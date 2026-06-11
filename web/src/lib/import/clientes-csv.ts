import {
  normalizeEmail,
  normalizePhone,
} from "@/lib/pipeline/idempotency";

export const CSV_COLUMNS = [
  "cnpj",
  "razao_social",
  "telefone",
  "email",
  "banco_codigo",
  "banco_nome",
  "conta_ref",
] as const;

export type ClienteCsvRow = {
  line: number;
  cnpj: string;
  razao_social: string;
  telefone?: string;
  email?: string;
  banco_codigo?: string;
  banco_nome?: string;
  conta_ref: string;
};

export type ImportRowError = {
  line: number;
  message: string;
};

export type ImportPreview = {
  rows: ClienteCsvRow[];
  errors: ImportRowError[];
  stats: {
    totalLines: number;
    validLines: number;
    uniqueClientes: number;
    bancoRows: number;
  };
};

export type ImportApplyResult = {
  status: "completed" | "partial" | "failed";
  clientesCriados: number;
  clientesAtualizados: number;
  bancosCriados: number;
  bancosAtualizados: number;
  errors: ImportRowError[];
  batchId?: string;
};

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

function isValidCnpj(cnpj: string): boolean {
  return cnpj.length === 14;
}

export function previewClientesCsv(content: string): ImportPreview {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors: ImportRowError[] = [];
  const rows: ClienteCsvRow[] = [];

  if (lines.length === 0) {
    return {
      rows: [],
      errors: [{ line: 0, message: "Arquivo vazio" }],
      stats: { totalLines: 0, validLines: 0, uniqueClientes: 0, bancoRows: 0 },
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );

  const missing = ["cnpj", "razao_social"].filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Colunas obrigatórias ausentes: ${missing.join(", ")}`,
        },
      ],
      stats: { totalLines: 0, validLines: 0, uniqueClientes: 0, bancoRows: 0 },
    };
  }

  const index = Object.fromEntries(header.map((name, i) => [name, i]));

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const cols = parseCsvLine(lines[i], delimiter);
    const get = (key: string) => cols[index[key]]?.trim() ?? "";

    const cnpj = normalizeCnpj(get("cnpj"));
    const razao_social = get("razao_social");

    if (!cnpj && !razao_social) continue;

    if (!isValidCnpj(cnpj)) {
      errors.push({ line: lineNo, message: "CNPJ inválido (14 dígitos)" });
      continue;
    }
    if (!razao_social) {
      errors.push({ line: lineNo, message: "razao_social obrigatória" });
      continue;
    }

    const banco_codigo = get("banco_codigo") || undefined;
    const banco_nome = get("banco_nome") || undefined;
    if (banco_codigo && !banco_nome) {
      errors.push({
        line: lineNo,
        message: "banco_nome obrigatório quando banco_codigo informado",
      });
      continue;
    }

    const telefoneRaw = get("telefone");
    const emailRaw = get("email");

    rows.push({
      line: lineNo,
      cnpj,
      razao_social,
      telefone: telefoneRaw ? normalizePhone(telefoneRaw) : undefined,
      email: emailRaw ? normalizeEmail(emailRaw) : undefined,
      banco_codigo: banco_codigo?.toLowerCase(),
      banco_nome,
      conta_ref: get("conta_ref") || "principal",
    });
  }

  const uniqueClientes = new Set(rows.map((r) => r.cnpj)).size;
  const bancoRows = rows.filter((r) => r.banco_codigo).length;

  return {
    rows,
    errors,
    stats: {
      totalLines: Math.max(lines.length - 1, 0),
      validLines: rows.length,
      uniqueClientes,
      bancoRows,
    },
  };
}

export function groupRowsByCnpj(rows: ClienteCsvRow[]) {
  const map = new Map<
    string,
    {
      razao_social: string;
      telefone?: string;
      email?: string;
      bancos: Array<{
        banco_codigo: string;
        banco_nome: string;
        conta_ref: string;
        line: number;
      }>;
    }
  >();

  for (const row of rows) {
    const existing = map.get(row.cnpj);
    if (!existing) {
      map.set(row.cnpj, {
        razao_social: row.razao_social,
        telefone: row.telefone,
        email: row.email,
        bancos: [],
      });
    } else {
      existing.razao_social = row.razao_social;
      if (row.telefone) existing.telefone = row.telefone;
      if (row.email) existing.email = row.email;
    }

    if (row.banco_codigo && row.banco_nome) {
      map.get(row.cnpj)!.bancos.push({
        banco_codigo: row.banco_codigo,
        banco_nome: row.banco_nome,
        conta_ref: row.conta_ref,
        line: row.line,
      });
    }
  }

  return map;
}
