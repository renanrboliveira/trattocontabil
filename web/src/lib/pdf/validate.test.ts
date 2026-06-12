import { describe, expect, it } from "vitest";
import type { PdfExtraction } from "@/lib/pdf/types";
import { validatePdfExtraction } from "./validate";

function baseExtraction(
  overrides: Partial<PdfExtraction> = {}
): PdfExtraction {
  return {
    banco_nome: "Itaú",
    banco_codigo_febraban: "341",
    conta_ref: "12345",
    competencia: "2026-07",
    saldo_inicial: 1000,
    saldo_final: 1150,
    escaneado: false,
    ilegivel: false,
    transacoes: [
      { data: "2026-07-05", valor: 200, tipo: "C", descricao: "TED" },
      { data: "2026-07-10", valor: 50, tipo: "D", descricao: "TARIFA" },
    ],
    ...overrides,
  };
}

describe("validatePdfExtraction", () => {
  it("rejects scanned PDF", () => {
    const result = validatePdfExtraction(baseExtraction({ escaneado: true }));
    expect(result).toEqual({
      ok: false,
      motivo: "PDF escaneado — qualidade insuficiente para conversão automática",
    });
  });

  it("rejects illegible PDF", () => {
    const result = validatePdfExtraction(baseExtraction({ ilegivel: true }));
    expect(result).toMatchObject({
      ok: false,
      motivo: expect.stringContaining("ilegível"),
    });
  });

  it("rejects zero transactions", () => {
    const result = validatePdfExtraction(baseExtraction({ transacoes: [] }));
    expect(result).toEqual({
      ok: false,
      motivo: "Nenhuma transação identificada no PDF",
    });
  });

  it("rejects invalid date including 2026-02-30", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        transacoes: [
          { data: "2026-02-30", valor: 100, tipo: "C", descricao: "X" },
        ],
      })
    );
    expect(result).toEqual({
      ok: false,
      motivo: "Datas de transação inválidas ou incompletas",
    });
  });

  it("rejects zero or negative values", () => {
    expect(
      validatePdfExtraction(
        baseExtraction({
          transacoes: [
            { data: "2026-07-01", valor: 0, tipo: "C", descricao: "X" },
          ],
        })
      ).ok
    ).toBe(false);
    expect(
      validatePdfExtraction(
        baseExtraction({
          transacoes: [
            { data: "2026-07-01", valor: -10, tipo: "D", descricao: "X" },
          ],
        })
      ).ok
    ).toBe(false);
  });

  it("rejects invalid transaction type", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        transacoes: [
          {
            data: "2026-07-01",
            valor: 100,
            tipo: "X" as "C",
            descricao: "X",
          },
        ],
      })
    );
    expect(result).toEqual({
      ok: false,
      motivo: "Tipo de transação inválido",
    });
  });

  it("rejects when below 80% competencia threshold", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        competencia: "2026-07",
        transacoes: [
          { data: "2026-07-01", valor: 100, tipo: "C", descricao: "A" },
          { data: "2026-07-02", valor: 100, tipo: "C", descricao: "B" },
          { data: "2026-06-01", valor: 100, tipo: "D", descricao: "C" },
          { data: "2026-06-02", valor: 100, tipo: "D", descricao: "D" },
          { data: "2026-06-03", valor: 100, tipo: "D", descricao: "E" },
        ],
      })
    );
    expect(result).toEqual({
      ok: false,
      motivo: "Menos de 80% das transações dentro da competência inferida",
    });
  });

  it("accepts when exactly at 80% competencia threshold", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        competencia: "2026-07",
        saldo_inicial: 0,
        saldo_final: 300,
        transacoes: [
          { data: "2026-07-01", valor: 100, tipo: "C", descricao: "A" },
          { data: "2026-07-02", valor: 100, tipo: "C", descricao: "B" },
          { data: "2026-07-03", valor: 100, tipo: "C", descricao: "C" },
          { data: "2026-07-04", valor: 100, tipo: "C", descricao: "D" },
          { data: "2026-06-01", valor: 100, tipo: "D", descricao: "E" },
        ],
      })
    );
    expect(result.ok).toBe(true);
  });

  it("accepts balance within R$ 0.01 tolerance", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        saldo_inicial: 1000,
        saldo_final: 1150.005,
        transacoes: [
          { data: "2026-07-05", valor: 200, tipo: "C", descricao: "TED" },
          { data: "2026-07-10", valor: 50, tipo: "D", descricao: "TARIFA" },
        ],
      })
    );
    expect(result.ok).toBe(true);
  });

  it("rejects balance outside R$ 0.01 tolerance", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        saldo_inicial: 1000,
        saldo_final: 1200,
        transacoes: [
          { data: "2026-07-05", valor: 200, tipo: "C", descricao: "TED" },
          { data: "2026-07-10", valor: 50, tipo: "D", descricao: "TARIFA" },
        ],
      })
    );
    expect(result).toMatchObject({
      ok: false,
      motivo: expect.stringMatching(/Saldos não fecham/),
    });
  });

  it("infers competencia by mode of transaction months", () => {
    const result = validatePdfExtraction(
      baseExtraction({
        competencia: null,
        saldo_inicial: 0,
        saldo_final: 300,
        transacoes: [
          { data: "2026-08-01", valor: 100, tipo: "C", descricao: "A" },
          { data: "2026-08-02", valor: 100, tipo: "C", descricao: "B" },
          { data: "2026-08-03", valor: 100, tipo: "C", descricao: "C" },
          { data: "2026-08-04", valor: 100, tipo: "C", descricao: "D" },
          { data: "2026-07-31", valor: 100, tipo: "D", descricao: "E" },
        ],
      })
    );
    expect(result.ok).toBe(true);
  });
});
