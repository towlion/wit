"use client";

import { SHORTCUT_LIST } from "@/lib/shortcuts";

interface ShortcutHelpProps {
  onClose: () => void;
}

export default function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div
        className="relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 w-full max-w-sm p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-tight">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-1.5">
          {SHORTCUT_LIST.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
              <span className="text-xs text-[var(--text-secondary)]">{s.description}</span>
              <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">
                {s.meta ? "Cmd+" : ""}{s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
