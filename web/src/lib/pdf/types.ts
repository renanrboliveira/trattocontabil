export type PdfTransacao = {
  data: string;
  valor: number;
  tipo: "C" | "D";
  descricao: string;
};

export type PdfExtraction = {
  banco_nome: string;
  banco_codigo_febraban: string | null;
  conta_ref: string | null;
  competencia: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  escaneado: boolean;
  ilegivel: boolean;
  transacoes: PdfTransacao[];
};

export type PdfExtractionUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type PdfExtractionResult = {
  extraction: PdfExtraction;
  usage: PdfExtractionUsage;
};

export type PdfGuardResult =
  | { ok: true }
  | { ok: false; motivo: string };

export type PdfValidationResult =
  | { ok: true }
  | { ok: false; motivo: string };

export type PdfConversionAttempt = {
  extraction: PdfExtraction;
  model: string;
  inputTokens: number;
  outputTokens: number;
  validation: PdfValidationResult;
};

export type PdfConversionResult = {
  best: PdfConversionAttempt;
  attempts: number;
  status: "convertido" | "triagem";
  motivo?: string;
};
