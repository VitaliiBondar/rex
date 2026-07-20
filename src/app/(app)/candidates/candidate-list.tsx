import Link from "next/link";
import { StatusSelect } from "@/components/status-select";
import { StatusBadge } from "@/components/status-badge";
import { StageTrack } from "@/components/stage-track";
import { recruitmentTypeLabel, channelLabel } from "@/lib/domain";
import { formatDate } from "@/lib/format";

export type CandidateRow = {
  id: string;
  fullName: string;
  position: string | null;
  recruitmentType: string;
  channel: string;
  status: string;
  unit: { name: string } | null;
  enlistedAt: Date | null;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border-strong px-1.5 py-0.5 text-[11px] text-ink-soft">
      {children}
    </span>
  );
}

export function CandidateList({
  candidates,
  isCurrentMonth,
}: {
  candidates: CandidateRow[];
  isCurrentMonth: boolean;
}) {
  if (candidates.length === 0) {
    return (
      <div className="mx-4 sm:mx-6 my-10 rounded-lg border border-dashed border-border-strong p-10 text-center">
        <p className="text-sm font-medium text-ink">Кандидатів не знайдено</p>
        <p className="mt-1 text-sm text-ink-soft">
          {isCurrentMonth
            ? "Змініть фільтри або додайте нового кандидата."
            : "У цьому місяці кандидатів, що відповідають фільтрам, не було."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: таблиця */}
      <div className="hidden md:block px-6 py-4">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left">
                <Th>Кандидат</Th>
                <Th>Тип · канал</Th>
                <Th>Підрозділ</Th>
                <Th>Дата зарахування</Th>
                <Th className="w-40">Етап</Th>
                <Th className="w-48">Статус</Th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 bg-surface hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/candidates/${c.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {c.fullName}
                    </Link>
                    {c.position && (
                      <p className="text-xs text-ink-faint">{c.position}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Chip>{recruitmentTypeLabel(c.recruitmentType)}</Chip>
                      <Chip>{channelLabel(c.channel)}</Chip>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.unit?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.enlistedAt ? formatDate(c.enlistedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StageTrack status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {isCurrentMonth ? (
                      <StatusSelect candidateId={c.id} status={c.status} />
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: картки */}
      <div className="md:hidden flex flex-col gap-3 p-4">
        {candidates.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/candidates/${c.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {c.fullName}
                </Link>
                {c.position && (
                  <p className="text-xs text-ink-faint">{c.position}</p>
                )}
              </div>
              {isCurrentMonth ? (
                <StatusSelect candidateId={c.id} status={c.status} />
              ) : (
                <StatusBadge status={c.status} />
              )}
            </div>
            <div className="mt-3">
              <StageTrack status={c.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>{recruitmentTypeLabel(c.recruitmentType)}</Chip>
              <Chip>{channelLabel(c.channel)}</Chip>
              {c.unit && <Chip>{c.unit.name}</Chip>}
              {c.enlistedAt && <Chip>Зараховано: {formatDate(c.enlistedAt)}</Chip>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-ink-faint eyebrow ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
