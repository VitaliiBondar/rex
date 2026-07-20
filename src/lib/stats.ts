// Чисті функції агрегації статистики кандидатів.
// Не залежать від Prisma/БД — приймають прості об'єкти, тому легко тестуються ізольовано.
// Місяць подається рядком "YYYY-MM".

import { FINAL_STATUSES } from "./domain";

export type StatStatusChange = {
  toStatus: string;
  changedAt: Date;
};

export type StatCandidate = {
  id: string;
  createdAt: Date;
  status: string;
  recruitmentType: string;
  channel: string;
  responsibleUserId: string | null;
  statusChanges: StatStatusChange[];
};

// ── Межі місяця ─────────────────────────────────────────────────────────────
// Повертає [start, end): start — перша мить місяця, end — перша мить наступного.
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);
  return { start, end };
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end;
}

// ── Реконструкція статусу на певну дату ─────────────────────────────────────
// Статус, актуальний на `date` = toStatus останньої зміни з changedAt <= date.
export function statusAt(candidate: StatCandidate, date: Date): string | null {
  let result: string | null = null;
  let latest = -Infinity;
  for (const change of candidate.statusChanges) {
    const t = change.changedAt.getTime();
    if (t <= date.getTime() && t >= latest) {
      latest = t;
      result = change.toStatus;
    }
  }
  return result;
}

// ── Додані у місяці (за createdAt) ──────────────────────────────────────────
export function addedInMonth(
  candidates: StatCandidate[],
  month: string,
): StatCandidate[] {
  const { start, end } = monthRange(month);
  return candidates.filter((c) => inRange(c.createdAt, start, end));
}

// ── Досягли статусу в місяці (за датою переходу) ────────────────────────────
// Рахуємо кандидатів, у яких є зміна в цей статус із changedAt у межах місяця.
export function reachedStatusInMonth(
  candidates: StatCandidate[],
  status: string,
  month: string,
): StatCandidate[] {
  const { start, end } = monthRange(month);
  return candidates.filter((c) =>
    c.statusChanges.some(
      (ch) => ch.toStatus === status && inRange(ch.changedAt, start, end),
    ),
  );
}

// ── Активні на кінець місяця (в роботі, з урахуванням переносу) ──────────────
export function activeAtEndOfMonth(
  candidates: StatCandidate[],
  month: string,
): StatCandidate[] {
  const { end } = monthRange(month);
  // Остання мить місяця = end - 1мс.
  const lastInstant = new Date(end.getTime() - 1);
  const finals: readonly string[] = FINAL_STATUSES;
  return candidates.filter((c) => {
    const st = statusAt(c, lastInstant);
    return st !== null && !finals.includes(st);
  });
}

// ── Групування ──────────────────────────────────────────────────────────────
export function countBy(
  candidates: StatCandidate[],
  keyFn: (c: StatCandidate) => string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of candidates) {
    const key = keyFn(c);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

// ── Фільтрація ──────────────────────────────────────────────────────────────
export type CandidateFilter = {
  recruitmentType?: string;
  channel?: string;
  responsibleUserId?: string;
  status?: string;
};

export function filterCandidates(
  candidates: StatCandidate[],
  filter: CandidateFilter,
): StatCandidate[] {
  return candidates.filter((c) => {
    if (filter.recruitmentType && c.recruitmentType !== filter.recruitmentType)
      return false;
    if (filter.channel && c.channel !== filter.channel) return false;
    if (
      filter.responsibleUserId &&
      c.responsibleUserId !== filter.responsibleUserId
    )
      return false;
    if (filter.status && c.status !== filter.status) return false;
    return true;
  });
}

// ── Тренд по місяцях ────────────────────────────────────────────────────────
export type MonthlyTrendPoint = {
  month: string;
  added: number;
  enlisted: number;
  rejected: number;
  selfWithdrew: number;
};

export function monthlyTrend(
  candidates: StatCandidate[],
  months: string[],
): MonthlyTrendPoint[] {
  return months.map((month) => ({
    month,
    added: addedInMonth(candidates, month).length,
    enlisted: reachedStatusInMonth(candidates, "ENLISTED", month).length,
    rejected: reachedStatusInMonth(candidates, "REJECTED_BY_US", month).length,
    selfWithdrew: reachedStatusInMonth(candidates, "SELF_WITHDREW", month)
      .length,
  }));
}
