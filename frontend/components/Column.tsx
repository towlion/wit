"use client";

import { useDroppable } from "@dnd-kit/core";
import type { WorkflowState, WorkItem } from "@/lib/types";
import Card from "./Card";
import QuickCreate from "./QuickCreate";

interface ColumnProps {
  state: WorkflowState;
  items: WorkItem[];
  onItemCreate: (statusId: number, title: string) => Promise<void>;
  onCardClick: (item: WorkItem) => void;
}

export default function Column({ state, items, onItemCreate, onCardClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${state.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-xl transition ${
        isOver ? "bg-[var(--bg-tertiary)]" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: state.color }}
        />
        <span className="text-sm font-medium truncate">{state.name}</span>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{items.length}</span>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 px-1.5 pb-1.5 min-h-[100px]">
        {items.map((item) => (
          <Card key={item.id} item={item} onClick={() => onCardClick(item)} />
        ))}
        <QuickCreate onSubmit={(title) => onItemCreate(state.id, title)} />
      </div>
    </div>
  );
}
