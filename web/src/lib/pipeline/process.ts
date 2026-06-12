import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBancoCodigo } from "@/lib/bancos/resolve";
import { convertPdfWithCascade } from "@/lib/pdf/convert";
import { checkPdfGuards } from "@/lib/pdf/guards";
import type { PdfExtraction } from "@/lib/pdf/types";
import { isOfxFile, isPdfFile, parseOfx } from "@/lib/ofx/parse";
import { triggerWorkerProcess } from "@/lib/pipeline/trigger-worker";

export type ProcessResult = {
  status: "convertido" | "triagem" | "erro";
  message: string;
  transacaoCount?: number;
};

const MAX_JOB_ATTEMPTS = 3;

function isPdfExtrato(extrato: {
  arquivo_mime?: string | null;
  arquivo_nome?: string | null;
}): boolean {
  return isPdfFile(extrato.arquivo_nome ?? "", extrato.arquivo_mime);
}

async function persistPdfTransactions(
  admin: SupabaseClient,
  extratoId: string,
  extraction: PdfExtraction
) {
  await admin.from("transacoes").delete().eq("extrato_id", extratoId);

  if (extraction.transacoes.length === 0) return;

  const rows = extraction.transacoes.map((tx) => ({
    extrato_id: extratoId,
    data: tx.data,
    valor: tx.valor,
    descricao: tx.descricao,
    tipo: tx.tipo,
    fitid: null,
  }));

  const { error } = await admin.from("transacoes").insert(rows);
  if (error) throw error;
}

async function resolveBancoFromExtraction(
  admin: SupabaseClient,
  extraction: PdfExtraction,
  currentCodigo?: string | null,
  currentNome?: string | null
) {
  if (currentCodigo && currentNome) {
    return { bancoCodigo: currentCodigo, bancoNome: currentNome };
  }

  const resolved = await resolveBancoCodigo(
    admin,
    extraction.banco_codigo_febraban ?? extraction.banco_nome
  );

  return {
    bancoCodigo: currentCodigo ?? resolved?.codigo ?? extraction.banco_codigo_febraban,
    bancoNome: currentNome ?? resolved?.nome ?? extraction.banco_nome,
  };
}

async function markJobCompleted(admin: SupabaseClient, extratoId: string) {
  await admin
    .from("pipeline_jobs")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("extrato_id", extratoId);
}

async function markJobFailed(
  admin: SupabaseClient,
  extratoId: string,
  message: string,
  incrementAttempts: boolean
) {
  const { data: job } = await admin
    .from("pipeline_jobs")
    .select("attempts")
    .eq("extrato_id", extratoId)
    .maybeSingle();

  const attempts = (job?.attempts ?? 0) + (incrementAttempts ? 1 : 0);

  await admin
    .from("pipeline_jobs")
    .update({
      status: "failed",
      last_error: message,
      attempts,
      updated_at: new Date().toISOString(),
    })
    .eq("extrato_id", extratoId);

  return attempts;
}

async function requeueJobForRetry(admin: SupabaseClient, extratoId: string) {
  await admin
    .from("pipeline_jobs")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("extrato_id", extratoId);
  triggerWorkerProcess();
}

async function processOfxExtrato(
  admin: SupabaseClient,
  extratoId: string,
  buffer: Buffer,
  extrato: Record<string, unknown>
): Promise<ProcessResult> {
  const parsed = parseOfx(buffer);

  if (parsed.transacoes.length === 0) {
    throw new Error("OFX sem transações");
  }

  await admin.from("transacoes").delete().eq("extrato_id", extratoId);

  const rows = parsed.transacoes.map((tx) => ({
    extrato_id: extratoId,
    data: tx.data,
    valor: tx.valor,
    descricao: tx.descricao,
    tipo: tx.tipo,
    fitid: tx.fitid ?? null,
  }));

  const { error: txError } = await admin.from("transacoes").insert(rows);
  if (txError) throw txError;

  await admin
    .from("extratos")
    .update({
      status: "convertido",
      transacao_count: rows.length,
      processed_at: new Date().toISOString(),
      banco_codigo: (extrato.banco_codigo as string | null) ?? parsed.bancoCodigo,
      banco_nome: (extrato.banco_nome as string | null) ?? parsed.bancoNome,
    })
    .eq("id", extratoId);

  await markJobCompleted(admin, extratoId);

  return {
    status: "convertido",
    message: `${rows.length} transações convertidas`,
    transacaoCount: rows.length,
  };
}

async function processPdfExtrato(
  admin: SupabaseClient,
  extratoId: string,
  buffer: Buffer,
  extrato: Record<string, unknown>
): Promise<ProcessResult> {
  const guard = checkPdfGuards(buffer);
  if (!guard.ok) {
    await admin
      .from("extratos")
      .update({
        status: "triagem",
        triagem_motivo: guard.motivo,
        processed_at: new Date().toISOString(),
      })
      .eq("id", extratoId);
    await markJobCompleted(admin, extratoId);
    return { status: "triagem", message: guard.motivo };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const message = "Configuração incompleta: ANTHROPIC_API_KEY ausente";
    const attempts = await markJobFailed(admin, extratoId, message, true);
    await admin
      .from("extratos")
      .update({
        status: "triagem",
        triagem_motivo: message,
      })
      .eq("id", extratoId);
    if (attempts < MAX_JOB_ATTEMPTS) {
      await requeueJobForRetry(admin, extratoId);
    }
    return { status: "triagem", message };
  }

  const conversion = await convertPdfWithCascade(buffer);
  const { extraction, model, inputTokens, outputTokens } = conversion.best;
  const banco = await resolveBancoFromExtraction(
    admin,
    extraction,
    extrato.banco_codigo as string | null,
    extrato.banco_nome as string | null
  );

  await persistPdfTransactions(admin, extratoId, extraction);

  const baseUpdate = {
    transacao_count: extraction.transacoes.length,
    processed_at: new Date().toISOString(),
    banco_codigo: banco.bancoCodigo ?? null,
    banco_nome: banco.bancoNome ?? null,
    saldo_inicial: extraction.saldo_inicial,
    saldo_final: extraction.saldo_final,
    conversao_modelo: model,
    conversao_tokens_entrada: inputTokens,
    conversao_tokens_saida: outputTokens,
    conversao_tentativas: conversion.attempts,
    triagem_motivo: null,
  };

  if (conversion.status === "convertido") {
    await admin
      .from("extratos")
      .update({
        ...baseUpdate,
        status: "convertido",
      })
      .eq("id", extratoId);
    await markJobCompleted(admin, extratoId);
    return {
      status: "convertido",
      message: `${extraction.transacoes.length} transações convertidas`,
      transacaoCount: extraction.transacoes.length,
    };
  }

  await admin
    .from("extratos")
    .update({
      ...baseUpdate,
      status: "triagem",
      triagem_motivo: conversion.motivo ?? "Validação da conversão falhou",
    })
    .eq("id", extratoId);
  await markJobCompleted(admin, extratoId);

  return {
    status: "triagem",
    message: conversion.motivo ?? "Validação da conversão falhou",
    transacaoCount: extraction.transacoes.length,
  };
}

export async function processExtratoJob(
  admin: SupabaseClient,
  extratoId: string
): Promise<ProcessResult> {
  const { data: extrato, error } = await admin
    .from("extratos")
    .select("*")
    .eq("id", extratoId)
    .single();

  if (error || !extrato) {
    return { status: "erro", message: "Extrato não encontrado" };
  }

  if (extrato.status === "convertido" || extrato.status === "duplicado") {
    return {
      status: "convertido",
      message: "Já processado",
      transacaoCount: extrato.transacao_count,
    };
  }

  if (!extrato.storage_path) {
    return { status: "erro", message: "Arquivo ausente no storage" };
  }

  await admin
    .from("extratos")
    .update({ status: "processando" })
    .eq("id", extratoId);

  await admin
    .from("pipeline_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("extrato_id", extratoId);

  try {
    const { data: file, error: downloadError } = await admin.storage
      .from("extratos")
      .download(extrato.storage_path);

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "Download falhou");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (isPdfExtrato(extrato)) {
      return processPdfExtrato(admin, extratoId, buffer, extrato);
    }

    if (!isOfxFile(extrato.arquivo_nome ?? "", extrato.arquivo_mime)) {
      throw new Error("Formato não suportado para processamento");
    }

    return processOfxExtrato(admin, extratoId, buffer, extrato);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    const isPdf = isPdfExtrato(extrato);
    const attempts = await markJobFailed(admin, extratoId, message, true);

    if (isPdf && attempts >= MAX_JOB_ATTEMPTS) {
      await admin
        .from("extratos")
        .update({
          status: "erro",
          erro_mensagem: message,
          conversao_tentativas: attempts,
        })
        .eq("id", extratoId);
      return { status: "erro", message };
    }

    if (isPdf) {
      await admin
        .from("extratos")
        .update({
          status: "triagem",
          triagem_motivo: `Erro na conversão (tentativa ${attempts}/${MAX_JOB_ATTEMPTS})`,
          conversao_tentativas: attempts,
        })
        .eq("id", extratoId);

      if (attempts < MAX_JOB_ATTEMPTS) {
        await requeueJobForRetry(admin, extratoId);
      }

      return { status: "triagem", message };
    }

    await admin
      .from("extratos")
      .update({ status: "erro", erro_mensagem: message })
      .eq("id", extratoId);

    return { status: "erro", message };
  }
}

export async function processPendingJobs(
  admin: SupabaseClient,
  limit = 5
): Promise<{ processed: number; errors: number; triagem: number; requeued: number }> {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: requeuedFailed } = await admin
    .from("pipeline_jobs")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "failed")
    .lt("attempts", MAX_JOB_ATTEMPTS)
    .select("extrato_id");

  const { data: requeuedStale } = await admin
    .from("pipeline_jobs")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("extrato_id");

  const requeued =
    (requeuedFailed?.length ?? 0) + (requeuedStale?.length ?? 0);

  const { data: jobs } = await admin
    .from("pipeline_jobs")
    .select("extrato_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  let processed = 0;
  let errors = 0;
  let triagem = 0;

  for (const job of jobs ?? []) {
    const result = await processExtratoJob(admin, job.extrato_id);
    if (result.status === "convertido") processed += 1;
    else if (result.status === "triagem") triagem += 1;
    else errors += 1;
  }

  return { processed, errors, triagem, requeued };
}
