"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AdminAuditLogEntry } from "@/lib/types";
import { SkeletonTable } from "@/components/Skeleton";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (entityType) params.set("entity_type", entityType);
    if (actionFilter) params.set("action", actionFilter);
    setLoading(true);
    api.get<AdminAuditLogEntry[]>(`/admin/audit-log?${params}`).then(setLogs).finally(() => setLoading(false));
  }, [entityType, actionFilter, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function formatAction(action: string): string {
    return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
        <div className="flex items-center gap-2">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setOffset(0); }}
            className="input-base w-auto text-xs"
          >
            <option value="">All entities</option>
            <option value="user">Users</option>
            <option value="workspace">Workspaces</option>
          </select>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
            placeholder="Filter action..."
            className="input-base w-48 text-xs"
          />
        </div>
      </div>

      {loading ? <SkeletonTable rows={8} cols={5} /> : <div className="space-y-2">
        {logs.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">
            No audit log entries found
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="card-surface p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {log.actor?.display_name || "System"}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatAction(log.action)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                  {log.entity_type} #{log.entity_id}
                </span>
              </div>
              {log.details && (
                <div className="mt-1.5 text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </div>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">
              {timeAgo(log.created_at)}
            </span>
          </div>
        ))}
      </div>}

      {logs.length === LIMIT && (
        <div className="flex justify-center gap-3 mt-4">
          {offset > 0 && (
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="btn-secondary text-xs">
              Previous
            </button>
          )}
          <button onClick={() => setOffset(offset + LIMIT)} className="btn-secondary text-xs">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
