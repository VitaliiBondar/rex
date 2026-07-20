// Єдине джерело правди для «enum-подібних» полів: значення, українські лейбли, кольори, порядок.
// Використовується скрізь у UI та валідації, щоб терміни й вигляд були консистентними.

// ── Ролі ────────────────────────────────────────────────────────────────────
export const ROLES = ["ADMIN", "RECRUITER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Адміністратор",
  RECRUITER: "Рекрутер",
};

// ── Стать ───────────────────────────────────────────────────────────────────
export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Чоловіча",
  FEMALE: "Жіноча",
};

// ── Тип залучення ───────────────────────────────────────────────────────────
export const RECRUITMENT_TYPES = [
  "MOBILIZATION",
  "CONTRACT",
  "CONTRACT_18_24",
] as const;
export type RecruitmentType = (typeof RECRUITMENT_TYPES)[number];
export const RECRUITMENT_TYPE_LABELS: Record<RecruitmentType, string> = {
  MOBILIZATION: "Мобілізація",
  CONTRACT: "Контракт",
  CONTRACT_18_24: "Контракт 18–24",
};

// ── Канал залучення ─────────────────────────────────────────────────────────
export const CHANNELS = ["RECRUITING_CENTER", "DIRECT"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  RECRUITING_CENTER: "Через центр рекрутингу",
  DIRECT: "Напряму до нас",
};

// ── Статуси (конвеєр) ───────────────────────────────────────────────────────
export const STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "COLLECTING_DOCS",
  "MEDICAL_COMMISSION",
  "CONTRACT_SIGNING",
  "ENLISTED",
  "REJECTED_BY_US",
  "SELF_WITHDREW",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  NEW: "Новий",
  IN_PROGRESS: "В роботі",
  COLLECTING_DOCS: "Збирає документи",
  MEDICAL_COMMISSION: "Проходить ВЛК",
  CONTRACT_SIGNING: "Оформлення",
  ENLISTED: "Зараховано",
  REJECTED_BY_US: "Відмова з нашого боку",
  SELF_WITHDREW: "Відмовився сам",
};

// Фінальні статуси — кандидат завершив шлях (для звітів і канбану).
export const FINAL_STATUSES = [
  "ENLISTED",
  "REJECTED_BY_US",
  "SELF_WITHDREW",
] as const satisfies readonly Status[];

export function isFinalStatus(status: string): boolean {
  return (FINAL_STATUSES as readonly string[]).includes(status);
}

// Активні статуси (кандидат ще в роботі) — порядок для канбан-колонок.
export const ACTIVE_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "COLLECTING_DOCS",
  "MEDICAL_COMMISSION",
  "CONTRACT_SIGNING",
] as const satisfies readonly Status[];

// Tailwind-класи бейджів для кожного статусу (світла/темна тема через префікси).
export const STATUS_BADGE_CLASSES: Record<Status, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  COLLECTING_DOCS:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  MEDICAL_COMMISSION:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  CONTRACT_SIGNING:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
  ENLISTED:
    "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200",
  REJECTED_BY_US: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
  SELF_WITHDREW:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
};

// Кольори (hex) для графіків Recharts.
export const STATUS_COLORS: Record<Status, string> = {
  NEW: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  COLLECTING_DOCS: "#6366f1",
  MEDICAL_COMMISSION: "#f59e0b",
  CONTRACT_SIGNING: "#8b5cf6",
  ENLISTED: "#22c55e",
  REJECTED_BY_US: "#ef4444",
  SELF_WITHDREW: "#f97316",
};

export const RECRUITMENT_TYPE_COLORS: Record<RecruitmentType, string> = {
  MOBILIZATION: "#0ea5e9",
  CONTRACT: "#8b5cf6",
  CONTRACT_18_24: "#22c55e",
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  RECRUITING_CENTER: "#6366f1",
  DIRECT: "#f59e0b",
};

// Хелпери для безпечного отримання лейбла з довільного рядка.
export function statusLabel(value: string): string {
  return STATUS_LABELS[value as Status] ?? value;
}
export function recruitmentTypeLabel(value: string): string {
  return RECRUITMENT_TYPE_LABELS[value as RecruitmentType] ?? value;
}
export function channelLabel(value: string): string {
  return CHANNEL_LABELS[value as Channel] ?? value;
}
export function genderLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return GENDER_LABELS[value as Gender] ?? value;
}
