import { describe, expect, it } from "vitest";
import { compLabel, compParam, parseCompParam } from "./competencias";

describe("competencias", () => {
  it("compLabel formats MM/YYYY with zero-padded month", () => {
    expect(compLabel(2026, 3)).toBe("03/2026");
    expect(compLabel(2026, 12)).toBe("12/2026");
  });

  it("compParam formats YYYY-MM", () => {
    expect(compParam(2026, 7)).toBe("2026-07");
  });

  it("parseCompParam parses valid param and rejects invalid", () => {
    expect(parseCompParam("2026-07")).toEqual({ ano: 2026, mes: 7 });
    expect(parseCompParam(undefined)).toBeNull();
    expect(parseCompParam("2026-13")).toBeNull();
    expect(parseCompParam("invalid")).toBeNull();
  });
});
