// Генерація Word-документів (наразі: "Повідомлення про зарахування").
// Офлайн: shevchenko (відмінювання ПІБ) + docxtemplater/pizzip (заповнення .docx-шаблону).

import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { inGenitive, detectGender, GrammaticalGender } from "shevchenko";
import type { TckType } from "@/lib/domain";
import { formatDate } from "@/lib/format";

// Родовий відмінок прикметника-топоніма на "-ий" (Рівненський → Рівненського).
// Покриває стандартний патерн "-ський"/"-цький", яким названі всі відомі ТЦК;
// екзотичні винятки — поза межами цієї задачі.
function declineAdjectiveGenitive(adjective: string): string {
  return adjective.replace(/ий$/, "ого");
}

const TCK_TYPE_GENITIVE_PHRASE: Record<TckType, string> = {
  OMTCK:
    "об'єднаного міського територіального центру комплектування та соціальної підтримки",
  RTCK: "районного територіального центру комплектування та соціальної підтримки",
  MTCK: "міського територіального центру комплектування та соціальної підтримки",
};

export function tckGenitive(tckRegion: string, tckType: TckType): string {
  return `${declineAdjectiveGenitive(tckRegion)} ${TCK_TYPE_GENITIVE_PHRASE[tckType]}`;
}

const RECRUITMENT_TYPE_DOCUMENT_TEXT: Record<string, string> = {
  MOBILIZATION: "за призовом під час мобілізації на особливий період",
  CONTRACT: "за контрактом",
  CONTRACT_18_24: "за контрактом",
  NEW_CONTRACT: "за контрактом",
};

// Присвійний займенник ("...зарахування його/її до списків...") за статтю.
function possessivePronoun(gender: string | null): string {
  return gender === "FEMALE" ? "її" : "його";
}

function splitFullName(fullName: string): {
  familyName?: string;
  givenName?: string;
  patronymicName?: string;
} {
  const [familyName, givenName, patronymicName] = fullName.trim().split(/\s+/);
  return { familyName, givenName, patronymicName };
}

export async function fullNameGenitive(
  fullName: string,
  gender: string | null,
): Promise<string> {
  const parts = splitFullName(fullName);
  const grammaticalGender =
    gender === "FEMALE"
      ? GrammaticalGender.FEMININE
      : gender === "MALE"
        ? GrammaticalGender.MASCULINE
        : ((await detectGender(parts)) ?? GrammaticalGender.MASCULINE);

  const declined = await inGenitive({ gender: grammaticalGender, ...parts });
  return [
    declined.familyName?.toUpperCase(),
    declined.givenName,
    declined.patronymicName,
  ]
    .filter(Boolean)
    .join(" ");
}

export type EnlistmentNoticeCandidate = {
  fullName: string;
  gender: string | null;
  recruitmentType: string;
  orderNumber: string;
  tckRegion: string;
  tckType: TckType;
  enlistedAt: Date;
};

type NoticeFields = {
  TCK: string;
  name: string;
  type: string;
  number: string;
  date: string;
  sex: string;
};

async function buildNoticeFields(
  candidate: EnlistmentNoticeCandidate,
): Promise<NoticeFields> {
  return {
    TCK: tckGenitive(candidate.tckRegion, candidate.tckType),
    name: await fullNameGenitive(candidate.fullName, candidate.gender),
    type:
      RECRUITMENT_TYPE_DOCUMENT_TEXT[candidate.recruitmentType] ??
      candidate.recruitmentType,
    number: candidate.orderNumber,
    date: formatDate(candidate.enlistedAt),
    sex: possessivePronoun(candidate.gender),
  };
}

function renderTemplate(templateFileName: string, fields: NoticeFields): Buffer {
  const templatePath = path.join(process.cwd(), "templates", templateFileName);
  const zip = new PizZip(fs.readFileSync(templatePath));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(fields);
  return doc.getZip().generate({ type: "nodebuffer" });
}

// Два супровідних листи для зарахованого кандидата — до ТЦК і напряму до
// центру рекрутингу — генеруються завжди разом, пакуються в один .zip.
export async function buildEnlistmentDocumentsZip(
  candidate: EnlistmentNoticeCandidate,
): Promise<Buffer> {
  const fields = await buildNoticeFields(candidate);
  const tckDoc = renderTemplate("message.docx", fields);
  const recruitingCenterDoc = renderTemplate("message2.docx", fields);

  const zip = new PizZip();
  zip.file("Повідомлення ТЦК.docx", tckDoc);
  zip.file("Повідомлення центру рекрутингу.docx", recruitingCenterDoc);
  return zip.generate({ type: "nodebuffer" });
}
