"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AdminWorkspace } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/lib/toast";

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminWorkspace | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();
  const LIMIT = 50;

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (search) params.set("search", search);
    api.get<AdminWorkspace[]>(`/admin/workspaces?${params}`).then(setWorkspaces);
  }, [search, offset]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeleteWorkspace() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/workspaces/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
      toast.success("Workspace deleted");
    } catch { toast.error("Failed to delete workspace"); }
    finally { setDeleteLoading(false); }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Workspaces</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Search workspaces..."
          className="input-base w-64"
        />
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Slug</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Members</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Projects</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Items</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws) => (
              <tr key={ws.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="px-4 py-3 font-medium">{ws.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{ws.slug}</td>
                <td className="px-4 py-3 text-center tabular-nums">{ws.member_count}</td>
                <td className="px-4 py-3 text-center tabular-nums">{ws.project_count}</td>
                <td className="px-4 py-3 text-center tabular-nums">{ws.item_count}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleteTarget(ws)}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete workspace"
        message={`Permanently delete "${deleteTarget?.name}"? All projects, items, and members will be removed.`}
        loading={deleteLoading}
        onConfirm={handleDeleteWorkspace}
        onCancel={() => setDeleteTarget(null)}
      />

      {workspaces.length === LIMIT && (
        <div className="flex justify-center gap-3 mt-4">
          {offset > 0 && (
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="btn-secondary text-xs">
              Previous
            </button>
          )}
          <button onClick={() => setOffset(offset + LIMIT)} className="btn-secondary text-xs">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
