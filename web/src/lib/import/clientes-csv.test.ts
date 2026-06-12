import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  groupRowsByCnpj,
  normalizeCnpj,
  previewClientesCsv,
} from "./clientes-csv";

const fixturesDir = path.join(__dirname, "../../../fixtures");

describe("normalizeCnpj", () => {
  it("strips mask from formatted CNPJ", () => {
    expect(normalizeCnpj("12.345.678/0001-90")).toBe("12345678000190");
  });

  it("keeps unmasked 14 digits", () => {
    expect(normalizeCnpj("12345678000190")).toBe("12345678000190");
  });

  it("returns partial digits for invalid input", () => {
    expect(normalizeCnpj("123")).toBe("123");
  });
});

describe("previewClientesCsv", () => {
  it("parses valid CSV with normalization", () => {
    const content = readFileSync(
      path.join(fixturesDir, "clientes-valido.csv"),
      "utf-8"
    );
    const preview = previewClientesCsv(content);

    expect(preview.errors).toHaveLength(0);
    expect(preview.stats.validLines).toBe(3);
    expect(preview.stats.uniqueClientes).toBe(2);
    expect(preview.stats.bancoRows).toBe(3);
    expect(preview.rows[0].email).toBe("contato@alpha.com");
    expect(preview.rows[0].telefone).toBe("11987654321");
    expect(preview.rows[0].regua_opt_in).toBe(true);
  });

  it("reports missing required columns", () => {
    const preview = previewClientesCsv("razao_social,telefone\nEmpresa,11999");
    expect(preview.rows).toHaveLength(0);
    expect(preview.errors[0].message).toContain("cnpj");
  });

  it("reports invalid lines and still parses valid ones from mixed file", () => {
    const content = readFileSync(
      path.join(fixturesDir, "clientes-invalido.csv"),
      "utf-8"
    );
    const preview = previewClientesCsv(content);

    expect(preview.errors.some((e) => e.message.includes("CNPJ inválido"))).toBe(
      true
    );
    expect(preview.rows.filter((r) => r.cnpj === "12345678000190")).toHaveLength(
      2
    );
  });
});

describe("groupRowsByCnpj", () => {
  it("groups multiple banks under same client", () => {
    const content = readFileSync(
      path.join(fixturesDir, "clientes-valido.csv"),
      "utf-8"
    );
    const { rows } = previewClientesCsv(content);
    const grouped = groupRowsByCnpj(rows);

    const alpha = grouped.get("12345678000190");
    expect(alpha?.bancos).toHaveLength(2);
    expect(alpha?.bancos.map((b) => b.banco_codigo).sort()).toEqual([
      "237",
      "341",
    ]);
  });
});
