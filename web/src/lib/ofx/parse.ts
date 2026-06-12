import { XMLParser } from "fast-xml-parser";

export type ParsedTransaction = {
  data: string;
  valor: number;
  descricao: string;
  tipo: "C" | "D";
  fitid?: string;
};

export type ParsedOfx = {
  bancoCodigo?: string;
  bancoNome?: string;
  contaRef?: string;
  dtStart?: string;
  dtEnd?: string;
  transacoes: ParsedTransaction[];
};

function stripOfxHeaders(content: string): string {
  const start = content.indexOf("<OFX");
  return start >= 0 ? content.slice(start) : content;
}

function normalizeOfxTag(content: string): string {
  return content.replace(/<(\w+?)>([^<\r\n]+)(?=\r?\n)/g, "<$1>$2</$1>");
}

function parseOfxDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 8) return new Date().toISOString().slice(0, 10);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseOfx(buffer: Buffer): ParsedOfx {
  const raw = buffer.toString("utf-8");
  const xml = normalizeOfxTag(stripOfxHeaders(raw));
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
  });

  const doc = parser.parse(xml);
  const stmt = doc?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
  if (!stmt) {
    throw new Error("OFX inválido: STMTRS não encontrado");
  }

  const bankId = stmt.BANKACCTFROM?.BANKID?.toString();
  const acctId = stmt.BANKACCTFROM?.ACCTID?.toString();
  const list = stmt.BANKTRANLIST;
  const entries = toArray(list?.STMTTRN);

  const transacoes: ParsedTransaction[] = entries.map((entry) => {
    const amount = Number(entry.TRNAMT);
    const tipo: "C" | "D" = amount >= 0 ? "C" : "D";
    return {
      data: parseOfxDate(String(entry.DTPOSTED ?? entry.DTUSER ?? "")),
      valor: Math.abs(amount),
      descricao: String(entry.MEMO ?? entry.NAME ?? "Sem descrição").trim(),
      tipo,
      fitid: entry.FITID ? String(entry.FITID) : undefined,
    };
  });

  return {
    bancoCodigo: bankId,
    bancoNome: bankId,
    contaRef: acctId,
    dtStart: list?.DTSTART ? parseOfxDate(String(list.DTSTART)) : undefined,
    dtEnd: list?.DTEND ? parseOfxDate(String(list.DTEND)) : undefined,
    transacoes,
  };
}

export function inferCompetencia(ofx: ParsedOfx): string {
  if (ofx.dtEnd) return ofx.dtEnd.slice(0, 7);
  if (ofx.transacoes.length > 0) {
    const last = ofx.transacoes[ofx.transacoes.length - 1].data;
    return last.slice(0, 7);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isPdfFile(filename: string, mime?: string | null): boolean {
  return (
    filename.toLowerCase().endsWith(".pdf") || mime === "application/pdf"
  );
}

/**
 * Classifica o arquivo pelo conteúdo (magic bytes / marcador OFX) antes de
 * extensão/mime — mimes genéricos como application/octet-stream não podem
 * decidir o formato sozinhos.
 */
export function classifyExtratoFile(
  filename: string,
  mime: string | null | undefined,
  buffer: Buffer
): "pdf" | "ofx" | null {
  const head = buffer.subarray(0, 4096).toString("latin1");
  if (head.startsWith("%PDF-")) return "pdf";
  if (head.includes("OFXHEADER") || head.includes("<OFX")) return "ofx";
  if (isPdfFile(filename, mime)) return "pdf";
  // Fallback estrito: mimes genéricos (octet-stream, text/plain) não decidem.
  const lower = filename.toLowerCase();
  if (
    lower.endsWith(".ofx") ||
    lower.endsWith(".qfx") ||
    mime === "application/x-ofx"
  ) {
    return "ofx";
  }
  return null;
}
