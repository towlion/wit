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
import type { WorkflowState, WorkItem, BoardSettings, CardDisplaySettings } from "@/lib/types";
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
  boardSettings?: BoardSettings | null;
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

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

function getSwimlanes(items: WorkItem[], swimlane: string | null): { key: string; label: string; itemIds: Set<number> }[] {
  if (!swimlane) return [{ key: "__all__", label: "", itemIds: new Set(items.map((i) => i.id)) }];

  if (swimlane === "priority") {
    return PRIORITY_ORDER.map((p) => ({
      key: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      itemIds: new Set(items.filter((i) => i.priority === p).map((i) => i.id)),
    })).filter((s) => s.itemIds.size > 0);
  }

  if (swimlane === "assignee") {
    const byAssignee = new Map<string, { label: string; ids: Set<number> }>();
    const unassigned = new Set<number>();
    for (const item of items) {
      if (item.assignees.length === 0) {
        unassigned.add(item.id);
      } else {
        for (const a of item.assignees) {
          const key = String(a.id);
          if (!byAssignee.has(key)) byAssignee.set(key, { label: a.display_name, ids: new Set() });
          byAssignee.get(key)!.ids.add(item.id);
        }
      }
    }
    const lanes = Array.from(byAssignee.entries()).map(([key, v]) => ({
      key,
      label: v.label,
      itemIds: v.ids,
    }));
    if (unassigned.size > 0) lanes.push({ key: "__none__", label: "Unassigned", itemIds: unassigned });
    return lanes;
  }

  if (swimlane === "label") {
    const byLabel = new Map<string, { label: string; color: string; ids: Set<number> }>();
    const unlabeled = new Set<number>();
    for (const item of items) {
      if (item.labels.length === 0) {
        unlabeled.add(item.id);
      } else {
        for (const l of item.labels) {
          const key = String(l.id);
          if (!byLabel.has(key)) byLabel.set(key, { label: l.name, color: l.color, ids: new Set() });
          byLabel.get(key)!.ids.add(item.id);
        }
      }
    }
    const lanes = Array.from(byLabel.entries()).map(([key, v]) => ({
      key,
      label: v.label,
      itemIds: v.ids,
    }));
    if (unlabeled.size > 0) lanes.push({ key: "__none__", label: "No label", itemIds: unlabeled });
    return lanes;
  }

  return [{ key: "__all__", label: "", itemIds: new Set(items.map((i) => i.id)) }];
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
  boardSettings,
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

  const swimlaneMode = boardSettings?.swimlane || null;
  const swimlanes = getSwimlanes(items, swimlaneMode);
  const wipLimits = boardSettings?.wip_limits || {};
  const cardDisplay = boardSettings?.card_display;
  const hasSwimlanes = swimlaneMode && swimlanes.length > 0 && swimlanes[0].key !== "__all__";

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex-1 overflow-auto p-4 ${hasSwimlanes ? "" : "flex gap-4"}`}>
          {hasSwimlanes ? (
            swimlanes.map((lane) => (
              <div key={lane.key} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {lane.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                    ({lane.itemIds.size})
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="flex gap-4 overflow-x-auto">
                  {states.map((state) => {
                    const columnItems = items
                      .filter((i) => i.status_id === state.id && lane.itemIds.has(i.id))
                      .sort((a, b) => a.position.localeCompare(b.position));
                    return (
                      <Column
                        key={`${lane.key}-${state.id}`}
                        state={state}
                        items={columnItems}
                        onItemCreate={onItemCreate}
                        onCardClick={setSelectedItem}
                        selectable={selectable}
                        selectedIds={selectedIds}
                        onToggleSelect={onToggleSelect}
                        wipLimit={wipLimits[String(state.id)]}
                        cardDisplay={cardDisplay}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            states.map((state) => {
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
                  wipLimit={wipLimits[String(state.id)]}
                  cardDisplay={cardDisplay}
                />
              );
            })
          )}
        </div>
        <DragOverlay>
          {activeItem ? <Card item={activeItem} overlay cardDisplay={cardDisplay} /> : null}
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
