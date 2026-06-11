import type { PdfExtraction, PdfValidationResult } from "@/lib/pdf/types";

const SALDO_TOLERANCE = 0.01;

function signedValue(valor: number, tipo: "C" | "D"): number {
  return tipo === "C" ? valor : -valor;
}

function inferCompetencia(extraction: PdfExtraction): string | null {
  if (extraction.competencia) return extraction.competencia;

  const counts = new Map<string, number>();
  for (const tx of extraction.transacoes) {
    const month = tx.data.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) {
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [month, count] of counts) {
    if (count > bestCount) {
      best = month;
      bestCount = count;
    }
  }

  return best;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePdfExtraction(
  extraction: PdfExtraction
): PdfValidationResult {
  if (extraction.escaneado) {
    return { ok: false, motivo: "PDF escaneado — qualidade insuficiente para conversão automática" };
  }

  if (extraction.ilegivel) {
    return { ok: false, motivo: "PDF ilegível — conversão automática não confiável" };
  }

  if (extraction.transacoes.length === 0) {
    return { ok: false, motivo: "Nenhuma transação identificada no PDF" };
  }

  for (const tx of extraction.transacoes) {
    if (!isValidDate(tx.data)) {
      return { ok: false, motivo: "Datas de transação inválidas ou incompletas" };
    }
    if (!Number.isFinite(tx.valor) || tx.valor <= 0) {
      return { ok: false, motivo: "Valores de transação inválidos" };
    }
    if (tx.tipo !== "C" && tx.tipo !== "D") {
      return { ok: false, motivo: "Tipo de transação inválido" };
    }
  }

  const competencia = inferCompetencia(extraction);
  if (competencia) {
    const inCompetencia = extraction.transacoes.filter(
      (tx) => tx.data.slice(0, 7) === competencia
    ).length;
    const ratio = inCompetencia / extraction.transacoes.length;
    if (ratio < 0.8) {
      return {
        ok: false,
        motivo: "Menos de 80% das transações dentro da competência inferida",
      };
    }
  }

  if (extraction.saldo_inicial == null || extraction.saldo_final == null) {
    return { ok: false, motivo: "Saldos não identificados" };
  }

  const movimento = extraction.transacoes.reduce(
    (sum, tx) => sum + signedValue(tx.valor, tx.tipo),
    0
  );
  const delta =
    Number(extraction.saldo_final) - Number(extraction.saldo_inicial);
  const diff = Math.abs(delta - movimento);

  if (diff > SALDO_TOLERANCE) {
    return {
      ok: false,
      motivo: `Saldos não fecham (diferença R$ ${diff.toFixed(2)})`,
    };
  }

  return { ok: true };
}
