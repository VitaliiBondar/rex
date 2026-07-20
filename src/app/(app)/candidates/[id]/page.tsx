import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getCandidateById,
  getUnits,
  getUsers,
  getPositions,
} from "@/lib/queries";
import { StageTrack } from "@/components/stage-track";
import { StatusSelect } from "@/components/status-select";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  recruitmentTypeLabel,
  channelLabel,
  genderLabel,
} from "@/lib/domain";
import { formatDate, formatDateTime } from "@/lib/format";
import { CandidateActions } from "./edit-candidate-button";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, units, users, positions] = await Promise.all([
    getCandidateById(id),
    getUnits(),
    getUsers(),
    getPositions(),
  ]);

  if (!candidate) notFound();

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));
  const defaultValues = {
    fullName: candidate.fullName,
    age: candidate.age != null ? String(candidate.age) : "",
    gender: candidate.gender ?? "",
    position: candidate.position ?? "",
    unitId: candidate.unitId ?? "",
    recruitmentType: candidate.recruitmentType,
    channel: candidate.channel,
    responsibleUserId: candidate.responsibleUserId ?? "",
    note: candidate.note ?? "",
  };

  return (
    <div className="max-w-4xl">
      <div className="border-b border-border bg-surface px-4 sm:px-6 py-4">
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> До списку
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {candidate.fullName}
            </h1>
            {candidate.position && (
              <p className="text-sm text-ink-soft">{candidate.position}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CandidateActions
              candidateId={candidate.id}
              defaultValues={defaultValues}
              units={units}
              users={userOptions}
              positions={positions}
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex flex-col gap-6">
        {/* Статус + трек */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Поточний статус</p>
              <StatusBadge status={candidate.status} />
            </div>
            <div>
              <p className="eyebrow mb-1.5">Змінити статус</p>
              <StatusSelect
                candidateId={candidate.id}
                status={candidate.status}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="mt-5">
            <StageTrack status={candidate.status} showLabels />
          </div>
        </Card>

        {/* Дані */}
        <Card className="p-5">
          <p className="eyebrow mb-4">Дані кандидата</p>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-sm">
            <Info label="Тип залучення" value={recruitmentTypeLabel(candidate.recruitmentType)} />
            <Info label="Канал" value={channelLabel(candidate.channel)} />
            <Info label="Підрозділ" value={candidate.unit?.name ?? "—"} />
            <Info label="Вік" value={candidate.age != null ? String(candidate.age) : "—"} />
            <Info label="Стать" value={genderLabel(candidate.gender)} />
            <Info label="Відповідальний" value={candidate.responsible?.name ?? "—"} />
            <Info label="Додано" value={formatDate(candidate.createdAt)} />
          </dl>
        </Card>

        {/* Примітка */}
        {candidate.note && (
          <Card className="p-5">
            <p className="eyebrow mb-2">Примітка</p>
            <p className="text-sm text-ink whitespace-pre-wrap">
              {candidate.note}
            </p>
          </Card>
        )}

        {/* Історія статусів */}
        <Card className="p-5">
          <p className="eyebrow mb-4">Історія статусів</p>
          <ol className="relative flex flex-col gap-4">
            {candidate.statusChanges.map((ch) => (
              <li key={ch.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-border-strong" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge status={ch.toStatus} />
                  <span className="tnum text-xs text-ink-faint">
                    {formatDateTime(ch.changedAt)}
                  </span>
                  {ch.changedBy?.name && (
                    <span className="text-xs text-ink-soft">
                      · {ch.changedBy.name}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow mb-0.5">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
