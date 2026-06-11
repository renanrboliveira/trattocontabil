import { extractPdf, getPdfModelFallback, getPdfModelPrimary } from "@/lib/pdf/extract";
import type { PdfConversionResult } from "@/lib/pdf/types";
import { validatePdfExtraction } from "@/lib/pdf/validate";

export async function convertPdfWithCascade(
  buffer: Buffer
): Promise<PdfConversionResult> {
  const models = [getPdfModelPrimary()];
  const fallback = getPdfModelFallback();
  if (fallback && fallback !== models[0]) {
    models.push(fallback);
  }

  let bestAttempt: PdfConversionResult["best"] | null = null;

  for (const model of models) {
    const { extraction, usage } = await extractPdf(buffer, model);
    const validation = validatePdfExtraction(extraction);
    const attempt = {
      extraction,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      validation,
    };

    if (!bestAttempt) {
      bestAttempt = attempt;
    } else if (
      validation.ok ||
      (attempt.extraction.transacoes.length >
        bestAttempt.extraction.transacoes.length &&
        !bestAttempt.validation.ok)
    ) {
      bestAttempt = attempt;
    }

    if (validation.ok) {
      return {
        best: attempt,
        attempts: models.indexOf(model) + 1,
        status: "convertido",
      };
    }
  }

  if (!bestAttempt) {
    throw new Error("Conversão PDF sem tentativas");
  }

  return {
    best: bestAttempt,
    attempts: models.length,
    status: "triagem",
    motivo: bestAttempt.validation.ok
      ? undefined
      : bestAttempt.validation.motivo,
  };
}
