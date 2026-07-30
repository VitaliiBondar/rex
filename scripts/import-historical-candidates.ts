import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_PIPELINE_DAYS = 45;
const AUTHOR_EMAIL = "admin@rex.local";
const STAGES = [
  "UNIT_SEARCH",
  "COLLECTING_DOCS",
  "MEDICAL_COMMISSION",
  "CONTRACT_SIGNING",
  "ENLISTED",
];

type HistoricalEntry = {
  fullName: string;
  age?: number;
  gender?: string;
  position?: string;
  recruitmentType: string;
  channel: string;
  unit: string;
  enlistedDate: string;
  pipelineStartDate?: string;
};

const dataPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "historical-candidates.data.json");

async function main() {
  const entries: HistoricalEntry[] = JSON.parse(
    fs.readFileSync(dataPath, "utf-8"),
  );

  const author = await prisma.user.findUniqueOrThrow({
    where: { email: AUTHOR_EMAIL },
  });

  for (const entry of entries) {
    const enlistedAt = new Date(entry.enlistedDate);
    const startAt = entry.pipelineStartDate
      ? new Date(entry.pipelineStartDate)
      : new Date(enlistedAt.getTime() - DEFAULT_PIPELINE_DAYS * 86_400_000);

    const unit = await prisma.unit.upsert({
      where: { name: entry.unit },
      create: { name: entry.unit },
      update: {},
    });

    const stepMs = (enlistedAt.getTime() - startAt.getTime()) / (STAGES.length - 1);
    const stageDates = STAGES.map((_, i) => new Date(startAt.getTime() + stepMs * i));

    const candidate = await prisma.candidate.create({
      data: {
        fullName: entry.fullName,
        age: entry.age,
        gender: entry.gender,
        position: entry.position,
        recruitmentType: entry.recruitmentType,
        channel: entry.channel,
        status: "ENLISTED",
        unitId: unit.id,
        createdAt: startAt,
      },
    });

    let prevStatus: string | null = null;
    for (let i = 0; i < STAGES.length; i++) {
      await prisma.statusChange.create({
        data: {
          candidateId: candidate.id,
          fromStatus: prevStatus,
          toStatus: STAGES[i],
          changedById: author.id,
          changedAt: stageDates[i],
        },
      });
      prevStatus = STAGES[i];
    }

    console.log(`Імпортовано: ${entry.fullName} → ENLISTED (${entry.enlistedDate})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
