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
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  recruitmentTypeLabel,
  channelLabel,
  type Status,
} from "@/lib/domain";
import { changeCandidateStatus } from "@/lib/actions/candidates";
import { cn } from "@/lib/utils";

export type BoardCandidate = {
  id: string;
  fullName: string;
  position: string | null;
  recruitmentType: string;
  channel: string;
  status: string;
  responsibleName: string | null;
};

export function BoardClient({ initial }: { initial: BoardCandidate[] }) {
  const [cards, setCards] = useState<BoardCandidate[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cardId = String(active.id);
    const newStatus = String(over.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    // Оптимістичне оновлення + серверна дія.
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c)),
    );
    changeCandidateStatus({ candidateId: cardId, status: newStatus });
  };

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto p-4 sm:p-6">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <CardBody card={activeCard} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  cards,
}: {
  status: Status;
  cards: BoardCandidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: STATUS_COLORS[status] }}
        />
        <span className="text-sm font-medium text-ink">
          {STATUS_LABELS[status]}
        </span>
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
          onPointerDown={(e) => e.stopPropagation()}
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
      {card.responsibleName && (
        <p className="mt-2 text-[11px] text-ink-faint">
          {card.responsibleName}
        </p>
      )}
    </div>
  );
}
