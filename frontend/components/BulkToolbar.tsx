"use client";

import { useState } from "react";
import type { Member, Label, WorkflowState } from "@/lib/types";

interface BulkToolbarProps {
  selectedCount: number;
  members: Member[];
  labels: Label[];
  states?: WorkflowState[];
  onArchive: () => Promise<void>;
  onReassign: (assigneeId: number) => Promise<void>;
  onLabel: (labelId: number, action: "add" | "remove") => Promise<void>;
  onStatusChange?: (statusId: number) => Promise<void>;
  onCancel: () => void;
}

export default function BulkToolbar({
  selectedCount,
  members,
  labels,
  states,
  onArchive,
  onReassign,
  onLabel,
  onStatusChange,
  onCancel,
}: BulkToolbarProps) {
  const [showMembers, setShowMembers] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showStatuses, setShowStatuses] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAction(fn: () => Promise<void>) {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6 z-50 animate-fade-in">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="flex flex-wrap items-center gap-3 px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl"
        onKeyDown={(e) => { if (e.key === "Escape") { setShowMembers(false); setShowLabels(false); setShowStatuses(false); } }}
      >
        <span className="text-sm font-medium tabular-nums">
          {selectedCount} selected
        </span>

        <div className="w-px h-5 bg-[var(--border)]" />

        <button
          onClick={() => handleAction(onArchive)}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
        >
          Archive
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowMembers(!showMembers); setShowLabels(false); setShowStatuses(false); }}
            disabled={loading}
            aria-haspopup="true"
            aria-expanded={showMembers}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
          >
            Reassign
          </button>
          {showMembers && (
            <div role="menu" className="absolute bottom-full mb-2 left-0 w-48 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  role="menuitem"
                  onClick={() => { handleAction(() => onReassign(m.user_id)); setShowMembers(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[8px] text-white font-semibold shrink-0">
                    {m.display_name[0].toUpperCase()}
                  </div>
                  {m.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowLabels(!showLabels); setShowMembers(false); setShowStatuses(false); }}
            disabled={loading}
            aria-haspopup="true"
            aria-expanded={showLabels}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
          >
            Label
          </button>
          {showLabels && (
            <div role="menu" className="absolute bottom-full mb-2 left-0 w-48 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              {labels.map((l) => (
                <div key={l.id} role="menuitem" className="flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="text-xs">{l.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { handleAction(() => onLabel(l.id, "add")); setShowLabels(false); }}
                      aria-label={`Add label ${l.name}`}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300"
                    >
                      +
                    </button>
                    <button
                      onClick={() => { handleAction(() => onLabel(l.id, "remove")); setShowLabels(false); }}
                      aria-label={`Remove label ${l.name}`}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {states && states.length > 0 && onStatusChange && (
          <div className="relative">
            <button
              onClick={() => { setShowStatuses(!showStatuses); setShowMembers(false); setShowLabels(false); }}
              disabled={loading}
              aria-haspopup="true"
              aria-expanded={showStatuses}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            >
              Status
            </button>
            {showStatuses && (
              <div role="menu" className="absolute bottom-full mb-2 left-0 w-48 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                {states.map((s) => (
                  <button
                    key={s.id}
                    role="menuitem"
                    onClick={() => { handleAction(() => onStatusChange(s.id)); setShowStatuses(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-5 bg-[var(--border)]" />

        <button
          onClick={onCancel}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
