import crypto from "crypto";

export function verifyMetaSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  // Fail closed: sem secret configurado, nenhuma requisição é aceita.
  if (!secret) return false;
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
