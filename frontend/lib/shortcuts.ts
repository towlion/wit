import { useEffect, useCallback } from "react";

export interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Allow meta/ctrl shortcuts even in inputs
      const inInput = isInputFocused();

      for (const s of shortcuts) {
        const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;

        if (e.key.toLowerCase() === s.key.toLowerCase() && metaMatch && shiftMatch) {
          // Skip non-meta shortcuts when in input
          if (inInput && !s.meta) continue;
          e.preventDefault();
          s.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

export const SHORTCUT_LIST = [
  { key: "n", description: "New item (focus quick create)" },
  { key: "j", description: "Next card" },
  { key: "k", description: "Previous card" },
  { key: "Enter", description: "Open selected card" },
  { key: "Escape", description: "Close panel / deselect" },
  { key: "e", description: "Edit description (in detail)" },
  { key: "k", meta: true, description: "Search" },
  { key: "?", description: "Show keyboard shortcuts" },
];
