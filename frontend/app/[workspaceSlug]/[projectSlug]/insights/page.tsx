"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ProjectInsights } from "@/lib/types";
import BarChart from "@/components/BarChart";
import LineChart from "@/components/LineChart";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

export default function ProjectInsightsPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;
  const [data, setData] = useState<ProjectInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ProjectInsights>(`${basePath}/insights`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [basePath]);

  function handleExport() {
    const token = localStorage.getItem("token");
    const url = `/api${basePath}/export.csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${projectSlug}-items.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <span className="text-sm text-[var(--text-muted)]">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)]">Failed to load insights</div>
    );
  }

  const completedCount = data.recently_completed.length;

  return (
    <div className="p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/${wsSlug}/${projectSlug}`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            &larr; Board
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Insights</h1>
        </div>
        <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
          <div className="text-xl font-bold tracking-tight mt-1">
            {data.cycle_time.avg_days != null ? `${data.cycle_time.avg_days}d` : "--"}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Avg cycle time{data.cycle_time.median_days != null ? ` (median ${data.cycle_time.median_days}d)` : ""}
          </div>
        </div>
        <div className="card-surface p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="text-xl font-bold tracking-tight mt-1">{completedCount}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Recently completed</div>
        </div>
      </div>

      {/* Status + Priority side by side */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Status Distribution
          </h2>
          <BarChart
            items={data.status_distribution.map((s) => ({
              label: s.state_name,
              value: s.count,
              color: s.color,
            }))}
          />
        </div>
        <div className="card-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Priority Distribution
          </h2>
          <BarChart
            items={data.priority_distribution.map((p) => ({
              label: p.priority,
              value: p.count,
              color: PRIORITY_COLORS[p.priority] || "#6b7280",
            }))}
          />
        </div>
      </div>

      {/* Burndown */}
      <div className="card-surface p-4 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Burndown (30 days)
        </h2>
        {data.burndown.length > 0 ? (
          <LineChart
            points={data.burndown.map((b) => ({
              label: b.date.slice(5),
              value: b.remaining,
            }))}
            color="#6366f1"
          />
        ) : (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">No data</div>
        )}
      </div>

      {/* Member breakdown */}
      <div className="card-surface p-4 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Member Breakdown
        </h2>
        {data.member_breakdown.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">No data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="text-left font-medium pb-2">Member</th>
                  <th className="text-right font-medium pb-2">Created</th>
                  <th className="text-right font-medium pb-2">Completed</th>
                  <th className="text-right font-medium pb-2">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {data.member_breakdown.map((m) => (
                  <tr key={m.user_id} className="border-t border-[var(--border-subtle)]">
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-semibold shrink-0">
                        {m.display_name[0].toUpperCase()}
                      </div>
                      {m.display_name}
                    </td>
                    <td className="text-right py-2 tabular-nums">{m.items_created}</td>
                    <td className="text-right py-2 tabular-nums">{m.items_completed}</td>
                    <td className="text-right py-2 tabular-nums">{m.items_assigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently completed */}
      <div className="card-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Recently Completed
        </h2>
        {data.recently_completed.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">No completed items</div>
        ) : (
          <div className="space-y-2">
            {data.recently_completed.map((item) => (
              <div key={item.item_number} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0">
                    #{item.item_number}
                  </span>
                  <span className="text-sm truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {item.completed_by && (
                    <span className="text-xs text-[var(--text-muted)]">{item.completed_by}</span>
                  )}
                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                    {timeAgo(item.completed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
