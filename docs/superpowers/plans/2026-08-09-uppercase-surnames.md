# Прізвища капслоком у таблицях і документах — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Прізвище кандидата (перше слово `fullName`) відображається ВЕЛИКИМИ ЛІТЕРАМИ всюди, де показується ім'я — у списку кандидатів, на канбані, на сторінці кандидата, і в згенерованих Word-документах. Ім'я/по батькові — без змін регістру.

**Architecture:** Дві незалежні чисто-функціональні зміни форматування виводу (без змін схеми БД чи форми редагування): `displayName()` у `src/lib/format.ts` (використовується в 4 UI-місцях через єдину функцію) і `fullNameGenitive()` у `src/lib/documents.ts` (плейсхолдер `{name}` у генерованих `.docx`).

**Tech Stack:** TypeScript, Vitest (юніт-тести), `shevchenko` (відмінювання ПІБ, вже інтегровано).

## Global Constraints

- Капслок лише на виводі — `Candidate.fullName` у БД і форма редагування (`candidate-form.tsx`) не змінюються.
- Капслоком стає ТІЛЬКИ прізвище (перше слово); ім'я та по батькові лишаються у звичайному регістрі.
- Сортування (`comparators.fullName` у `candidates/page.tsx`) і пошук (`filterCandidates`) працюють з оригінальним `fullName` з БД — не чіпати.

---

### Task 1: `displayName()` — капслок прізвища в UI

**Files:**
- Modify: `src/lib/format.ts:54-56`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `displayName(fullName: string): string` — сигнатура не змінюється, змінюється лише повернений регістр першого слова. Використовується без змін у `src/app/(app)/candidates/candidate-list.tsx`, `src/app/(app)/candidates/[id]/page.tsx`, `src/app/(app)/board/board-client.tsx`.

- [ ] **Step 1: Написати тести, що падають**

Додати в кінець `src/lib/format.test.ts`:

```ts
import { nextMonth, previousMonth, monthsBetween, displayName } from "./format";

describe("displayName", () => {
  it("прізвище стає капслоком, ім'я лишається як є", () => {
    expect(displayName("Хорхулу Роман Ігорович")).toBe("ХОРХУЛУ Роман");
  });

  it("прізвище й ім'я з двох слів (без по батькові)", () => {
    expect(displayName("Іванова Марія")).toBe("ІВАНОВА Марія");
  });

  it("лише одне слово — капслок без другого слова", () => {
    expect(displayName("Хорхулу")).toBe("ХОРХУЛУ");
  });

  it("зайві пробіли навколо й між словами ігноруються", () => {
    expect(displayName("  Хорхулу   Роман  Ігорович")).toBe("ХОРХУЛУ Роман");
  });
});
```

Імпорт `displayName` додати до наявного рядка `import { nextMonth, previousMonth, monthsBetween } from "./format";` на початку файлу (замінити на рядок вище).

- [ ] **Step 2: Прогнати тести, переконатись що падають**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `displayName` повертає `"Хорхулу Роман"` (без капслоку) замість `"ХОРХУЛУ Роман"`.

- [ ] **Step 3: Реалізувати зміну**

У `src/lib/format.ts` замінити:

```ts
// "Прізвище Ім'я [По батькові]" → перші два слова для показу в UI
// (по батькові зберігається в fullName, але ніде не відображається).
export function displayName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}
```

на:

```ts
// "Прізвище Ім'я [По батькові]" → перші два слова для показу в UI
// (по батькові зберігається в fullName, але ніде не відображається).
// Прізвище — капслоком (бюрократична конвенція), ім'я — як є.
export function displayName(fullName: string): string {
  const [surname, givenName] = fullName.trim().split(/\s+/);
  return [surname?.toUpperCase(), givenName].filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Прогнати тести, переконатись що проходять**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (усі тести в файлі, включно з наявними для `nextMonth`/`previousMonth`/`monthsBetween`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "$(cat <<'EOF'
Показувати прізвище кандидата капслоком у списку/канбані/картці

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `fullNameGenitive()` — капслок прізвища в документах

**Files:**
- Modify: `src/lib/documents.ts:51-66`
- Test (new): `src/lib/documents.test.ts`

**Interfaces:**
- Consumes: нічого з Task 1 (незалежна зміна).
- Produces: `export async function fullNameGenitive(fullName: string, gender: string | null): Promise<string>` — функція стає експортованою (раніше була приватною), сигнатура не змінюється. Продовжує використовуватись у `buildNoticeFields()` того ж файлу без змін виклику.

- [ ] **Step 1: Написати тест, що падає**

Створити `src/lib/documents.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fullNameGenitive } from "./documents";

describe("fullNameGenitive", () => {
  it("прізвище у родовому відмінку — капслоком, ім'я й по батькові — ні", async () => {
    const result = await fullNameGenitive("Хорхулу Роман Ігорович", "MALE");
    expect(result).toBe("ХОРХУЛУ Романа Ігоровича");
  });

  it("жіночий рід, без по батькові", async () => {
    const result = await fullNameGenitive("Іванова Марія", "FEMALE");
    expect(result).toBe("ІВАНОВОЇ Марії");
  });
});
```

(Очікувані відмінені форми перевірені прямим викликом `shevchenko.inGenitive`
для тих самих вхідних даних: `{"givenName":"Романа","patronymicName":"Ігоровича","familyName":"Хорхулу"}`
і `{"givenName":"Марії","familyName":"Іванової"}` — капслок додається лише
поверх `familyName`.)

- [ ] **Step 2: Прогнати тест, переконатись що падає**

Run: `npx vitest run src/lib/documents.test.ts`
Expected: FAIL — `fullNameGenitive` не є експортованою функцією (`TypeError` / `Module has no exported member 'fullNameGenitive'`).

- [ ] **Step 3: Реалізувати зміну**

У `src/lib/documents.ts` замінити:

```ts
async function fullNameGenitive(
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
  return [declined.familyName, declined.givenName, declined.patronymicName]
    .filter(Boolean)
    .join(" ");
}
```

на:

```ts
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
```

- [ ] **Step 4: Прогнати тест, переконатись що проходить**

Run: `npx vitest run src/lib/documents.test.ts`
Expected: PASS (обидва тести).

- [ ] **Step 5: Прогнати весь тестовий набір проєкту**

Run: `npm test`
Expected: PASS — усі наявні тести (`format.test.ts`, `domain.test.ts`, `stats.test.ts`, новий `documents.test.ts`) зелені, без регресій.

- [ ] **Step 6: Ручна перевірка генерації документа**

Запустити `npm run dev`, відкрити в браузері сторінку зарахованого кандидата
(`status === "ENLISTED"` з заповненими `orderNumber`/`tckRegion`/`tckType`),
натиснути кнопку генерації документа, розпакувати завантажений `.zip`,
відкрити обидва `.docx` і переконатись, що прізвище в тексті — капслоком, а
ім'я й по батькові — звичайним регістром.

- [ ] **Step 7: Commit**

```bash
git add src/lib/documents.ts src/lib/documents.test.ts
git commit -m "$(cat <<'EOF'
Показувати прізвище капслоком у згенерованих документах про зарахування

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
