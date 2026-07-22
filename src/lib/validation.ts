import { z } from "zod";
import {
  RECRUITMENT_TYPES,
  CHANNELS,
  STATUSES,
  GENDERS,
  ROLES,
} from "./domain";

// ── Авторизація ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Некоректний email"),
  password: z.string().min(1, "Введіть пароль"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ── Кандидат ────────────────────────────────────────────────────────────────
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

export const candidateSchema = z.object({
  fullName: z.string().trim().min(1, "Вкажіть ім'я"),
  age: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(16, "Замало").max(70, "Забагато").optional(),
  ),
  gender: z.preprocess(emptyToUndefined, z.enum(GENDERS).optional()),
  position: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  unitId: z.preprocess(emptyToUndefined, z.string().optional()),
  recruitmentType: z.enum(RECRUITMENT_TYPES),
  channel: z.enum(CHANNELS),
  note: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
});
export type CandidateInput = z.infer<typeof candidateSchema>;

export const statusChangeSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(STATUSES),
  unitId: z.string().min(1).optional(),
});

// ── Користувач (керує адмін) ────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть ім'я"),
  email: z.string().email("Некоректний email"),
  password: z.string().min(6, "Мінімум 6 символів"),
  role: z.enum(ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// ── Підрозділ ───────────────────────────────────────────────────────────────
export const unitSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву"),
});
