"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  RECRUITMENT_TYPES,
  RECRUITMENT_TYPE_LABELS,
  CHANNELS,
  CHANNEL_LABELS,
} from "@/lib/domain";
import { monthLabel } from "@/lib/format";

export function DashboardControls({
  months,
  currentMonth,
}: {
  months: string[];
  currentMonth: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const selectClass =
    "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentMonth}
        onChange={(e) => setParam("month", e.target.value)}
        className={selectClass}
        aria-label="Місяць"
      >
        {[...months].reverse().map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
        <option value="all">Весь період</option>
      </select>

      <select
        value={params.get("recruitmentType") ?? ""}
        onChange={(e) => setParam("recruitmentType", e.target.value)}
        className={selectClass}
      >
        <option value="">Усі типи</option>
        {RECRUITMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {RECRUITMENT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      <select
        value={params.get("channel") ?? ""}
        onChange={(e) => setParam("channel", e.target.value)}
        className={selectClass}
      >
        <option value="">Усі канали</option>
        {CHANNELS.map((c) => (
          <option key={c} value={c}>
            {CHANNEL_LABELS[c]}
          </option>
        ))}
      </select>
    </div>
  );
}
