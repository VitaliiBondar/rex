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

// Наступний/попередній місяць у форматі "YYYY-MM" — для навігації по місяцях.
export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Інклюзивний список місяців від start до end (для діапазону "весь період").
export function monthsBetween(start: string, end: string): string[] {
  const result: string[] = [start];
  let cur = start;
  while (cur !== end) {
    cur = nextMonth(cur);
    result.push(cur);
  }
  return result;
}

// "Прізвище Ім'я [По батькові]" → перші два слова для показу в UI
// (по батькові зберігається в fullName, але ніде не відображається).
export function displayName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
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
