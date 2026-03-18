"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Workspace, Member, ActivityEvent, WorkspaceStats, WorkspaceInsights, WorkspaceMemberWorkload } from "@/lib/types";
import LineChart from "@/components/LineChart";
import StackedBar from "@/components/StackedBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/lib/toast";

interface Invite {
  id: number;
  token: string;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

interface Webhook {
  id: number;
  url: string;
  event_types: Record<string, unknown> | null;
  active: boolean;
}

type Tab = "members" | "audit" | "stats";

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("members");

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteRole, setInviteRole] = useState("member");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Audit
  const [auditEvents, setAuditEvents] = useState<ActivityEvent[]>([]);
  const [auditEventType, setAuditEventType] = useState("");
  const [auditOffset, setAuditOffset] = useState(0);

  // Stats
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [wsInsights, setWsInsights] = useState<WorkspaceInsights | null>(null);
  const [wsWorkload, setWsWorkload] = useState<WorkspaceMemberWorkload[]>([]);
  const { toast } = useToast();

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{ action: () => Promise<void>; title: string; message: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Button loading
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.get<Workspace>(`/workspaces/${wsSlug}`).then(setWorkspace).catch(() => toast.error("Failed to load workspace settings"));
    api.get<Invite[]>(`/workspaces/${wsSlug}/invites`).then(setInvites).catch(() => toast.error("Failed to load invites"));
    api.get<Webhook[]>(`/workspaces/${wsSlug}/webhooks`).then(setWebhooks).catch(() => toast.error("Failed to load webhooks"));
  }, [wsSlug]);

  const loadAudit = useCallback(() => {
    const params = new URLSearchParams({ limit: "50", offset: String(auditOffset) });
    if (auditEventType) params.set("event_type", auditEventType);
    api.get<ActivityEvent[]>(`/workspaces/${wsSlug}/audit?${params}`).then(setAuditEvents).catch(() => toast.error("Failed to load audit log"));
  }, [wsSlug, auditEventType, auditOffset]);

  useEffect(() => {
    if (activeTab === "audit") loadAudit();
  }, [activeTab, loadAudit]);

  useEffect(() => {
    if (activeTab === "stats") {
      api.get<WorkspaceStats>(`/workspaces/${wsSlug}/stats`).then(setStats).catch(() => toast.error("Failed to load stats"));
      api.get<WorkspaceInsights>(`/workspaces/${wsSlug}/insights`).then(setWsInsights).catch(() => toast.error("Failed to load insights"));
      api.get<WorkspaceMemberWorkload[]>(`/workspaces/${wsSlug}/workload`).then(setWsWorkload).catch(() => toast.error("Failed to load workload"));
    }
  }, [activeTab, wsSlug]);

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

  function confirmRemoveMember(member: Member) {
    setConfirmState({
      title: "Remove member",
      message: `Remove ${member.display_name} from this workspace? They will lose access to all projects.`,
      action: async () => {
        await api.delete(`/workspaces/${wsSlug}/members/${member.user_id}`);
        const ws = await api.get<Workspace>(`/workspaces/${wsSlug}`);
        setWorkspace(ws);
        toast.success("Member removed");
      },
    });
  }

  async function createInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const invite = await api.post<Invite>(`/workspaces/${wsSlug}/invites`, { role: inviteRole });
      setInvites([invite, ...invites]);
      toast.success("Invite link created");
    } catch { toast.error("Failed to create invite"); }
    finally { setInviting(false); }
  }

  async function revokeInvite(id: number) {
    await api.delete(`/workspaces/${wsSlug}/invites/${id}`);
    setInvites(invites.filter((i) => i.id !== id));
  }

  function copyInviteLink(invite: Invite) {
    const url = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function addWebhook(e: FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    try {
      const webhook = await api.post<Webhook>(`/workspaces/${wsSlug}/webhooks`, { url: webhookUrl });
      setWebhooks([...webhooks, webhook]);
      setWebhookUrl("");
      toast.success("Webhook created");
    } catch { toast.error("Failed to create webhook"); }
  }

  function confirmDeleteWebhook(wh: Webhook) {
    setConfirmState({
      title: "Delete webhook",
      message: `Delete webhook to ${wh.url}? Integrations using this webhook will stop receiving events.`,
      action: async () => {
        await api.delete(`/workspaces/${wsSlug}/webhooks/${wh.id}`);
        setWebhooks(webhooks.filter((w) => w.id !== wh.id));
        toast.success("Webhook deleted");
      },
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

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "audit", label: "Audit Log" },
    { key: "stats", label: "Stats" },
  ];

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        loading={confirmLoading}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmLoading(true);
          try {
            await confirmState.action();
          } catch { toast.error("Operation failed"); }
          finally {
            setConfirmLoading(false);
            setConfirmState(null);
          }
        }}
        onCancel={() => setConfirmState(null)}
      />
      <h1 className="text-xl font-semibold tracking-tight mb-4">Workspace settings</h1>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[var(--accent)] text-[var(--accent-hover)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {activeTab === "members" && (
        <>
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Members</h2>
            <div className="space-y-2 mb-4">
              {workspace.members.map((m: Member) => (
                <div key={m.user_id} className="flex items-center justify-between p-3.5 card-surface">
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
                      <button onClick={() => confirmRemoveMember(m)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
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

            <form onSubmit={addMember} className="flex flex-col sm:flex-row gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="input-base flex-1" />
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input-base w-auto">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              <button type="submit" className="btn-primary">Add</button>
            </form>
          </section>

          <div className="h-px bg-[var(--border)] mb-8" />

          {/* Invite Links */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Invite links</h2>
            <div className="space-y-2 mb-4">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3.5 card-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                      {inv.role}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono truncate">
                      ...{inv.token.slice(-12)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {inv.use_count} uses
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyInviteLink(inv)}
                      className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      {copiedId === inv.id ? "Copied!" : "Copy link"}
                    </button>
                    <button onClick={() => revokeInvite(inv.id)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={createInvite} className="flex flex-col sm:flex-row gap-2">
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input-base w-auto">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              <button type="submit" disabled={inviting} className="btn-primary">{inviting ? "Sending..." : "Create invite"}</button>
            </form>
          </section>

          <div className="h-px bg-[var(--border)] mb-8" />

          {/* Webhooks */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Webhooks</h2>
            <div className="space-y-2 mb-4">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-3.5 card-surface">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${wh.active ? "bg-green-500" : "bg-zinc-500"}`} />
                    <span className="text-xs truncate font-mono">{wh.url}</span>
                  </div>
                  <button onClick={() => confirmDeleteWebhook(wh)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors shrink-0 ml-2">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={addWebhook} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/webhook"
                required
                className="input-base flex-1"
              />
              <button type="submit" className="btn-primary">Add</button>
            </form>
          </section>
        </>
      )}

      {/* Audit Log tab */}
      {activeTab === "audit" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Activity</h2>
            <select
              value={auditEventType}
              onChange={(e) => { setAuditEventType(e.target.value); setAuditOffset(0); }}
              className="input-base w-auto text-xs"
            >
              <option value="">All events</option>
              <option value="created">Created</option>
              <option value="status_change">Status change</option>
              <option value="comment">Comment</option>
              <option value="assignee_added">Assignee added</option>
              <option value="assignee_removed">Assignee removed</option>
              <option value="label_added">Label added</option>
              <option value="label_removed">Label removed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {auditEvents.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-sm">
              No activity found
            </div>
          ) : (
            <div className="space-y-2">
              {auditEvents.map((ev) => (
                <div key={ev.id} className="card-surface p-3.5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                    {ev.user ? (
                      <span className="text-[9px] text-[var(--text-muted)] font-semibold">
                        {ev.user.display_name[0].toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[9px] text-[var(--text-muted)]">?</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{ev.user?.display_name || "Unknown"}</span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {ev.event_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        item #{ev.work_item_id}
                      </span>
                    </div>
                    {ev.body && (
                      <div className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{ev.body}</div>
                    )}
                    {(ev.old_value || ev.new_value) && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">
                        {ev.old_value && <span className="line-through mr-2">{ev.old_value}</span>}
                        {ev.new_value && <span>{ev.new_value}</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums">
                    {timeAgo(ev.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {auditEvents.length === 50 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setAuditOffset(auditOffset + 50)}
                className="btn-secondary text-xs"
              >
                Load more
              </button>
            </div>
          )}
        </section>
      )}

      {/* Stats tab */}
      {activeTab === "stats" && (
        <section>
          {!stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Total Items", value: stats.items_total.toLocaleString(), color: "from-indigo-500 to-violet-500" },
                { label: "Items This Week", value: stats.items_last_7d.toLocaleString(), color: "from-emerald-500 to-teal-500" },
                { label: "Active Members", value: stats.active_members.toLocaleString(), color: "from-amber-500 to-orange-500" },
                { label: "Attachments", value: stats.attachment_count.toLocaleString(), color: "from-sky-500 to-blue-500" },
                { label: "Storage Used", value: formatBytes(stats.storage_bytes), color: "from-pink-500 to-rose-500" },
              ].map((stat) => (
                <div key={stat.label} className="card-surface p-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${stat.color}`} />
                  <div className="text-xl font-bold tracking-tight mt-1">{stat.value}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Workspace Insights */}
          {wsInsights && (
            <>
              <div className="h-px bg-[var(--border)] my-6" />

              {/* Project completion */}
              <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Project Completion
                </h2>
                {wsInsights.project_summaries.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-muted)]">No projects</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                          <th className="text-left font-medium pb-2">Project</th>
                          <th className="text-right font-medium pb-2">Total</th>
                          <th className="text-right font-medium pb-2">Done</th>
                          <th className="text-right font-medium pb-2">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wsInsights.project_summaries.map((p) => (
                          <tr key={p.project_id} className="border-t border-[var(--border-subtle)]">
                            <td className="py-2 font-medium">{p.project_name}</td>
                            <td className="text-right py-2 tabular-nums">{p.total_items}</td>
                            <td className="text-right py-2 tabular-nums">{p.completed_items}</td>
                            <td className="text-right py-2 tabular-nums">
                              <span className={p.completion_rate >= 50 ? "text-emerald-400" : "text-[var(--text-muted)]"}>
                                {p.completion_rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Most active members */}
              <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Most Active Members (30d)
                </h2>
                {wsInsights.most_active_members.length === 0 ? (
                  <div className="text-center py-6 text-sm text-[var(--text-muted)]">No activity</div>
                ) : (
                  <div className="space-y-2">
                    {wsInsights.most_active_members.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-semibold shrink-0">
                            {m.display_name[0].toUpperCase()}
                          </div>
                          <span className="text-sm">{m.display_name}</span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] tabular-nums">
                          {m.events_count} events
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity trend */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Activity Trend (30d)
                </h2>
                <LineChart
                  points={wsInsights.activity_trend.map((t) => ({
                    label: t.date.slice(5),
                    value: t.count,
                  }))}
                  color="#6366f1"
                />
              </div>
            </>
          )}

          {/* Workspace Workload */}
          {wsWorkload.length > 0 && (
            <>
              <div className="h-px bg-[var(--border)] my-6" />
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Team Workload
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                        <th className="text-left font-medium pb-2">Member</th>
                        <th className="text-right font-medium pb-2">Items</th>
                        <th className="text-right font-medium pb-2">Points</th>
                        <th className="text-left font-medium pb-2 pl-4">Projects</th>
                        <th className="font-medium pb-2 pl-4 w-1/4">Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wsWorkload.map((m) => (
                        <tr key={m.user_id} className="border-t border-[var(--border-subtle)]">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[9px] text-white font-semibold shrink-0">
                                {m.display_name[0].toUpperCase()}
                              </div>
                              {m.display_name}
                            </div>
                          </td>
                          <td className="text-right py-2 tabular-nums">{m.total_items}</td>
                          <td className="text-right py-2 tabular-nums">{m.total_points}</td>
                          <td className="py-2 pl-4 text-xs text-[var(--text-muted)]">
                            {m.projects.join(", ")}
                          </td>
                          <td className="py-2 pl-4">
                            <StackedBar
                              segments={[
                                { label: "Todo", value: m.breakdown.todo_items, color: "#6b7280" },
                                { label: "In Progress", value: m.breakdown.in_progress_items, color: "#6366f1" },
                                { label: "Done", value: m.breakdown.done_items, color: "#10b981" },
                              ]}
                            />
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
            </>
          )}
        </section>
      )}
    </div>
  );
}
