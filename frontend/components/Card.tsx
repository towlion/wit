"use client";

import { useDraggable } from "@dnd-kit/core";
import type { WorkItem } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-blue-500/20 text-blue-400",
  low: "bg-gray-500/20 text-gray-400",
};

interface CardProps {
  item: WorkItem;
  overlay?: boolean;
  onClick?: () => void;
}

export default function Card({ item, overlay, onClick }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={onClick}
      className={`p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] cursor-pointer hover:border-[var(--border-hover)] transition select-none ${
        isDragging ? "opacity-30" : ""
      } ${overlay ? "shadow-xl rotate-2 scale-105" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 mt-0.5">
          #{item.item_number}
        </span>
        <span className="text-sm leading-snug flex-1">{item.title}</span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
          }`}
        >
          {item.priority}
        </span>

        {item.labels.map((label) => (
          <span
            key={label.id}
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: label.color }}
            title={label.name}
          />
        ))}

        {item.assignees.length > 0 && (
          <div className="flex -space-x-1 ml-auto">
            {item.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[9px] text-white font-medium border border-[var(--bg-secondary)]"
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
