import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./verify-signature";

describe("verifyMetaSignature", () => {
  const originalSecret = process.env.WHATSAPP_APP_SECRET;

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.WHATSAPP_APP_SECRET;
    } else {
      process.env.WHATSAPP_APP_SECRET = originalSecret;
    }
  });

  function sign(payload: string): string {
    return `sha256=${crypto
      .createHmac("sha256", "test-secret")
      .update(payload)
      .digest("hex")}`;
  }

  it("accepts valid signature", () => {
    const payload = '{"entry":[]}';
    expect(verifyMetaSignature(payload, sign(payload))).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyMetaSignature('{"entry":[]}', "sha256=deadbeef")).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyMetaSignature('{"entry":[]}', null)).toBe(false);
  });

  it("rejects wrong-length signature", () => {
    expect(verifyMetaSignature('{"entry":[]}', "sha256=short")).toBe(false);
  });

  it("fail-closed when secret is missing", () => {
    delete process.env.WHATSAPP_APP_SECRET;
    expect(verifyMetaSignature('{"entry":[]}', sign('{"entry":[]}'))).toBe(
      false
    );
  });
});
