"use client";

import { useTransition } from "react";
import { STATUSES, STATUS_LABELS } from "@/lib/domain";
import { changeCandidateStatus } from "@/lib/actions/candidates";
import { cn } from "@/lib/utils";

// Швидка зміна статусу з фіксацією в історії.
export function StatusSelect({
  candidateId,
  status,
  className,
}: {
  candidateId: string;
  status: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Змінити статус"
      value={status}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          changeCandidateStatus({ candidateId, status: next });
        });
      }}
      className={cn(
        "h-8 rounded-md border border-border-strong bg-surface px-2 pr-7 text-xs text-ink cursor-pointer appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a909c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.4rem center",
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
