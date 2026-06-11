import type { PdfGuardResult } from "@/lib/pdf/types";

const MAX_BYTES = 30 * 1024 * 1024;
const MAX_PAGES = 100;

export function checkPdfGuards(buffer: Buffer): PdfGuardResult {
  if (buffer.length > MAX_BYTES) {
    return {
      ok: false,
      motivo: "PDF excede 30MB — limite da API de conversão",
    };
  }

  const raw = buffer.toString("latin1");
  if (/\/Encrypt\b/.test(raw)) {
    return {
      ok: false,
      motivo:
        "PDF protegido por senha — pedir reenvio sem senha",
    };
  }

  const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches?.length ?? 0;
  if (pageCount > MAX_PAGES) {
    return {
      ok: false,
      motivo: `PDF excede ${MAX_PAGES} páginas — limite da API de conversão`,
    };
  }

  return { ok: true };
}
