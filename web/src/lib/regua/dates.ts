const MESES_ABREV = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export const DIAS_LEMBRETE = [1, 4, 8] as const;

export function competenciaCobrada(hoje: Date): { ano: number; mes: number } {
  const mesAtual = hoje.getUTCMonth() + 1;
  const anoAtual = hoje.getUTCFullYear();
  if (mesAtual === 1) return { ano: anoAtual - 1, mes: 12 };
  return { ano: anoAtual, mes: mesAtual - 1 };
}

export function competenciaParam(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function formatCompetenciaRegua(ano: number, mes: number): string {
  return `${MESES_ABREV[mes - 1]}/${ano}`;
}

export function dentroJanelaRegua(hoje: Date): boolean {
  const dia = hoje.getUTCDate();
  return dia >= 1 && dia <= 10;
}

export function isDiaLembrete(hoje: Date): boolean {
  return (DIAS_LEMBRETE as readonly number[]).includes(hoje.getUTCDate());
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function normalizeOptOutText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
