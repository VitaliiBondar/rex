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
