import type { PdfExtraction } from "@/lib/pdf/types";
import { validatePdfExtraction } from "@/lib/pdf/validate";

export type GabaritoTransacao = {
  data: string;
  valor: number;
  tipo: "C" | "D";
  descricao: string;
};

export type Gabarito = {
  banco_nome?: string;
  banco_codigo_febraban?: string | null;
  competencia?: string | null;
  saldo_inicial?: number | null;
  saldo_final?: number | null;
  transacoes: GabaritoTransacao[];
};

export type EvalExtratoResult = "Pass" | "Pass-with-triage" | "Fail";

export type EvalExtratoReport = {
  file: string;
  banco: string;
  model: string;
  validationOk: boolean;
  validationMotivo?: string;
  result: EvalExtratoResult;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  costBrl: number;
};

function txKey(tx: GabaritoTransacao): string {
  return `${tx.data}|${tx.tipo}|${tx.valor.toFixed(2)}|${tx.descricao.trim().toLowerCase()}`;
}

function countFieldErrors(
  extraction: PdfExtraction,
  gabarito: Gabarito
): number {
  let errors = 0;
  const expected = gabarito.transacoes.map(txKey);
  const actual = extraction.transacoes.map(txKey);

  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  for (const key of expectedSet) {
    if (!actualSet.has(key)) errors += 1;
  }

  for (const key of actualSet) {
    if (!expectedSet.has(key)) errors += 1;
  }

  if (
    gabarito.saldo_inicial != null &&
    extraction.saldo_inicial != null &&
    Math.abs(gabarito.saldo_inicial - extraction.saldo_inicial) > 0.01
  ) {
    errors += 1;
  }

  if (
    gabarito.saldo_final != null &&
    extraction.saldo_final != null &&
    Math.abs(gabarito.saldo_final - extraction.saldo_final) > 0.01
  ) {
    errors += 1;
  }

  return errors;
}

export function classifyEvalResult(
  extraction: PdfExtraction,
  gabarito: Gabarito,
  validationOk: boolean
): { result: EvalExtratoResult; errors: number } {
  const errors = countFieldErrors(extraction, gabarito);

  if (errors === 0 && validationOk) {
    return { result: "Pass", errors };
  }

  const validation = validatePdfExtraction(extraction);
  if (!validationOk && errors === 0 && validation.ok === false) {
    return { result: "Pass-with-triage", errors: 1 };
  }

  if (errors === 0 && validationOk) {
    return { result: "Pass", errors };
  }

  if (errors > 0 && errors <= 2 && !validationOk) {
    return { result: "Pass-with-triage", errors };
  }

  return { result: "Fail", errors };
}

const MODEL_PRICING_USD_PER_MTOK = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
} as const;

const FX_BRL = 5.15;

export function estimateCostBrl(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing =
    MODEL_PRICING_USD_PER_MTOK[
      model as keyof typeof MODEL_PRICING_USD_PER_MTOK
    ] ?? MODEL_PRICING_USD_PER_MTOK["claude-sonnet-4-6"];

  const usd =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;

  return usd * FX_BRL;
}
