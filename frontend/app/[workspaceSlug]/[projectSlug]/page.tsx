"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, WorkItem, Label } from "@/lib/types";
import Board from "@/components/Board";
import FilterBar, { Filters } from "@/components/FilterBar";
import Link from "next/link";

export default function ProjectBoardPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;

  const [states, setStates] = useState<WorkflowState[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});

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

  const filteredItems = items.filter((item) => {
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.assigneeId && !item.assignees.some((a) => a.id === filters.assigneeId))
      return false;
    if (filters.labelId && !item.labels.some((l) => l.id === filters.labelId)) return false;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[var(--text-muted)]">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
        <FilterBar filters={filters} onChange={setFilters} labels={labels} />
        <Link
          href={`/${wsSlug}/${projectSlug}/settings`}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
        >
          Settings
        </Link>
      </div>
      <Board
        states={states}
        items={filteredItems}
        onItemCreate={onItemCreate}
        onItemUpdate={onItemUpdate}
        basePath={basePath}
        onRefresh={loadData}
      />
    </div>
  );
}
