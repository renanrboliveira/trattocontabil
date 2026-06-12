import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  buildTriagemIdempotencyKey,
  competenciaFromDate,
  hashFile,
  idempotencyScope,
  normalizeEmail,
  normalizePhone,
  parseCompetencia,
} from "./idempotency";

describe("hashFile", () => {
  it("produces stable hash for same content", () => {
    const a = hashFile(Buffer.from("extrato"));
    const b = hashFile(Buffer.from("extrato"));
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hash for different content", () => {
    const a = hashFile(Buffer.from("extrato-a"));
    const b = hashFile(Buffer.from("extrato-b"));
    expect(a).not.toBe(b);
  });
});

describe("buildIdempotencyKey", () => {
  it("formats full key with hash, cnpj, banco and competencia", () => {
    const key = buildIdempotencyKey({
      hash: "abc123",
      cnpj: "12345678000190",
      bancoCodigo: "341",
      competencia: "2026-07",
    });
    expect(key).toBe("abc123:12345678000190:341:2026-07");
  });
});

describe("buildTriagemIdempotencyKey", () => {
  it("prefixes triagem and uses scope instead of cnpj/banco", () => {
    const key = buildTriagemIdempotencyKey({
      hash: "abc123",
      competencia: "2026-07",
      scope: "5511999998888",
    });
    expect(key).toBe("triagem:abc123:5511999998888:2026-07");
    expect(key).not.toContain("341");
  });
});

describe("idempotencyScope", () => {
  it("prefers remetente over clienteId and canal", () => {
    expect(
      idempotencyScope({
        remetente: "55 11 99999 8888",
        clienteId: "uuid-1",
        canal: "whatsapp",
      })
    ).toBe("5511999998888");
  });

  it("uses clienteId when remetente is absent", () => {
    expect(
      idempotencyScope({ clienteId: "uuid-1", canal: "email" })
    ).toBe("cliente:uuid-1");
  });

  it("falls back to canal", () => {
    expect(idempotencyScope({ canal: "upload" })).toBe("upload");
  });

  it("strips whitespace from remetente", () => {
    expect(
      idempotencyScope({ remetente: " 55 11 98888 7777 ", canal: "whatsapp" })
    ).toBe("5511988887777");
  });
});

describe("normalizePhone", () => {
  it("strips BR mask, +55 and spaces", () => {
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("11 98765 4321")).toBe("11987654321");
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Contato@Empresa.COM  ")).toBe("contato@empresa.com");
  });
});

describe("competenciaFromDate / parseCompetencia", () => {
  it("round-trips with zero-padded month", () => {
    const date = new Date(2026, 0, 15);
    const comp = competenciaFromDate(date);
    expect(comp).toBe("2026-01");
    expect(parseCompetencia(comp)).toEqual({ ano: 2026, mes: 1 });
  });

  it("pads single-digit months", () => {
    const date = new Date(2026, 8, 1);
    expect(competenciaFromDate(date)).toBe("2026-09");
    expect(parseCompetencia("2026-09")).toEqual({ ano: 2026, mes: 9 });
  });

  it("returns null for out-of-range month", () => {
    expect(parseCompetencia("2026-13")).toBeNull();
    expect(parseCompetencia("2026-00")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseCompetencia("invalid")).toBeNull();
    expect(parseCompetencia("")).toBeNull();
  });
});
