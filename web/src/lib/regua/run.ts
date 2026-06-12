import type { SupabaseClient } from "@supabase/supabase-js";
import {
  derivePendencias,
  type ClienteComBancos,
  type ExtratoDaCompetencia,
} from "@/app/painel/derive";
import { ensureCompetencia } from "@/lib/pipeline/routing";
import {
  competenciaCobrada,
  competenciaParam,
  dentroJanelaRegua,
  isDiaLembrete,
  isSameUtcDay,
} from "@/lib/regua/dates";
import {
  renderCobrancaMensagem,
  type PendenciaSnapshot,
} from "@/lib/regua/template";
import { sendTemplate } from "@/lib/whatsapp/send";

export type CobrancaExistente = {
  id: string;
  cliente_id: string;
  competencia_id: string;
  tentativa: number;
  status: string;
  created_at: string;
};

export type CobrancaSelecionada = {
  clienteId: string;
  telefone: string;
  contatoNome: string;
  tentativa: number;
  pendencias: PendenciaSnapshot[];
  variables: string[];
  mensagem: string;
};

export type EscritorioRegua = {
  id: string;
  nome: string;
  email_inbound: string | null;
};

export type ClienteRegua = ClienteComBancos & {
  telefone: string | null;
  contato_nome: string | null;
  regua_opt_in: boolean;
  regua_opt_out_em: string | null;
};

export function calcularTentativa(
  cobrancas: CobrancaExistente[],
  hoje: Date,
  forcar = false
): number | null {
  const enviadas = cobrancas.filter(
    (c) => c.status === "enviada" || c.status === "dry_run"
  );
  if (enviadas.length >= 3) return null;

  const hojeCobrancas = cobrancas.filter((c) =>
    isSameUtcDay(new Date(c.created_at), hoje)
  );

  if (forcar) {
    if (hojeCobrancas.some((c) => c.status === "enviada")) {
      return null;
    }

    const retentavelHoje = hojeCobrancas
      .filter((c) =>
        c.status === "dry_run" || c.status === "falha" || c.status === "pendente"
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

    if (retentavelHoje) {
      return retentavelHoje.tentativa;
    }
  } else if (
    hojeCobrancas.some(
      (c) => c.status === "enviada" || c.status === "dry_run"
    )
  ) {
    return null;
  }

  const falhaAnterior = cobrancas.find(
    (c) => c.status === "falha" && !isSameUtcDay(new Date(c.created_at), hoje)
  );

  const falhaHoje = hojeCobrancas.find((c) => c.status === "falha");
  if (falhaHoje) {
    return falhaHoje.tentativa;
  }

  const pendenteHoje = hojeCobrancas.find((c) => c.status === "pendente");
  if (pendenteHoje) {
    return pendenteHoje.tentativa;
  }

  if (falhaAnterior) {
    return falhaAnterior.tentativa;
  }

  return enviadas.length + 1;
}

export function selecionarCobrancas(params: {
  escritorio: EscritorioRegua;
  clientes: ClienteRegua[];
  extratos: ExtratoDaCompetencia[];
  competenciaId: string;
  competenciaAno: number;
  competenciaMes: number;
  cobrancasExistentes: CobrancaExistente[];
  hoje: Date;
  forcar?: boolean;
}): CobrancaSelecionada[] {
  const { pendencias } = derivePendencias(params.clientes, params.extratos);
  const faltasPorCliente = new Map<
    string,
    { cliente: ClienteRegua; bancos: PendenciaSnapshot[] }
  >();

  for (const pendencia of pendencias) {
    if (pendencia.status !== "falta") continue;

    const clienteId = pendencia.clienteId;
    const cliente = params.clientes.find((c) => c.id === clienteId);
    if (!cliente) continue;

    const entry = faltasPorCliente.get(clienteId) ?? {
      cliente,
      bancos: [],
    };

    if (pendencia.banco !== "—") {
      const banco = cliente.cliente_bancos?.find(
        (b) => b.banco_nome === pendencia.banco
      );
      entry.bancos.push({
        banco_codigo: banco?.banco_codigo ?? null,
        banco_nome: pendencia.banco,
      });
    }

    faltasPorCliente.set(clienteId, entry);
  }

  const selecionadas: CobrancaSelecionada[] = [];

  for (const { cliente, bancos } of faltasPorCliente.values()) {
    if (!cliente.telefone) continue;
    if (!cliente.regua_opt_in || cliente.regua_opt_out_em) continue;

    const cobrancasCliente = params.cobrancasExistentes.filter(
      (c) =>
        c.cliente_id === cliente.id && c.competencia_id === params.competenciaId
    );

    const tentativa = calcularTentativa(
      cobrancasCliente,
      params.hoje,
      params.forcar ?? false
    );
    if (tentativa === null) continue;

    const contatoNome = cliente.contato_nome?.trim() || cliente.razao_social;
    const { variables, mensagem } = renderCobrancaMensagem({
      contatoNome,
      escritorioNome: params.escritorio.nome,
      competenciaAno: params.competenciaAno,
      competenciaMes: params.competenciaMes,
      bancos,
      emailInbound: params.escritorio.email_inbound,
    });

    selecionadas.push({
      clienteId: cliente.id,
      telefone: cliente.telefone,
      contatoNome,
      tentativa,
      pendencias: bancos,
      variables,
      mensagem,
    });
  }

  return selecionadas;
}

export type RunReguaResult = {
  escritorios: number;
  rollover: number;
  selecionadas: number;
  enviadas: number;
  dryRun: number;
  falhas: number;
  skippedCadencia: boolean;
};

export async function runRegua(
  admin: SupabaseClient,
  hoje: Date = new Date(),
  options?: {
    forcar?: boolean;
    escritorioId?: string;
    clienteId?: string;
    competenciaId?: string;
    competenciaAno?: number;
    competenciaMes?: number;
  }
): Promise<RunReguaResult> {
  const forcar = options?.forcar ?? false;
  const cadenciaOk =
    forcar || (dentroJanelaRegua(hoje) && isDiaLembrete(hoje));

  let escritoriosQuery = admin.from("escritorios").select("id, nome, email_inbound");
  if (options?.escritorioId) {
    escritoriosQuery = escritoriosQuery.eq("id", options.escritorioId);
  }
  const { data: escritorios } = await escritoriosQuery;

  const result: RunReguaResult = {
    escritorios: escritorios?.length ?? 0,
    rollover: 0,
    selecionadas: 0,
    enviadas: 0,
    dryRun: 0,
    falhas: 0,
    skippedCadencia: !cadenciaOk,
  };

  if (!cadenciaOk) {
    for (const escritorio of escritorios ?? []) {
      const mesAtual = competenciaParam(
        hoje.getUTCFullYear(),
        hoje.getUTCMonth() + 1
      );
      await ensureCompetencia(admin, escritorio.id, mesAtual);
      result.rollover += 1;
    }
    return result;
  }

  const { ano: compAnoDefault, mes: compMesDefault } = competenciaCobrada(hoje);
  const compAno = options?.competenciaAno ?? compAnoDefault;
  const compMes = options?.competenciaMes ?? compMesDefault;
  const compParam = competenciaParam(compAno, compMes);

  for (const escritorio of escritorios ?? []) {
    const mesAtual = competenciaParam(
      hoje.getUTCFullYear(),
      hoje.getUTCMonth() + 1
    );
    await ensureCompetencia(admin, escritorio.id, mesAtual);
    result.rollover += 1;

    const competenciaId =
      options?.competenciaId ??
      (await ensureCompetencia(admin, escritorio.id, compParam));

    let clientesQuery = admin
      .from("clientes")
      .select(
        "id, razao_social, cnpj, telefone, contato_nome, regua_opt_in, regua_opt_out_em, cliente_bancos(id, banco_codigo, banco_nome)"
      )
      .eq("escritorio_id", escritorio.id)
      .eq("ativo", true);

    if (options?.clienteId) {
      clientesQuery = clientesQuery.eq("id", options.clienteId);
    }

    const { data: clientes } = await clientesQuery;

    const { data: extratos } = await admin
      .from("extratos")
      .select("id, cliente_id, status, banco_nome, clientes(razao_social)")
      .eq("escritorio_id", escritorio.id)
      .eq("competencia_id", competenciaId);

    const { data: cobrancasExistentes } = await admin
      .from("cobrancas")
      .select("id, cliente_id, competencia_id, tentativa, status, created_at")
      .eq("escritorio_id", escritorio.id)
      .eq("competencia_id", competenciaId);

    const selecionadas = selecionarCobrancas({
      escritorio,
      clientes: (clientes ?? []) as ClienteRegua[],
      extratos: (extratos ?? []) as ExtratoDaCompetencia[],
      competenciaId,
      competenciaAno: compAno,
      competenciaMes: compMes,
      cobrancasExistentes: (cobrancasExistentes ?? []) as CobrancaExistente[],
      hoje,
      forcar,
    });

    result.selecionadas += selecionadas.length;

    for (const cobranca of selecionadas) {
      const { data: inserted, error: insertError } = await admin
        .from("cobrancas")
        .insert({
          escritorio_id: escritorio.id,
          cliente_id: cobranca.clienteId,
          competencia_id: competenciaId,
          tentativa: cobranca.tentativa,
          pendencias: cobranca.pendencias,
          mensagem: cobranca.mensagem,
          status: "pendente",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        result.falhas += 1;
        continue;
      }

      const sendResult = await sendTemplate({
        to: cobranca.telefone.replace(/\D/g, ""),
        templateName: "cobranca_extrato_pendente",
        languageCode: "pt_BR",
        variables: cobranca.variables,
      });

      const now = new Date().toISOString();
      const reguaMode = process.env.REGUA_MODE ?? "dry_run";

      if (sendResult.ok) {
        const status = reguaMode === "live" ? "enviada" : "dry_run";
        await admin
          .from("cobrancas")
          .update({
            status,
            wamid: sendResult.wamid ?? null,
            sent_at: now,
          })
          .eq("id", inserted.id);

        if (status === "enviada") result.enviadas += 1;
        else result.dryRun += 1;
      } else {
        await admin
          .from("cobrancas")
          .update({
            status: "falha",
            erro: sendResult.error ?? "Falha no envio",
          })
          .eq("id", inserted.id);
        result.falhas += 1;
      }
    }
  }

  return result;
}

export async function cobrarClienteAgora(
  admin: SupabaseClient,
  params: {
    escritorioId: string;
    clienteId: string;
    competenciaId: string;
    competenciaAno: number;
    competenciaMes: number;
  }
): Promise<{ ok: boolean; message: string }> {
  const result = await runRegua(admin, new Date(), {
    forcar: true,
    escritorioId: params.escritorioId,
    clienteId: params.clienteId,
    competenciaId: params.competenciaId,
    competenciaAno: params.competenciaAno,
    competenciaMes: params.competenciaMes,
  });

  if (result.selecionadas === 0) {
    return {
      ok: false,
      message:
        "Cliente não elegível (sem pendência, opt-out, sem telefone ou limite de tentativas)",
    };
  }

  if (result.falhas > 0 && result.enviadas + result.dryRun === 0) {
    return { ok: false, message: "Falha ao enviar cobrança" };
  }

  return { ok: true, message: "Cobrança registrada" };
}
