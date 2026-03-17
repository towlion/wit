"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import MarkdownToolbar from "./MarkdownToolbar";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  wsSlug: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  showToolbar?: boolean;
}

export default function MentionTextarea({
  value,
  onChange,
  wsSlug,
  placeholder,
  rows = 3,
  className = "",
  onKeyDown,
  showToolbar = true,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const getMentionQuery = useCallback((text: string, cursorPos: number): string | null => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@([\w ]*)$/);
    if (!match) return null;
    return match[1];
  }, []);

  function handleChange(newValue: string) {
    onChange(newValue);
    const ta = textareaRef.current;
    if (!ta) return;
    requestAnimationFrame(() => {
      const query = getMentionQuery(newValue, ta.selectionStart);
      setMentionQuery(query);
      if (query !== null) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          api
            .get<User[]>(`/workspaces/${wsSlug}/members/search?q=${encodeURIComponent(query)}`)
            .then((users) => {
              setSuggestions(users);
              setSelectedIdx(0);
            })
            .catch((e) => { console.warn("Failed to search mentions:", e.message); setSuggestions([]); });
        }, 200);
      } else {
        setSuggestions([]);
      }
    });
  }

  function selectSuggestion(user: User) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    const newValue = value.slice(0, atIdx) + `@${user.display_name} ` + value.slice(cursor);
    onChange(newValue);
    setSuggestions([]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const newCursor = atIdx + user.display_name.length + 2;
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0 && mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {showToolbar && (
        <div className="border border-b-0 border-[var(--border)] rounded-t-xl bg-[var(--bg-tertiary)]">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        aria-autocomplete="list"
        aria-controls={suggestions.length > 0 && mentionQuery !== null ? "mention-suggestions" : undefined}
        className={`${className} ${showToolbar ? "rounded-t-none border-t-0" : ""}`}
      />
      {suggestions.length > 0 && mentionQuery !== null && (
        <div id="mention-suggestions" role="listbox" aria-label="User suggestions" className="absolute left-0 right-0 z-50 mt-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((user, i) => (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={i === selectedIdx}
              onClick={() => selectSuggestion(user)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                i === selectedIdx
                  ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[8px] text-white font-medium shrink-0">
                {user.display_name[0].toUpperCase()}
              </div>
              <span className="truncate">{user.display_name}</span>
              <span className="text-xs text-[var(--text-muted)] ml-auto truncate">{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
