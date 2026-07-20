import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES, statusLabel, type Status } from "@/lib/domain";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_BADGE_CLASSES[status as Status] ??
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
