"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { createUserSchema, type CreateUserInput } from "@/lib/validation";
import { ROLES, ROLE_LABELS } from "@/lib/domain";
import { createUser, toggleUserActive } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Користувачі</h2>
          <p className="text-sm text-ink-soft">
            Створюйте акаунти рекрутерів і адміністраторів.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Додати</span>
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-medium text-ink">
              {u.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {u.name}
                {u.id === currentUserId && (
                  <span className="ml-2 text-xs text-ink-faint">(ви)</span>
                )}
              </p>
              <p className="truncate text-xs text-ink-faint">{u.email}</p>
            </div>
            <span className="text-xs text-ink-soft">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</span>
            <ToggleActive
              userId={u.id}
              active={u.active}
              disabled={u.id === currentUserId}
            />
          </li>
        ))}
      </ul>

      <Modal open={open} onClose={() => setOpen(false)} title="Новий користувач">
        <CreateUserForm onDone={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

function ToggleActive({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        const res = await toggleUserActive(userId);
        setPending(false);
        if (!res.ok) alert(res.error);
      }}
      className={
        "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-40 " +
        (active
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
      }
    >
      {active ? "Активний" : "Вимкнено"}
    </button>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "RECRUITER",
    } as CreateUserInput,
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await createUser(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Ім'я" htmlFor="u-name" error={errors.name?.message}>
        <Input id="u-name" {...register("name")} placeholder="Олена Рекрутер" />
      </Field>
      <Field label="Email" htmlFor="u-email" error={errors.email?.message}>
        <Input id="u-email" type="email" {...register("email")} placeholder="olena@example.com" />
      </Field>
      <Field
        label="Тимчасовий пароль"
        htmlFor="u-pass"
        error={errors.password?.message}
        hint="Передайте користувачу; він зможе увійти цими даними."
      >
        <Input id="u-pass" {...register("password")} placeholder="Мінімум 6 символів" />
      </Field>
      <Field label="Роль" htmlFor="u-role">
        <Select id="u-role" {...register("role")}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Скасувати
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Створення…" : "Створити"}
        </Button>
      </div>
    </form>
  );
}
