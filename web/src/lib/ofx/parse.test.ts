import { readFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyExtratoFile,
  inferCompetencia,
  isPdfFile,
  parseOfx,
  type ParsedOfx,
} from "./parse";

const fixturesDir = path.join(__dirname, "../../../fixtures");

function loadFixture(name: string): Buffer {
  return readFileSync(path.join(fixturesDir, name));
}

describe("parseOfx", () => {
  it("parses multi-transaction OFX with bank, account, dates, values, C/D and FITID", () => {
    const result = parseOfx(loadFixture("ofx-multi.ofx"));

    expect(result.bancoCodigo).toBe("341");
    expect(result.contaRef).toBe("12345-6");
    expect(result.dtStart).toBe("2026-07-01");
    expect(result.dtEnd).toBe("2026-07-31");
    expect(result.transacoes).toHaveLength(2);

    expect(result.transacoes[0]).toEqual({
      data: "2026-07-05",
      valor: 150,
      descricao: "PIX ENVIADO",
      tipo: "D",
      fitid: "tx-001",
    });
    expect(result.transacoes[1]).toEqual({
      data: "2026-07-10",
      valor: 2500,
      descricao: "TED RECEBIDA",
      tipo: "C",
      fitid: "tx-002",
    });
  });

  it("handles single STMTTRN object via toArray", () => {
    const result = parseOfx(loadFixture("ofx-single.ofx"));

    expect(result.transacoes).toHaveLength(1);
    expect(result.transacoes[0]).toMatchObject({
      data: "2026-03-15",
      valor: 500,
      tipo: "C",
      fitid: "single-001",
    });
  });

  it("throws when STMTRS is missing", () => {
    expect(() => parseOfx(loadFixture("ofx-sem-stmtrs.ofx"))).toThrow(
      "OFX inválido: STMTRS não encontrado"
    );
  });

  it("parses SGML-style OFX with headers and unclosed tags", () => {
    const result = parseOfx(loadFixture("ofx-sgml.ofx"));

    expect(result.bancoCodigo).toBe("237");
    expect(result.transacoes[0].data).toBe("2026-01-31");
    expect(result.transacoes[0].tipo).toBe("D");
    expect(result.transacoes[0].valor).toBe(75.5);
  });

  it("parseOfxDate handles timezone suffix and short date fallback", () => {
    const result = parseOfx(loadFixture("ofx-sgml.ofx"));

    expect(result.transacoes[0].data).toBe("2026-01-31");
    expect(result.transacoes[1].data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("inferCompetencia", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses dtEnd when present", () => {
    const ofx: ParsedOfx = {
      dtEnd: "2026-07-31",
      transacoes: [{ data: "2026-01-01", valor: 1, descricao: "x", tipo: "C" }],
    };
    expect(inferCompetencia(ofx)).toBe("2026-07");
  });

  it("uses last transaction when dtEnd is absent", () => {
    const ofx: ParsedOfx = {
      transacoes: [
        { data: "2026-03-01", valor: 1, descricao: "a", tipo: "C" },
        { data: "2026-05-20", valor: 2, descricao: "b", tipo: "D" },
      ],
    };
    expect(inferCompetencia(ofx)).toBe("2026-05");
  });

  it("falls back to current month when no dtEnd or transactions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    expect(inferCompetencia({ transacoes: [] })).toBe("2026-06");
  });
});

describe("classifyExtratoFile", () => {
  const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF", "latin1");

  it("classifies PDF by magic bytes even with generic mime", () => {
    expect(
      classifyExtratoFile("extrato.pdf", "application/octet-stream", pdfBuffer)
    ).toBe("pdf");
  });

  it("classifies PDF by magic bytes without extension or mime", () => {
    expect(classifyExtratoFile("documento", null, pdfBuffer)).toBe("pdf");
  });

  it("classifies OFX by content even with generic mime and no extension", () => {
    expect(
      classifyExtratoFile(
        "extrato",
        "application/octet-stream",
        loadFixture("ofx-multi.ofx")
      )
    ).toBe("ofx");
  });

  it("falls back to extension/mime when content is inconclusive", () => {
    expect(classifyExtratoFile("extrato.ofx", null, Buffer.from(""))).toBe(
      "ofx"
    );
    expect(classifyExtratoFile("extrato.QFX", null, Buffer.from(""))).toBe(
      "ofx"
    );
    expect(
      classifyExtratoFile("extrato.txt", "application/x-ofx", Buffer.from(""))
    ).toBe("ofx");
    expect(classifyExtratoFile("extrato.pdf", null, Buffer.from(""))).toBe(
      "pdf"
    );
  });

  it("returns null for unknown content with generic mime", () => {
    expect(
      classifyExtratoFile(
        "dados.bin",
        "application/octet-stream",
        Buffer.from("conteudo qualquer")
      )
    ).toBeNull();
  });
});

describe("isPdfFile", () => {
  it("detects PDF by extension and MIME", () => {
    expect(isPdfFile("extrato.pdf")).toBe(true);
    expect(isPdfFile("extrato.PDF")).toBe(true);
    expect(isPdfFile("extrato.bin", "application/pdf")).toBe(true);
    expect(isPdfFile("extrato.ofx")).toBe(false);
  });
});
