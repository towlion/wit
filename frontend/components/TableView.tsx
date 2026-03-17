"use client";

import { useState, useMemo } from "react";
import type { WorkItem, WorkflowState, Label, Member } from "@/lib/types";

type SortField = "item_number" | "title" | "status" | "priority" | "due_date" | "created_at";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

interface TableViewProps {
  items: WorkItem[];
  states: WorkflowState[];
  labels: Label[];
  members: Member[];
  onCardClick: (item: WorkItem) => void;
  onItemUpdate: (itemNumber: number, data: Partial<WorkItem>) => Promise<void>;
  canEdit: boolean;
  selectable: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (itemId: number) => void;
  onSelectAll: (ids: number[]) => void;
}

interface EditingCell {
  itemNumber: number;
  field: "title" | "status" | "priority" | "due_date";
}

export default function TableView({
  items,
  states,
  labels,
  members,
  onCardClick,
  onItemUpdate,
  canEdit,
  selectable,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>("item_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");

  const stateMap = useMemo(() => {
    const m = new Map<number, WorkflowState>();
    states.forEach((s) => m.set(s.id, s));
    return m;
  }, [states]);

  const sortedItems = useMemo(() => {
    const arr = [...items];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case "item_number":
          return (a.item_number - b.item_number) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "status": {
          const sa = stateMap.get(a.status_id);
          const sb = stateMap.get(b.status_id);
          return ((sa?.position ?? 0) - (sb?.position ?? 0)) * dir;
        }
        case "priority":
          return ((PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)) * dir;
        case "due_date": {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date) * dir;
        }
        case "created_at":
          return a.created_at.localeCompare(b.created_at) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [items, sortField, sortDir, stateMap]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortArrow(field: SortField) {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[var(--accent)]">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  const allSelected = sortedItems.length > 0 && sortedItems.every((i) => selectedIds.has(i.id));

  function handleSelectAllToggle() {
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(sortedItems.map((i) => i.id));
    }
  }

  function startEdit(itemNumber: number, field: EditingCell["field"], currentValue: string) {
    if (!canEdit) return;
    setEditingCell({ itemNumber, field });
    setEditValue(currentValue);
  }

  async function commitEdit(itemNumber: number, field: string, value: string) {
    setEditingCell(null);
    if (field === "title") {
      if (value.trim() && value !== items.find((i) => i.item_number === itemNumber)?.title) {
        await onItemUpdate(itemNumber, { title: value.trim() });
      }
    } else if (field === "due_date") {
      await onItemUpdate(itemNumber, { due_date: value || null } as Partial<WorkItem>);
    }
  }

  async function handleSelectChange(itemNumber: number, field: "status_id" | "priority", value: string) {
    setEditingCell(null);
    if (field === "status_id") {
      await onItemUpdate(itemNumber, { status_id: parseInt(value) } as Partial<WorkItem>);
    } else {
      await onItemUpdate(itemNumber, { priority: value });
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
            {selectable && (
              <th className="w-10 px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAllToggle}
                  className="rounded border-[var(--border)] accent-[var(--accent)]"
                />
              </th>
            )}
            <th
              className="w-16 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("item_number")}
            >
              # {sortArrow("item_number")}
            </th>
            <th
              className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("title")}
            >
              Title {sortArrow("title")}
            </th>
            <th
              className="w-32 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("status")}
            >
              Status {sortArrow("status")}
            </th>
            <th
              className="w-28 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("priority")}
            >
              Priority {sortArrow("priority")}
            </th>
            <th className="w-36 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Assignees
            </th>
            <th className="w-32 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Labels
            </th>
            <th
              className="w-32 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("due_date")}
            >
              Due Date {sortArrow("due_date")}
            </th>
            <th
              className="w-36 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
              onClick={() => toggleSort("created_at")}
            >
              Created {sortArrow("created_at")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, idx) => {
            const state = stateMap.get(item.status_id);
            const isEditing = editingCell?.itemNumber === item.item_number;
            return (
              <tr
                key={item.id}
                className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50 transition-colors ${
                  idx % 2 === 0 ? "" : "bg-[var(--bg-secondary)]/30"
                } ${selectedIds.has(item.id) ? "bg-[var(--accent-subtle)]/30" : ""}`}
              >
                {selectable && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                      className="rounded border-[var(--border)] accent-[var(--accent)]"
                    />
                  </td>
                )}
                <td
                  className="px-3 py-2 text-[var(--text-muted)] font-mono text-xs cursor-pointer"
                  onClick={() => onCardClick(item)}
                >
                  {item.item_number}
                </td>
                <td className="px-3 py-2">
                  {isEditing && editingCell.field === "title" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(item.item_number, "title", editValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(item.item_number, "title", editValue);
                        if (e.key === "Escape") setEditingCell(null);
                      }}
                      className="w-full bg-transparent border border-[var(--accent)] rounded px-1.5 py-0.5 text-sm outline-none text-[var(--text-primary)]"
                    />
                  ) : (
                    <span
                      className={`text-[var(--text-primary)] ${canEdit ? "cursor-text hover:bg-[var(--bg-tertiary)] rounded px-1 -mx-1 transition-colors" : ""}`}
                      onClick={() => startEdit(item.item_number, "title", item.title)}
                    >
                      {item.title}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditing && editingCell.field === "status" ? (
                    <select
                      autoFocus
                      value={item.status_id}
                      onChange={(e) => handleSelectChange(item.item_number, "status_id", e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-xs outline-none text-[var(--text-primary)]"
                    >
                      {states.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${canEdit ? "cursor-pointer hover:opacity-80" : ""}`}
                      onClick={() => canEdit && setEditingCell({ itemNumber: item.item_number, field: "status" })}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: state?.color || "#6b7280" }} />
                      {state?.name || "Unknown"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditing && editingCell.field === "priority" ? (
                    <select
                      autoFocus
                      value={item.priority}
                      onChange={(e) => handleSelectChange(item.item_number, "priority", e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-xs outline-none text-[var(--text-primary)]"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs capitalize ${canEdit ? "cursor-pointer hover:opacity-80" : ""}`}
                      onClick={() => canEdit && setEditingCell({ itemNumber: item.item_number, field: "priority" })}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[item.priority] || "#6b7280" }} />
                      {item.priority}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => onCardClick(item)}
                  >
                    {item.assignees.length === 0 ? (
                      <span className="text-[var(--text-muted)] text-xs">—</span>
                    ) : (
                      <div className="flex -space-x-1.5">
                        {item.assignees.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[8px] text-white font-medium border border-[var(--bg-primary)]"
                            title={a.display_name}
                          >
                            {a.display_name[0].toUpperCase()}
                          </div>
                        ))}
                        {item.assignees.length > 3 && (
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">+{item.assignees.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div
                    className="flex items-center gap-1 flex-wrap cursor-pointer"
                    onClick={() => onCardClick(item)}
                  >
                    {item.labels.length === 0 ? (
                      <span className="text-[var(--text-muted)] text-xs">—</span>
                    ) : (
                      item.labels.slice(0, 3).map((l) => (
                        <span
                          key={l.id}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: l.color + "22", color: l.color }}
                        >
                          {l.name}
                        </span>
                      ))
                    )}
                    {item.labels.length > 3 && (
                      <span className="text-[10px] text-[var(--text-muted)]">+{item.labels.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {isEditing && editingCell.field === "due_date" ? (
                    <input
                      type="date"
                      autoFocus
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        commitEdit(item.item_number, "due_date", e.target.value);
                      }}
                      onBlur={() => setEditingCell(null)}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingCell(null); }}
                      className="bg-[var(--bg-primary)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-xs outline-none text-[var(--text-primary)]"
                    />
                  ) : (
                    <span
                      className={`text-xs ${
                        item.due_date && item.due_date < new Date().toISOString().split("T")[0]
                          ? "text-red-400"
                          : "text-[var(--text-secondary)]"
                      } ${canEdit ? "cursor-pointer hover:bg-[var(--bg-tertiary)] rounded px-1 -mx-1 transition-colors" : ""}`}
                      onClick={() => startEdit(item.item_number, "due_date", item.due_date || "")}
                    >
                      {item.due_date || "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedItems.length === 0 && (
        <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
          No items match the current filters
        </div>
      )}
    </div>
  );
}
