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
  const hasFilters = filters.priority || filters.assigneeId || filters.labelId;

  return (
    <div className="flex items-center gap-2">
      <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>

      <select
        value={filters.priority || ""}
        onChange={(e) => onChange({ ...filters, priority: e.target.value || undefined })}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
          filters.priority
            ? "bg-[var(--accent-subtle)] border-[var(--accent)]/30 text-[var(--accent-hover)]"
            : "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
        }`}
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
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
            filters.labelId
              ? "bg-[var(--accent-subtle)] border-[var(--accent)]/30 text-[var(--accent-hover)]"
              : "bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
          }`}
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
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
