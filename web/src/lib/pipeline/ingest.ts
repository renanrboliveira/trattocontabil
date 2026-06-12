import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBancoCodigo } from "@/lib/bancos/resolve";
import {
  buildIdempotencyKey,
  buildTriagemIdempotencyKey,
  hashFile,
  idempotencyScope,
  parseCompetencia,
} from "@/lib/pipeline/idempotency";
import {
  inferCompetencia,
  isOfxFile,
  isPdfFile,
  parseOfx,
} from "@/lib/ofx/parse";
import {
  ensureCompetencia,
  matchClienteBanco,
  matchClienteByRemetente,
  resolveEscritorioBySlug,
} from "@/lib/pipeline/routing";
import { triggerWorkerProcess } from "@/lib/pipeline/trigger-worker";
import { checkPdfGuards } from "@/lib/pdf/guards";
import { processExtratoJob } from "@/lib/pipeline/process";

export type IngestInput = {
  buffer: Buffer;
  filename: string;
  mime?: string | null;
  canal: "whatsapp" | "email" | "upload";
  remetente?: string;
  escritorioSlug?: string;
  clienteId?: string;
  bancoCodigo?: string;
  competencia?: string;
};

export type IngestResult = {
  extratoId: string;
  status: "convertido" | "duplicado" | "triagem" | "erro" | "recebido";
  message: string;
  transacaoCount?: number;
};

async function checkDuplicate(
  admin: SupabaseClient,
  escritorioId: string,
  idempotencyKey: string
) {
  return admin
    .from("extratos")
    .select("id, status")
    .eq("escritorio_id", escritorioId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
}

async function persistExtrato(
  admin: SupabaseClient,
  params: {
    extratoId: string;
    escritorioId: string;
    competenciaId: string;
    input: IngestInput;
    fileHash: string;
    idempotencyKey: string;
    status: "recebido" | "triagem";
    triagemMotivo?: string;
    clienteId?: string;
    clienteBancoId?: string;
    cnpj?: string;
    bancoCodigo?: string;
    bancoNome?: string;
    mime: string;
  }
) {
  const storagePath = `${params.escritorioId}/${params.extratoId}/${params.input.filename}`;

  const { error: uploadError } = await admin.storage
    .from("extratos")
    .upload(storagePath, params.input.buffer, {
      contentType: params.mime,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false as const, message: `Falha no storage: ${uploadError.message}` };
  }

  const { data: extrato, error: insertError } = await admin
    .from("extratos")
    .insert({
      id: params.extratoId,
      escritorio_id: params.escritorioId,
      cliente_id: params.clienteId ?? null,
      cliente_banco_id: params.clienteBancoId ?? null,
      competencia_id: params.competenciaId,
      canal: params.input.canal,
      status: params.status,
      arquivo_hash: params.fileHash,
      arquivo_nome: params.input.filename,
      arquivo_mime: params.mime,
      storage_path: storagePath,
      idempotency_key: params.idempotencyKey,
      remetente: params.input.remetente ?? null,
      banco_codigo: params.bancoCodigo ?? null,
      banco_nome: params.bancoNome ?? null,
      triagem_motivo: params.triagemMotivo ?? null,
    })
    .select("id")
    .single();

  if (insertError || !extrato) {
    return {
      ok: false as const,
      message: insertError?.message ?? "Falha ao registrar extrato",
    };
  }

  return { ok: true as const, extratoId: extrato.id };
}

export async function ingestExtrato(
  admin: SupabaseClient,
  input: IngestInput
): Promise<IngestResult> {
  const slug =
    input.escritorioSlug ??
    process.env.DEFAULT_ESCRITORIO_SLUG ??
    "e2-piloto";

  const escritorio = await resolveEscritorioBySlug(admin, slug);
  const fileHash = hashFile(input.buffer);
  const isPdf = isPdfFile(input.filename, input.mime);
  const isOfx = isOfxFile(input.filename, input.mime);

  if (!isPdf && !isOfx) {
    return {
      extratoId: "",
      status: "erro",
      message: "Formato não suportado. Envie OFX ou PDF.",
    };
  }

  let parsed: ReturnType<typeof parseOfx> | undefined;
  if (isOfx) {
    try {
      parsed = parseOfx(input.buffer);
    } catch (err) {
      return {
        extratoId: "",
        status: "erro",
        message: err instanceof Error ? err.message : "Falha ao parsear OFX",
      };
    }
  }

  const competencia =
    input.competencia ??
    (parsed ? inferCompetencia(parsed) : undefined) ??
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  let clienteId = input.clienteId;
  let cnpj: string | undefined;
  let clienteBancoId: string | undefined;
  let needsTriagem = false;
  let bancoCodigo = input.bancoCodigo;
  let bancoNome: string | undefined;

  if (!clienteId && input.remetente) {
    const routed = await matchClienteByRemetente(
      admin,
      escritorio.id,
      input.remetente,
      input.canal === "email" ? "email" : "whatsapp"
    );
    if (routed) {
      clienteId = routed.clienteId;
      cnpj = routed.cnpj;
    } else {
      needsTriagem = true;
    }
  }

  if (clienteId && !cnpj) {
    const { data: cliente } = await admin
      .from("clientes")
      .select("cnpj")
      .eq("id", clienteId)
      .single();
    cnpj = cliente?.cnpj;
  }

  const rawBankId = parsed?.bancoCodigo;
  if (!bancoCodigo && rawBankId) {
    const resolved = await resolveBancoCodigo(admin, rawBankId);
    if (resolved) {
      bancoCodigo = resolved.codigo;
      bancoNome = resolved.nome;
    }
  } else if (bancoCodigo && !bancoNome) {
    const resolved = await resolveBancoCodigo(admin, bancoCodigo);
    bancoNome = resolved?.nome ?? bancoCodigo;
  }

  if (clienteId && bancoCodigo && !isPdf) {
    const banco = await matchClienteBanco(
      admin,
      clienteId,
      bancoCodigo,
      parsed?.contaRef
    );
    if (banco) {
      clienteBancoId = banco.id;
      bancoCodigo = banco.banco_codigo;
      bancoNome = banco.banco_nome;
    }
  }

  if (!cnpj) {
    needsTriagem = true;
  }

  const scope = idempotencyScope({
    remetente: input.remetente,
    clienteId,
    canal: input.canal,
  });

  const idempotencyKey = needsTriagem
    ? buildTriagemIdempotencyKey({ hash: fileHash, competencia, scope })
    : buildIdempotencyKey({
        hash: fileHash,
        cnpj: cnpj!,
        bancoCodigo: bancoCodigo ?? "desconhecido",
        competencia,
      });

  const { data: existing } = await checkDuplicate(
    admin,
    escritorio.id,
    idempotencyKey
  );

  if (existing) {
    return {
      extratoId: existing.id,
      status: "duplicado",
      message: "Extrato duplicado — reenvio ignorado (idempotência)",
    };
  }

  const competenciaId = await ensureCompetencia(
    admin,
    escritorio.id,
    competencia
  );

  const extratoId = crypto.randomUUID();
  const mime = isPdf
    ? (input.mime ?? "application/pdf")
    : (input.mime ?? "application/x-ofx");

  let triagemMotivo: string | undefined;
  if (isPdf) {
    const guard = checkPdfGuards(input.buffer);
    if (!guard.ok) {
      needsTriagem = true;
      triagemMotivo = guard.motivo;
    }
  }

  const persisted = await persistExtrato(admin, {
    extratoId,
    escritorioId: escritorio.id,
    competenciaId,
    input,
    fileHash,
    idempotencyKey,
    status: needsTriagem ? "triagem" : "recebido",
    triagemMotivo,
    clienteId,
    clienteBancoId,
    bancoCodigo,
    bancoNome,
    mime,
  });

  if (!persisted.ok) {
    return { extratoId: "", status: "erro", message: persisted.message };
  }

  if (isPdf) {
    if (needsTriagem) {
      return {
        extratoId: persisted.extratoId,
        status: "triagem",
        message: triagemMotivo ?? "PDF em triagem",
      };
    }

    await admin.from("pipeline_jobs").insert({
      extrato_id: persisted.extratoId,
      status: "pending",
    });

    triggerWorkerProcess();

    return {
      extratoId: persisted.extratoId,
      status: "recebido",
      message: "PDF recebido — conversão em processamento",
    };
  }

  if (needsTriagem) {
    return {
      extratoId: persisted.extratoId,
      status: "triagem",
      message: "Extrato recebido — remetente ou banco não identificado",
    };
  }

  await admin.from("pipeline_jobs").insert({
    extrato_id: persisted.extratoId,
    status: "pending",
  });

  const processed = await processExtratoJob(admin, persisted.extratoId);

  return {
    extratoId: persisted.extratoId,
    status: processed.status,
    message: processed.message,
    transacaoCount: processed.transacaoCount,
  };
}

export function formatCompetenciaLabel(competencia: string): string {
  const parsed = parseCompetencia(competencia);
  if (!parsed) return competencia;
  return `${String(parsed.mes).padStart(2, "0")}/${parsed.ano}`;
}
