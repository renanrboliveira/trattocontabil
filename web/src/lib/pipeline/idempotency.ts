import { createHash } from "crypto";

export function hashFile(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function buildIdempotencyKey(params: {
  hash: string;
  cnpj: string;
  bancoCodigo: string;
  competencia: string;
}): string {
  return `${params.hash}:${params.cnpj}:${params.bancoCodigo}:${params.competencia}`;
}

/** Chave alternativa quando CNPJ ainda não identificado (triagem). */
export function buildTriagemIdempotencyKey(params: {
  hash: string;
  competencia: string;
  scope: string;
}): string {
  return `triagem:${params.hash}:${params.scope}:${params.competencia}`;
}

export function idempotencyScope(params: {
  remetente?: string;
  clienteId?: string;
  canal: string;
}): string {
  if (params.remetente) return params.remetente.replace(/\s+/g, "");
  if (params.clienteId) return `cliente:${params.clienteId}`;
  return params.canal;
}

export function competenciaFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseCompetencia(competencia: string): { ano: number; mes: number } {
  const [ano, mes] = competencia.split("-").map(Number);
  return { ano, mes };
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
