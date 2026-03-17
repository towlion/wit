"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { WorkflowState, WorkItem } from "@/lib/types";
import Column from "./Column";
import Card from "./Card";
import CardDetail from "./CardDetail";

interface BoardProps {
  states: WorkflowState[];
  items: WorkItem[];
  onItemCreate: (statusId: number, title: string) => Promise<void>;
  onItemUpdate: (itemNumber: number, data: Partial<WorkItem>) => Promise<void>;
  basePath: string;
  onRefresh: () => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}

function generatePosition(before: string | null, after: string | null): string {
  const a = before || "";
  const b = after || (a + "z");
  let pos = "";
  let i = 0;
  while (true) {
    const ca = i < a.length ? a.charCodeAt(i) : 96;
    const cb = i < b.length ? b.charCodeAt(i) : 123;
    if (cb - ca > 1) {
      pos += String.fromCharCode(Math.floor((ca + cb) / 2));
      return pos;
    }
    pos += String.fromCharCode(ca);
    i++;
    if (i > 50) return pos + "n";
  }
}

export default function Board({
  states,
  items,
  onItemCreate,
  onItemUpdate,
  basePath,
  onRefresh,
  selectable,
  selectedIds,
  onToggleSelect,
}: BoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Could add optimistic column moves here
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const item = items.find((i) => i.id === active.id);
    if (!item) return;

    // Determine target status: if dropped on a column, use that column's state id
    // If dropped on another card, use that card's status
    let targetStatusId = item.status_id;
    let targetPosition = item.position;

    const overIdStr = String(over.id);
    if (overIdStr.startsWith("column-")) {
      targetStatusId = parseInt(overIdStr.replace("column-", ""));
      const columnItems = items
        .filter((i) => i.status_id === targetStatusId && i.id !== item.id)
        .sort((a, b) => a.position.localeCompare(b.position));
      const last = columnItems[columnItems.length - 1];
      targetPosition = generatePosition(last?.position || null, null);
    } else {
      const overItem = items.find((i) => i.id === over.id);
      if (overItem) {
        targetStatusId = overItem.status_id;
        const columnItems = items
          .filter((i) => i.status_id === targetStatusId && i.id !== item.id)
          .sort((a, b) => a.position.localeCompare(b.position));
        const idx = columnItems.findIndex((i) => i.id === overItem.id);
        const before = idx > 0 ? columnItems[idx - 1].position : null;
        targetPosition = generatePosition(before, overItem.position);
      }
    }

    if (targetStatusId !== item.status_id || targetPosition !== item.position) {
      await onItemUpdate(item.item_number, {
        status_id: targetStatusId,
        position: targetPosition,
      });
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-x-auto p-4 gap-4">
          {states.map((state) => {
            const columnItems = items
              .filter((i) => i.status_id === state.id)
              .sort((a, b) => a.position.localeCompare(b.position));
            return (
              <Column
                key={state.id}
                state={state}
                items={columnItems}
                onItemCreate={onItemCreate}
                onCardClick={setSelectedItem}
                selectable={selectable}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeItem ? <Card item={activeItem} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedItem && (
        <CardDetail
          item={selectedItem}
          basePath={basePath}
          onClose={() => setSelectedItem(null)}
          onUpdate={async (data) => {
            await onItemUpdate(selectedItem.item_number, data);
            setSelectedItem(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
