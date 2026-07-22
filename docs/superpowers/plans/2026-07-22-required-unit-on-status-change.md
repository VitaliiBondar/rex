# Обов'язковий підрозділ при виході зі статусу «Пошук підрозділу» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перед тим як кандидат вийде зі статусу `UNIT_SEARCH` у будь-який
статус, окрім відмов, вимагати вказаний підрозділ — з єдиною перевіркою на
сервері й спільною модалкою вибору підрозділу на всіх трьох поверхнях UI
(канбан, список кандидатів, сторінка кандидата).

**Architecture:** Чисте правило `requiresUnitAssignment(fromStatus, toStatus)`
у `src/lib/domain.ts`. Сервер-екшен `changeCandidateStatus` — єдина точка
входу для зміни статусу з усіх трьох UI — перевіряє правило й, якщо
підрозділ відсутній, повертає `{ ok: false, code: "NEEDS_UNIT" }` замість
запису в БД; той самий виклик може одразу прийняти `unitId`, щоб застосувати
підрозділ і статус атомарно. Клієнтські компоненти реагують на цей код,
показуючи спільну модалку `RequireUnitModal`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7
(SQLite, better-sqlite3 driver adapter), Zod, Vitest, dnd-kit.

## Global Constraints

- Правило: `requiresUnitAssignment = fromStatus === "UNIT_SEARCH" && toStatus !== "REJECTED_BY_US" && toStatus !== "SELF_WITHDREW"`.
- Перевірка виконується ВИКЛЮЧНО на сервері в `changeCandidateStatus` — клієнтський код лише реагує на код помилки `"NEEDS_UNIT"`, не дублює правило.
- Джерело правди для поточного статусу й підрозділу кандидата — БД (fetch у самій дії), не значення з клієнта.
- Форма створення кандидата (`candidateSchema`) не змінюється — підрозділ і надалі необов'язковий при створенні.
- UI-текст українською, консистентний із рештою застосунку.

---

## Task 1: Доменне правило `requiresUnitAssignment` + тест

**Files:**
- Modify: `src/lib/domain.ts` (додати функцію в кінець файлу)
- Create: `src/lib/domain.test.ts`

**Interfaces:**
- Produces: `requiresUnitAssignment(fromStatus: string, toStatus: string): boolean` — імпортується в Task 2 (`src/lib/actions/candidates.ts`).

- [ ] **Step 1: Написати тест, що впаде**

Створити `src/lib/domain.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { requiresUnitAssignment } from "./domain";

describe("requiresUnitAssignment", () => {
  it("вимагає підрозділ при виході з UNIT_SEARCH у активний статус", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "COLLECTING_DOCS")).toBe(true);
    expect(requiresUnitAssignment("UNIT_SEARCH", "MEDICAL_COMMISSION")).toBe(true);
    expect(requiresUnitAssignment("UNIT_SEARCH", "CONTRACT_SIGNING")).toBe(true);
  });

  it("вимагає підрозділ при зарахуванні напряму з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "ENLISTED")).toBe(true);
  });

  it("НЕ вимагає підрозділ для відмов з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("UNIT_SEARCH", "REJECTED_BY_US")).toBe(false);
    expect(requiresUnitAssignment("UNIT_SEARCH", "SELF_WITHDREW")).toBe(false);
  });

  it("НЕ вимагає підрозділ для переходів, що не починаються з UNIT_SEARCH", () => {
    expect(requiresUnitAssignment("COLLECTING_DOCS", "MEDICAL_COMMISSION")).toBe(false);
    expect(requiresUnitAssignment("MEDICAL_COMMISSION", "CONTRACT_SIGNING")).toBe(false);
    expect(requiresUnitAssignment("CONTRACT_SIGNING", "ENLISTED")).toBe(false);
    expect(requiresUnitAssignment("COLLECTING_DOCS", "REJECTED_BY_US")).toBe(false);
  });
});
```

- [ ] **Step 2: Перевірити, що тест падає**

Run: `npx vitest run src/lib/domain.test.ts`
Expected: FAIL — `requiresUnitAssignment is not a function` (або аналогічна помилка імпорту).

- [ ] **Step 3: Реалізувати мінімальну функцію**

Додати в кінець `src/lib/domain.ts`:

```ts
// Чи потрібен вказаний підрозділ, щоб дозволити цей перехід статусу.
// Підрозділ обов'язковий, коли кандидат покидає «Пошук підрозділу» заради
// просування конвеєром — але не для відмов (це завершення шляху).
export function requiresUnitAssignment(
  fromStatus: string,
  toStatus: string,
): boolean {
  return (
    fromStatus === "UNIT_SEARCH" &&
    toStatus !== "REJECTED_BY_US" &&
    toStatus !== "SELF_WITHDREW"
  );
}
```

- [ ] **Step 4: Перевірити, що тест проходить**

Run: `npx vitest run src/lib/domain.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain.ts src/lib/domain.test.ts
git commit -m "Add requiresUnitAssignment domain rule for status transitions"
```

---

## Task 2: Серверна перевірка в `changeCandidateStatus`

**Files:**
- Modify: `src/lib/validation.ts:39-42` (`statusChangeSchema`)
- Modify: `src/lib/actions/candidates.ts:8-10` (`ActionResult`), `:78-112` (`changeCandidateStatus`)

**Interfaces:**
- Consumes: `requiresUnitAssignment` з `src/lib/domain.ts` (Task 1).
- Produces:
  - `ActionResult` тепер `{ ok: true; id?: string } | { ok: false; error: string; code?: "NEEDS_UNIT" }` — використовується в Task 3 (`RequireUnitModal` не імпортує це напряму, але Task 4/5 читають `result.code`).
  - `changeCandidateStatus(input: unknown): Promise<ActionResult>` приймає `{ candidateId: string; status: string; unitId?: string }`.

- [ ] **Step 1: Розширити `statusChangeSchema`**

У `src/lib/validation.ts` знайти:

```ts
export const statusChangeSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(STATUSES),
});
```

Замінити на:

```ts
export const statusChangeSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(STATUSES),
  unitId: z.string().min(1).optional(),
});
```

- [ ] **Step 2: Розширити тип `ActionResult`**

У `src/lib/actions/candidates.ts` знайти:

```ts
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };
```

Замінити на:

```ts
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; code?: "NEEDS_UNIT" };
```

- [ ] **Step 3: Додати перевірку в `changeCandidateStatus`**

Додати імпорт нагорі `src/lib/actions/candidates.ts` (поруч з іншими імпортами з `@/lib/validation`):

```ts
import { candidateSchema, statusChangeSchema } from "@/lib/validation";
import { requiresUnitAssignment } from "@/lib/domain";
```

Замінити тіло `changeCandidateStatus` (рядки 78-112) на:

```ts
export async function changeCandidateStatus(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Некоректний статус" };
  }
  const { candidateId, status, unitId } = parsed.data;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { status: true, unitId: true },
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

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status,
      ...(unitId ? { unitId } : {}),
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
```

- [ ] **Step 4: Перевірити типи й наявні тести**

Run: `npx tsc --noEmit`
Expected: без нових помилок типів у `src/lib/actions/candidates.ts` і `src/lib/validation.ts`.

Run: `npm test`
Expected: усі наявні тести (включно з Task 1) проходять — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/actions/candidates.ts
git commit -m "Enforce unit assignment before leaving UNIT_SEARCH in changeCandidateStatus"
```

---

## Task 3: Спільний компонент `RequireUnitModal`

**Files:**
- Create: `src/components/require-unit-modal.tsx`

**Interfaces:**
- Consumes: `Modal` з `src/components/ui/modal.tsx` (`{ open, onClose, title, children }`), `Select` з `src/components/ui/input.tsx`, `Button` з `src/components/ui/button.tsx`.
- Produces: `RequireUnitModal({ open, units, pending, onClose, onConfirm })` — React-компонент, використовується в Task 4 (`board-client.tsx`) і Task 5 (`status-select.tsx`).
  - `units: { id: string; name: string }[]`
  - `pending?: boolean` — дизейблить кнопку підтвердження під час запиту.
  - `onClose: () => void`
  - `onConfirm: (unitId: string) => void`

- [ ] **Step 1: Створити компонент**

Створити `src/components/require-unit-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RequireUnitModal({
  open,
  units,
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  units: { id: string; name: string }[];
  pending?: boolean;
  onClose: () => void;
  onConfirm: (unitId: string) => void;
}) {
  const [unitId, setUnitId] = useState("");

  useEffect(() => {
    if (!open) setUnitId("");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Вкажіть підрозділ">
      <p className="text-sm text-ink-soft mb-4">
        Перш ніж рухати кандидата далі конвеєром, потрібно вказати підрозділ.
      </p>
      <Select
        aria-label="Підрозділ"
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
      >
        <option value="">Оберіть підрозділ…</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Скасувати
        </Button>
        <Button
          disabled={!unitId || pending}
          onClick={() => onConfirm(unitId)}
        >
          Зберегти й перейти
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок типів у новому файлі.

- [ ] **Step 3: Commit**

```bash
git add src/components/require-unit-modal.tsx
git commit -m "Add shared RequireUnitModal component"
```

---

## Task 4: Підключення до канбану

**Files:**
- Modify: `src/app/(app)/board/board-client.tsx`
- Modify: `src/app/(app)/board/page.tsx`

**Interfaces:**
- Consumes: `RequireUnitModal` (Task 3), `changeCandidateStatus` тепер повертає `ActionResult` з можливим `code: "NEEDS_UNIT"` (Task 2), `getUnits()` з `src/lib/queries.ts`.

- [ ] **Step 1: Прокинути `units` із сторінки в `BoardClient`**

У `src/app/(app)/board/page.tsx` замінити:

```tsx
import { PageHeader } from "@/components/page-header";
import { getCandidates } from "@/lib/queries";
import { BoardClient, type BoardCandidate } from "./board-client";

export default async function BoardPage() {
  const candidates = await getCandidates();
```

на:

```tsx
import { PageHeader } from "@/components/page-header";
import { getCandidates, getUnits } from "@/lib/queries";
import { BoardClient, type BoardCandidate } from "./board-client";

export default async function BoardPage() {
  const [candidates, units] = await Promise.all([
    getCandidates(),
    getUnits(),
  ]);
```

І нижче в JSX замінити:

```tsx
      <BoardClient initial={cards} />
```

на:

```tsx
      <BoardClient initial={cards} units={units} />
```

- [ ] **Step 2: Оновити `BoardClient` — пропси, стан, `applyStatusChange`**

У `src/app/(app)/board/board-client.tsx` додати імпорт (поруч з іншими):

```tsx
import { RequireUnitModal } from "@/components/require-unit-modal";
```

Замінити сигнатуру компонента:

```tsx
export function BoardClient({ initial }: { initial: BoardCandidate[] }) {
```

на:

```tsx
export function BoardClient({
  initial,
  units,
}: {
  initial: BoardCandidate[];
  units: { id: string; name: string }[];
}) {
```

Додати новий стан поруч із `pendingReject`:

```tsx
  const [pendingUnit, setPendingUnit] = useState<{
    cardId: string;
    status: string;
  } | null>(null);
```

Замінити `applyStatusChange`:

```tsx
  const applyStatusChange = (cardId: string, status: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status } : c)),
    );
    changeCandidateStatus({ candidateId: cardId, status });
  };
```

на:

```tsx
  const applyStatusChange = async (
    cardId: string,
    status: string,
    unitId?: string,
  ) => {
    const previousStatus = cards.find((c) => c.id === cardId)?.status;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status } : c)),
    );
    const result = await changeCandidateStatus({
      candidateId: cardId,
      status,
      unitId,
    });
    if (!result.ok) {
      if (previousStatus) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId ? { ...c, status: previousStatus } : c,
          ),
        );
      }
      if (result.code === "NEEDS_UNIT") {
        setPendingUnit({ cardId, status });
      }
    }
  };
```

- [ ] **Step 3: Додати `RequireUnitModal` у JSX**

Знайти блок з існуючою модалкою відмови (`<Modal open={pendingReject !== null} ...>`) і одразу після її закриваючого `</Modal>` (перед закриваючим `</DndContext>`) додати:

```tsx
      <RequireUnitModal
        open={pendingUnit !== null}
        units={units}
        onClose={() => setPendingUnit(null)}
        onConfirm={(unitId) => {
          if (pendingUnit) {
            applyStatusChange(pendingUnit.cardId, pendingUnit.status, unitId);
          }
          setPendingUnit(null);
        }}
      />
```

- [ ] **Step 4: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок типів у `board-client.tsx` і `board/page.tsx`.

- [ ] **Step 5: Ручна перевірка в браузері**

Run: `npm run dev`, залогінитись (`admin@rex.local` / пароль з `.env` або `admin123` за замовчуванням), відкрити `/board`.

1. Перетягнути картку зі статусом «Пошук підрозділу» **без вказаного підрозділу** в колонку «Збір документів» → очікується модалка «Вкажіть підрозділ»; картка залишається у вихідній колонці, доки модалку не підтверджено.
2. Обрати підрозділ і натиснути «Зберегти й перейти» → картка переїжджає в «Збір документів», статус і підрозділ збережені (перевірити перезавантаженням сторінки).
3. Натиснути «Скасувати» в модалці (для іншого кандидата без підрозділу) → картка лишається на місці, БД не змінена.
4. Перетягнути картку зі статусом «Пошук підрозділу» в колонку «Відмови» → модалка причини відмови з'являється як і раніше, без вимоги підрозділу.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/board/board-client.tsx" "src/app/(app)/board/page.tsx"
git commit -m "Require unit selection when dragging a candidate out of UNIT_SEARCH on the board"
```

---

## Task 5: Підключення до `StatusSelect` (список і сторінка кандидата)

**Files:**
- Modify: `src/components/status-select.tsx`
- Modify: `src/app/(app)/candidates/candidate-list.tsx`
- Modify: `src/app/(app)/candidates/page.tsx`
- Modify: `src/app/(app)/candidates/[id]/page.tsx`

**Interfaces:**
- Consumes: `RequireUnitModal` (Task 3), `changeCandidateStatus` з `code: "NEEDS_UNIT"` (Task 2), `getUnits()` з `src/lib/queries.ts`.

- [ ] **Step 1: Оновити `StatusSelect`**

Замінити повний вміст `src/components/status-select.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { STATUSES, STATUS_LABELS } from "@/lib/domain";
import { changeCandidateStatus } from "@/lib/actions/candidates";
import { RequireUnitModal } from "@/components/require-unit-modal";
import { cn } from "@/lib/utils";

// Швидка зміна статусу з фіксацією в історії.
export function StatusSelect({
  candidateId,
  status,
  units,
  className,
}: {
  candidateId: string;
  status: string;
  units: { id: string; name: string }[];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const apply = (next: string, unitId?: string) => {
    startTransition(async () => {
      const result = await changeCandidateStatus({
        candidateId,
        status: next,
        unitId,
      });
      if (!result.ok && result.code === "NEEDS_UNIT") {
        setPendingStatus(next);
      }
    });
  };

  return (
    <>
      <select
        aria-label="Змінити статус"
        value={status}
        disabled={pending}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => apply(e.target.value)}
        className={cn(
          "h-8 rounded-md border border-border-strong bg-surface px-2 pr-7 text-xs text-ink cursor-pointer appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a909c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.4rem center",
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <RequireUnitModal
        open={pendingStatus !== null}
        units={units}
        pending={pending}
        onClose={() => setPendingStatus(null)}
        onConfirm={(unitId) => {
          if (pendingStatus) apply(pendingStatus, unitId);
          setPendingStatus(null);
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Прокинути `units` у список кандидатів**

У `src/app/(app)/candidates/candidate-list.tsx` замінити сигнатуру:

```tsx
export function CandidateList({
  candidates,
  isCurrentMonth,
}: {
  candidates: CandidateRow[];
  isCurrentMonth: boolean;
}) {
```

на:

```tsx
export function CandidateList({
  candidates,
  isCurrentMonth,
  units,
}: {
  candidates: CandidateRow[];
  isCurrentMonth: boolean;
  units: { id: string; name: string }[];
}) {
```

Замінити обидва виклики (desktop, рядок ~97, і mobile, рядок ~129):

```tsx
                      <StatusSelect candidateId={c.id} status={c.status} />
```

на:

```tsx
                      <StatusSelect
                        candidateId={c.id}
                        status={c.status}
                        units={units}
                      />
```

(і аналогічно для mobile-варіанту — той самий рядок з іншим відступом).

- [ ] **Step 3: Передати `units` зі сторінки списку**

У `src/app/(app)/candidates/page.tsx` внизу файлу замінити:

```tsx
      <CandidateList candidates={candidates} isCurrentMonth={isCurrentMonth} />
```

на:

```tsx
      <CandidateList
        candidates={candidates}
        isCurrentMonth={isCurrentMonth}
        units={units}
      />
```

(`units` тут уже отримано вище через `getUnits()` — див. `const [all, units, positions] = await Promise.all([...])`, змін у fetch не потрібно.)

- [ ] **Step 4: Передати `units` на сторінці кандидата**

У `src/app/(app)/candidates/[id]/page.tsx` замінити:

```tsx
              <StatusSelect
                candidateId={candidate.id}
                status={candidate.status}
                className="h-9 text-sm"
              />
```

на:

```tsx
              <StatusSelect
                candidateId={candidate.id}
                status={candidate.status}
                units={units}
                className="h-9 text-sm"
              />
```

(`units` тут уже отримано вище через `getUnits()` — змін у fetch не потрібно.)

- [ ] **Step 5: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок типів у жодному з чотирьох файлів.

- [ ] **Step 6: Ручна перевірка в браузері**

Run: `npm run dev` (якщо ще не запущено), залогінитись.

1. На `/candidates` (поточний місяць) знайти кандидата в статусі «Пошук підрозділу» без підрозділу, обрати в `StatusSelect` інший активний статус → модалка «Вкажіть підрозділ»; після вибору й підтвердження статус і підрозділ застосовуються, рядок оновлюється.
2. На сторінці кандидата (`/candidates/[id]`) для такого ж кандидата — та сама поведінка через `StatusSelect` угорі картки статусу.
3. Обрати статус «Відмова з нашого боку» / «Сам відмовився» для кандидата без підрозділу з «Пошуку підрозділу» → застосовується одразу, без модалки.
4. Скасувати модалку → статус кандидата лишається попереднім (перевірити, що `<select>` не застряг на новому значенні).

- [ ] **Step 7: Commit**

```bash
git add src/components/status-select.tsx \
  "src/app/(app)/candidates/candidate-list.tsx" \
  "src/app/(app)/candidates/page.tsx" \
  "src/app/(app)/candidates/[id]/page.tsx"
git commit -m "Require unit selection in StatusSelect on candidates list and detail page"
```

---

## Task 6: Прогін повного набору тестів і фінальна перевірка

**Files:** немає нових/змінених файлів — лише перевірка.

- [ ] **Step 1: Повний прогін тестів**

Run: `npm test`
Expected: усі тести (наявні `stats.test.ts` + нові `domain.test.ts`) — PASS.

- [ ] **Step 2: Повна перевірка типів усього проєкту**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 3: Продакшн-збірка**

Run: `npm run build`
Expected: збірка завершується без помилок.
