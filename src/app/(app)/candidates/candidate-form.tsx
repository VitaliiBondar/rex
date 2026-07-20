"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { candidateSchema, type CandidateInput } from "@/lib/validation";
import {
  GENDERS,
  GENDER_LABELS,
  RECRUITMENT_TYPES,
  RECRUITMENT_TYPE_LABELS,
  CHANNELS,
  CHANNEL_LABELS,
} from "@/lib/domain";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createCandidate, updateCandidate } from "@/lib/actions/candidates";

export type CandidateFormValues = {
  fullName: string;
  age: string;
  gender: string;
  position: string;
  unitId: string;
  recruitmentType: string;
  channel: string;
  responsibleUserId: string;
  note: string;
};

export function CandidateForm({
  candidateId,
  defaultValues,
  units,
  users,
  positions,
  onDone,
}: {
  candidateId?: string;
  defaultValues?: Partial<CandidateFormValues>;
  units: { id: string; name: string }[];
  users: { id: string; name: string }[];
  positions: string[];
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: "",
      age: "",
      gender: "",
      position: "",
      unitId: "",
      recruitmentType: "CONTRACT",
      channel: "DIRECT",
      responsibleUserId: "",
      note: "",
      ...defaultValues,
    } as unknown as CandidateInput,
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = candidateId
      ? await updateCandidate(candidateId, values)
      : await createCandidate(values);
    if (result.ok) {
      onDone();
    } else {
      setServerError(result.error);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Ім'я та прізвище" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" {...register("fullName")} placeholder="Іван Петренко" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Вік" htmlFor="age" error={errors.age?.message}>
          <Input id="age" type="number" inputMode="numeric" {...register("age")} placeholder="28" />
        </Field>
        <Field label="Стать" htmlFor="gender">
          <Select id="gender" {...register("gender")}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Тип залучення" htmlFor="recruitmentType" error={errors.recruitmentType?.message}>
          <Select id="recruitmentType" {...register("recruitmentType")}>
            {RECRUITMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {RECRUITMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Канал" htmlFor="channel" error={errors.channel?.message}>
          <Select id="channel" {...register("channel")}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Підрозділ" htmlFor="unitId" hint="Куди йде людина">
          <Select id="unitId" {...register("unitId")}>
            <option value="">—</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Посада" htmlFor="position">
          <Input id="position" list="position-suggestions" {...register("position")} placeholder="Стрілець" />
          <datalist id="position-suggestions">
            {positions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Відповідальний" htmlFor="responsibleUserId">
        <Select id="responsibleUserId" {...register("responsibleUserId")}>
          <option value="">— (я)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Примітка" htmlFor="note" error={errors.note?.message}>
        <Textarea id="note" {...register("note")} placeholder="Специфічна інформація по кандидату…" />
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
          {isSubmitting ? "Збереження…" : candidateId ? "Зберегти" : "Додати кандидата"}
        </Button>
      </div>
    </form>
  );
}
