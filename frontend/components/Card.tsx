"use client";

import { useDraggable } from "@dnd-kit/core";
import type { WorkItem } from "@/lib/types";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#6366f1",
  low: "#71717a",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

interface CardProps {
  item: WorkItem;
  overlay?: boolean;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function Card({ item, overlay, onClick, selectable, selected, onToggleSelect }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });

  const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={onClick}
      className={`group relative p-3 rounded-xl bg-[var(--bg-secondary)] border cursor-pointer select-none transition-all duration-200 ${
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30" : "border-[var(--border)]"
      } ${
        isDragging ? "opacity-30" : ""
      } ${
        overlay
          ? "shadow-2xl shadow-black/40 rotate-2 scale-105 border-[var(--accent)]/30"
          : "hover:border-[var(--border-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
      }`}
    >
      {/* Selection checkbox */}
      {selectable && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
          className={`absolute top-2 right-2 w-4 h-4 rounded border transition-all z-10 flex items-center justify-center ${
            selected
              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
              : "border-[var(--border)] bg-[var(--bg-tertiary)] opacity-0 group-hover:opacity-100"
          }`}
        >
          {selected && (
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {/* Priority stripe on left edge */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ backgroundColor: priorityColor }}
      />

      <div className="flex items-start gap-2 pl-2">
        <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 mt-0.5 opacity-60">
          #{item.item_number}
        </span>
        <span className="text-sm leading-snug flex-1">{item.title}</span>
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 pl-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
            PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
          }`}
        >
          {item.priority}
        </span>

        {item.due_date && (() => {
          const today = new Date().toISOString().split("T")[0];
          const isOverdue = item.due_date < today;
          const isToday = item.due_date === today;
          return (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                isOverdue
                  ? "bg-red-500/15 text-red-400 border-red-500/20"
                  : isToday
                  ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
              }`}
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(item.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          );
        })()}

        {item.labels.map((label) => (
          <span
            key={label.id}
            className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
            style={{ backgroundColor: label.color }}
            title={label.name}
          />
        ))}

        {item.assignees.length > 0 && (
          <div className="flex -space-x-1.5 ml-auto">
            {item.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-medium border-2 border-[var(--bg-secondary)]"
                title={a.display_name}
              >
                {a.display_name[0].toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
