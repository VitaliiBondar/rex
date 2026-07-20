import { format } from "date-fns";
import { uk } from "date-fns/locale";

export function formatDateTime(date: Date): string {
  return format(date, "d MMM yyyy, HH:mm", { locale: uk });
}

export function formatDate(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: uk });
}

// "2026-07" → "липень 2026"
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "LLLL yyyy", { locale: uk });
}

// Поточний місяць у форматі "YYYY-MM".
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Останні N місяців (від старих до нових), включно з поточним.
export function lastMonths(count: number, now: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return result;
}
