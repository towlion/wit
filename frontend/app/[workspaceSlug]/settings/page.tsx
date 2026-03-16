"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Workspace, Member } from "@/lib/types";

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Workspace>(`/workspaces/${wsSlug}`).then(setWorkspace);
  }, [wsSlug]);

  async function addMember(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/workspaces/${wsSlug}/members`, { email, role });
      setEmail("");
      const ws = await api.get<Workspace>(`/workspaces/${wsSlug}`);
      setWorkspace(ws);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function removeMember(userId: number) {
    try {
      await api.delete(`/workspaces/${wsSlug}/members/${userId}`);
      const ws = await api.get<Workspace>(`/workspaces/${wsSlug}`);
      setWorkspace(ws);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Workspace settings</h1>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Members</h2>
        <div className="space-y-2 mb-4">
          {workspace.members.map((m: Member) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between p-3.5 card-surface"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[11px] text-white font-semibold shrink-0">
                  {m.display_name[0].toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium">{m.display_name}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">{m.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                  {m.role}
                </span>
                {m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.user_id)}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-[var(--danger-subtle)] border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-4 text-sm animate-fade-in">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={addMember} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="input-base flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-base w-auto"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="guest">Guest</option>
          </select>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
