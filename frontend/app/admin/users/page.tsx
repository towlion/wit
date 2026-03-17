"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (search) params.set("search", search);
    api.get<AdminUser[]>(`/admin/users?${params}`).then(setUsers);
  }, [search, offset]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleField(userId: number, field: "is_active" | "is_superuser", current: boolean) {
    await api.patch(`/admin/users/${userId}`, { [field]: !current });
    load();
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Search users..."
          className="input-base w-64"
        />
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Email</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Workspaces</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Role</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[10px] text-white font-semibold shrink-0">
                      {u.display_name[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{u.display_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{u.email}</td>
                <td className="px-4 py-3 text-center tabular-nums">{u.workspace_count}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    u.is_active
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/15 text-red-400 border-red-500/20"
                  }`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.is_superuser && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-500/15 text-amber-400 border-amber-500/20">
                      Superuser
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleField(u.id, "is_active", u.is_active)}
                      className={`text-xs transition-colors ${
                        u.is_active
                          ? "text-red-400/70 hover:text-red-400"
                          : "text-emerald-400/70 hover:text-emerald-400"
                      }`}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => toggleField(u.id, "is_superuser", u.is_superuser)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {u.is_superuser ? "Revoke admin" : "Grant admin"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === LIMIT && (
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
