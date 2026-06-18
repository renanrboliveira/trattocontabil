import { describe, expect, it } from "vitest";
import {
  buildCobrancaMap,
  formatCobrancaResumo,
  type CobrancaResumoInput,
} from "./resumo";

function row(
  overrides: Partial<CobrancaResumoInput> &
    Pick<CobrancaResumoInput, "status" | "tentativa">
): CobrancaResumoInput {
  return {
    cliente_id: "c1",
    sent_at: null,
    created_at: "2026-06-17T22:58:00Z",
    ...overrides,
  };
}

const noOptOut = new Map<string, boolean>();

describe("buildCobrancaMap", () => {
  it("counts duplicate sends of the same tentativa once (regression)", () => {
    const rows: CobrancaResumoInput[] = [
      row({ status: "dry_run", tentativa: 1, created_at: "2026-06-12T00:36:00Z" }),
      row({ status: "falha", tentativa: 1, created_at: "2026-06-12T01:12:00Z" }),
      row({ status: "enviada", tentativa: 1, created_at: "2026-06-17T22:58:00Z" }),
      row({ status: "enviada", tentativa: 1, created_at: "2026-06-18T00:34:00Z" }),
    ];
    expect(buildCobrancaMap(rows, noOptOut).get("c1")?.tentativas).toBe(1);
  });

  it("does not count dry_run as cobrado", () => {
    const rows = [row({ status: "dry_run", tentativa: 1 })];
    expect(buildCobrancaMap(rows, noOptOut).get("c1")).toBeUndefined();
  });

  it("counts distinct enviada tentativas", () => {
    const rows = [
      row({ status: "enviada", tentativa: 1 }),
      row({ status: "enviada", tentativa: 2 }),
    ];
    expect(buildCobrancaMap(rows, noOptOut).get("c1")?.tentativas).toBe(2);
  });

  it("flags opt-out even without cobranças", () => {
    const optOut = new Map([["c1", true]]);
    const resumo = buildCobrancaMap([], optOut).get("c1");
    expect(resumo?.optOut).toBe(true);
    expect(formatCobrancaResumo(resumo)).toBe("opt-out");
  });
});

describe("formatCobrancaResumo", () => {
  it("renders count with last date", () => {
    expect(
      formatCobrancaResumo({
        tentativas: 2,
        ultima: "2026-06-17T22:58:00Z",
        optOut: false,
      })
    ).toBe("Cobrado 2× · última 17/06");
  });

  it("returns null when nothing was sent", () => {
    expect(
      formatCobrancaResumo({ tentativas: 0, ultima: null, optOut: false })
    ).toBeNull();
  });
});
