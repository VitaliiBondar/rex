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
