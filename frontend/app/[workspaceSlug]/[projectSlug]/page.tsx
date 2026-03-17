"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, WorkItem, Label, Workspace, BulkOperationResult, Project, BoardSettings, ItemTemplate } from "@/lib/types";
import Board from "@/components/Board";
import CardDetail from "@/components/CardDetail";
import FilterBar, { Filters } from "@/components/FilterBar";
import CalendarView from "@/components/CalendarView";
import DependencyGraph from "@/components/DependencyGraph";
import SearchModal from "@/components/SearchModal";
import ShortcutHelp from "@/components/ShortcutHelp";
import BulkToolbar from "@/components/BulkToolbar";
import BoardSettingsPopover from "@/components/BoardSettingsPopover";
import { useKeyboardShortcuts, type Shortcut } from "@/lib/shortcuts";
import { useBoardSocket } from "@/lib/useBoardSocket";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type ViewMode = "board" | "calendar" | "dependencies";

export default function ProjectBoardPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;
  const { user } = useAuth();

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

  // Determine if user is admin/owner in this workspace
  const userRole = workspace?.members.find((m) => m.user_id === user?.id)?.role;
  const isAdmin = userRole === "admin" || userRole === "owner";

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
    });
  }, [basePath]);

  useEffect(() => {
    loadData();
    api.get<Project>(basePath).then((p) => {
      setProjectId(p.id);
      if (p.board_settings) setBoardSettings(p.board_settings);
    }).catch(() => {});
    api.get<ItemTemplate[]>(`${basePath}/templates`).then(setTemplates).catch(() => {});
  }, [loadData, basePath]);

  useEffect(() => {
    if (user) {
      api.get<Workspace>(`/workspaces/${wsSlug}`).then(setWorkspace).catch(() => {});
    }
  }, [wsSlug, user]);

  const { presence } = useBoardSocket(projectId, useCallback((event) => {
    if (event.type === "item_created" || event.type === "item_updated" || event.type === "item_deleted") {
      loadData();
    }
  }, [loadData]));

  function updateBoardSettings(newSettings: BoardSettings) {
    setBoardSettings(newSettings);
    api.patch(basePath, { board_settings: newSettings }).catch(() => {});
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
        await api.post(`${basePath}/items/${item.item_number}/labels/${labelId}`).catch(() => {});
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
    await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/archive`, {
      item_ids: Array.from(selectedIds),
    });
    setSelectedIds(new Set());
    loadData();
  }

  async function handleBulkReassign(assigneeId: number) {
    await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/reassign`, {
      item_ids: Array.from(selectedIds),
      assignee_id: assigneeId,
    });
    setSelectedIds(new Set());
    loadData();
  }

  async function handleBulkLabel(labelId: number, action: "add" | "remove") {
    await api.post<BulkOperationResult>(`/workspaces/${wsSlug}/bulk/labels`, {
      item_ids: Array.from(selectedIds),
      label_id: labelId,
      action,
    });
    setSelectedIds(new Set());
    loadData();
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] shrink-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <FilterBar filters={filters} onChange={handleFiltersChange} labels={labels} states={states} members={workspace?.members || []} basePath={basePath} />
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode("dependencies")}
              className={`text-[10px] px-2.5 py-1.5 font-medium transition-colors ${
                viewMode === "dependencies"
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Dependencies
            </button>
          </div>
          {viewMode === "board" && (
            <select
              value={boardSettings.swimlane || ""}
              onChange={(e) => updateBoardSettings({ ...boardSettings, swimlane: (e.target.value || null) as BoardSettings["swimlane"] })}
              className="input-base text-[10px] w-auto py-1.5"
            >
              <option value="">No swimlanes</option>
              <option value="priority">By priority</option>
              <option value="assignee">By assignee</option>
              <option value="label">By label</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {presence.length > 0 && (
            <div className="flex items-center gap-1 mr-1">
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
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">Cmd+K</kbd>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)]"
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
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center gap-1"
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
      ) : (
        <CalendarView
          items={filteredItems}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onCardClick={setSelectedItem}
        />
      )}
      {selectedItem && (viewMode === "calendar" || viewMode === "dependencies") && (
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
          onArchive={handleBulkArchive}
          onReassign={handleBulkReassign}
          onLabel={handleBulkLabel}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
