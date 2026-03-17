"use client";

import { RefObject } from "react";

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after: string,
  defaultText: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || defaultText;
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(newValue);
  const cursorPos = start + before.length + selected.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      cursorPos
    );
  });
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  prefix: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const block = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
  const newValue = value.slice(0, lineStart) + prefixed + (lineEnd === -1 ? "" : value.slice(lineEnd));
  onChange(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + prefixed.length);
  });
}

const buttons: { label: string; title: string; action: (ta: HTMLTextAreaElement, v: string, o: (v: string) => void) => void }[] = [
  {
    label: "B",
    title: "Bold",
    action: (ta, v, o) => insertMarkdown(ta, v, o, "**", "**", "bold"),
  },
  {
    label: "I",
    title: "Italic",
    action: (ta, v, o) => insertMarkdown(ta, v, o, "*", "*", "italic"),
  },
  {
    label: "</>",
    title: "Code",
    action: (ta, v, o) => insertMarkdown(ta, v, o, "`", "`", "code"),
  },
  {
    label: "\u{1f517}",
    title: "Link",
    action: (ta, v, o) => insertMarkdown(ta, v, o, "[", "](url)", "link text"),
  },
  {
    label: "H",
    title: "Heading",
    action: (ta, v, o) => prefixLines(ta, v, o, "## "),
  },
  {
    label: "\u2022",
    title: "Unordered list",
    action: (ta, v, o) => prefixLines(ta, v, o, "- "),
  },
  {
    label: "1.",
    title: "Ordered list",
    action: (ta, v, o) => prefixLines(ta, v, o, "1. "),
  },
  {
    label: ">",
    title: "Quote",
    action: (ta, v, o) => prefixLines(ta, v, o, "> "),
  },
];

export default function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-1 border-b border-[var(--border)]">
      {buttons.map((btn) => (
        <button
          key={btn.title}
          type="button"
          title={btn.title}
          onClick={() => {
            if (textareaRef.current) {
              btn.action(textareaRef.current, value, onChange);
            }
          }}
          className="w-7 h-7 flex items-center justify-center rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors font-mono"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
