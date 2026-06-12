import { describe, expect, it } from "vitest";
import { renderCobrancaMensagem } from "./template";

describe("renderCobrancaMensagem", () => {
  it("returns variables in Meta template order with bank list separator", () => {
    const { variables, mensagem } = renderCobrancaMensagem({
      contatoNome: "Maria",
      escritorioNome: "Contábil XYZ",
      competenciaAno: 2026,
      competenciaMes: 6,
      bancos: [
        { banco_codigo: "341", banco_nome: "Itaú" },
        { banco_codigo: "237", banco_nome: "Bradesco" },
      ],
      emailInbound: "extratos@xyz.com",
    });

    expect(variables).toEqual([
      "Maria",
      "Contábil XYZ",
      "jun/2026",
      "Itaú · Bradesco",
      "extratos@xyz.com",
    ]);
    expect(mensagem).toContain("Olá Maria, aqui é do Contábil XYZ.");
    expect(mensagem).toContain("Pendências de extrato bancário (jun/2026):");
    expect(mensagem).toContain("Itaú · Bradesco");
    expect(mensagem).toContain("extratos@xyz.com");
  });

  it('falls back to "seu contador" when email is absent', () => {
    const { variables, mensagem } = renderCobrancaMensagem({
      contatoNome: "João",
      escritorioNome: "Escritório ABC",
      competenciaAno: 2025,
      competenciaMes: 12,
      bancos: [{ banco_codigo: "001", banco_nome: "BB" }],
      emailInbound: null,
    });

    expect(variables[4]).toBe("seu contador");
    expect(mensagem).toContain("para seu contador.");
  });
});
