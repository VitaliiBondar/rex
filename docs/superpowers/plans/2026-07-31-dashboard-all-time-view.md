# Дашборд: «Весь період» + завжди видима загальна кількість — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати на `/dashboard` опцію перегляду «Весь період» (аналог `month=all` на `/candidates`) і завжди видимий блок «Усього кандидатів» з розбивкою за типом залучення.

**Architecture:** Чотири нові чисті функції-хелпери (`stats.ts`: `activeNow`, `reachedStatusEver`, `earliestMonth`; `format.ts`: `monthsBetween`), покриті юніт-тестами за зразком наявних; `page.tsx` розгалужується на `isAll = month === "all"` і вибирає, які з наявних/нових функцій викликати; `dashboard-controls.tsx` отримує нову опцію селектора. Компоненти графіків (`charts.tsx`) не змінюються.

**Tech Stack:** Next.js 16 App Router (Server Component `page.tsx`), TypeScript, Vitest, Tailwind v4.

## Global Constraints

- Усі нові функції в `stats.ts` — чисті, без сторонніх імпортів окрім `./domain` (наявний стиль модуля).
- Кожна нова функція покривається юніт-тестом у відповідному `*.test.ts` за зразком наявних тестів (`stats.test.ts`/`format.test.ts`), включно з `makeCandidate`-хелпером зі `stats.test.ts`.
- Блок «Усього кандидатів» рахується від нефільтрованого `all` (до `filterCandidates`) — не залежить від `month`/`recruitmentType`/`channel`.
- Місяці для тренд-графіка в режимі «Весь період» рахуються від нефільтрованого `all` (не від `filtered`) — вісь графіка не змінюється при перемиканні фільтрів.
- Спек: `docs/superpowers/specs/2026-07-31-dashboard-all-time-view-design.md`.

---

### Task 1: `stats.ts::activeNow` + `stats.ts::reachedStatusEver`

**Files:**
- Modify: `src/lib/stats.ts` (додати після `activeAtEndOfMonth`, перед `countBy`)
- Test: `src/lib/stats.test.ts` (додати нові `describe`-блоки після `activeAtEndOfMonth`)

**Interfaces:**
- Consumes: `StatCandidate` (з `stats.ts`), `FINAL_STATUSES` (вже імпортовано з `./domain`).
- Produces: `activeNow(candidates: StatCandidate[]): StatCandidate[]`, `reachedStatusEver(candidates: StatCandidate[], status: string): StatCandidate[]` — обидві використовуються в Task 4 (`page.tsx`).

- [ ] **Step 1: Написати тести, що падають**

Додати в `src/lib/stats.test.ts` після блоку `describe("activeAtEndOfMonth ...)` (після рядка 146, перед `describe("countBy"...)`):

```ts
describe("activeNow", () => {
  const active = makeCandidate("active", {
    createdAt: new Date(2026, 5, 1),
    changes: [{ toStatus: "MEDICAL_COMMISSION", changedAt: new Date(2026, 5, 1) }],
  });
  const enlisted = makeCandidate("enlisted", {
    createdAt: new Date(2026, 5, 1),
    changes: [{ toStatus: "ENLISTED", changedAt: new Date(2026, 5, 1) }],
  });
  const rejected = makeCandidate("rejected", {
    createdAt: new Date(2026, 5, 1),
    changes: [{ toStatus: "REJECTED_BY_US", changedAt: new Date(2026, 5, 1) }],
  });

  it("повертає лише кандидатів із живим нефінальним статусом", () => {
    const result = activeNow([active, enlisted, rejected]);
    expect(result.map((c) => c.id)).toEqual(["active"]);
  });

  it("порожній список на вході — порожній на виході", () => {
    expect(activeNow([])).toEqual([]);
  });
});

describe("reachedStatusEver", () => {
  const enlistedLongAgo = makeCandidate("a", {
    createdAt: new Date(2026, 0, 1),
    changes: [
      { toStatus: "UNIT_SEARCH", changedAt: new Date(2026, 0, 1) },
      { toStatus: "ENLISTED", changedAt: new Date(2026, 1, 1) },
    ],
  });
  const stillActive = makeCandidate("b", {
    createdAt: new Date(2026, 5, 1),
    changes: [{ toStatus: "UNIT_SEARCH", changedAt: new Date(2026, 5, 1) }],
  });

  it("рахує незалежно від того, як давно відбувся перехід", () => {
    const result = reachedStatusEver([enlistedLongAgo, stillActive], "ENLISTED");
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("кандидат, що ніколи не досягав статусу — відсутній", () => {
    expect(reachedStatusEver([stillActive], "ENLISTED")).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустити тести, переконатись, що падають**

Run: `npm test -- --run stats.test.ts`
Expected: FAIL — `activeNow`/`reachedStatusEver` не експортуються з `./stats` (помилка імпорту чи `is not a function`).

Спершу додати їх у імпорт на початку `stats.test.ts` (рядок 1-14): додати `activeNow, reachedStatusEver,` у список імпортованих імен з `"./stats"`.

- [ ] **Step 3: Реалізувати мінімальний код**

У `src/lib/stats.ts` додати після функції `activeAtEndOfMonth` (після рядка 86, перед коментарем `// ── Групування`):

```ts
// ── Активні зараз (живий статус, без реконструкції на дату) ─────────────────
export function activeNow(candidates: StatCandidate[]): StatCandidate[] {
  const finals: readonly string[] = FINAL_STATUSES;
  return candidates.filter((c) => !finals.includes(c.status));
}

// ── Колись досягли статусу (без обмеження місяцем) ──────────────────────────
export function reachedStatusEver(
  candidates: StatCandidate[],
  status: string,
): StatCandidate[] {
  return candidates.filter((c) =>
    c.statusChanges.some((ch) => ch.toStatus === status),
  );
}
```

- [ ] **Step 4: Запустити тести, переконатись, що проходять**

Run: `npm test -- --run stats.test.ts`
Expected: PASS (усі тести файлу, включно з новими).

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "Add activeNow and reachedStatusEver stats helpers"
```

---

### Task 2: `stats.ts::earliestMonth`

**Files:**
- Modify: `src/lib/stats.ts` (додати одразу після `activeNow`/`reachedStatusEver` з Task 1)
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `StatCandidate.createdAt`.
- Produces: `earliestMonth(candidates: StatCandidate[], now?: Date): string` (формат `"YYYY-MM"`) — використовується в Task 4 (`page.tsx`) як вхід для `monthsBetween` з Task 3.

- [ ] **Step 1: Написати тести, що падають**

Додати в `src/lib/stats.test.ts` після блоків з Task 1:

```ts
describe("earliestMonth", () => {
  it("повертає місяць найранішого createdAt", () => {
    const candidates = [
      makeCandidate("a", {
        createdAt: new Date(2026, 5, 15),
        changes: [{ toStatus: "UNIT_SEARCH", changedAt: new Date(2026, 5, 15) }],
      }),
      makeCandidate("b", {
        createdAt: new Date(2026, 2, 1),
        changes: [{ toStatus: "UNIT_SEARCH", changedAt: new Date(2026, 2, 1) }],
      }),
      makeCandidate("c", {
        createdAt: new Date(2026, 6, 1),
        changes: [{ toStatus: "UNIT_SEARCH", changedAt: new Date(2026, 6, 1) }],
      }),
    ];
    expect(earliestMonth(candidates)).toBe("2026-03");
  });

  it("порожній список — повертає поточний місяць за now", () => {
    expect(earliestMonth([], new Date(2026, 6, 20))).toBe("2026-07");
  });
});
```

Оновити імпорт на початку файлу: додати `earliestMonth,` у список.

- [ ] **Step 2: Запустити тести, переконатись, що падають**

Run: `npm test -- --run stats.test.ts`
Expected: FAIL — `earliestMonth` не визначена.

- [ ] **Step 3: Реалізувати мінімальний код**

У `src/lib/stats.ts` додати одразу після `reachedStatusEver`:

```ts
// ── Місяць найранішого додавання (для діапазону "весь період") ──────────────
export function earliestMonth(candidates: StatCandidate[], now: Date = new Date()): string {
  const asMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (candidates.length === 0) return asMonth(now);
  const min = candidates.reduce(
    (m, c) => (c.createdAt < m ? c.createdAt : m),
    candidates[0].createdAt,
  );
  return asMonth(min);
}
```

- [ ] **Step 4: Запустити тести, переконатись, що проходять**

Run: `npm test -- --run stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "Add earliestMonth stats helper"
```

---

### Task 3: `format.ts::monthsBetween`

**Files:**
- Modify: `src/lib/format.ts` (додати після `lastMonths`)
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Consumes: `nextMonth` (вже визначена в цьому ж файлі, рядок 24-28).
- Produces: `monthsBetween(start: string, end: string): string[]` — використовується в Task 4 (`page.tsx`) разом з `earliestMonth` із Task 2.

- [ ] **Step 1: Написати тести, що падають**

Спершу змінити рядок імпорту на початку `src/lib/format.test.ts` (рядок 2)
з:

```ts
import { nextMonth, previousMonth } from "./format";
```

на:

```ts
import { nextMonth, previousMonth, monthsBetween } from "./format";
```

Потім додати в `src/lib/format.test.ts` після блоку `describe("previousMonth"...)`:

```ts
describe("monthsBetween", () => {
  it("повертає інклюзивний список місяців від start до end", () => {
    expect(monthsBetween("2026-05", "2026-07")).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("коректно переходить через межу року", () => {
    expect(monthsBetween("2025-11", "2026-01")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("start === end — список з одного місяця", () => {
    expect(monthsBetween("2026-07", "2026-07")).toEqual(["2026-07"]);
  });
});
```

- [ ] **Step 2: Запустити тести, переконатись, що падають**

Run: `npm test -- --run format.test.ts`
Expected: FAIL — `monthsBetween` не експортується.

- [ ] **Step 3: Реалізувати мінімальний код**

У `src/lib/format.ts` додати після функції `lastMonths` (після рядка 52):

```ts
// Інклюзивний список місяців від start до end (для діапазону "весь період").
export function monthsBetween(start: string, end: string): string[] {
  const result: string[] = [start];
  let cur = start;
  while (cur !== end) {
    cur = nextMonth(cur);
    result.push(cur);
  }
  return result;
}
```

- [ ] **Step 4: Запустити тести, переконатись, що проходять**

Run: `npm test -- --run format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "Add monthsBetween format helper"
```

---

### Task 4: Дашборд — селектор «Весь період» + гілка `isAll` у `page.tsx`

**Files:**
- Modify: `src/app/(app)/dashboard/dashboard-controls.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `activeNow`, `reachedStatusEver`, `earliestMonth` (Task 1-2, з `@/lib/stats`), `monthsBetween` (Task 3, з `@/lib/format`), наявні `addedInMonth`, `activeAtEndOfMonth`, `reachedStatusInMonth`, `countBy`, `monthlyTrend`, `filterCandidates` (усі вже імпортовані в `page.tsx`), наявний компонент `Kpi` (визначений у самому `page.tsx`, рядки 151-168), `RECRUITMENT_TYPES`/`RECRUITMENT_TYPE_LABELS` (вже імпортовані з `@/lib/domain`).
- Produces: немає (кінцева UI-задача цього плану) — але сторінка після цього завдання повністю відповідає спеку.

Це UI-задача без юніт-тестів (аналогічно наявним React-компонентам проєкту — вони не покриті юніт-тестами, лише `stats.ts`/`format.ts`/`domain.ts`). Перевірка — ручна, в кінці задачі (Step 4).

- [ ] **Step 1: Додати опцію «Весь період» у селектор місяця**

У `src/app/(app)/dashboard/dashboard-controls.tsx`, у першому `<select>` (рядки 35-46), додати нову опцію одразу після закриття `.map(...)` і перед закриваючим `</select>`:

```tsx
      <select
        value={currentMonth}
        onChange={(e) => setParam("month", e.target.value)}
        className={selectClass}
        aria-label="Місяць"
      >
        {[...months].reverse().map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
        <option value="all">Весь період</option>
      </select>
```

- [ ] **Step 2: Розгалужити обчислення в `page.tsx`**

У `src/app/(app)/dashboard/page.tsx` замінити блок від `const added = addedInMonth(filtered, month);` до кінця обчислення `trend` (рядки 49-95) на:

```ts
  const isAll = month === "all";
  const monthOptions = lastMonths(6); // фіксований список для селектора контролів

  const added = isAll ? filtered : addedInMonth(filtered, month);
  const enlisted = isAll
    ? reachedStatusEver(filtered, "ENLISTED").length
    : reachedStatusInMonth(filtered, "ENLISTED", month).length;
  const rejected = isAll
    ? reachedStatusEver(filtered, "REJECTED_BY_US").length
    : reachedStatusInMonth(filtered, "REJECTED_BY_US", month).length;
  const selfWithdrew = isAll
    ? reachedStatusEver(filtered, "SELF_WITHDREW").length
    : reachedStatusInMonth(filtered, "SELF_WITHDREW", month).length;
  const active = isAll ? activeNow(filtered) : activeAtEndOfMonth(filtered, month);

  // Розподіл активних по етапах.
  const activeByStatus = countBy(active, (c) => c.status);
  const stageData: NamedDatum[] = ACTIVE_STATUSES.filter(
    (s) => activeByStatus[s],
  ).map((s) => ({
    name: STATUS_LABELS[s],
    value: activeByStatus[s],
    fill: STATUS_COLORS[s],
  }));

  // Розподіл доданих (або всіх — у режимі "Весь період") по типах і каналах.
  const addedByType = countBy(added, (c) => c.recruitmentType);
  const typeData: NamedDatum[] = RECRUITMENT_TYPES.filter(
    (t) => addedByType[t],
  ).map((t) => ({
    name: RECRUITMENT_TYPE_LABELS[t],
    value: addedByType[t],
    fill: RECRUITMENT_TYPE_COLORS[t],
  }));

  const addedByChannel = countBy(added, (c) => c.channel);
  const channelData: NamedDatum[] = CHANNELS.filter(
    (c) => addedByChannel[c],
  ).map((c) => ({
    name: CHANNEL_LABELS[c],
    value: addedByChannel[c],
    fill: CHANNEL_COLORS[c],
  }));

  // Тренд: 6 місяців, або повна історія в режимі "Весь період" (діапазон —
  // від нефільтрованого `all`, щоб вісь не змінювалась при зміні фільтрів).
  const trendMonths = isAll
    ? monthsBetween(earliestMonth(all), currentMonth())
    : lastMonths(6);
  const trend = monthlyTrend(filtered, trendMonths).map((p) => ({
    month: format(
      new Date(Number(p.month.split("-")[0]), Number(p.month.split("-")[1]) - 1),
      "LLL",
      { locale: uk },
    ),
    Додані: p.added,
    Зараховано: p.enlisted,
    Відмови: p.rejected + p.selfWithdrew,
  }));
```

Далі, на рядку 102 (`<DashboardControls months={trendMonths} currentMonth={month} />`),
замінити проп `months={trendMonths}` на `months={monthOptions}` — селектор
контролів і надалі показує лише останні 6 місяців + «Весь період» (не всю
історію), тоді як `trendMonths` тепер використовується окремо, лише для
самого тренд-графіка:

```tsx
        <DashboardControls months={monthOptions} currentMonth={month} />
```

Оновити рядок імпорту функцій зі `stats.ts` (рядок 6-13): додати `activeNow, reachedStatusEver, earliestMonth,`. Оновити рядок імпорту з `format.ts` (рядок 25): додати `monthsBetween,`.

- [ ] **Step 3: Оновити підпис періоду, заголовки карток і додати блок «Усього кандидатів»**

У `src/app/(app)/dashboard/page.tsx`, замінити рядок підпису (колишній рядок 103-105):

```tsx
        <p className="mt-2 text-sm text-ink-soft">
          Показники за <span className="font-medium text-ink">{monthLabel(month)}</span>
        </p>
```

на:

```tsx
        <p className="mt-2 text-sm text-ink-soft">
          Показники за{" "}
          <span className="font-medium text-ink">
            {isAll ? "весь час" : monthLabel(month)}
          </span>
        </p>
```

Одразу після відкриваючого `<div className="p-4 sm:p-6 flex flex-col gap-6">` (колишній рядок 108) і перед коментарем `{/* KPI */}`, додати новий завжди видимий блок (рахується від нефільтрованого `all`, не від `filtered`):

```tsx
        {/* Усього кандидатів — завжди видимо, незалежно від місяця/фільтрів */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Усього кандидатів" value={all.length} accent="ink" />
          {RECRUITMENT_TYPES.map((t) => (
            <Kpi
              key={t}
              label={RECRUITMENT_TYPE_LABELS[t]}
              value={countBy(all, (c) => c.recruitmentType)[t] ?? 0}
            />
          ))}
        </div>
```

Замінити лейбл першої KPI-картки (колишній рядок 111):

```tsx
          <Kpi label="Нових за місяць" value={added.length} />
```

на:

```tsx
          <Kpi label={isAll ? "Додано всього" : "Нових за місяць"} value={added.length} />
```

Замінити заголовок картки тренду (колишній рядок 120):

```tsx
            <p className="eyebrow mb-4">Динаміка за 6 місяців</p>
```

на:

```tsx
            <p className="eyebrow mb-4">
              {isAll ? "Динаміка за весь час" : "Динаміка за 6 місяців"}
            </p>
```

- [ ] **Step 4: Ручна перевірка в браузері**

Запустити дев-сервер (`npm run dev`), відкрити `http://localhost:3000/dashboard`:
1. Переконатись, що новий рядок «Усього кандидатів» + картки по типах видно одразу, і числа не змінюються при перемиканні місяця чи фільтрів.
2. Обрати «Весь період» у селекторі місяця — перевірити: підпис змінюється на «Показники за весь час», перша KPI-картка — «Додано всього», заголовок тренду — «Динаміка за весь час», графік тренду показує більше стовпчиків, ніж 6 (якщо в seed-даних є кілька місяців).
3. У режимі «Весь період» застосувати фільтр `recruitmentType` — переконатись, що KPI/пироги звужуються, а вісь тренд-графіка (кількість і підписи місяців) не змінюється.
4. Повернутись до конкретного місяця — переконатись, що поведінка ідентична попередній (до змін) реалізації.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard/dashboard-controls.tsx" "src/app/(app)/dashboard/page.tsx"
git commit -m "Add all-time view and always-visible totals to dashboard"
```

---

### Task 5: Прогнати повний набір тестів і типчек

**Files:** немає нових — фінальна перевірка всього плану разом.

- [ ] **Step 1: Юніт-тести**

Run: `npm test -- --run`
Expected: усі тести (наявні + нові з Task 1-3) — PASS.

- [ ] **Step 2: Типчек**

Run: `npx tsc --noEmit`
Expected: без помилок.

- [ ] **Step 3: Commit (лише якщо Step 1-2 щось поправили)**

Якщо обидва кроки пройшли без правок — коміт не потрібен, задача завершена комітом з Task 4.
