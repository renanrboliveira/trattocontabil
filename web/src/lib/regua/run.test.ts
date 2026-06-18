import { describe, expect, it } from "vitest";
import { calcularTentativa, type CobrancaExistente } from "./run";

function cobranca(
  overrides: Partial<CobrancaExistente> & Pick<CobrancaExistente, "tentativa" | "status" | "created_at">
): CobrancaExistente {
  return {
    id: crypto.randomUUID(),
    cliente_id: "c1",
    competencia_id: "comp1",
    ...overrides,
  };
}

const HOJE = new Date("2026-06-18T12:00:00Z");
const ONTEM = "2026-06-17T22:58:00Z";
const ANTEONTEM = "2026-06-12T01:00:00Z";

describe("calcularTentativa", () => {
  it("returns 1 for a client with no cobranças", () => {
    expect(calcularTentativa([], HOJE)).toBe(1);
  });

  it("advances to 2 the day after a successful send (cadência)", () => {
    const cobrancas = [
      cobranca({ tentativa: 1, status: "enviada", created_at: ONTEM }),
    ];
    expect(calcularTentativa(cobrancas, HOJE)).toBe(2);
  });

  it("does NOT re-send a tentativa that already succeeded, even with leftover falhas (regression)", () => {
    // Dados reais do bug: tudo tentativa 1, falhas antigas + 1 envio real.
    const cobrancas = [
      cobranca({ tentativa: 1, status: "dry_run", created_at: ANTEONTEM }),
      cobranca({ tentativa: 1, status: "falha", created_at: ANTEONTEM }),
      cobranca({ tentativa: 1, status: "falha", created_at: ANTEONTEM }),
      cobranca({ tentativa: 1, status: "enviada", created_at: ONTEM }),
    ];
    // forçar (cobrar agora) NÃO pode reenviar tentativa 1; avança para 2.
    expect(calcularTentativa(cobrancas, HOJE, true)).toBe(2);
    // cron (não forçado) idem.
    expect(calcularTentativa(cobrancas, HOJE, false)).toBe(2);
  });

  it("retries a genuinely failed tentativa that never succeeded", () => {
    const cobrancas = [
      cobranca({ tentativa: 1, status: "falha", created_at: ANTEONTEM }),
    ];
    expect(calcularTentativa(cobrancas, HOJE)).toBe(1);
  });

  it("returns null after 3 distinct successful tentativas", () => {
    const cobrancas = [
      cobranca({ tentativa: 1, status: "enviada", created_at: "2026-06-01T10:00:00Z" }),
      cobranca({ tentativa: 2, status: "enviada", created_at: "2026-06-08T10:00:00Z" }),
      cobranca({ tentativa: 3, status: "enviada", created_at: "2026-06-15T10:00:00Z" }),
    ];
    expect(calcularTentativa(cobrancas, HOJE)).toBeNull();
  });

  it("does NOT inflate the count from duplicate rows of the same tentativa", () => {
    // 3 linhas enviada mas todas tentativa 1 => ainda há tentativas 2 e 3 disponíveis.
    const cobrancas = [
      cobranca({ tentativa: 1, status: "enviada", created_at: "2026-06-01T10:00:00Z" }),
      cobranca({ tentativa: 1, status: "enviada", created_at: "2026-06-02T10:00:00Z" }),
      cobranca({ tentativa: 1, status: "enviada", created_at: "2026-06-03T10:00:00Z" }),
    ];
    expect(calcularTentativa(cobrancas, HOJE)).toBe(2);
  });

  it("blocks a second send on the same day", () => {
    const cobrancas = [
      cobranca({ tentativa: 1, status: "enviada", created_at: "2026-06-18T08:00:00Z" }),
    ];
    expect(calcularTentativa(cobrancas, HOJE, true)).toBeNull();
    expect(calcularTentativa(cobrancas, HOJE, false)).toBeNull();
  });
});
