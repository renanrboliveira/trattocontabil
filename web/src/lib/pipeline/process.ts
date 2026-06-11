import type { SupabaseClient } from "@supabase/supabase-js";
import { parseOfx } from "@/lib/ofx/parse";

export type ProcessResult = {
  status: "convertido" | "erro";
  message: string;
  transacaoCount?: number;
};

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
        banco_codigo: extrato.banco_codigo ?? parsed.bancoCodigo,
        banco_nome: extrato.banco_nome ?? parsed.bancoNome,
      })
      .eq("id", extratoId);

    await admin
      .from("pipeline_jobs")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("extrato_id", extratoId);

    return {
      status: "convertido",
      message: `${rows.length} transações convertidas`,
      transacaoCount: rows.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    await admin
      .from("extratos")
      .update({ status: "erro", erro_mensagem: message })
      .eq("id", extratoId);

    await admin
      .from("pipeline_jobs")
      .update({
        status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("extrato_id", extratoId);

    const { data: job } = await admin
      .from("pipeline_jobs")
      .select("attempts")
      .eq("extrato_id", extratoId)
      .maybeSingle();

    if (job) {
      await admin
        .from("pipeline_jobs")
        .update({ attempts: (job.attempts ?? 0) + 1 })
        .eq("extrato_id", extratoId);
    }

    return { status: "erro", message };
  }
}

export async function processPendingJobs(
  admin: SupabaseClient,
  limit = 10
): Promise<{ processed: number; errors: number }> {
  const { data: jobs } = await admin
    .from("pipeline_jobs")
    .select("extrato_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  let processed = 0;
  let errors = 0;

  for (const job of jobs ?? []) {
    const result = await processExtratoJob(admin, job.extrato_id);
    if (result.status === "convertido") processed += 1;
    else errors += 1;
  }

  return { processed, errors };
}
