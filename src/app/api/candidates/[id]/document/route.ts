import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { enlistedDate } from "@/lib/stats";
import { buildEnlistmentDocumentsZip } from "@/lib/documents";
import type { TckType } from "@/lib/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      statusChanges: { select: { toStatus: true, changedAt: true } },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Кандидата не знайдено" }, { status: 404 });
  }
  if (candidate.status !== "ENLISTED") {
    return NextResponse.json(
      { error: "Кандидат ще не зарахований" },
      { status: 400 },
    );
  }
  if (!candidate.orderNumber || !candidate.tckRegion || !candidate.tckType) {
    return NextResponse.json(
      { error: "Спочатку вкажіть ТЦК і номер наказу (редагування кандидата)" },
      { status: 400 },
    );
  }

  const enlistedAt = enlistedDate(candidate);
  if (!enlistedAt) {
    return NextResponse.json(
      { error: "Не вдалось визначити дату зарахування" },
      { status: 400 },
    );
  }

  const buffer = await buildEnlistmentDocumentsZip({
    fullName: candidate.fullName,
    gender: candidate.gender,
    recruitmentType: candidate.recruitmentType,
    orderNumber: candidate.orderNumber,
    tckRegion: candidate.tckRegion,
    tckType: candidate.tckType as TckType,
    enlistedAt,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="povidomlennya-${id}.zip"`,
    },
  });
}
