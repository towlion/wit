"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Label, Member, SavedView, WorkflowState } from "@/lib/types";

export interface Filters {
  priority?: string;
  assigneeId?: number;
  labelId?: number;
  overdue?: boolean;
  statusId?: number;
  dueBefore?: string;
  dueAfter?: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  labels: Label[];
  states?: WorkflowState[];
  members?: Member[];
  basePath?: string;
}

const PRIORITIES = ["", "urgent", "high", "medium", "low"];

export default function FilterBar({ filters, onChange, labels, states = [], members = [], basePath }: FilterBarProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const hasFilters = filters.priority || filters.assigneeId || filters.labelId || filters.overdue || filters.statusId || filters.dueBefore || filters.dueAfter;

  useEffect(() => {
    if (basePath) {
      api.get<SavedView[]>(`${basePath}/views`).then(setSavedViews).catch(() => {});
    }
  }, [basePath]);

  async function handleSaveView() {
    if (!saveName.trim() || !basePath) return;
    await api.post(`${basePath}/views`, { name: saveName.trim(), filters });
    setSaveName("");
    setShowSave(false);
    const views = await api.get<SavedView[]>(`${basePath}/views`);
    setSavedViews(views);
  }

  async function handleDeleteView(viewId: number) {
    if (!basePath) return;
    await api.delete(`${basePath}/views/${viewId}`);
    setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
  }

  function handleSelectView(view: SavedView) {
    onChange(view.filters as Filters);
  }

  const activeClass = "bg-[var(--accent-subtle)] border-[var(--accent)]/30 text-[var(--accent-hover)]";
  const inactiveClass = "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>

      {states.length > 0 && (
        <select
          value={filters.statusId || ""}
          onChange={(e) => onChange({ ...filters, statusId: e.target.value ? parseInt(e.target.value) : undefined })}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${filters.statusId ? activeClass : inactiveClass}`}
        >
          <option value="">All statuses</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <select
        value={filters.priority || ""}
        onChange={(e) => onChange({ ...filters, priority: e.target.value || undefined })}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${filters.priority ? activeClass : inactiveClass}`}
      >
        <option value="">All priorities</option>
        {PRIORITIES.filter(Boolean).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {members.length > 0 && (
        <select
          value={filters.assigneeId || ""}
          onChange={(e) => onChange({ ...filters, assigneeId: e.target.value ? parseInt(e.target.value) : undefined })}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${filters.assigneeId ? activeClass : inactiveClass}`}
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
          ))}
        </select>
      )}

      {labels.length > 0 && (
        <select
          value={filters.labelId || ""}
          onChange={(e) =>
            onChange({ ...filters, labelId: e.target.value ? parseInt(e.target.value) : undefined })
          }
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${filters.labelId ? activeClass : inactiveClass}`}
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      )}

      <input
        type="date"
        value={filters.dueAfter || ""}
        onChange={(e) => onChange({ ...filters, dueAfter: e.target.value || undefined })}
        title="Due after"
        className={`text-xs px-2 py-1.5 rounded-lg border transition-all duration-150 ${filters.dueAfter ? activeClass : inactiveClass}`}
      />
      <input
        type="date"
        value={filters.dueBefore || ""}
        onChange={(e) => onChange({ ...filters, dueBefore: e.target.value || undefined })}
        title="Due before"
        className={`text-xs px-2 py-1.5 rounded-lg border transition-all duration-150 ${filters.dueBefore ? activeClass : inactiveClass}`}
      />

      <button
        onClick={() => onChange({ ...filters, overdue: filters.overdue ? undefined : true })}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
          filters.overdue
            ? "bg-red-500/15 border-red-500/30 text-red-400"
            : "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
        }`}
      >
        Overdue
      </button>

      {savedViews.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const view = savedViews.find((v) => v.id === parseInt(e.target.value));
            if (view) handleSelectView(view);
          }}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${inactiveClass}`}
        >
          <option value="">Saved views</option>
          {savedViews.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}

      {hasFilters && basePath && (
        <div className="relative">
          <button
            onClick={() => setShowSave(!showSave)}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1"
          >
            Save
          </button>
          {showSave && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg shadow-xl p-2 z-50 flex gap-1">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="View name"
                className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] w-28"
                onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
                autoFocus
              />
              <button
                onClick={handleSaveView}
                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--bg-tertiary)]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
