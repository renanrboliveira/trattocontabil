import type { SupabaseClient } from "@supabase/supabase-js";

export type BancoRef = {
  codigo: string;
  nome: string;
};

export async function resolveBancoCodigo(
  admin: SupabaseClient,
  rawBankId?: string | null
): Promise<BancoRef | null> {
  if (!rawBankId) return null;

  const digits = rawBankId.replace(/\D/g, "").padStart(3, "0");

  const { data } = await admin
    .from("bancos")
    .select("codigo, nome, febraban_id")
    .eq("febraban_id", digits)
    .maybeSingle();

  if (data) {
    return { codigo: data.codigo, nome: data.nome };
  }

  const lower = rawBankId.toLowerCase();
  const { data: byCodigo } = await admin
    .from("bancos")
    .select("codigo, nome")
    .eq("codigo", lower)
    .maybeSingle();

  if (byCodigo) {
    return { codigo: byCodigo.codigo, nome: byCodigo.nome };
  }

  return { codigo: lower, nome: rawBankId };
}
