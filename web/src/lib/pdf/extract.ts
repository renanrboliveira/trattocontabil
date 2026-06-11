import Anthropic from "@anthropic-ai/sdk";
import type { PdfExtraction, PdfExtractionResult } from "@/lib/pdf/types";
import {
  PDF_EXTRACTION_INSTRUCTION,
  PDF_EXTRACTION_JSON_SCHEMA,
} from "@/lib/pdf/schema";

const DEFAULT_PRIMARY_MODEL = "claude-sonnet-4-6";
const DEFAULT_FALLBACK_MODEL = "claude-opus-4-8";

export function getPdfModelPrimary(): string {
  return process.env.PDF_MODEL_PRIMARY ?? DEFAULT_PRIMARY_MODEL;
}

export function getPdfModelFallback(): string | null {
  const value = process.env.PDF_MODEL_FALLBACK;
  if (value === undefined) return DEFAULT_FALLBACK_MODEL;
  if (value.trim() === "") return null;
  return value.trim();
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ausente");
  }
  return new Anthropic({ apiKey });
}

function parseExtraction(text: string): PdfExtraction {
  const parsed = JSON.parse(text) as PdfExtraction;
  return {
    ...parsed,
    transacoes: parsed.transacoes ?? [],
  };
}

function supportsAdaptiveThinking(model: string): boolean {
  return /claude-(sonnet|opus)-4/.test(model);
}

export async function extractPdf(
  buffer: Buffer,
  model = getPdfModelPrimary()
): Promise<PdfExtractionResult> {
  const client = getClient();
  const data = buffer.toString("base64");

  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data,
            },
          },
          {
            type: "text",
            text: PDF_EXTRACTION_INSTRUCTION,
          },
        ],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: PDF_EXTRACTION_JSON_SCHEMA,
      },
    },
    ...(supportsAdaptiveThinking(model)
      ? {
          thinking: {
            type: "adaptive" as const,
          },
        }
      : {}),
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta da API sem conteúdo JSON");
  }

  return {
    extraction: parseExtraction(textBlock.text),
    usage: {
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}
