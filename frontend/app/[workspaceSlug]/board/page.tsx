"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CrossProjectItem } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

const CATEGORY_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#6b7280" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "done", label: "Done", color: "#22c55e" },
];

type GroupBy = "none" | "project" | "priority";

export default function CrossProjectBoardPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const [items, setItems] = useState<CrossProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  useEffect(() => {
    api
      .get<CrossProjectItem[]>(`/workspaces/${wsSlug}/items`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [wsSlug]);

  const filtered = filterPriority
    ? items.filter((i) => i.priority === filterPriority)
    : items;

  function renderItemCard(item: CrossProjectItem) {
    return (
      <Link
        key={item.id}
        href={`/${wsSlug}/${item.project_slug}`}
        className="group p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all duration-200 block"
      >
        <div className="flex items-start gap-2">
          <div
            className="w-[3px] rounded-full self-stretch shrink-0 mt-0.5"
            style={{ backgroundColor: item.status_color }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">
                #{item.item_number}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)] truncate max-w-[100px]">
                {item.project_name}
              </span>
            </div>
            <div className="text-sm leading-snug">{item.title}</div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
                  PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
                }`}
              >
                {item.priority}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)]"
              >
                {item.status_name}
              </span>
              {item.due_date && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {new Date(item.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {item.assignee_names.length > 0 && (
                <div className="flex -space-x-1.5 ml-auto">
                  {item.assignee_names.slice(0, 3).map((name, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-medium border-2 border-[var(--bg-secondary)]"
                      title={name}
                    >
                      {name[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  function renderColumn(category: typeof CATEGORY_CONFIG[number], columnItems: CrossProjectItem[]) {
    return (
      <div key={category.key} className="flex flex-col w-64 sm:w-80 shrink-0 rounded-xl">
        <div className="mx-1.5 mt-1.5 rounded-t-lg overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: category.color }} />
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--bg-secondary)]/50">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[var(--bg-primary)]/50"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm font-semibold truncate tracking-tight">{category.label}</span>
            <span className="text-[11px] text-[var(--text-muted)] ml-auto tabular-nums font-medium bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
              {columnItems.length}
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 px-1.5 pb-1.5 mt-1.5 min-h-[100px] max-h-[calc(100vh-200px)] overflow-y-auto">
          {columnItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">No items</div>
          ) : (
            columnItems.map(renderItemCard)
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <span className="text-sm text-[var(--text-muted)]">Loading board...</span>
        </div>
      </div>
    );
  }

  // Group items within each category column
  function getGroupedColumns() {
    if (groupBy === "none") {
      return CATEGORY_CONFIG.map((cat) => ({
        ...cat,
        groups: [{ key: "__all__", label: "", items: filtered.filter((i) => i.status_category === cat.key) }],
      }));
    }

    return CATEGORY_CONFIG.map((cat) => {
      const catItems = filtered.filter((i) => i.status_category === cat.key);
      const groups = new Map<string, { label: string; items: CrossProjectItem[] }>();

      if (groupBy === "project") {
        for (const item of catItems) {
          if (!groups.has(item.project_slug)) groups.set(item.project_slug, { label: item.project_name, items: [] });
          groups.get(item.project_slug)!.items.push(item);
        }
      } else if (groupBy === "priority") {
        for (const p of ["urgent", "high", "medium", "low"]) {
          const pItems = catItems.filter((i) => i.priority === p);
          if (pItems.length > 0) groups.set(p, { label: p.charAt(0).toUpperCase() + p.slice(1), items: pItems });
        }
      }

      return {
        ...cat,
        groups: Array.from(groups.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items })),
      };
    });
  }

  const columns = getGroupedColumns();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/${wsSlug}`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            &larr; Projects
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">All Items</h1>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input-base text-[10px] w-auto py-1.5"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="input-base text-[10px] w-auto py-1.5"
          >
            <option value="none">No grouping</option>
            <option value="project">Group by project</option>
            <option value="priority">Group by priority</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-x-auto p-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className="flex flex-col w-64 sm:w-80 shrink-0 rounded-xl">
            <div className="mx-1.5 mt-1.5 rounded-t-lg overflow-hidden">
              <div className="h-[3px]" style={{ backgroundColor: col.color }} />
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--bg-secondary)]/50">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[var(--bg-primary)]/50"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-sm font-semibold truncate tracking-tight">{col.label}</span>
                <span className="text-[11px] text-[var(--text-muted)] ml-auto tabular-nums font-medium bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                  {col.groups.reduce((sum, g) => sum + g.items.length, 0)}
                </span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 px-1.5 pb-1.5 mt-1.5 min-h-[100px] max-h-[calc(100vh-200px)] overflow-y-auto">
              {col.groups.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">No items</div>
              ) : (
                col.groups.map((group) => (
                  <div key={group.key}>
                    {group.label && groupBy !== "none" && (
                      <div className="flex items-center gap-2 mb-1.5 mt-2 first:mt-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          {group.label}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)]">({group.items.length})</span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {group.items.map(renderItemCard)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
