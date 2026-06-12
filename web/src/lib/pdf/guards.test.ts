import { describe, expect, it } from "vitest";
import { checkPdfGuards } from "./guards";

const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
trailer<</Size 4/Root 1 0 R>>
startxref
%%EOF`,
  "latin1"
);

describe("checkPdfGuards", () => {
  it("accepts minimal valid PDF buffer", () => {
    expect(checkPdfGuards(MINIMAL_PDF)).toEqual({ ok: true });
  });

  it("rejects encrypted PDF", () => {
    const encrypted = Buffer.from(
      `%PDF-1.4
/Encrypt /Filter /Standard
1 0 obj<</Type/Catalog>>endobj
%%EOF`,
      "latin1"
    );
    const result = checkPdfGuards(encrypted);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.motivo).toContain("senha");
  });

  it("rejects oversized PDF", () => {
    const huge = Buffer.alloc(31 * 1024 * 1024, 0x25);
    const result = checkPdfGuards(huge);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.motivo).toContain("30MB");
  });
});
