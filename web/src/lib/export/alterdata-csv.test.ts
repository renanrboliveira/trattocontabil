import { describe, expect, it } from "vitest";
import {
  alterdataExportFilename,
  generateAlterdataCsvV1,
} from "./alterdata-csv";

describe("generateAlterdataCsvV1", () => {
  it("formats date DD/MM/YYYY, decimal with comma, BOM and CRLF", () => {
    const csv = generateAlterdataCsvV1([
      {
        data: "2026-07-15",
        valor: 1234.5,
        descricao: "PIX RECEBIDO",
        tipo: "C",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain("Data;Histórico;Valor;Tipo");
    expect(csv).toContain("15/07/2026;PIX RECEBIDO;1234,50;C");
  });

  it("replaces semicolon in historico and truncates at 200 chars", () => {
    const longDesc = `${"A".repeat(195)};extra`;
    const csv = generateAlterdataCsvV1([
      {
        data: "2026-01-01",
        valor: 10,
        descricao: longDesc,
        tipo: "D",
      },
    ]);

    const line = csv.split("\r\n")[1];
    const historico = line.split(";")[1];
    expect(historico).not.toContain(";");
    expect(historico.length).toBeLessThanOrEqual(200);
    expect(historico.endsWith("extra")).toBe(false);
  });
});

describe("alterdataExportFilename", () => {
  it("builds filename with cnpj, banco and competencia", () => {
    expect(
      alterdataExportFilename({
        cnpj: "12.345.678/0001-90",
        bancoCodigo: "341",
        competencia: { ano: 2026, mes: 7 },
      })
    ).toBe("alterdata-12345678000190-341-2026-07.csv");
  });

  it("uses defaults when optional fields are missing", () => {
    expect(alterdataExportFilename({})).toBe(
      "alterdata-extrato-banco-comp.csv"
    );
  });
});
