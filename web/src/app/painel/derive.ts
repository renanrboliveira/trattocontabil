import { unwrapRelation } from "@/lib/supabase/relations";

export type ClienteComBancos = {
  id: string;
  razao_social: string;
  cnpj: string | null;
  cliente_bancos:
    | { id: string; banco_codigo: string | null; banco_nome: string | null }[]
    | null;
};

export type ExtratoDaCompetencia = {
  id: string;
  cliente_id: string | null;
  status: string;
  banco_nome: string | null;
  clientes: { razao_social: string } | { razao_social: string }[] | null;
};

export type PendenciaStatus = "falta" | "triagem" | "erro";

export type Pendencia = {
  key: string;
  cliente: string;
  cnpj: string | null;
  banco: string;
  status: PendenciaStatus;
  extratoId: string | null;
};

export function derivePendencias(
  clientes: ClienteComBancos[],
  extratos: ExtratoDaCompetencia[]
): { pendencias: Pendencia[]; recebidos: number; totalPares: number } {
  const pendencias: Pendencia[] = [];
  const usados = new Set<string>();
  let recebidos = 0;
  let totalPares = 0;

  for (const cliente of clientes) {
    const bancos = cliente.cliente_bancos ?? [];

    if (bancos.length === 0) {
      totalPares += 1;
      pendencias.push({
        key: cliente.id,
        cliente: cliente.razao_social,
        cnpj: cliente.cnpj,
        banco: "—",
        status: "falta",
        extratoId: null,
      });
      continue;
    }

    for (const banco of bancos) {
      totalPares += 1;
      const match = extratos.find((extrato) => {
        if (usados.has(extrato.id)) return false;
        if (extrato.cliente_id) {
          return extrato.cliente_id === cliente.id && extrato.banco_nome === banco.banco_nome;
        }
        const extratoCliente = unwrapRelation(extrato.clientes);
        return (
          extratoCliente?.razao_social === cliente.razao_social &&
          extrato.banco_nome === banco.banco_nome
        );
      });

      if (!match) {
        pendencias.push({
          key: `${cliente.id}-${banco.id}`,
          cliente: cliente.razao_social,
          cnpj: cliente.cnpj,
          banco: banco.banco_nome ?? "?",
          status: "falta",
          extratoId: null,
        });
        continue;
      }

      usados.add(match.id);
      recebidos += 1;

      if (match.status === "triagem" || match.status === "erro") {
        pendencias.push({
          key: `${cliente.id}-${banco.id}`,
          cliente: cliente.razao_social,
          cnpj: cliente.cnpj,
          banco: banco.banco_nome ?? "?",
          status: match.status,
          extratoId: match.id,
        });
      }
    }
  }

  // Extratos sem par cliente × banco (ex.: remetente não identificado em triagem)
  for (const extrato of extratos) {
    if (usados.has(extrato.id)) continue;
    if (extrato.status !== "triagem" && extrato.status !== "erro") continue;
    pendencias.push({
      key: extrato.id,
      cliente:
        unwrapRelation(extrato.clientes)?.razao_social ?? "Remetente não identificado",
      cnpj: null,
      banco: extrato.banco_nome ?? "?",
      status: extrato.status,
      extratoId: extrato.id,
    });
  }

  return { pendencias, recebidos, totalPares };
}

export function filterPendencias(
  pendencias: Pendencia[],
  f: string | undefined,
  q: string | undefined
): Pendencia[] {
  let result = pendencias;
  if (f === "falta" || f === "triagem" || f === "erro") {
    result = result.filter((p) => p.status === f);
  }
  if (q) {
    const needle = q.trim().toLowerCase();
    if (needle) {
      const digits = needle.replace(/\D/g, "");
      result = result.filter(
        (p) =>
          p.cliente.toLowerCase().includes(needle) ||
          (digits !== "" && (p.cnpj ?? "").replace(/\D/g, "").includes(digits)) ||
          p.banco.toLowerCase().includes(needle)
      );
    }
  }
  return result;
}
