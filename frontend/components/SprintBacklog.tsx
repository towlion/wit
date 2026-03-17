"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { Sprint, WorkItem } from "@/lib/types";

interface Props {
  items: WorkItem[];
  basePath: string;
  onItemUpdate: (itemNumber: number, data: Partial<WorkItem>) => Promise<void>;
  onCardClick: (item: WorkItem) => void;
  canEdit: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-indigo-500",
  low: "border-l-zinc-500",
};

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function SprintBacklog({ items, basePath, onItemUpdate, onCardClick, canEdit }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);

  useEffect(() => {
    api.get<Sprint[]>(`${basePath}/sprints`).then(setSprints).catch(() => {});
  }, [basePath]);

  const activeSprint = useMemo(() => sprints.find((s) => s.status === "active"), [sprints]);
  const backlogItems = useMemo(() => items.filter((i) => !i.sprint_id), [items]);
  const sprintItems = useMemo(
    () => (activeSprint ? items.filter((i) => i.sprint_id === activeSprint.id) : []),
    [items, activeSprint]
  );

  function ItemRow({ item }: { item: WorkItem }) {
    return (
      <div
        className={`flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors border-l-2 ${
          PRIORITY_COLORS[item.priority] || "border-l-zinc-500"
        }`}
        onClick={() => onCardClick(item)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0">#{item.item_number}</span>
          <span className="text-sm truncate">{item.title}</span>
          {item.due_date && (
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{item.due_date}</span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!item.sprint_id && activeSprint && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onItemUpdate(item.item_number, { sprint_id: activeSprint.id });
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent-hover)] hover:bg-[var(--accent)]/20 transition-colors"
              >
                Add to sprint
              </button>
            )}
            {item.sprint_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onItemUpdate(item.item_number, { sprint_id: null } as Partial<WorkItem>);
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Active Sprint */}
        {activeSprint && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold">{activeSprint.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE.active}`}>
                Active
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {activeSprint.start_date} &mdash; {activeSprint.end_date}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] ml-auto">
                {activeSprint.completed_count}/{activeSprint.item_count} done
              </span>
            </div>
            {activeSprint.goal && (
              <p className="text-xs text-[var(--text-muted)] mb-3 italic">{activeSprint.goal}</p>
            )}
            <div className="space-y-1.5">
              {sprintItems.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">No items in this sprint yet</p>
              ) : (
                sprintItems.map((item) => <ItemRow key={item.id} item={item} />)
              )}
            </div>
          </section>
        )}

        {!activeSprint && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No active sprint. Create one in project settings.</p>
          </div>
        )}

        {/* Backlog */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">Backlog</h2>
            <span className="text-[11px] text-[var(--text-muted)]">{backlogItems.length} items</span>
          </div>
          <div className="space-y-1.5">
            {backlogItems.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">Backlog is empty</p>
            ) : (
              backlogItems.map((item) => <ItemRow key={item.id} item={item} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
