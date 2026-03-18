"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { DependencyItem, Subtask, WatchStatus, WorkItem, WorkflowState } from "@/lib/types";
import ActivityFeed from "./ActivityFeed";
import AttachmentList from "./AttachmentList";
import CustomFieldInput from "./CustomFieldInput";
import FileUpload from "./FileUpload";
import MentionTextarea from "./MentionTextarea";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface CardDetailProps {
  item: WorkItem;
  basePath: string;
  wsSlug: string;
  onClose: () => void;
  onUpdate: (data: Partial<WorkItem>) => Promise<void>;
  onClone?: (clonedItem: WorkItem) => void;
}

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: Record<string, unknown> | null;
  required: boolean;
  position: number;
}

interface FieldVal {
  id: number;
  work_item_id: number;
  field_id: number;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
}

interface AttachmentItem {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function CardDetail({ item, basePath, wsSlug, onClose, onUpdate, onClone }: CardDetailProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [priority, setPriority] = useState(item.priority);
  const [statusId, setStatusId] = useState(item.status_id);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [dueDate, setDueDate] = useState(item.due_date || "");
  const [storyPoints, setStoryPoints] = useState<string>(item.story_points != null ? String(item.story_points) : "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom fields
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<number, FieldVal>>({});

  // Dependencies
  const [blocks, setBlocks] = useState<DependencyItem[]>(item.blocks || []);
  const [blockedBy, setBlockedBy] = useState<DependencyItem[]>(item.blocked_by || []);
  const [depInput, setDepInput] = useState("");
  const [depType, setDepType] = useState<"blocks" | "blocked_by">("blocks");

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Watch
  const [watchStatus, setWatchStatus] = useState<WatchStatus>({ watching: false, watcher_count: 0 });

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const panelRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);

  const itemPath = `${basePath}/items/${item.item_number}`;

  const loadPanelData = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      api.get<WorkflowState[]>(`${basePath}/states`),
      api.get<FieldDef[]>(`${basePath}/fields`),
      api.get<FieldVal[]>(`${itemPath}/fields`),
      api.get<AttachmentItem[]>(`${itemPath}/attachments`),
      api.get<WatchStatus>(`${itemPath}/watch`),
      api.get<Subtask[]>(`${itemPath}/subtasks`),
      api.get<{ blocks: DependencyItem[]; blocked_by: DependencyItem[] }>(`${itemPath}/dependencies`),
    ]).then(([statesData, fieldDefsData, fieldValsData, attachData, watchData, subtasksData, depsData]) => {
      setStates(statesData);
      setFieldDefs(fieldDefsData);
      const map: Record<number, FieldVal> = {};
      for (const v of fieldValsData) map[v.field_id] = v;
      setFieldValues(map);
      setAttachments(attachData);
      setWatchStatus(watchData);
      setSubtasks(subtasksData);
      setBlocks(depsData.blocks);
      setBlockedBy(depsData.blocked_by);
    }).catch(() => {
      toast.error("Failed to load item details");
      setLoadError(true);
    }).finally(() => {
      setLoading(false);
    });
  }, [basePath, itemPath, toast]);

  useEffect(() => { loadPanelData(); }, [loadPanelData]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate({
        title,
        description: description || null,
        priority,
        status_id: statusId,
        due_date: dueDate || null,
        story_points: storyPoints ? parseInt(storyPoints) : null,
      } as Partial<WorkItem>);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleFieldChange(
    fieldId: number,
    data: { value_text?: string | null; value_number?: number | null; value_date?: string | null }
  ) {
    try {
      const val = await api.put<FieldVal>(`${itemPath}/fields/${fieldId}`, data);
      setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
    } catch {
      toast.error("Failed to update field");
    }
  }

  async function handleUpload(file: File) {
    const att = await api.upload<AttachmentItem>(`${itemPath}/attachments`, file);
    setAttachments((prev) => [att, ...prev]);
  }

  async function handleDeleteAttachment(id: number) {
    try {
      await api.delete(`${itemPath}/attachments/${id}`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to delete attachment");
    }
  }

  async function handleToggleWatch() {
    try {
      if (watchStatus.watching) {
        const res = await api.delete(`${itemPath}/watch`) as unknown as WatchStatus;
        setWatchStatus(res);
      } else {
        const res = await api.post<WatchStatus>(`${itemPath}/watch`);
        setWatchStatus(res);
      }
    } catch {
      toast.error("Failed to update watch status");
    }
  }

  async function handleAddDependency() {
    const num = parseInt(depInput);
    if (!num) return;
    try {
      if (depType === "blocks") {
        await api.post(`${itemPath}/dependencies`, { blocks_item_number: num });
      } else {
        await api.post(`${basePath}/items/${num}/dependencies`, { blocks_item_number: item.item_number });
      }
      const deps = await api.get<{ blocks: DependencyItem[]; blocked_by: DependencyItem[] }>(`${itemPath}/dependencies`);
      setBlocks(deps.blocks);
      setBlockedBy(deps.blocked_by);
      setDepInput("");
    } catch {
      toast.error("Failed to add dependency");
    }
  }

  async function handleRemoveDependency(relatedNumber: number) {
    try {
      await api.delete(`${itemPath}/dependencies/${relatedNumber}`);
      setBlocks((prev) => prev.filter((d) => d.item_number !== relatedNumber));
      setBlockedBy((prev) => prev.filter((d) => d.item_number !== relatedNumber));
    } catch {
      toast.error("Failed to remove dependency");
    }
  }

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    try {
      const st = await api.post<Subtask>(`${itemPath}/subtasks`, { title: newSubtaskTitle.trim() });
      setSubtasks((prev) => [...prev, st]);
      setNewSubtaskTitle("");
    } catch {
      toast.error("Failed to add subtask");
    }
  }

  async function handleToggleSubtask(subtask: Subtask) {
    try {
      const updated = await api.patch<Subtask>(`${itemPath}/subtasks/${subtask.id}`, { completed: !subtask.completed });
      setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? updated : s));
    } catch {
      toast.error("Failed to update subtask");
    }
  }

  async function handleDeleteSubtask(subtaskId: number) {
    try {
      await api.delete(`${itemPath}/subtasks/${subtaskId}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } catch {
      toast.error("Failed to delete subtask");
    }
  }

  async function handleClone() {
    try {
      const cloned = await api.post<WorkItem>(`${basePath}/items/${item.item_number}/clone`);
      onClone?.(cloned);
      onClose();
    } catch {
      toast.error("Failed to clone item");
    }
  }

  const subtaskCompleted = subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Work item #${item.item_number}`}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      <div
        ref={panelRef}
        className="relative w-full max-w-full sm:max-w-lg bg-[var(--bg-primary)] border-l border-[var(--border)] h-full overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)] font-mono bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
                #{item.item_number}
              </span>
              <button
                onClick={handleToggleWatch}
                aria-label={watchStatus.watching ? "Unwatch item" : "Watch item"}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  watchStatus.watching
                    ? "bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
                    : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={watchStatus.watching ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {watchStatus.watching ? "Watching" : "Watch"}
                {watchStatus.watcher_count > 0 && (
                  <span className="text-[10px] opacity-70">{watchStatus.watcher_count}</span>
                )}
              </button>
              <button
                onClick={handleClone}
                aria-label="Clone item"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border bg-[var(--bg-tertiary)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)] transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Clone
              </button>
            </div>
            <button
              onClick={onClose}
              aria-label="Close detail panel"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-6 bg-[var(--bg-tertiary)] rounded-lg w-3/4" />
              <div className="h-px bg-[var(--border)]" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16" />
                  <div className="h-9 bg-[var(--bg-tertiary)] rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16" />
                  <div className="h-9 bg-[var(--bg-tertiary)] rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg-tertiary)] rounded w-20" />
                <div className="h-9 bg-[var(--bg-tertiary)] rounded-xl" />
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg-tertiary)] rounded w-24" />
                <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
              </div>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-sm text-[var(--text-muted)]">Failed to load item details</span>
              <button onClick={loadPanelData} className="btn-primary text-sm px-4 py-2">
                Retry
              </button>
            </div>
          ) : (
            <>
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Item title"
            className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none mb-6 tracking-tight placeholder:text-[var(--text-muted)]"
            placeholder="Item title"
          />

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Status</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(parseInt(e.target.value))}
                className="input-base py-2"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input-base py-2"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-base py-2"
            />
          </div>

          {/* Story Points */}
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Story Points</label>
            <input
              type="number"
              min="0"
              max="100"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              placeholder="Unestimated"
              className="input-base py-2"
            />
          </div>

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
              <button
                onClick={() => setEditingDesc(!editingDesc)}
                aria-label={editingDesc ? "Preview description" : "Edit description"}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium"
              >
                {editingDesc ? "Preview" : "Edit"}
              </button>
            </div>
            {editingDesc ? (
              <MentionTextarea
                value={description}
                onChange={setDescription}
                wsSlug={wsSlug}
                rows={8}
                placeholder="Describe this item (Markdown supported)..."
                className="input-base resize-none"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="prose prose-invert prose-sm max-w-none p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] min-h-[100px] cursor-text hover:border-[var(--border-hover)] transition-colors"
              >
                {description ? (
                  <ReactMarkdown>{description}</ReactMarkdown>
                ) : (
                  <span className="text-[var(--text-muted)] text-sm">Click to add a description...</span>
                )}
              </div>
            )}
          </div>

          {/* Assignees */}
          {item.assignees.length > 0 && (
            <>
              <div className="h-px bg-[var(--border)] mb-5" />
              <div className="mb-6">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Assignees</label>
                <div className="flex gap-2 flex-wrap">
                  {item.assignees.map((a) => (
                    <span key={a.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[8px] text-white font-medium">
                        {a.display_name[0].toUpperCase()}
                      </div>
                      {a.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Labels */}
          {item.labels.length > 0 && (
            <>
              <div className="h-px bg-[var(--border)] mb-5" />
              <div className="mb-6">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Labels</label>
                <div className="flex gap-2 flex-wrap">
                  {item.labels.map((l) => (
                    <span
                      key={l.id}
                      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 border"
                      style={{ backgroundColor: l.color + "15", color: l.color, borderColor: l.color + "30" }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Dependencies */}
          <div className="h-px bg-[var(--border)] mb-5" />
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Dependencies</label>

            {blocks.length > 0 && (
              <div className="mb-3">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">This item blocks</span>
                <div className="mt-1.5 space-y-1">
                  {blocks.map((d) => (
                    <div key={d.item_id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                      <span>
                        <span className="text-[var(--text-muted)] font-mono">#{d.item_number}</span>{" "}
                        {d.title}
                      </span>
                      <button
                        onClick={() => handleRemoveDependency(d.item_number)}
                        aria-label={`Remove dependency #${d.item_number}`}
                        className="text-[var(--text-muted)] hover:text-red-400 transition-colors ml-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {blockedBy.length > 0 && (
              <div className="mb-3">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">This item is blocked by</span>
                <div className="mt-1.5 space-y-1">
                  {blockedBy.map((d) => (
                    <div key={d.item_id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20">
                      <span>
                        <span className="text-red-400 font-mono">#{d.item_number}</span>{" "}
                        {d.title}
                      </span>
                      <button
                        onClick={() => handleRemoveDependency(d.item_number)}
                        aria-label={`Remove dependency #${d.item_number}`}
                        className="text-[var(--text-muted)] hover:text-red-400 transition-colors ml-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <select
                value={depType}
                onChange={(e) => setDepType(e.target.value as "blocks" | "blocked_by")}
                className="input-base py-1.5 text-xs w-auto"
              >
                <option value="blocks">Blocks</option>
                <option value="blocked_by">Blocked by</option>
              </select>
              <input
                type="number"
                value={depInput}
                onChange={(e) => setDepInput(e.target.value)}
                placeholder="Item #"
                aria-label="Item number for dependency"
                className="input-base py-1.5 text-xs w-20"
                onKeyDown={(e) => e.key === "Enter" && handleAddDependency()}
              />
              <button
                onClick={handleAddDependency}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom Fields */}
          {fieldDefs.length > 0 && (
            <>
              <div className="h-px bg-[var(--border)] mb-5" />
              <div className="mb-6">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Custom fields</label>
                <div className="space-y-3">
                  {fieldDefs.map((f) => (
                    <div key={f.id}>
                      {f.field_type !== "checkbox" && (
                        <label className="block text-[10px] text-[var(--text-muted)] mb-1">{f.name}</label>
                      )}
                      <CustomFieldInput
                        field={f}
                        value={fieldValues[f.id] || {}}
                        onChange={handleFieldChange}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Attachments */}
          <div className="h-px bg-[var(--border)] mb-5" />
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">Attachments</label>
            <AttachmentList
              attachments={attachments}
              downloadUrl={(id) => `/api${itemPath}/attachments/${id}/download`}
              onDelete={handleDeleteAttachment}
            />
            <div className="mt-2">
              <FileUpload onUpload={handleUpload} />
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div className="h-px bg-[var(--border)] mb-5" />
          <div className="mb-6">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
              Checklist
              {subtasks.length > 0 && (
                <span className="ml-2 text-[var(--text-secondary)] normal-case font-normal">
                  {subtaskCompleted}/{subtasks.length} completed
                </span>
              )}
            </label>
            {subtasks.length > 0 && (
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${subtaskCompleted === subtasks.length ? "bg-green-400" : "bg-[var(--accent)]"}`}
                  style={{ width: `${subtasks.length > 0 ? Math.round((subtaskCompleted / subtasks.length) * 100) : 0}%` }}
                />
              </div>
            )}
            <div className="space-y-1 mb-2">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleToggleSubtask(st)}
                    aria-label={st.completed ? "Mark incomplete" : "Mark complete"}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      st.completed
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {st.completed && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${st.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                    {st.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    aria-label="Remove subtask"
                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                aria-label="New subtask title"
                className="input-base py-1.5 text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
              />
              <button
                onClick={handleAddSubtask}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Save */}
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full mb-6">
            {saving ? "Saving..." : "Save changes"}
          </button>

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Activity */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Activity</label>
            <ActivityFeed basePath={basePath} itemNumber={item.item_number} wsSlug={wsSlug} />
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
