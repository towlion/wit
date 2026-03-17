"use client";

import { useDroppable } from "@dnd-kit/core";
import type { WorkflowState, WorkItem, CardDisplaySettings } from "@/lib/types";
import Card from "./Card";
import QuickCreate from "./QuickCreate";

interface ColumnProps {
  state: WorkflowState;
  items: WorkItem[];
  onItemCreate: (statusId: number, title: string) => Promise<void>;
  onCardClick: (item: WorkItem) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  wipLimit?: number;
  cardDisplay?: CardDisplaySettings;
}

export default function Column({ state, items, onItemCreate, onCardClick, selectable, selectedIds, onToggleSelect, wipLimit, cardDisplay }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${state.id}`,
  });

  const overLimit = wipLimit != null && wipLimit > 0 && items.length > wipLimit;
  const atLimit = wipLimit != null && wipLimit > 0 && items.length === wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-xl transition-all duration-200 ${
        isOver ? "bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)]/20" : ""
      }`}
    >
      {/* Column header with colored top border */}
      <div className="mx-1.5 mt-1.5 rounded-t-lg overflow-hidden">
        <div className="h-[3px]" style={{ backgroundColor: overLimit ? "#ef4444" : state.color }} />
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--bg-secondary)]/50">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[var(--bg-primary)]/50"
            style={{ backgroundColor: state.color }}
          />
          <span className="text-sm font-semibold truncate tracking-tight">{state.name}</span>
          <span className={`text-[11px] ml-auto tabular-nums font-medium px-2 py-0.5 rounded-full ${
            overLimit
              ? "bg-red-500/15 text-red-400 border border-red-500/20"
              : atLimit
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          }`}>
            {items.length}{wipLimit != null && wipLimit > 0 ? `/${wipLimit}` : ""}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 px-1.5 pb-1.5 mt-1.5 min-h-[100px]">
        {items.map((item) => (
          <Card
            key={item.id}
            item={item}
            onClick={() => onCardClick(item)}
            selectable={selectable}
            selected={selectedIds?.has(item.id)}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
            cardDisplay={cardDisplay}
          />
        ))}
        <QuickCreate onSubmit={(title) => onItemCreate(state.id, title)} />
      </div>
    </div>
  );
}
