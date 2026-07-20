"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CandidateForm, type CandidateFormValues } from "../candidate-form";
import { deleteCandidate } from "@/lib/actions/candidates";

export function CandidateActions({
  candidateId,
  defaultValues,
  units,
  users,
  positions,
}: {
  candidateId: string;
  defaultValues: Partial<CandidateFormValues>;
  units: { id: string; name: string }[];
  users: { id: string; name: string }[];
  positions: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!confirm("Видалити кандидата разом з історією? Дію не можна скасувати."))
      return;
    setDeleting(true);
    const res = await deleteCandidate(candidateId);
    if (res.ok) {
      router.push("/candidates");
    } else {
      setDeleting(false);
      alert(res.error);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        <span className="hidden sm:inline">Редагувати</span>
      </Button>
      <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Видалити</span>
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редагувати кандидата"
      >
        <CandidateForm
          candidateId={candidateId}
          defaultValues={defaultValues}
          units={units}
          users={users}
          positions={positions}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
