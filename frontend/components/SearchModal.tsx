"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { SearchResult } from "@/lib/types";

interface SearchModalProps {
  basePath: string;
  onClose: () => void;
  onSelect?: (itemNumber: number) => void;
}

export default function SearchModal({ basePath, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useFocusTrap(dialogRef);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get<SearchResult[]>(
          `${basePath}/search?q=${encodeURIComponent(query)}`
        );
        setResults(r);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, basePath]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onSelect?.(results[selectedIndex].item.item_number);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search work items">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div
        ref={dialogRef}
        className="relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search work items..."
            aria-label="Search work items"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div id="search-results" role="listbox" aria-label="Search results" className="max-h-[300px] overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={r.item.id}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => {
                  onSelect?.(r.item.item_number);
                  onClose();
                }}
                className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                  i === selectedIndex ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 mt-0.5">
                  #{r.item.item_number}
                </span>
                <div className="min-w-0">
                  <div className="text-sm truncate">{r.item.title}</div>
                  <div
                    className="text-xs text-[var(--text-muted)] truncate mt-0.5 [&_mark]:text-[var(--accent)] [&_mark]:bg-transparent [&_mark]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: r.headline }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">No results found</div>
        )}
      </div>
    </div>
  );
}
