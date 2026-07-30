import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getUnits, getPositions, getCandidatesForStats } from "@/lib/queries";
import { filterCandidates, candidatesForMonth, enlistedDate } from "@/lib/stats";
import { STATUSES } from "@/lib/domain";
import { currentMonth } from "@/lib/format";
import { CandidateFilters } from "./filters";
import { CandidateList, type CandidateRow } from "./candidate-list";
import { AddCandidateButton } from "./add-candidate-button";
import { MonthNav } from "./month-nav";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const month = sp.month || currentMonth();
  const isAllPeriod = month === "all";
  const isEditable = isAllPeriod || month === currentMonth();

  const [all, units, positions] = await Promise.all([
    getCandidatesForStats(),
    getUnits(),
    getPositions(),
  ]);

  // Спочатку часо-незалежні фільтри (тип/канал/пошук), потім знімок на місяць
  // (підмінює status на історичний), потім фільтр за статусом — уже за історичним.
  const preFiltered = filterCandidates(all, {
    recruitmentType: sp.recruitmentType,
    channel: sp.channel,
    q: sp.q,
  });
  // У режимі "весь період" немає єдиної дати для історичного знімку —
  // показуємо кандидатів з їхнім живим поточним статусом.
  const monthly = isAllPeriod
    ? preFiltered
    : candidatesForMonth(preFiltered, month);
  const filtered = sp.status
    ? monthly.filter((c) => c.status === sp.status)
    : monthly;

  const sortKey = sp.sort ?? "fullName";
  const sortDir: 1 | -1 = sp.dir === "desc" ? -1 : 1;

  function withNullsLast<T>(
    getValue: (row: CandidateRow) => T | null,
    compare: (a: T, b: T) => number,
  ) {
    return (a: CandidateRow, b: CandidateRow) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // завжди в кінець, незалежно від напрямку
      if (vb === null) return -1;
      return compare(va, vb) * sortDir;
    };
  }

  const comparators: Record<
    string,
    (a: CandidateRow, b: CandidateRow) => number
  > = {
    fullName: (a, b) => a.fullName.localeCompare(b.fullName, "uk") * sortDir,
    unit: withNullsLast(
      (c) => c.unit?.name ?? null,
      (a, b) => a.localeCompare(b, "uk"),
    ),
    enlistedAt: withNullsLast(
      (c) => c.enlistedAt,
      (a, b) => a.getTime() - b.getTime(),
    ),
    status: (a, b) =>
      ((STATUSES as readonly string[]).indexOf(a.status) -
        (STATUSES as readonly string[]).indexOf(b.status)) *
      sortDir,
  };

  const candidates: CandidateRow[] = filtered
    .map((c) => ({
      id: c.id,
      fullName: c.fullName,
      position: c.position,
      recruitmentType: c.recruitmentType,
      channel: c.channel,
      status: c.status,
      unit: c.unit,
      enlistedAt: enlistedDate(c),
    }))
    .sort(comparators[sortKey] ?? comparators.fullName);

  return (
    <>
      <PageHeader title="Кандидати">
        <AddCandidateButton units={units} positions={positions} />
      </PageHeader>

      <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Suspense>
            <MonthNav month={month} />
          </Suspense>
          <span className="text-sm text-ink-soft">
            Показано кандидатів:{" "}
            <strong className="text-ink">{candidates.length}</strong>
          </span>
        </div>
        <Suspense>
          <CandidateFilters />
        </Suspense>
      </div>

      <CandidateList
        candidates={candidates}
        isCurrentMonth={isEditable}
        units={units}
        searchParams={sp}
        currentSort={sortKey}
        currentDir={sp.dir === "desc" ? "desc" : "asc"}
      />
    </>
  );
}
