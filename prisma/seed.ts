import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

type SeedChange = { to: string; at: Date };

async function createCandidate(
  data: {
    fullName: string;
    age: number;
    gender: string;
    position: string;
    recruitmentType: string;
    channel: string;
    note?: string;
    unitId?: string;
    responsibleUserId: string;
    createdAt: Date;
  },
  changes: SeedChange[],
) {
  const status = changes[changes.length - 1].to;
  const candidate = await prisma.candidate.create({
    data: {
      fullName: data.fullName,
      age: data.age,
      gender: data.gender,
      position: data.position,
      recruitmentType: data.recruitmentType,
      channel: data.channel,
      note: data.note ?? "",
      unitId: data.unitId,
      responsibleUserId: data.responsibleUserId,
      status,
      createdAt: data.createdAt,
    },
  });

  let prev: string | null = null;
  for (const ch of changes) {
    await prisma.statusChange.create({
      data: {
        candidateId: candidate.id,
        fromStatus: prev,
        toStatus: ch.to,
        changedById: data.responsibleUserId,
        changedAt: ch.at,
      },
    });
    prev = ch.to;
  }
}

async function main() {
  // Чиста повторно-застосовна seed-база.
  await prisma.statusChange.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Адміністратор",
      email: "admin@rex.local",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });

  const recruiter = await prisma.user.create({
    data: {
      name: "Олена Рекрутер",
      email: "recruiter@rex.local",
      passwordHash: await bcrypt.hash("recruiter123", 10),
      role: "RECRUITER",
    },
  });

  const unit1 = await prisma.unit.create({ data: { name: "1-й батальйон" } });
  const unit2 = await prisma.unit.create({ data: { name: "2-й батальйон" } });
  const unitSup = await prisma.unit.create({ data: { name: "Рота підтримки" } });

  const d = (m: number, day: number) => new Date(2026, m - 1, day, 12);

  // Сценарій переносу: доданий у червні, ще на ВЛК у червні, зарахований у липні.
  await createCandidate(
    {
      fullName: "Іван Петренко",
      age: 28,
      gender: "MALE",
      position: "Стрілець",
      recruitmentType: "CONTRACT",
      channel: "DIRECT",
      note: "Мотивований, є досвід. ВЛК проходив у червні, зарахований у липні.",
      unitId: unit1.id,
      responsibleUserId: recruiter.id,
      createdAt: d(6, 15),
    },
    [
      { to: "NEW", at: d(6, 15) },
      { to: "MEDICAL_COMMISSION", at: d(6, 25) },
      { to: "ENLISTED", at: d(7, 8) },
    ],
  );

  // Зарахований повністю в червні.
  await createCandidate(
    {
      fullName: "Олег Коваль",
      age: 34,
      gender: "MALE",
      position: "Водій",
      recruitmentType: "MOBILIZATION",
      channel: "RECRUITING_CENTER",
      unitId: unit2.id,
      responsibleUserId: admin.id,
      createdAt: d(6, 2),
    },
    [
      { to: "NEW", at: d(6, 2) },
      { to: "COLLECTING_DOCS", at: d(6, 8) },
      { to: "ENLISTED", at: d(6, 20) },
    ],
  );

  // Відмова з нашого боку (липень).
  await createCandidate(
    {
      fullName: "Сергій Мороз",
      age: 45,
      gender: "MALE",
      position: "—",
      recruitmentType: "MOBILIZATION",
      channel: "RECRUITING_CENTER",
      note: "Не пройшов за станом здоров'я.",
      responsibleUserId: recruiter.id,
      createdAt: d(7, 3),
    },
    [
      { to: "NEW", at: d(7, 3) },
      { to: "MEDICAL_COMMISSION", at: d(7, 6) },
      { to: "REJECTED_BY_US", at: d(7, 10) },
    ],
  );

  // Відмовився сам (червень).
  await createCandidate(
    {
      fullName: "Андрій Ткач",
      age: 22,
      gender: "MALE",
      position: "Оператор БпЛА",
      recruitmentType: "CONTRACT_18_24",
      channel: "DIRECT",
      note: "Передумав, обрав інший підрозділ.",
      responsibleUserId: recruiter.id,
      createdAt: d(6, 10),
    },
    [
      { to: "NEW", at: d(6, 10) },
      { to: "SELF_WITHDREW", at: d(6, 18) },
    ],
  );

  // В роботі зараз (липень) — збирає документи.
  await createCandidate(
    {
      fullName: "Микола Шевченко",
      age: 31,
      gender: "MALE",
      position: "Сапер",
      recruitmentType: "CONTRACT",
      channel: "DIRECT",
      unitId: unitSup.id,
      responsibleUserId: admin.id,
      createdAt: d(7, 5),
    },
    [
      { to: "NEW", at: d(7, 5) },
      { to: "IN_PROGRESS", at: d(7, 7) },
      { to: "COLLECTING_DOCS", at: d(7, 12) },
    ],
  );

  // Новий цього місяця.
  await createCandidate(
    {
      fullName: "Дмитро Бондар",
      age: 26,
      gender: "MALE",
      position: "Стрілець",
      recruitmentType: "CONTRACT_18_24",
      channel: "DIRECT",
      responsibleUserId: recruiter.id,
      createdAt: d(7, 18),
    },
    [{ to: "NEW", at: d(7, 18) }],
  );

  // Перенесений активний: доданий у червні, ВЛК триває в липні.
  await createCandidate(
    {
      fullName: "Василь Гнатюк",
      age: 39,
      gender: "MALE",
      position: "Кухар",
      recruitmentType: "MOBILIZATION",
      channel: "RECRUITING_CENTER",
      unitId: unit1.id,
      responsibleUserId: admin.id,
      createdAt: d(6, 28),
    },
    [
      { to: "NEW", at: d(6, 28) },
      { to: "MEDICAL_COMMISSION", at: d(7, 2) },
    ],
  );

  console.log("Seed завершено. Кандидатів: 7, користувачів: 2, підрозділів: 3.");
  console.log("Вхід адміна: admin@rex.local / admin123");
  console.log("Вхід рекрутера: recruiter@rex.local / recruiter123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
