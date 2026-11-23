export const CHURCH_TZ = "America/Sao_Paulo";

export const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function monthName(month: number): string {
  return MONTHS_PT[month - 1] ?? "";
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y: y ?? 0, m: m ?? 0, d: d ?? 0 };
}

export function toISODate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 2026-11-23 -> 23/11/2026 (sem conversão de fuso). */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const { y, m, d } = parseISODate(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function formatDateTimeBR(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: CHURCH_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

/** Intervalo [início, fim) de um mês ou de um ano inteiro. */
export function periodRange(year: number, month: number | null): { start: string; end: string } {
  if (month === null) {
    return { start: toISODate(year, 1, 1), end: toISODate(year + 1, 1, 1) };
  }
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  return { start: toISODate(year, month, 1), end: toISODate(nextY, nextM, 1) };
}
