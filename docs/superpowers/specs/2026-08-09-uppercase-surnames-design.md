# Прізвища капслоком у таблицях і документах

## Контекст

`Candidate.fullName` за конвенцією містить "Прізвище Ім'я [По батькові]"
(див. розділ "ПІБ кандидата" в `CLAUDE.md`). Наразі скрізь показується як є
(регістр із форми створення/редагування). Вимога: прізвище (перше слово)
має відображатись ВЕЛИКИМИ ЛІТЕРАМИ всюди, де показується ім'я кандидата —
і в списку кандидатів, і на канбані, і в заголовку сторінки кандидата, і в
згенерованих Word-документах. Ім'я та по батькові лишаються у звичайному
регістрі. Дані в БД і у формі редагування (`candidate-form.tsx`) не
змінюються — це суто форматування виводу.

## 1. `displayName()` у `src/lib/format.ts`

Зараз:

```ts
export function displayName(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}
```

Стає: перше слово (прізвище) — `.toUpperCase()`, друге слово (ім'я, якщо є)
— без змін.

```ts
export function displayName(fullName: string): string {
  const [surname, givenName] = fullName.trim().split(/\s+/);
  return [surname?.toUpperCase(), givenName].filter(Boolean).join(" ");
}
```

Один виклик покриває всі 4 місця використання без дублювання логіки:
список кандидатів (`candidate-list.tsx`, десктоп-таблиця + мобільні картки),
заголовок сторінки кандидата (`candidates/[id]/page.tsx`), картки канбану
(`board-client.tsx`).

Крайній випадок: якщо в `fullName` лише одне слово — воно стає капслоком,
другого слова просто немає (`filter(Boolean)` прибирає `undefined`).

## 2. `fullNameGenitive()` у `src/lib/documents.ts`

Функція вже розкладає ПІБ на `familyName`/`givenName`/`patronymicName` через
`shevchenko.inGenitive()` перед склеюванням у рядок для плейсхолдера
`{name}`. Додається `.toUpperCase()` лише на `declined.familyName` перед
`.join(" ")`:

```ts
const declined = await inGenitive({ gender: grammaticalGender, ...parts });
return [declined.familyName?.toUpperCase(), declined.givenName, declined.patronymicName]
  .filter(Boolean)
  .join(" ");
```

Приклад: `{name}` для "Хорхулу Роман Ігорович" стане
"ХОРХУЛИ Романа Ігоровича" замість "Хорхули Романа Ігоровича".

## Що свідомо поза межами цього завдання

- Дані в БД (`Candidate.fullName`) і поле у формі створення/редагування
  залишаються як користувач їх ввів — капслок лише на виводі.
- Сортування за прізвищем (`candidates/page.tsx`, `comparators.fullName`)
  і пошук (`filterCandidates`) працюють з оригінальним `fullName` з БД —
  не чіпаємо, бо капслок суто візуальний.

## Тестування

- Юніт-тести в `format.test.ts` для `displayName`: звичайний випадок
  ("Хорхулу Роман" → "ХОРХУЛУ Роман"), одне слово без імені, зайві пробіли.
- Якщо існують тести для `documents.ts`/`fullNameGenitive` — розширити
  аналогічно; якщо ні, ручна перевірка генерації документа для зарахованого
  кандидата (перевірити текст `{name}` у згенерованому `.docx`).
