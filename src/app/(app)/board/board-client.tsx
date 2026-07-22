"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  recruitmentTypeLabel,
  channelLabel,
} from "@/lib/domain";
import { changeCandidateStatus } from "@/lib/actions/candidates";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { RequireUnitModal } from "@/components/require-unit-modal";

export type BoardCandidate = {
  id: string;
  fullName: string;
  position: string | null;
  recruitmentType: string;
  channel: string;
  status: string;
};

// Колонки канбану: 4 активні етапи + "Зараховано" окремо + віртуальна мердж-колонка
// "Відмови" (об'єднує REJECTED_BY_US/SELF_WITHDREW візуально; в даних статуси лишаються
// окремими — це критично для статистики на Дашборді).
type ColumnDef = { id: string; label: string; statuses: string[] };

const COLUMNS: ColumnDef[] = [
  ...ACTIVE_STATUSES.map((s) => ({
    id: s as string,
    label: STATUS_LABELS[s],
    statuses: [s as string],
  })),
  { id: "ENLISTED", label: STATUS_LABELS.ENLISTED, statuses: ["ENLISTED"] },
  {
    id: "REJECTED",
    label: "Відмови",
    statuses: ["REJECTED_BY_US", "SELF_WITHDREW"],
  },
];

const REJECTION_REASON_LABELS: Record<string, string> = {
  REJECTED_BY_US: "з нашого боку",
  SELF_WITHDREW: "сам відмовився",
};

export function BoardClient({
  initial,
  units,
}: {
  initial: BoardCandidate[];
  units: { id: string; name: string }[];
}) {
  const [cards, setCards] = useState<BoardCandidate[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<string | null>(null);
  const [pendingUnit, setPendingUnit] = useState<{
    cardId: string;
    status: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const applyStatusChange = async (
    cardId: string,
    status: string,
    unitId?: string,
  ) => {
    const previousStatus = cards.find((c) => c.id === cardId)?.status;
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status } : c)),
    );
    try {
      const result = await changeCandidateStatus({
        candidateId: cardId,
        status,
        unitId,
      });
      if (!result.ok) {
        if (previousStatus) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId ? { ...c, status: previousStatus } : c,
            ),
          );
        }
        if (result.code === "NEEDS_UNIT") {
          setPendingUnit({ cardId, status });
        }
      }
    } catch {
      if (previousStatus) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId ? { ...c, status: previousStatus } : c,
          ),
        );
      }
    }
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = String(active.id);
    const overId = String(over.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const column = COLUMNS.find((c) => c.id === overId);
    if (!column || column.statuses.includes(card.status)) return;

    if (overId === "REJECTED") {
      // Віртуальна колонка не відповідає одному реальному статусу — питаємо причину.
      setPendingReject(cardId);
      return;
    }
    applyStatusChange(cardId, overId);
  };

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto p-4 sm:p-6">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={cards.filter((c) => column.statuses.includes(c.status))}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardBody card={activeCard} dragging /> : null}
      </DragOverlay>

      <Modal
        open={pendingReject !== null}
        onClose={() => setPendingReject(null)}
        title="Причина відмови"
      >
        <p className="text-sm text-ink-soft mb-4">
          Виберіть причину, щоб перенести кандидата в колонку «Відмови».
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (pendingReject) applyStatusChange(pendingReject, "REJECTED_BY_US");
              setPendingReject(null);
            }}
          >
            Відмова з нашого боку
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (pendingReject) applyStatusChange(pendingReject, "SELF_WITHDREW");
              setPendingReject(null);
            }}
          >
            Відмовився сам
          </Button>
        </div>
      </Modal>

      <RequireUnitModal
        open={pendingUnit !== null}
        units={units}
        onClose={() => setPendingUnit(null)}
        onConfirm={(unitId) => {
          if (pendingUnit) {
            applyStatusChange(pendingUnit.cardId, pendingUnit.status, unitId);
          }
          setPendingUnit(null);
        }}
      />
    </DndContext>
  );
}

function Column({
  column,
  cards,
}: {
  column: ColumnDef;
  cards: BoardCandidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: STATUS_COLORS[column.statuses[0] as keyof typeof STATUS_COLORS] }}
        />
        <span className="text-sm font-medium text-ink">{column.label}</span>
        <span className="tnum text-xs text-ink-faint">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver
            ? "border-ink/40 bg-surface-2"
            : "border-border bg-surface-2/40",
        )}
      >
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ card }: { card: BoardCandidate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <CardBody card={card} />
    </div>
  );
}

function CardBody({
  card,
  dragging = false,
}: {
  card: BoardCandidate;
  dragging?: boolean;
}) {
  const reason = REJECTION_REASON_LABELS[card.status];
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-grab active:cursor-grabbing",
        dragging && "rotate-2 shadow-lg cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/candidates/${card.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium text-ink hover:underline"
        >
          {card.fullName}
        </Link>
      </div>
      {card.position && (
        <p className="mt-0.5 text-xs text-ink-faint">{card.position}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded border border-border-strong px-1.5 py-0.5 text-[11px] text-ink-soft">
          {recruitmentTypeLabel(card.recruitmentType)}
        </span>
        <span className="rounded border border-border-strong px-1.5 py-0.5 text-[11px] text-ink-soft">
          {channelLabel(card.channel)}
        </span>
      </div>
      {reason && (
        <span className="mt-2 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {reason}
        </span>
      )}
    </div>
  );
}
