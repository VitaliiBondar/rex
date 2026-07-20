import { prisma } from "@/lib/prisma";
import type { StatCandidate } from "@/lib/stats";

// Список кандидатів для канбану (live-статус, без часових фільтрів).
export async function getCandidates() {
  return prisma.candidate.findMany({
    include: { unit: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCandidateById(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      unit: true,
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

export type CandidateForStats = StatCandidate & {
  fullName: string;
  position: string | null;
  unit: { name: string } | null;
};

// Усі кандидати з історією статусів у формі для модуля stats.
// Використовується і Дашбордом, і списком кандидатів (помісячний перегляд) —
// фільтрація й агрегація відбуваються в пам'яті через lib/stats.
export async function getCandidatesForStats(): Promise<CandidateForStats[]> {
  const rows = await prisma.candidate.findMany({
    include: {
      unit: { select: { name: true } },
      statusChanges: {
        select: { toStatus: true, changedAt: true },
        orderBy: { changedAt: "asc" },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    position: c.position,
    unit: c.unit,
    createdAt: c.createdAt,
    status: c.status,
    recruitmentType: c.recruitmentType,
    channel: c.channel,
    statusChanges: c.statusChanges.map((s) => ({
      toStatus: s.toStatus,
      changedAt: s.changedAt,
    })),
  }));
}
