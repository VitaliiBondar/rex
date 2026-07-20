import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Ліва панель-«рейка» як фірмовий якір. */}
      <section className="relative hidden lg:flex flex-col justify-between bg-rail p-12 text-rail-ink">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight text-rail-active">
            REX
          </span>
        </div>
        <div className="max-w-sm">
          <p className="eyebrow mb-3">Відділ рекрутингу</p>
          <h1 className="text-3xl font-semibold leading-tight text-rail-active">
            Ведіть кандидатів від першого контакту до зарахування.
          </h1>
          <p className="mt-4 text-sm text-rail-ink-soft">
            Статуси, помісячна статистика та канбан — в одному місці, з ПК і
            телефону.
          </p>
        </div>
        <p className="eyebrow">Внутрішня система · доступ за запрошенням</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-rail text-rail-active">
              <Logo small />
            </span>
            <span className="font-semibold tracking-tight">REX</span>
          </div>
          <h2 className="text-xl font-semibold text-ink">Вхід у систему</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Введіть дані свого акаунта, щоб продовжити.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-rail-active"
    >
      <path d="M4 4h7a4 4 0 0 1 0 8H4z" />
      <path d="M4 12l9 8" />
      <path d="M4 4v16" />
    </svg>
  );
}
