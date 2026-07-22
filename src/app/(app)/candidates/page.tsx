import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getUnits, getPositions, getCandidatesForStats } from "@/lib/queries";
import { filterCandidates, candidatesForMonth, enlistedDate } from "@/lib/stats";
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
  const isCurrentMonth = month === currentMonth();

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
  const monthly = candidatesForMonth(preFiltered, month);
  const filtered = sp.status
    ? monthly.filter((c) => c.status === sp.status)
    : monthly;

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
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "uk"));

  return (
    <>
      <PageHeader eyebrow="Відділ рекрутингу" title="Кандидати">
        <AddCandidateButton units={units} positions={positions} />
      </PageHeader>

      <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface flex flex-col gap-3">
        <Suspense>
          <MonthNav month={month} />
        </Suspense>
        <Suspense>
          <CandidateFilters />
        </Suspense>
      </div>

      <CandidateList
        candidates={candidates}
        isCurrentMonth={isCurrentMonth}
        units={units}
      />
    </>
  );
}
