import { describe, expect, it } from "vitest";
import {
  competenciaCobrada,
  dentroJanelaRegua,
  isDiaLembrete,
  normalizeOptOutText,
} from "./dates";

describe("competenciaCobrada", () => {
  it("charges previous December when current month is January", () => {
    const janeiro = new Date(Date.UTC(2026, 0, 15));
    expect(competenciaCobrada(janeiro)).toEqual({ ano: 2025, mes: 12 });
  });

  it("charges previous month within same year", () => {
    const julho = new Date(Date.UTC(2026, 6, 10));
    expect(competenciaCobrada(julho)).toEqual({ ano: 2026, mes: 6 });
  });
});

describe("dentroJanelaRegua", () => {
  it("is true on days 1 through 10 UTC", () => {
    expect(dentroJanelaRegua(new Date(Date.UTC(2026, 5, 1)))).toBe(true);
    expect(dentroJanelaRegua(new Date(Date.UTC(2026, 5, 10)))).toBe(true);
    expect(dentroJanelaRegua(new Date(Date.UTC(2026, 5, 11)))).toBe(false);
  });
});

describe("isDiaLembrete", () => {
  it("matches reminder days 1, 4 and 8 in UTC", () => {
    expect(isDiaLembrete(new Date(Date.UTC(2026, 5, 1)))).toBe(true);
    expect(isDiaLembrete(new Date(Date.UTC(2026, 5, 4)))).toBe(true);
    expect(isDiaLembrete(new Date(Date.UTC(2026, 5, 8)))).toBe(true);
    expect(isDiaLembrete(new Date(Date.UTC(2026, 5, 2)))).toBe(false);
    expect(isDiaLembrete(new Date(Date.UTC(2026, 5, 10)))).toBe(false);
  });
});

describe("normalizeOptOutText", () => {
  it("normalizes PARAR variants with accents and spacing", () => {
    expect(normalizeOptOutText("PARAR")).toBe("parar");
    expect(normalizeOptOutText(" parar ")).toBe("parar");
    expect(normalizeOptOutText("PÁRAR")).toBe("parar");
  });
});
