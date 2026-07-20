@AGENTS.md

# REX — CRM відділу рекрутингу

Веб-CRM для команди рекрутерів: ведення кандидатів, статуси-конвеєр, помісячна
статистика, канбан. Ролі ADMIN/RECRUITER. UI українською.

## Стек
- Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4
- Prisma 7 (driver adapter `better-sqlite3`) → SQLite локально; для продакшену — Postgres
- Auth.js v5 (credentials, JWT), split-config: `src/auth.config.ts` (edge) + `src/auth.ts` (Node)
- Recharts (графіки), dnd-kit (канбан), react-hook-form + Zod (форми/валідація)

## Команди
- `npm run dev` — розробка (http://localhost:3000)
- `npm run db:seed` — заповнити демо-даними (перезаписує БД)
- `npm test` — юніт-тести (логіка статистики)
- `npx prisma migrate dev` — міграції

## Демо-акаунти (після seed)
- Адмін: `admin@rex.local` / `admin123` (дефолт для локальної розробки)
- Рекрутер: `recruiter@rex.local` / `recruiter123` (дефолт для локальної розробки)
- Паролі перевизначаються через `SEED_ADMIN_PASSWORD` / `SEED_RECRUITER_PASSWORD` у `.env`
  (див. `.env.example`) — обов'язково перед seed на будь-якій недовірчій/продакшн базі.

## Ключові місця
- Доменні enum-и + лейбли/кольори: `src/lib/domain.ts` (єдине джерело правди)
- Чиста логіка статистики (тестована): `src/lib/stats.ts` + `stats.test.ts`
- Server actions: `src/lib/actions/*`
- Запити до БД: `src/lib/queries.ts`
- Захист маршрутів і ролей: `src/middleware.ts` + `callbacks.authorized` в `auth.config.ts`

## Конвеєр статусів
Активні етапи (4): `UNIT_SEARCH` (Пошук підрозділу, дефолт при створенні) →
`COLLECTING_DOCS` (Збір документів) → `MEDICAL_COMMISSION` (Проходить ВЛК) →
`CONTRACT_SIGNING` (Оформлення). Фінальні (з будь-якого активного етапу):
`ENLISTED` (Зараховано), `REJECTED_BY_US`, `SELF_WITHDREW`. Немає окремого
поля "відповідальний рекрутер" — усі бачать і редагують усіх кандидатів.
На канбані (`board-client.tsx`) `REJECTED_BY_US`/`SELF_WITHDREW` візуально
об'єднані в одну колонку "Відмови" (з пікером причини при drag&drop), але в
даних/статистиці лишаються окремими статусами.

## Помісячний перегляд кандидатів
`/candidates` за замовчуванням показує ПОТОЧНИЙ місяць; навігація ‹ › (`month-nav.tsx`)
гортає історію. `lib/stats.ts::candidatesForMonth` реконструює історичний статус
кандидата на вибраний місяць (не живий поточний) і коректно ховає тих, хто
фіналізувався РАНІШЕ цього місяця. Зміна статусу (`StatusSelect`) дозволена лише
в поточному місяці; при перегляді минулого — статичний `StatusBadge` (read-only).
Колонка "Дата зарахування" (`enlistedDate`) завжди показує факт, незалежно від
переглянутого місяця.

## Статус проєкту
Це лише початок (перший робочий MVP, 2026-07-20) — доробляти протягом кількох тижнів.
Деплой (Vercel + Postgres) навмисно відкладено до повної готовності проєкту (дипломна
робота); поки що працюємо лише локально. Репозиторій: `https://github.com/VitaliiBondar/rex`
(публічний, гілка `main`). SQLite/`dev.db` і `.env` у git не потрапляють (`.gitignore`).

## Примітки
- enum-поля БД зберігаються рядками (сумісність SQLite/Postgres); валідні значення — у `domain.ts`.
- Статистика «за місяць»: додавання рахується за `createdAt`, зарахування/відмови — за датою
  переходу в статус (`StatusChange.changedAt`), що коректно обробляє перенос кандидатів між місяцями.
- `middleware` конвенція має deprecation-попередження в Next 16 (радять `proxy`) — працює, замінити згодом.
