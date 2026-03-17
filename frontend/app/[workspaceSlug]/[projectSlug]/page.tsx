"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, WorkItem, Label, Workspace, BulkOperationResult } from "@/lib/types";
import Board from "@/components/Board";
import CardDetail from "@/components/CardDetail";
import FilterBar, { Filters } from "@/components/FilterBar";
import CalendarView from "@/components/CalendarView";
import SearchModal from "@/components/SearchModal";
import ShortcutHelp from "@/components/ShortcutHelp";
import BulkToolbar from "@/components/BulkToolbar";
import { useKeyboardShortcuts, type Shortcut } from "@/lib/shortcuts";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

type ViewMode = "board" | "calendar";

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
  const [filters, setFilters] = useState<Filters>({});
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
  }, [loadData]);

  useEffect(() => {
    if (user) {
      api.get<Workspace>(`/workspaces/${wsSlug}`).then(setWorkspace).catch(() => {});
    }
  }, [wsSlug, user]);

  const filteredItems = items.filter((item) => {
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.assigneeId && !item.assignees.some((a) => a.id === filters.assigneeId))
      return false;
    if (filters.labelId && !item.labels.some((l) => l.id === filters.labelId)) return false;
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
          <FilterBar filters={filters} onChange={setFilters} labels={labels} />
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
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          onRefresh={loadData}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ) : (
        <CalendarView
          items={filteredItems}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onCardClick={setSelectedItem}
        />
      )}
      {selectedItem && viewMode === "calendar" && (
        <CardDetail
          item={selectedItem}
          basePath={basePath}
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
