"use client";

import { useState, KeyboardEvent } from "react";

interface QuickCreateProps {
  onSubmit: (title: string) => Promise<void>;
}

export default function QuickCreate({ onSubmit }: QuickCreateProps) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      e.preventDefault();
      setSubmitting(true);
      await onSubmit(title.trim());
      setTitle("");
      setSubmitting(false);
    }
    if (e.key === "Escape") {
      setActive(false);
      setTitle("");
    }
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]/50 transition-all duration-200"
      >
        <span className="opacity-70">+</span> Add item
      </button>
    );
  }

  return (
    <div className="animate-fade-in">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) setActive(false);
        }}
        disabled={submitting}
        placeholder="Enter title, press Enter..."
        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] shadow-[0_0_12px_var(--accent-glow)] transition-all"
      />
    </div>
  );
}
