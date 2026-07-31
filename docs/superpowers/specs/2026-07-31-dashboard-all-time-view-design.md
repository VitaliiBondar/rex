# Дашборд: перегляд «Весь період» і завжди видима загальна кількість

## Контекст

Дашборд (`src/app/(app)/dashboard/page.tsx`) наразі показує лише один місяць
за раз — селектор у `dashboard-controls.tsx` дозволяє обрати місяць з
останніх шести (`lastMonths(6)`), і всі KPI/графіки рахуються саме для нього
через помісячні функції `stats.ts` (`addedInMonth`, `reachedStatusInMonth`,
`activeAtEndOfMonth`, `monthlyTrend`). Аналогічна можливість «Весь період»
вже є на `/candidates` (`month-nav.tsx`, `month=all`) — тут реалізуємо той
самий принцип для дашборда, плюс окремий запит користувача: завжди видиму
загальну кількість кандидатів з розбивкою за типом залучення.

## 1. Завжди видимий блок «Усього кандидатів»

Новий рядок карток над існуючим рядком KPI у `page.tsx`. Рахується від
**нефільтрованого** `all` (результат `getCandidatesForStats()`, до
`filterCandidates`) — не залежить від вибраного місяця, `recruitmentType`
чи `channel`. Картки: «Усього кандидатів» (`all.length`) + по одній картці
на кожен `RECRUITMENT_TYPE` з лейблом з `RECRUITMENT_TYPE_LABELS` і
кількістю з `countBy(all, c => c.recruitmentType)`. Реюзається наявний
компонент `Kpi` (`page.tsx`) — новий рядок `grid-cols-2 lg:grid-cols-4`
над існуючим `grid-cols-2 lg:grid-cols-5`.

## 2. Опція «Весь період» у селекторі місяця

`dashboard-controls.tsx`: у той самий `<select>`, що й місяці, додати
`<option value="all">Весь період</option>` після реверсованого списку
`months`. Підпис під контролами в `page.tsx` — за умови `month === "all"`
показати «Показники за <span class="font-medium text-ink">весь час</span>»
замість `monthLabel(month)`.

## 3. Поведінка існуючих KPI/графіків при `month === "all"`

`page.tsx` вводить `const isAll = month === "all"` і рахує похідні дані
двома гілками замість поточних безумовних викликів `addedInMonth` /
`activeAtEndOfMonth` / `reachedStatusInMonth`:

| Показник | Помісячний режим (як зараз) | `isAll` |
|---|---|---|
| `added` (для KPI «Додано» і пирогів типу/каналу) | `addedInMonth(filtered, month)` | `filtered` |
| KPI-лейбл першої картки | «Нових за місяць» | «Додано всього» |
| `active` (для KPI «Зараз в роботі» і стовпчика етапів) | `activeAtEndOfMonth(filtered, month)` | `activeNow(filtered)` (новий, нижче) |
| `enlisted`/`rejected`/`selfWithdrew` | `reachedStatusInMonth(filtered, X, month).length` | `reachedStatusEver(filtered, X).length` (новий, нижче) |
| Заголовок тренд-картки | «Динаміка за 6 місяців» | «Динаміка за весь час» |
| Місяці для тренду (`trendMonths`) | `lastMonths(6)` | `monthsBetween(earliestMonth(all), currentMonth())` (нові, нижче) |

Пироги «За типом залучення»/«За каналом» і сам `TrendChart`/`StageBarChart`
коду не змінюють — вони й зараз просто приймають готові масиви `NamedDatum`/
`TrendDatum`, різниця лише в тому, які дані їм передають. Заголовки карток
«Додані за типом залучення»/«Додані за каналом» лишаються без змін в обох
режимах (множина відповідає і разовому місяцю, і всьому періоду).

Місячний діапазон для тренду свідомо рахується від **нефільтрованого** `all`
(не `filtered`) — так вісь графіка не змінюється при перемиканні
`recruitmentType`/`channel`, тільки самі значення стовпчиків.

## 4. Нові чисті функції

`src/lib/stats.ts` (кожна — простий фільтр за зразком існуючих функцій,
покривається тестом у `stats.test.ts` поруч з аналогічними):

```ts
// Активні зараз (живий status, без реконструкції на дату).
export function activeNow(candidates: StatCandidate[]): StatCandidate[] {
  const finals: readonly string[] = FINAL_STATUSES;
  return candidates.filter((c) => !finals.includes(c.status));
}

// Колись досягли статусу — без обмеження місяцем.
export function reachedStatusEver(
  candidates: StatCandidate[],
  status: string,
): StatCandidate[] {
  return candidates.filter((c) =>
    c.statusChanges.some((ch) => ch.toStatus === status),
  );
}

// Місяць найранішого createdAt; якщо кандидатів немає — поточний місяць.
export function earliestMonth(candidates: StatCandidate[], now = new Date()): string {
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

`earliestMonth` форматує рядок місяця напряму, а не через
`currentMonth()`/`monthLabel()` з `format.ts` — `stats.ts` навмисно не
має сторонніх імпортів окрім `domain.ts` (чисті, легко тестовані функції
без залежності від дати відображення), і цей новий helper продовжує той
самий стиль.

`src/lib/format.ts`:

```ts
// Інклюзивний список місяців від start до end (аналог lastMonths, але за межами).
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

## Що свідомо поза межами цього завдання

- Місячний `<select>` у `dashboard-controls.tsx` і надалі показує лише
  останні 6 місяців + «Весь період» — не робимо довільну навігацію по
  всіх минулих місяцях (як `month-nav.tsx` на `/candidates`), бо для
  дашборда це не запитували.
- Немає обмеження/групування тренд-графіка при дуже довгій історії
  (десятки місяців) — при поточному обсязі даних проєкту це не проблема;
  якщо стане актуальним пізніше — окрема задача.
- Блок «Усього кандидатів» не реагує на фільтри `recruitmentType`/`channel`
  навмисно (рішення підтверджене користувачем) — це стабільний загальний
  знімок, а не ще один фільтрований показник.

## Тестування

- Юніт-тести для `activeNow`, `reachedStatusEver`, `earliestMonth`
  (`stats.ts`) і `monthsBetween` (`format.ts`) — у відповідних `*.test.ts`,
  за зразком наявних тестів для `activeAtEndOfMonth`/`reachedStatusInMonth`/
  `lastMonths`.
- Ручна перевірка в браузері: відкрити `/dashboard`, переконатись що блок
  «Усього кандидатів» видно завжди (і при зміні фільтрів/місяця значення не
  міняються); обрати «Весь період» у селекторі — перевірити, що підпис,
  KPI-лейбл, заголовок тренду й самі числа коректно перемикаються;
  застосувати фільтр `recruitmentType` у режимі «Весь період» — пироги й
  KPI звужуються, а тренд-вісь (діапазон місяців) лишається незмінною.
