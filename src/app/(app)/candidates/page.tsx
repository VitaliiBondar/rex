import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  getCandidates,
  getUnits,
  getUsers,
  getPositions,
} from "@/lib/queries";
import { CandidateFilters } from "./filters";
import { CandidateList } from "./candidate-list";
import { AddCandidateButton } from "./add-candidate-button";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [candidates, units, users, positions] = await Promise.all([
    getCandidates({
      q: sp.q,
      status: sp.status,
      recruitmentType: sp.recruitmentType,
      channel: sp.channel,
      responsibleUserId: sp.responsibleUserId,
    }),
    getUnits(),
    getUsers(),
    getPositions(),
  ]);

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <>
      <PageHeader eyebrow="Відділ рекрутингу" title="Кандидати">
        <AddCandidateButton
          units={units}
          users={userOptions}
          positions={positions}
        />
      </PageHeader>

      <div className="px-4 sm:px-6 py-4 border-b border-border bg-surface">
        <Suspense>
          <CandidateFilters users={userOptions} />
        </Suspense>
      </div>

      <CandidateList candidates={candidates} />
    </>
  );
}
