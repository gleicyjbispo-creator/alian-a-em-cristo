import { parseISODate, toISODate } from "./dates";

type WithBirth = { full_name: string; birth_date: string | null };

export type BirthdayInfo<T> = T & {
  /** Dias até o aniversário (0 = hoje). */
  daysUntil: number;
  /** Data do próximo aniversário (AAAA-MM-DD). */
  nextBirthday: string;
  /** Idade que a pessoa completa nesse aniversário. */
  turningAge: number;
};

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos. */
function birthdayDay(m: number, d: number, year: number): number {
  return m === 2 && d === 29 && !isLeap(year) ? 28 : d;
}

function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Aniversariantes de hoje até `days` dias à frente, ordenados pela data. */
export function upcomingBirthdays<T extends WithBirth>(
  people: T[],
  today: string,
  days = 7,
): BirthdayInfo<T>[] {
  const t = parseISODate(today);
  const todayN = dayNumber(t.y, t.m, t.d);
  const result: BirthdayInfo<T>[] = [];

  for (const p of people) {
    if (!p.birth_date) continue;
    const b = parseISODate(p.birth_date);
    let year = t.y;
    let n = dayNumber(year, b.m, birthdayDay(b.m, b.d, year));
    if (n < todayN) {
      year += 1;
      n = dayNumber(year, b.m, birthdayDay(b.m, b.d, year));
    }
    const daysUntil = n - todayN;
    if (daysUntil > days) continue;
    result.push({
      ...p,
      daysUntil,
      nextBirthday: toISODate(year, b.m, birthdayDay(b.m, b.d, year)),
      turningAge: year - b.y,
    });
  }

  return result.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.full_name.localeCompare(b.full_name, "pt-BR"),
  );
}

export type MonthBirthday<T> = T & { day: number; turningAge: number };

/** Aniversariantes de um mês (1–12), ordenados pelo dia. */
export function birthdaysInMonth<T extends WithBirth>(
  people: T[],
  month: number,
  year: number,
): MonthBirthday<T>[] {
  const out: MonthBirthday<T>[] = [];
  for (const p of people) {
    if (!p.birth_date) continue;
    const b = parseISODate(p.birth_date);
    if (b.m !== month) continue;
    out.push({ ...p, day: birthdayDay(b.m, b.d, year), turningAge: year - b.y });
  }
  return out.sort((a, b) => a.day - b.day || a.full_name.localeCompare(b.full_name, "pt-BR"));
}

export function describeDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return "Hoje";
  if (daysUntil === 1) return "Amanhã";
  return `Em ${daysUntil} dias`;
}
