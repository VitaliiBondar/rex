"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CandidateForm } from "./candidate-form";

export function AddCandidateButton({
  units,
  users,
  positions,
}: {
  units: { id: string; name: string }[];
  users: { id: string; name: string }[];
  positions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Додати кандидата</span>
        <span className="sm:hidden">Додати</span>
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новий кандидат">
        <CandidateForm
          units={units}
          users={users}
          positions={positions}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
