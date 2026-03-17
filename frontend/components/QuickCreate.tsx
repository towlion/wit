"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import type { ItemTemplate } from "@/lib/types";

interface QuickCreateProps {
  onSubmit: (title: string) => Promise<void>;
  onSubmitFromTemplate?: (template: ItemTemplate) => Promise<void>;
  templates?: ItemTemplate[];
}

export default function QuickCreate({ onSubmit, onSubmitFromTemplate, templates }: QuickCreateProps) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowTemplates(false);
    }
    if (showTemplates) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTemplates]);

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

  async function handleTemplateClick(tmpl: ItemTemplate) {
    setShowTemplates(false);
    if (onSubmitFromTemplate) {
      setSubmitting(true);
      await onSubmitFromTemplate(tmpl);
      setSubmitting(false);
    }
  }

  const hasTemplates = templates && templates.length > 0 && onSubmitFromTemplate;

  if (!active) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => setActive(true)}
          aria-label="Add item"
          className="flex-1 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-3 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]/50 transition-all duration-200"
        >
          <span className="opacity-70">+</span> Add item
        </button>
        {hasTemplates && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2.5 py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]/50 transition-all duration-200"
              title="Create from template"
              aria-label="Create from template"
              aria-haspopup="true"
              aria-expanded={showTemplates}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            {showTemplates && (
              <div role="menu" className="absolute bottom-full mb-1 right-0 w-48 card-surface shadow-2xl shadow-black/40 z-50 py-1 animate-fade-in" onKeyDown={(e) => { if (e.key === "Escape") setShowTemplates(false); }}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Templates
                </div>
                {templates!.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    role="menuitem"
                    onClick={() => handleTemplateClick(tmpl)}
                    disabled={submitting}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
        aria-label="New item title"
        className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] shadow-[0_0_12px_var(--accent-glow)] transition-all"
      />
    </div>
  );
}
