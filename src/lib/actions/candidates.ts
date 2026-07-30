"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { candidateSchema, statusChangeSchema } from "@/lib/validation";
import { requiresUnitAssignment } from "@/lib/domain";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; code?: "NEEDS_UNIT" | "NEEDS_ENLISTMENT_INFO" };

function revalidateAll() {
  revalidatePath("/candidates");
  revalidatePath("/board");
  revalidatePath("/dashboard");
}

export async function createCandidate(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Помилка" };
  }
  const data = parsed.data;

  const candidate = await prisma.candidate.create({
    data: {
      fullName: data.fullName,
      age: data.age,
      gender: data.gender,
      position: data.position,
      unitId: data.unitId,
      recruitmentType: data.recruitmentType,
      channel: data.channel,
      note: data.note ?? "",
      orderNumber: data.orderNumber,
      tckRegion: data.tckRegion,
      tckType: data.tckType,
      status: "UNIT_SEARCH",
      statusChanges: {
        create: { fromStatus: null, toStatus: "UNIT_SEARCH", changedById: user.id },
      },
    },
  });

  revalidateAll();
  return { ok: true, id: candidate.id };
}

export async function updateCandidate(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser();
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Помилка" };
  }
  const data = parsed.data;

  await prisma.candidate.update({
    where: { id },
    data: {
      fullName: data.fullName,
      age: data.age ?? null,
      gender: data.gender ?? null,
      position: data.position ?? null,
      unitId: data.unitId ?? null,
      recruitmentType: data.recruitmentType,
      channel: data.channel,
      note: data.note ?? "",
      orderNumber: data.orderNumber ?? null,
      tckRegion: data.tckRegion ?? null,
      tckType: data.tckType ?? null,
    },
  });

  revalidateAll();
  revalidatePath(`/candidates/${id}`);
  return { ok: true, id };
}

// Зміна статусу з фіксацією в історії. Використовується списком і канбаном.
export async function changeCandidateStatus(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Некоректний статус" };
  }
  const { candidateId, status, unitId, orderNumber, tckRegion, tckType } =
    parsed.data;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      status: true,
      unitId: true,
      orderNumber: true,
      tckRegion: true,
      tckType: true,
    },
  });
  if (!candidate) return { ok: false, error: "Кандидата не знайдено" };
  if (candidate.status === status) return { ok: true, id: candidateId };

  const effectiveUnitId = unitId ?? candidate.unitId;
  if (
    requiresUnitAssignment(candidate.status, status) &&
    !effectiveUnitId
  ) {
    return {
      ok: false,
      error: "Спочатку вкажіть підрозділ",
      code: "NEEDS_UNIT",
    };
  }

  const missingEnlistmentInfo =
    !(orderNumber ?? candidate.orderNumber) ||
    !(tckRegion ?? candidate.tckRegion) ||
    !(tckType ?? candidate.tckType);
  if (status === "ENLISTED" && missingEnlistmentInfo) {
    return {
      ok: false,
      error: "Вкажіть ТЦК і номер наказу",
      code: "NEEDS_ENLISTMENT_INFO",
    };
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status,
      ...(unitId ? { unitId } : {}),
      ...(orderNumber ? { orderNumber } : {}),
      ...(tckRegion ? { tckRegion } : {}),
      ...(tckType ? { tckType } : {}),
      statusChanges: {
        create: {
          fromStatus: candidate.status,
          toStatus: status,
          changedById: user.id,
        },
      },
    },
  });

  revalidateAll();
  revalidatePath(`/candidates/${candidateId}`);
  return { ok: true, id: candidateId };
}

export async function deleteCandidate(id: string): Promise<ActionResult> {
  await requireUser();
  await prisma.candidate.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
