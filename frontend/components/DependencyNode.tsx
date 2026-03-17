"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { WorkItem } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#6366f1",
  low: "#71717a",
};

interface DependencyNodeData {
  item: WorkItem;
  stateColor: string;
  stateName: string;
}

function DependencyNodeComponent({ data }: { data: DependencyNodeData }) {
  const { item, stateColor, stateName } = data;
  const isBlocked = item.blocked_by && item.blocked_by.length > 0;
  const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--text-muted)] !border-[var(--bg-secondary)]" />
      <div
        className={`w-[220px] rounded-xl border bg-[var(--bg-secondary)] px-3 py-2.5 cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 ${
          isBlocked ? "border-red-500/30 bg-red-500/[0.03]" : "border-[var(--border)] hover:border-[var(--border-hover)]"
        }`}
      >
        {/* Priority stripe */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: priorityColor }}
        />

        <div className="flex items-center gap-1.5 mb-1 pl-1.5">
          <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">
            #{item.item_number}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stateColor }}
              title={stateName}
            />
            <span className="text-[9px] text-[var(--text-muted)]">{stateName}</span>
          </div>
        </div>

        <div className="text-xs leading-snug pl-1.5 truncate" title={item.title}>
          {item.title}
        </div>

        <div className="flex items-center gap-1 mt-1.5 pl-1.5">
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${
              PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
            }`}
          >
            {item.priority}
          </span>
          {isBlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium border bg-red-500/15 text-red-400 border-red-500/20">
              blocked
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--text-muted)] !border-[var(--bg-secondary)]" />
    </>
  );
}

export default memo(DependencyNodeComponent);
