"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TCK_TYPES, TCK_TYPE_LABELS, type TckType } from "@/lib/domain";

export function RequireEnlistmentInfoModal({
  open,
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (info: {
    tckRegion: string;
    tckType: TckType;
    orderNumber: string;
  }) => void;
}) {
  const [tckRegion, setTckRegion] = useState("");
  const [tckType, setTckType] = useState<TckType>(TCK_TYPES[0]);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    if (!open) {
      setTckRegion("");
      setTckType(TCK_TYPES[0]);
      setOrderNumber("");
    }
  }, [open]);

  const canConfirm = tckRegion.trim() !== "" && orderNumber.trim() !== "";

  return (
    <Modal open={open} onClose={onClose} title="Дані для повідомлення про зарахування">
      <p className="text-sm text-ink-soft mb-4">
        Потрібні для генерації документа — вкажіть один раз, надалі
        використовуватимуться для цього кандидата.
      </p>
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Регіон ТЦК</label>
          <Input
            value={tckRegion}
            onChange={(e) => setTckRegion(e.target.value)}
            placeholder="Рівненський"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Тип ТЦК</label>
          <Select
            value={tckType}
            onChange={(e) => setTckType(e.target.value as TckType)}
          >
            {TCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TCK_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft">Номер наказу</label>
          <Input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="123"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Скасувати
        </Button>
        <Button
          disabled={!canConfirm || pending}
          onClick={() => onConfirm({ tckRegion, tckType, orderNumber })}
        >
          Зберегти й зарахувати
        </Button>
      </div>
    </Modal>
  );
}
