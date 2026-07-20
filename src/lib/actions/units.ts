"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { unitSchema } from "@/lib/validation";
import type { ActionResult } from "./candidates";

export async function createUnit(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Помилка" };
  }
  const existing = await prisma.unit.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) return { ok: false, error: "Такий підрозділ вже є" };

  const created = await prisma.unit.create({ data: { name: parsed.data.name } });
  revalidatePath("/settings");
  revalidatePath("/candidates");
  return { ok: true, id: created.id };
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  await requireAdmin();
  // onDelete: SetNull у кандидатів — історія не втрачається.
  await prisma.unit.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/candidates");
  return { ok: true };
}
