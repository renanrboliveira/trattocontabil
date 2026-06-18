export type CobrancaResumo = {
  tentativas: number;
  ultima: string | null;
  optOut: boolean;
};

export type CobrancaResumoInput = {
  cliente_id: string;
  status: string;
  tentativa: number;
  sent_at: string | null;
  created_at: string;
};

export function formatCobrancaResumo(
  resumo: CobrancaResumo | undefined
): string | null {
  if (!resumo) return null;
  if (resumo.optOut) return "opt-out";
  if (resumo.tentativas === 0) return null;
  const ultima = resumo.ultima
    ? new Date(resumo.ultima).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;
  if (ultima) {
    return `Cobrado ${resumo.tentativas}× · última ${ultima}`;
  }
  return `Cobrado ${resumo.tentativas}×`;
}

// Conta tentativas DISTINTAS realmente enviadas (status "enviada").
// dry_run não conta como cobrado, e linhas duplicadas da mesma tentativa
// (reenvios/retentativas) contam uma única vez.
export function buildCobrancaMap(
  cobrancas: CobrancaResumoInput[],
  clientesOptOut: Map<string, boolean>
): Map<string, CobrancaResumo> {
  const map = new Map<string, CobrancaResumo>();
  const tentativasPorCliente = new Map<string, Set<number>>();

  for (const cobranca of cobrancas) {
    if (cobranca.status !== "enviada") continue;

    const tentativas =
      tentativasPorCliente.get(cobranca.cliente_id) ?? new Set<number>();
    tentativas.add(cobranca.tentativa);
    tentativasPorCliente.set(cobranca.cliente_id, tentativas);

    const existing = map.get(cobranca.cliente_id) ?? {
      tentativas: 0,
      ultima: null,
      optOut: clientesOptOut.get(cobranca.cliente_id) ?? false,
    };

    existing.tentativas = tentativas.size;
    const quando = cobranca.sent_at ?? cobranca.created_at;
    if (!existing.ultima || quando > existing.ultima) {
      existing.ultima = quando;
    }

    map.set(cobranca.cliente_id, existing);
  }

  for (const [clienteId, optOut] of clientesOptOut) {
    if (!optOut) continue;
    const existing = map.get(clienteId) ?? {
      tentativas: 0,
      ultima: null,
      optOut: true,
    };
    existing.optOut = true;
    map.set(clienteId, existing);
  }

  return map;
}
