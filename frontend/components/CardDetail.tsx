"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { WorkItem, WorkflowState } from "@/lib/types";
import ActivityFeed from "./ActivityFeed";
import AttachmentList from "./AttachmentList";
import CustomFieldInput from "./CustomFieldInput";
import FileUpload from "./FileUpload";

interface CardDetailProps {
  item: WorkItem;
  basePath: string;
  onClose: () => void;
  onUpdate: (data: Partial<WorkItem>) => Promise<void>;
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

export default function CardDetail({ item, basePath, onClose, onUpdate }: CardDetailProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [priority, setPriority] = useState(item.priority);
  const [statusId, setStatusId] = useState(item.status_id);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [dueDate, setDueDate] = useState(item.due_date || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom fields
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<number, FieldVal>>({});

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const itemPath = `${basePath}/items/${item.item_number}`;

  useEffect(() => {
    api.get<WorkflowState[]>(`${basePath}/states`).then(setStates);
    api.get<FieldDef[]>(`${basePath}/fields`).then(setFieldDefs);
    api.get<FieldVal[]>(`${itemPath}/fields`).then((vals) => {
      const map: Record<number, FieldVal> = {};
      for (const v of vals) map[v.field_id] = v;
      setFieldValues(map);
    });
    api.get<AttachmentItem[]>(`${itemPath}/attachments`).then(setAttachments);
  }, [basePath, itemPath]);

  async function handleSave() {
    setSaving(true);
    await onUpdate({
      title,
      description: description || null,
      priority,
      status_id: statusId,
      due_date: dueDate || null,
    } as Partial<WorkItem>);
    setSaving(false);
  }

  async function handleFieldChange(
    fieldId: number,
    data: { value_text?: string | null; value_number?: number | null; value_date?: string | null }
  ) {
    const val = await api.put<FieldVal>(`${itemPath}/fields/${fieldId}`, data);
    setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
  }

  async function handleUpload(file: File) {
    const att = await api.upload<AttachmentItem>(`${itemPath}/attachments`, file);
    setAttachments((prev) => [att, ...prev]);
  }

  async function handleDeleteAttachment(id: number) {
    await api.delete(`${itemPath}/attachments/${id}`);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary)] border-l border-[var(--border)] h-full overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-[var(--text-muted)] font-mono bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
              #{item.item_number}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Description</label>
              <button
                onClick={() => setEditingDesc(!editingDesc)}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium"
              >
                {editingDesc ? "Preview" : "Edit"}
              </button>
            </div>
            {editingDesc ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Save */}
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full mb-6">
            {saving ? "Saving..." : "Save changes"}
          </button>

          <div className="h-px bg-[var(--border)] mb-5" />

          {/* Activity */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Activity</label>
            <ActivityFeed basePath={basePath} itemNumber={item.item_number} />
          </div>
        </div>
      </div>
    </div>
  );
}
