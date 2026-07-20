"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";
import type { ActionResult } from "./candidates";

export async function createUser(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Помилка" };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return { ok: false, error: "Користувач із таким email вже існує" };
  }

  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });

  revalidatePath("/settings");
  return { ok: true, id: created.id };
}

// Активація/деактивація доступу без видалення історії.
export async function toggleUserActive(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.id === id) {
    return { ok: false, error: "Не можна деактивувати власний акаунт" };
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, error: "Користувача не знайдено" };

  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });
  revalidatePath("/settings");
  return { ok: true };
}
