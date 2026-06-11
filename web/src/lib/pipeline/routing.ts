import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone } from "@/lib/pipeline/idempotency";

export type RoutedCliente = {
  clienteId: string;
  cnpj: string;
  razaoSocial: string;
  clienteBancoId?: string;
  bancoCodigo?: string;
  bancoNome?: string;
};

export async function resolveEscritorioBySlug(
  admin: SupabaseClient,
  slug: string
) {
  const { data, error } = await admin
    .from("escritorios")
    .select("id, nome, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Escritório não encontrado: ${slug}`);
  return data;
}

export async function matchClienteByRemetente(
  admin: SupabaseClient,
  escritorioId: string,
  remetente: string,
  channel: "whatsapp" | "email"
): Promise<RoutedCliente | null> {
  if (channel === "whatsapp") {
    const phone = normalizePhone(remetente);
    const { data: clientes } = await admin
      .from("clientes")
      .select("id, cnpj, razao_social, telefone")
      .eq("escritorio_id", escritorioId)
      .eq("ativo", true);

    const matches =
      clientes?.filter(
        (c) => c.telefone && normalizePhone(c.telefone) === phone
      ) ?? [];

    if (matches.length !== 1) return null;
    const cliente = matches[0];
    return {
      clienteId: cliente.id,
      cnpj: cliente.cnpj,
      razaoSocial: cliente.razao_social,
    };
  }

  const email = normalizeEmail(remetente);
  const { data: clientes } = await admin
    .from("clientes")
    .select("id, cnpj, razao_social, email")
    .eq("escritorio_id", escritorioId)
    .eq("ativo", true)
    .ilike("email", email);

  if (!clientes || clientes.length !== 1) return null;
  const cliente = clientes[0];
  return {
    clienteId: cliente.id,
    cnpj: cliente.cnpj,
    razaoSocial: cliente.razao_social,
  };
}

export async function matchClienteBanco(
  admin: SupabaseClient,
  clienteId: string,
  bancoCodigo?: string,
  contaRef?: string
) {
  if (!bancoCodigo) return null;

  let query = admin
    .from("cliente_bancos")
    .select("id, banco_codigo, banco_nome, conta_ref")
    .eq("cliente_id", clienteId)
    .eq("banco_codigo", bancoCodigo);

  if (contaRef) {
    query = query.eq("conta_ref", contaRef);
  }

  const { data } = await query.limit(2);
  if (!data || data.length !== 1) return null;
  return data[0];
}

export async function ensureCompetencia(
  admin: SupabaseClient,
  escritorioId: string,
  competencia: string
) {
  const [ano, mes] = competencia.split("-").map(Number);
  const { data, error } = await admin
    .from("competencias")
    .upsert(
      { escritorio_id: escritorioId, ano, mes },
      { onConflict: "escritorio_id,ano,mes" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
