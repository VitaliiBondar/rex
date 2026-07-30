"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, currentMonth, nextMonth, previousMonth } from "@/lib/format";

// Навігація по місяцях для помісячного перегляду списку кандидатів.
export function MonthNav({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (m: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("month", m);
    router.push(`${pathname}?${next.toString()}`);
  };

  if (month === "all") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink">Увесь період</span>
        <button
          onClick={() => go(currentMonth())}
          className="text-xs text-ink-soft hover:text-ink underline"
        >
          До поточного місяця
        </button>
      </div>
    );
  }

  const isCurrent = month >= currentMonth();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(previousMonth(month))}
        aria-label="Попередній місяць"
        className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-32 text-center text-sm font-medium capitalize text-ink">
        {monthLabel(month)}
      </span>
      <button
        onClick={() => go(nextMonth(month))}
        disabled={isCurrent}
        aria-label="Наступний місяць"
        className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {!isCurrent && (
        <button
          onClick={() => go(currentMonth())}
          className="ml-2 text-xs text-ink-soft hover:text-ink underline"
        >
          До поточного місяця
        </button>
      )}
      <button
        onClick={() => go("all")}
        className="ml-2 text-xs text-ink-soft hover:text-ink underline"
      >
        Весь період
      </button>
    </div>
  );
}
