"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, WorkItem, Label, Workspace, BulkOperationResult, Project, BoardSettings, ItemTemplate, Sprint } from "@/lib/types";
import Board from "@/components/Board";
import CardDetail from "@/components/CardDetail";
import FilterBar, { Filters } from "@/components/FilterBar";
import CalendarView from "@/components/CalendarView";
import DependencyGraph from "@/components/DependencyGraph";
import TimelineView from "@/components/TimelineView";
import SprintBacklog from "@/components/SprintBacklog";
import TableView from "@/components/TableView";
import SearchModal from "@/components/SearchModal";
import ShortcutHelp from "@/components/ShortcutHelp";
import BulkToolbar from "@/components/BulkToolbar";
import BoardSettingsPopover from "@/components/BoardSettingsPopover";
import { useKeyboardShortcuts, type Shortcut } from "@/lib/shortcuts";
import { useBoardSocket } from "@/lib/useBoardSocket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import Link from "next/link";

type ViewMode = "board" | "calendar" | "dependencies" | "timeline" | "backlog" | "table";

export default function ProjectBoardPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;
  const { user } = useAuth();
  const { toast } = useToast();

  const [states, setStates] = useState<WorkflowState[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const routerNav = useRouter();
  const [filters, setFilters] = useState<Filters>(() => {
    const f: Filters = {};
    const p = searchParams.get("priority"); if (p) f.priority = p;
    const a = searchParams.get("assigneeId"); if (a) f.assigneeId = parseInt(a);
    const l = searchParams.get("labelId"); if (l) f.labelId = parseInt(l);
    const s = searchParams.get("statusId"); if (s) f.statusId = parseInt(s);
    const db = searchParams.get("dueBefore"); if (db) f.dueBefore = db;
    const da = searchParams.get("dueAfter"); if (da) f.dueAfter = da;
    if (searchParams.get("overdue") === "true") f.overdue = true;
    return f;
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({
    wip_limits: {},
    swimlane: null,
    card_display: { show_priority: true, show_due_date: true, show_labels: true, show_assignees: true, show_description: false },
  });
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintFilter, setSprintFilter] = useState<number | "">("");
  const [userRole, setUserRole] = useState<string | null>(null);

  // Determine if user is admin/owner in this workspace
  const wsRole = workspace?.members.find((m) => m.user_id === user?.id)?.role;
  const effectiveRole = userRole || wsRole;
  const isAdmin = effectiveRole === "admin" || effectiveRole === "owner";
  const canEdit = effectiveRole !== "viewer";

  const shortcuts: Shortcut[] = useMemo(
    () => [
      { key: "?", description: "Show shortcuts", action: () => setShowShortcuts((v) => !v) },
      { key: "k", meta: true, description: "Search", action: () => setShowSearch((v) => !v) },
      { key: "Escape", description: "Close", action: () => { setShowShortcuts(false); setShowSearch(false); setSelectedIds(new Set()); } },
    ],
    []
  );
  useKeyboardShortcuts(shortcuts);

  const loadData = useCallback(() => {
    Promise.all([
      api.get<WorkflowState[]>(`${basePath}/states`),
      api.get<WorkItem[]>(`${basePath}/items`),
      api.get<Label[]>(`${basePath}/labels`),
    ]).then(([s, i, l]) => {
      setStates(s);
      setItems(i);
      setLabels(l);
      setLoading(false);
    }).catch(() => { toast.error("Failed to load board data"); setLoading(false); });
  }, [basePath]);

  useEffect(() => {
    loadData();
    api.get<Project>(basePath).then((p) => {
      setProjectId(p.id);
      if (p.board_settings) setBoardSettings(p.board_settings);
      if (p.user_role) setUserRole(p.user_role);
    }).catch(() => toast.error("Failed to load project settings"));
    api.get<ItemTemplate[]>(`${basePath}/templates`).then(setTemplates).catch((e) => console.warn("Failed to load templates:", e.message)); /* Optional features — board is fully usable without them */
    api.get<Sprint[]>(`${basePath}/sprints`).then(setSprints).catch((e) => console.warn("Failed to load sprints:", e.message)); /* Optional features — board is fully usable without them */
  }, [loadData, basePath]);

  useEffect(() => {
    if (user) {
      api.get<Workspace>(`/workspaces/${wsSlug}`).then(setWorkspace).catch((e) => console.warn("Failed to load workspace:", e.message)); /* Non-critical for board — used for member list in filters */
    }
  }, [wsSlug, user]);

  const { presence } = useBoardSocket(projectId, useCallback((event) => {
    if (event.type === "item_created" || event.type === "item_updated" || event.type === "item_deleted") {
      loadData();
    }
  }, [loadData]));

  function updateBoardSettings(newSettings: BoardSettings) {
    setBoardSettings(newSettings);
    api.patch(basePath, { board_settings: newSettings }).catch(() => toast.error("Failed to save board settings"));
  }

  function handleFiltersChange(f: Filters) {
    setFilters(f);
    const params = new URLSearchParams();
    if (f.priority) params.set("priority", f.priority);
    if (f.assigneeId) params.set("assigneeId", String(f.assigneeId));
    if (f.labelId) params.set("labelId", String(f.labelId));
    if (f.statusId) params.set("statusId", String(f.statusId));
    if (f.dueBefore) params.set("dueBefore", f.dueBefore);
    if (f.dueAfter) params.set("dueAfter", f.dueAfter);
    if (f.overdue) params.set("overdue", "true");
    const qs = params.toString();
    routerNav.replace(`/${wsSlug}/${projectSlug}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const filteredItems = items.filter((item) => {
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.assigneeId && !item.assignees.some((a) => a.id === filters.assigneeId))
      return false;
    if (filters.labelId && !item.labels.some((l) => l.id === filters.labelId)) return false;
    if (filters.statusId && item.status_id !== filters.statusId) return false;
    if (filters.dueBefore && (!item.due_date || item.due_date > filters.dueBefore)) return false;
    if (filters.dueAfter && (!item.due_date || item.due_date < filters.dueAfter)) return false;
    if (filters.overdue) {
      const today = new Date().toISOString().split("T")[0];
      if (!item.due_date || item.due_date >= today) return false;
    }
    if (sprintFilter && item.sprint_id !== sprintFilter) return false;
    return true;
  });

  async function onItemCreate(statusId: number, title: string) {
    const item = await api.post<WorkItem>(`${basePath}/items`, {
      title,
      status_id: statusId,
    });
    setItems((prev) => [...prev, item]);
  }

  async function onItemCreateFromTemplate(statusId: number, tmpl: ItemTemplate) {
    const item = await api.post<WorkItem>(`${basePath}/items`, {
      title: tmpl.title_template || tmpl.name,
      description: tmpl.description_template || undefined,
      status_id: statusId,
      priority: tmpl.priority,
    });
    // Apply template labels
    if (tmpl.label_ids && tmpl.label_ids.length > 0) {
      for (const labelId of tmpl.label_ids) {
        await api.post(`${basePath}/items/${item.item_number}/labels/${labelId}`).catch(() => toast.error("Failed to apply template label"));
      }
    }
    loadData();
  }

  async function onItemUpdate(itemNumber: number, data: Partial<WorkItem>) {
    const updated = await api.patch<WorkItem>(`${basePath}/items/${itemNumber}`, data);
    setItems((prev) => prev.map((i) => (i.item_number === itemNumber ? updated : i)));
  }

  function toggleSelect(itemId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleBulkArchive() {
    try {
      await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/archive`, {
        item_ids: Array.from(selectedIds),
      });
      toast.success(`Archived ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      toast.error("Failed to archive items");
    }
  }

  async function handleBulkReassign(assigneeId: number) {
    try {
      await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/reassign`, {
        item_ids: Array.from(selectedIds),
        assignee_id: assigneeId,
      });
      toast.success(`Reassigned ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      toast.error("Failed to reassign items");
    }
  }

  async function handleBulkStatus(statusId: number) {
    try {
      await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/status`, {
        item_ids: Array.from(selectedIds),
        status_id: statusId,
      });
      toast.success(`Updated status on ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleBulkLabel(labelId: number, action: "add" | "remove") {
    try {
      await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/labels`, {
        item_ids: Array.from(selectedIds),
        label_id: labelId,
        action,
      });
      toast.success(`Updated labels on ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      toast.error("Failed to update labels");
    }
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5 border-b border-[var(--border)] shrink-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <FilterBar filters={filters} onChange={handleFiltersChange} labels={labels} states={states} members={workspace?.members || []} basePath={basePath} />
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-x-auto">
            <button
              onClick={() => setViewMode("board")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "board"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "calendar"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode("dependencies")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "dependencies"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Dependencies
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "timeline"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("backlog")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "backlog"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Backlog
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors whitespace-nowrap ${
                viewMode === "table"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Table
            </button>
          </div>
          {viewMode === "board" && (
            <>
              <select
                value={boardSettings.swimlane || ""}
                onChange={(e) => updateBoardSettings({ ...boardSettings, swimlane: (e.target.value || null) as BoardSettings["swimlane"] })}
                className="input-base text-[10px] w-auto py-1.5 hidden sm:block"
              >
                <option value="">No swimlanes</option>
                <option value="priority">By priority</option>
                <option value="assignee">By assignee</option>
                <option value="label">By label</option>
              </select>
              {sprints.length > 0 && (
                <select
                  value={sprintFilter}
                  onChange={(e) => setSprintFilter(e.target.value ? parseInt(e.target.value) : "")}
                  className="input-base text-[10px] w-auto py-1.5 hidden sm:block"
                >
                  <option value="">All sprints</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {presence.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <div className="flex -space-x-1.5">
                {presence.slice(0, 5).map((p) => (
                  <div
                    key={p.user_id}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-500/80 flex items-center justify-center text-[9px] text-white font-medium border-2 border-[var(--bg-primary)] ring-1 ring-emerald-500/30"
                    title={p.display_name}
                  >
                    {p.display_name[0].toUpperCase()}
                  </div>
                ))}
              </div>
              {presence.length > 5 && (
                <span className="text-[10px] text-[var(--text-muted)]">+{presence.length - 5}</span>
              )}
            </div>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hidden sm:inline">Cmd+K</kbd>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="hidden sm:block text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]"
            title="Keyboard shortcuts"
          >
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">?</kbd>
          </button>
          {viewMode === "board" && (
            <BoardSettingsPopover
              settings={boardSettings}
              states={states}
              onUpdate={updateBoardSettings}
            />
          )}
          <Link
            href={`/${wsSlug}/${projectSlug}/insights`}
            className="hidden sm:flex text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Insights
          </Link>
          <Link
            href={`/${wsSlug}/${projectSlug}/settings`}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]"
          >
            Settings
          </Link>
        </div>
      </div>
      {viewMode === "board" ? (
        <Board
          states={states}
          items={filteredItems}
          onItemCreate={onItemCreate}
          onItemUpdate={onItemUpdate}
          basePath={basePath}
          wsSlug={wsSlug}
          onRefresh={loadData}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          boardSettings={boardSettings}
          templates={templates}
          onItemCreateFromTemplate={onItemCreateFromTemplate}
        />
      ) : viewMode === "dependencies" ? (
        <DependencyGraph
          items={filteredItems}
          states={states}
          onCardClick={setSelectedItem}
        />
      ) : viewMode === "timeline" ? (
        <TimelineView
          items={filteredItems}
          states={states}
          onCardClick={setSelectedItem}
          onItemUpdate={onItemUpdate}
        />
      ) : viewMode === "backlog" ? (
        <SprintBacklog
          items={filteredItems}
          basePath={basePath}
          onItemUpdate={onItemUpdate}
          onCardClick={setSelectedItem}
          canEdit={canEdit}
        />
      ) : viewMode === "table" ? (
        <TableView
          items={filteredItems}
          states={states}
          labels={labels}
          members={workspace?.members || []}
          onCardClick={setSelectedItem}
          onItemUpdate={onItemUpdate}
          canEdit={canEdit}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={(ids) => setSelectedIds(new Set(ids))}
        />
      ) : (
        <CalendarView
          items={filteredItems}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onCardClick={setSelectedItem}
          onItemUpdate={onItemUpdate}
        />
      )}
      {selectedItem && (viewMode === "calendar" || viewMode === "dependencies" || viewMode === "timeline" || viewMode === "backlog" || viewMode === "table") && (
        <CardDetail
          item={selectedItem}
          basePath={basePath}
          wsSlug={wsSlug}
          onClose={() => setSelectedItem(null)}
          onUpdate={async (data) => {
            await onItemUpdate(selectedItem.item_number, data);
            setSelectedItem(null);
            loadData();
          }}
        />
      )}
      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
      {showSearch && (
        <SearchModal basePath={basePath} onClose={() => setShowSearch(false)} />
      )}
      {isAdmin && selectedIds.size > 0 && workspace && (
        <BulkToolbar
          selectedCount={selectedIds.size}
          members={workspace.members}
          labels={labels}
          states={states}
          onArchive={handleBulkArchive}
          onReassign={handleBulkReassign}
          onLabel={handleBulkLabel}
          onStatusChange={handleBulkStatus}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
