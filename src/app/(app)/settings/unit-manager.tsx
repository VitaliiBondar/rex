"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createUnit, deleteUnit } from "@/lib/actions/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type UnitRow = { id: string; name: string };

export function UnitManager({ units }: { units: UnitRow[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    const res = await createUnit({ name });
    setPending(false);
    if (res.ok) setName("");
    else setError(res.error);
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink">Підрозділи</h2>
      <p className="text-sm text-ink-soft">
        Куди направляються кандидати. Використовується у формі кандидата.
      </p>

      <div className="mt-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Назва підрозділу"
        />
        <Button onClick={add} disabled={pending}>
          <Plus className="h-4 w-4" />
          Додати
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y divide-border">
        {units.length === 0 && (
          <li className="py-3 text-sm text-ink-faint">Ще немає підрозділів.</li>
        )}
        {units.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-ink">{u.name}</span>
            <button
              onClick={async () => {
                if (!confirm(`Видалити підрозділ «${u.name}»?`)) return;
                await deleteUnit(u.id);
              }}
              aria-label="Видалити"
              className="rounded-md p-1.5 text-ink-faint hover:bg-surface-2 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
