export type TransacaoExport = {
  data: string;
  valor: number;
  descricao: string;
  tipo: "C" | "D";
};

/** Layout provisório v1 — validar import com E2 (Etapa 0). Separador `;`, decimal BR. */
export function generateAlterdataCsvV1(transacoes: TransacaoExport[]): string {
  const header = "Data;Histórico;Valor;Tipo";
  const lines = transacoes.map((tx) => {
    const [y, m, d] = tx.data.slice(0, 10).split("-");
    const data = `${d}/${m}/${y}`;
    const historico = tx.descricao.replace(/;/g, ",").slice(0, 200);
    const valor = Number(tx.valor).toFixed(2).replace(".", ",");
    return `${data};${historico};${valor};${tx.tipo}`;
  });
  return `\uFEFF${[header, ...lines].join("\r\n")}`;
}

export function alterdataExportFilename(params: {
  cnpj?: string | null;
  bancoCodigo?: string | null;
  competencia?: { ano: number; mes: number } | null;
}): string {
  const cnpj = params.cnpj?.replace(/\D/g, "") ?? "extrato";
  const banco = params.bancoCodigo ?? "banco";
  const comp = params.competencia
    ? `${params.competencia.ano}-${String(params.competencia.mes).padStart(2, "0")}`
    : "comp";
  return `alterdata-${cnpj}-${banco}-${comp}.csv`;
}
