import { describe, expect, it } from "vitest";
import type { PdfExtraction } from "@/lib/pdf/types";
import { classifyEvalResult, estimateCostBrl } from "./eval-compare";
import type { Gabarito } from "./eval-compare";

function extraction(overrides: Partial<PdfExtraction> = {}): PdfExtraction {
  return {
    banco_nome: "Itaú",
    banco_codigo_febraban: "341",
    conta_ref: null,
    competencia: "2026-07",
    saldo_inicial: 1000,
    saldo_final: 1100,
    escaneado: false,
    ilegivel: false,
    transacoes: [
      { data: "2026-07-01", valor: 100, tipo: "C", descricao: "TED" },
    ],
    ...overrides,
  };
}

const gabarito: Gabarito = {
  saldo_inicial: 1000,
  saldo_final: 1100,
  transacoes: [
    { data: "2026-07-01", valor: 100, tipo: "C", descricao: "TED" },
  ],
};

describe("classifyEvalResult", () => {
  it("returns Pass when extraction matches gabarito and validation ok", () => {
    const result = classifyEvalResult(extraction(), gabarito, true);
    expect(result).toEqual({ result: "Pass", errors: 0 });
  });

  it("returns Pass-with-triage for validation failure with zero field errors", () => {
    const result = classifyEvalResult(
      extraction({ saldo_final: 999 }),
      gabarito,
      false
    );
    expect(result.result).toBe("Pass-with-triage");
  });

  it("returns Fail for many field errors", () => {
    const result = classifyEvalResult(
      extraction({
        transacoes: [
          { data: "2026-07-01", valor: 50, tipo: "D", descricao: "X" },
          { data: "2026-07-02", valor: 60, tipo: "D", descricao: "Y" },
          { data: "2026-07-03", valor: 70, tipo: "D", descricao: "Z" },
        ],
      }),
      gabarito,
      false
    );
    expect(result.result).toBe("Fail");
    expect(result.errors).toBeGreaterThan(2);
  });
});

describe("estimateCostBrl", () => {
  it("computes BRL cost for known model pricing", () => {
    const cost = estimateCostBrl("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo((3 + 15) * 5.15, 2);
  });

  it("falls back to sonnet pricing for unknown model", () => {
    const known = estimateCostBrl("claude-sonnet-4-6", 1000, 1000);
    const unknown = estimateCostBrl("unknown-model", 1000, 1000);
    expect(unknown).toBe(known);
  });
});
