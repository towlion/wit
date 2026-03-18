"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { WorkspaceMemberWorkload } from "@/lib/types";
import StackedBar from "@/components/StackedBar";

export default function TeamWorkloadPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const [workload, setWorkload] = useState<WorkspaceMemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    api
      .get<WorkspaceMemberWorkload[]>(`/workspaces/${wsSlug}/workload`)
      .then(setWorkload)
      .catch(() => toast.error("Failed to load team workload"))
      .finally(() => setLoading(false));
  }, [wsSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <span className="text-sm text-[var(--text-muted)]">Loading team workload...</span>
        </div>
      </div>
    );
  }

  const sorted = [...workload].sort(
    (a, b) =>
      b.breakdown.todo_items + b.breakdown.in_progress_items -
      (a.breakdown.todo_items + a.breakdown.in_progress_items)
  );

  const totalMembers = workload.length;
  const openItems = workload.reduce(
    (sum, m) => sum + m.breakdown.todo_items + m.breakdown.in_progress_items,
    0
  );
  const totalPoints = workload.reduce((sum, m) => sum + m.total_points, 0);

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${wsSlug}`}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          &larr; Projects
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Team Workload</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="text-xl font-bold tracking-tight mt-1">{totalMembers}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Members</div>
        </div>
        <div className="card-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="text-xl font-bold tracking-tight mt-1">{openItems}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Open Items</div>
        </div>
        <div className="card-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="text-xl font-bold tracking-tight mt-1">{totalPoints}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Total Story Points</div>
        </div>
      </div>

      {/* Workload table */}
      {sorted.length === 0 ? (
        <div className="card-surface p-4 text-center py-12 text-sm text-[var(--text-muted)]">
          No workload data
        </div>
      ) : (
        <div className="card-surface p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="text-left font-medium pb-2">Member</th>
                  <th className="text-right font-medium pb-2">Items</th>
                  <th className="text-right font-medium pb-2">Points</th>
                  <th className="font-medium pb-2 pl-4 w-1/4">Distribution</th>
                  <th className="text-left font-medium pb-2 pl-4">Projects</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.user_id} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-semibold shrink-0">
                        {m.display_name[0].toUpperCase()}
                      </div>
                      {m.display_name}
                    </td>
                    <td className="text-right py-2 tabular-nums">{m.total_items}</td>
                    <td className="text-right py-2 tabular-nums">{m.total_points}</td>
                    <td className="py-2 pl-4">
                      <StackedBar
                        segments={[
                          { label: "Todo", value: m.breakdown.todo_items, color: "#6b7280" },
                          { label: "In Progress", value: m.breakdown.in_progress_items, color: "#6366f1" },
                          { label: "Done", value: m.breakdown.done_items, color: "#10b981" },
                        ]}
                      />
                    </td>
                    <td className="py-2 pl-4">
                      <div className="flex flex-wrap gap-1">
                        {m.projects.map((proj) => (
                          <span
                            key={proj}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                          >
                            {proj}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#6b7280" }} />Todo</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#6366f1" }} />In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#10b981" }} />Done</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
