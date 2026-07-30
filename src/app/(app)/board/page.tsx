import { PageHeader } from "@/components/page-header";
import { getCandidates, getUnits } from "@/lib/queries";
import { BoardClient, type BoardCandidate } from "./board-client";

export default async function BoardPage() {
  const [candidates, units] = await Promise.all([
    getCandidates(),
    getUnits(),
  ]);
  const cards: BoardCandidate[] = candidates.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    position: c.position,
    recruitmentType: c.recruitmentType,
    channel: c.channel,
    status: c.status,
  }));

  return (
    <>
      <PageHeader title="Канбан" />
      <p className="px-4 sm:px-6 pt-4 text-sm text-ink-soft">
        Перетягніть картку між колонками, щоб змінити статус. Зміна фіксується в
        історії кандидата.
      </p>
      <BoardClient initial={cards} units={units} />
    </>
  );
}
