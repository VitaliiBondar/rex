"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  STATUSES,
  STATUS_LABELS,
  RECRUITMENT_TYPES,
  RECRUITMENT_TYPE_LABELS,
  CHANNELS,
  CHANNEL_LABELS,
} from "@/lib/domain";

export function CandidateFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const hasFilters = ["q", "status", "recruitmentType", "channel"].some((k) =>
    params.get(k),
  );

  const selectClass =
    "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[12rem]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
        <input
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            window.clearTimeout((window as any).__q);
            (window as any).__q = window.setTimeout(() => setParam("q", v), 300);
          }}
          placeholder="Пошук за іменем…"
          className="h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-3 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectClass}
      >
        <option value="">Усі статуси</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
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

      {hasFilters && (
        <button
          onClick={() => {
            // Скидаємо лише фільтри, зберігаючи вибраний місяць у URL.
            const next = new URLSearchParams();
            const month = params.get("month");
            if (month) next.set("month", month);
            router.push(`${pathname}?${next.toString()}`);
          }}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" /> Скинути
        </button>
      )}
    </div>
  );
}
