"use client";

import { useState, useRef, useEffect } from "react";
import type { BoardSettings, CardDisplaySettings, WorkflowState } from "@/lib/types";

interface Props {
  settings: BoardSettings;
  states: WorkflowState[];
  onUpdate: (settings: BoardSettings) => void;
}

const DEFAULT_DISPLAY: CardDisplaySettings = {
  show_priority: true,
  show_due_date: true,
  show_labels: true,
  show_assignees: true,
  show_description: false,
};

export default function BoardSettingsPopover({ settings, states, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const display = settings.card_display || DEFAULT_DISPLAY;

  function toggleDisplay(key: keyof CardDisplaySettings) {
    onUpdate({
      ...settings,
      card_display: { ...display, [key]: !display[key] },
    });
  }

  function setWipLimit(stateId: number, value: string) {
    const limits = { ...settings.wip_limits };
    const num = parseInt(value);
    if (value === "" || isNaN(num) || num <= 0) {
      delete limits[String(stateId)];
    } else {
      limits[String(stateId)] = num;
    }
    onUpdate({ ...settings, wip_limits: limits });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Board settings"
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center gap-1"
        title="Board settings"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-[-0.5rem] sm:right-0 top-full mt-1 w-[calc(100vw-2rem)] sm:w-72 card-surface p-4 shadow-2xl shadow-black/40 z-50 animate-fade-in" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
          {/* Card display */}
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Card display
          </h3>
          <div role="group" aria-label="Card display options" className="space-y-1.5 mb-4">
            {([
              ["show_priority", "Priority badge"],
              ["show_due_date", "Due date"],
              ["show_labels", "Labels"],
              ["show_assignees", "Assignees"],
              ["show_description", "Description preview"],
            ] as [keyof CardDisplaySettings, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={display[key]}
                  onChange={() => toggleDisplay(key)}
                  className="rounded border-[var(--border)] bg-[var(--bg-tertiary)] accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="h-px bg-[var(--border)] mb-3" />

          {/* WIP limits */}
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            WIP limits
          </h3>
          <div role="group" aria-label="WIP limits per column" className="space-y-1.5">
            {states.map((state) => (
              <div key={state.id} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: state.color }}
                />
                <span className="text-xs flex-1 truncate">{state.name}</span>
                <input
                  type="number"
                  min={0}
                  placeholder="--"
                  value={settings.wip_limits[String(state.id)] ?? ""}
                  onChange={(e) => setWipLimit(state.id, e.target.value)}
                  className="input-base w-14 text-xs text-center py-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
