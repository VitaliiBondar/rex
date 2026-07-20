import { prisma } from "@/lib/prisma";
import type { StatCandidate } from "@/lib/stats";

export type CandidateListFilters = {
  q?: string;
  status?: string;
  recruitmentType?: string;
  channel?: string;
  responsibleUserId?: string;
};

// Список кандидатів для таблиці/карток із фільтрами.
export async function getCandidates(filters: CandidateListFilters = {}) {
  return prisma.candidate.findMany({
    where: {
      status: filters.status || undefined,
      recruitmentType: filters.recruitmentType || undefined,
      channel: filters.channel || undefined,
      responsibleUserId: filters.responsibleUserId || undefined,
      fullName: filters.q
        ? { contains: filters.q }
        : undefined,
    },
    include: {
      unit: true,
      responsible: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCandidateById(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      unit: true,
      responsible: { select: { id: true, name: true } },
      statusChanges: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { changedAt: "desc" },
      },
    },
  });
}

export async function getUnits() {
  return prisma.unit.findMany({ orderBy: { name: "asc" } });
}

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
}

// Підказки посад — з уже введених значень.
export async function getPositions(): Promise<string[]> {
  const rows = await prisma.candidate.findMany({
    where: { position: { not: null } },
    select: { position: true },
    distinct: ["position"],
  });
  return rows
    .map((r) => r.position!)
    .filter((p) => p.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "uk"));
}

// Усі кандидати з історією статусів у формі для модуля stats.
export async function getCandidatesForStats(): Promise<
  (StatCandidate & { fullName: string })[]
> {
  const rows = await prisma.candidate.findMany({
    include: {
      statusChanges: {
        select: { toStatus: true, changedAt: true },
        orderBy: { changedAt: "asc" },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    createdAt: c.createdAt,
    status: c.status,
    recruitmentType: c.recruitmentType,
    channel: c.channel,
    responsibleUserId: c.responsibleUserId,
    statusChanges: c.statusChanges.map((s) => ({
      toStatus: s.toStatus,
      changedAt: s.changedAt,
    })),
  }));
}
