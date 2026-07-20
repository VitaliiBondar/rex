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
  status?: string;
  q?: string;
};

export function filterCandidates<C extends StatCandidate & { fullName?: string }>(
  candidates: C[],
  filter: CandidateFilter,
): C[] {
  return candidates.filter((c) => {
    if (filter.recruitmentType && c.recruitmentType !== filter.recruitmentType)
      return false;
    if (filter.channel && c.channel !== filter.channel) return false;
    if (filter.status && c.status !== filter.status) return false;
    if (filter.q) {
      const name = c.fullName ?? "";
      if (!name.toLowerCase().includes(filter.q.toLowerCase())) return false;
    }
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

// ── Помісячний знімок (для перегляду списку кандидатів по місяцях) ──────────
// Для місяця M повертає кандидатів, релевантних саме цьому місяцю:
//   - ще активні на кінець M (включно з перенесеними з попередніх місяців) —
//     зі статусом "на той момент" (не поточним живим);
//   - фіналізовані (зараховано/відмова) САМЕ В МЕЖАХ M.
// Кандидат, що фіналізувався РАНІШЕ M, у результат не потрапляє — для M він вже
// "стара новина". `status` у результаті — це історичний знімок на місяць M,
// а не поточне живе значення candidate.status.
export function candidatesForMonth<C extends StatCandidate>(
  candidates: C[],
  month: string,
): (Omit<C, "status"> & { status: string })[] {
  const { end } = monthRange(month);
  const lastInstant = new Date(end.getTime() - 1);
  type WithStatus = Omit<C, "status"> & { status: string };

  const active = activeAtEndOfMonth(candidates, month).map(
    (c) => ({ ...c, status: statusAt(c, lastInstant) as string }) as WithStatus,
  );

  const finalized = (FINAL_STATUSES as readonly string[]).flatMap((status) =>
    reachedStatusInMonth(candidates, status, month).map(
      (c) => ({ ...c, status }) as WithStatus,
    ),
  );

  return [...active, ...finalized];
}

// ── Дата зарахування ─────────────────────────────────────────────────────────
// Дата першого переходу в ENLISTED, або null, якщо кандидат не зарахований.
export function enlistedDate(candidate: StatCandidate): Date | null {
  const enlistings = candidate.statusChanges.filter(
    (c) => c.toStatus === "ENLISTED",
  );
  if (enlistings.length === 0) return null;
  return enlistings.reduce(
    (min, c) => (c.changedAt < min ? c.changedAt : min),
    enlistings[0].changedAt,
  );
}
