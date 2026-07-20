import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  isFinalStatus,
  type Status,
} from "@/lib/domain";

// Підпис інтерфейсу: компактний трек етапів конвеєра.
// Показує, наскільки просунувся кандидат; термінальний стан фарбує трек за семантикою.

const TERMINAL_FILL: Record<string, string> = {
  ENLISTED: "bg-green-500",
  REJECTED_BY_US: "bg-red-500",
  SELF_WITHDREW: "bg-orange-500",
};

export function StageTrack({
  status,
  showLabels = false,
  className,
}: {
  status: string;
  showLabels?: boolean;
  className?: string;
}) {
  const final = isFinalStatus(status);
  const activeIndex = ACTIVE_STATUSES.indexOf(status as (typeof ACTIVE_STATUSES)[number]);
  // Для термінального стану вважаємо всі активні етапи пройденими.
  const filledUpTo = final ? ACTIVE_STATUSES.length - 1 : activeIndex;
  const terminalFill = final ? TERMINAL_FILL[status] ?? "bg-ink" : null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1" aria-hidden>
        {ACTIVE_STATUSES.map((stage, i) => {
          const isFilled = i <= filledUpTo;
          const isCurrent = !final && i === activeIndex;
          return (
            <span
              key={stage}
              title={STATUS_LABELS[stage as Status]}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                isFilled
                  ? terminalFill ?? "bg-ink"
                  : "bg-border-strong",
                isCurrent && "ring-2 ring-offset-1 ring-offset-surface ring-ink/30",
              )}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between eyebrow">
          <span>{STATUS_LABELS[ACTIVE_STATUSES[0]]}</span>
          <span>Зараховано</span>
        </div>
      )}
    </div>
  );
}
