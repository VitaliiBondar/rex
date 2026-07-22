# Обов'язковий підрозділ при виході зі статусу «Пошук підрозділу»

## Контекст

Кандидат створюється зі статусом `UNIT_SEARCH` («Пошук підрозділу»), і поле
`unitId` на цьому етапі необов'язкове. На практиці буває, що кандидата
просувають далі конвеєром (у «Збір документів», «Проходить ВЛК»,
«Оформлення» чи навіть одразу в «Зараховано»), так і не вказавши, до якого
підрозділу він іде. Потрібно закрити цю прогалину: перед виходом зі стану
«Пошук підрозділу» підрозділ має бути вказаний.

Статус кандидата можна змінити з трьох місць UI, усі йдуть через єдину
server action `changeCandidateStatus`:
1. Канбан-дошка (`src/app/(app)/board/board-client.tsx`) — drag&drop карток.
2. Випадаючий список `StatusSelect` на сторінці `/candidates`.
3. Той самий `StatusSelect` на сторінці кандидата `/candidates/[id]`.

## Правило

```
requiresUnitAssignment(fromStatus, toStatus) =
  fromStatus === "UNIT_SEARCH"
  && toStatus !== "REJECTED_BY_US"
  && toStatus !== "SELF_WITHDREW"
```

Тобто підрозділ обов'язковий для переходів `UNIT_SEARCH → COLLECTING_DOCS`,
`UNIT_SEARCH → MEDICAL_COMMISSION`, `UNIT_SEARCH → CONTRACT_SIGNING`,
`UNIT_SEARCH → ENLISTED`. Відмови (`REJECTED_BY_US`, `SELF_WITHDREW`) з
«Пошуку підрозділу» дозволені без підрозділу — це завершення шляху, а не
просування конвеєром. Переходи між статусами, що вже минули `UNIT_SEARCH`,
без змін — підрозділ мав бути вказаний раніше.

Функція `requiresUnitAssignment` живе в `src/lib/domain.ts` (єдине джерело
правди для доменних правил проєкту) і покривається юніт-тестом за зразком
`src/lib/stats.test.ts`.

## Архітектура: сервер — єдине джерело правди

Перевірка виконується виключно в server action `changeCandidateStatus`
(`src/lib/actions/candidates.ts`), а не дублюється в кожному UI-компоненті.
Це гарантує, що правило не можна обійти через жодну з трьох поверхонь.

### Контракт дії

`statusChangeSchema` (`src/lib/validation.ts`) отримує необов'язкове поле
`unitId`:

```ts
export const statusChangeSchema = z.object({
  candidateId: z.string().min(1),
  status: z.enum(STATUSES),
  unitId: z.string().min(1).optional(),
});
```

`ActionResult` (`src/lib/actions/candidates.ts`) отримує необов'язкове поле
`code` у гілці помилки:

```ts
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; code?: "NEEDS_UNIT" };
```

Логіка `changeCandidateStatus`:
1. Дістати поточний `candidate.status` і `candidate.unitId` з БД (джерело
   правди — не довіряти клієнту).
2. `effectiveUnitId = unitId (з payload) ?? candidate.unitId`.
3. Якщо `requiresUnitAssignment(candidate.status, status)` і
   `!effectiveUnitId` — повернути
   `{ ok: false, error: "Спочатку вкажіть підрозділ", code: "NEEDS_UNIT" }`,
   нічого не записуючи в БД.
4. Інакше виконати `prisma.candidate.update` як і раніше, додатково
   записуючи `unitId`, якщо він прийшов у payload.

Такий контракт дозволяє застосувати вибір підрозділу й зміну статусу
**однією атомарною дією** — без окремого проміжного виклику
`updateCandidate`.

## UI: спільна модалка

Новий клієнтський компонент `src/components/require-unit-modal.tsx`,
`RequireUnitModal` — обгортка над існуючим `Modal` (`ui/modal.tsx`) з
`<select>` підрозділів (реюз `Select` з `ui/input.tsx`) і кнопками
«Скасувати» / «Зберегти й перейти». Використовується ідентично в усіх трьох
місцях UI.

### Канбан (`board-client.tsx`)

- `applyStatusChange` стає `async`, приймає необов'язковий `unitId`.
- Оптимістичне оновлення статусу картки застосовується одразу (як і зараз),
  але тепер результат дії очікується (`await`).
- Якщо `result.ok === false`:
  - оптимістичну зміну статусу відкочують назад до попереднього значення;
  - якщо `result.code === "NEEDS_UNIT"` — відкривається `RequireUnitModal`
    через новий стан `pendingUnit: { cardId, status } | null`.
- Підтвердження в модалці повторює `applyStatusChange(cardId, status, unitId)`.
- Існуючий потік `pendingReject` (вибір причини відмови) лишається без змін —
  відмови не потребують підрозділу за правилом вище.
- `board/page.tsx` додатково фетчить `getUnits()` і передає `units` пропом у
  `BoardClient`.

### `StatusSelect` (список кандидатів + сторінка кандидата)

- Компонент отримує новий проп `units: { id: string; name: string }[]`.
- `onChange` викликає дію і чекає результат (замість поточного
  «fire-and-forget» без перевірки відповіді).
- При `NEEDS_UNIT` — відкриває `RequireUnitModal` (локальний стан
  `pendingStatus: string | null`); нічого не відкочувати, бо `StatusSelect`
  не робить оптимістичних оновлень — контрольоване значення `<select>`
  і так лишається прив'язаним до серверного `status` до успішної відповіді.
- Підтвердження повторює виклик дії з обраним `unitId`; після успіху
  спрацьовує наявний `revalidatePath`, і сторінка отримує оновлені дані.
- `src/app/(app)/candidates/candidate-list.tsx` і сама сторінка
  `src/app/(app)/candidates/page.tsx` отримують/прокидають `units`
  (аналогічний fetch `getUnits()` додається в `page.tsx`).
- `src/app/(app)/candidates/[id]/page.tsx` уже фетчить `getUnits()` для форми
  редагування — той самий список передається в `StatusSelect`.

## Що свідомо поза межами цього завдання

- Немає перевірки на рівні форми створення кандидата (`candidateSchema`) —
  підрозділ і надалі необов'язковий при створенні; вимога діє лише в момент
  виходу зі статусу «Пошук підрозділу».
- Немає масового ("bulk") виправлення вже існуючих кандидатів без підрозділу,
  які вже пройшли повз «Пошук підрозділу» до впровадження цього правила —
  застосовується тільки для майбутніх переходів.

## Тестування

- Юніт-тест для `requiresUnitAssignment` у `src/lib/domain.test.ts` (новий
  файл, за зразком `stats.test.ts`): усі 7 статусів як `toStatus` для
  `fromStatus = "UNIT_SEARCH"`, і кілька прикладів з іншим `fromStatus`
  (правило завжди `false`).
- Ручна перевірка через браузер (Playwright): канбан-перехід
  `UNIT_SEARCH → COLLECTING_DOCS` без підрозділу відкриває модалку; вибір
  підрозділу застосовує і статус, і підрозділ; скасування — картка
  лишається на місці. Аналогічно для `StatusSelect` на списку й на сторінці
  кандидата. Перехід у відмову без підрозділу — без модалки.
