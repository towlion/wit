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
    return <div className="p-6 text-[var(--text-muted)]">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Workspace settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Members</h2>
        <div className="space-y-2 mb-4">
          {workspace.members.map((m: Member) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
            >
              <div>
                <span className="text-sm">{m.display_name}</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">{m.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  {m.role}
                </span>
                {m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.user_id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
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
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="guest">Guest</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
