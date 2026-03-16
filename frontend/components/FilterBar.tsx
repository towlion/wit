"use client";

import type { Label } from "@/lib/types";

export interface Filters {
  priority?: string;
  assigneeId?: number;
  labelId?: number;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  labels: Label[];
}

const PRIORITIES = ["", "urgent", "high", "medium", "low"];

export default function FilterBar({ filters, onChange, labels }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={filters.priority || ""}
        onChange={(e) => onChange({ ...filters, priority: e.target.value || undefined })}
        className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)]"
      >
        <option value="">All priorities</option>
        {PRIORITIES.filter(Boolean).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      {labels.length > 0 && (
        <select
          value={filters.labelId || ""}
          onChange={(e) =>
            onChange({ ...filters, labelId: e.target.value ? parseInt(e.target.value) : undefined })
          }
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)]"
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}

      {(filters.priority || filters.assigneeId || filters.labelId) && (
        <button
          onClick={() => onChange({})}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
        >
          Clear
        </button>
      )}
    </div>
  );
}
