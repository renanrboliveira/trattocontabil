import type { SupabaseClient } from "@supabase/supabase-js";
import {
  alterdataExportFilename,
  generateAlterdataCsvV1,
} from "@/lib/export/alterdata-csv";

export type CreateExportResult =
  | { ok: true; exportId: string; filename: string }
  | { ok: false; message: string };

export async function createAlterdataExport(
  admin: SupabaseClient,
  params: {
    extratoId: string;
    escritorioId: string;
    userId: string | null;
  }
): Promise<CreateExportResult> {
  const { data: extrato, error } = await admin
    .from("extratos")
    .select(
      "id, status, banco_codigo, clientes(cnpj), competencias(ano, mes)"
    )
    .eq("id", params.extratoId)
    .eq("escritorio_id", params.escritorioId)
    .maybeSingle();

  if (error || !extrato) {
    return { ok: false, message: "Extrato não encontrado" };
  }

  if (extrato.status !== "convertido" && extrato.status !== "exportado") {
    return {
      ok: false,
      message: "Extrato precisa estar convertido antes de exportar",
    };
  }

  const { data: transacoes, error: txError } = await admin
    .from("transacoes")
    .select("data, valor, descricao, tipo")
    .eq("extrato_id", params.extratoId)
    .order("data", { ascending: true });

  if (txError || !transacoes?.length) {
    return { ok: false, message: "Nenhuma transação para exportar" };
  }

  const cliente = Array.isArray(extrato.clientes)
    ? extrato.clientes[0]
    : extrato.clientes;
  const competencia = Array.isArray(extrato.competencias)
    ? extrato.competencias[0]
    : extrato.competencias;

  const csv = generateAlterdataCsvV1(
    transacoes.map((tx) => ({
      data: tx.data,
      valor: Number(tx.valor),
      descricao: tx.descricao,
      tipo: tx.tipo as "C" | "D",
    }))
  );

  const exportId = crypto.randomUUID();
  const filename = alterdataExportFilename({
    cnpj: cliente?.cnpj,
    bancoCodigo: extrato.banco_codigo,
    competencia: competencia ?? null,
  });
  const storagePath = `${params.escritorioId}/exports/${exportId}/${filename}`;

  const { error: uploadError } = await admin.storage
    .from("extratos")
    .upload(storagePath, Buffer.from(csv, "utf-8"), {
      contentType: "text/csv; charset=utf-8",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: insertError } = await admin.from("exportacoes").insert({
    id: exportId,
    escritorio_id: params.escritorioId,
    extrato_id: params.extratoId,
    formato: "alterdata_csv_v1",
    arquivo_nome: filename,
    storage_path: storagePath,
    transacao_count: transacoes.length,
    created_by: params.userId,
  });

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  await admin
    .from("extratos")
    .update({ status: "exportado" })
    .eq("id", params.extratoId);

  return { ok: true, exportId, filename };
}
