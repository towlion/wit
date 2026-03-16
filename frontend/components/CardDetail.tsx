"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { WorkItem, WorkflowState } from "@/lib/types";

interface CardDetailProps {
  item: WorkItem;
  basePath: string;
  onClose: () => void;
  onUpdate: (data: Partial<WorkItem>) => Promise<void>;
}

const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function CardDetail({ item, basePath, onClose, onUpdate }: CardDetailProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [priority, setPriority] = useState(item.priority);
  const [statusId, setStatusId] = useState(item.status_id);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [editingDesc, setEditingDesc] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<WorkflowState[]>(`${basePath}/states`).then(setStates);
  }, [basePath]);

  async function handleSave() {
    setSaving(true);
    await onUpdate({
      title,
      description: description || null,
      priority,
      status_id: statusId,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary)] border-l border-[var(--border)] h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-[var(--text-muted)] font-mono">
              #{item.item_number}
            </span>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition text-lg"
            >
              &times;
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none mb-4"
          />

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Status</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--text-muted)]">Description</label>
              <button
                onClick={() => setEditingDesc(!editingDesc)}
                className="text-xs text-[var(--accent)] hover:underline"
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
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="prose prose-invert prose-sm max-w-none p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] min-h-[100px] cursor-text"
              >
                {description ? (
                  <ReactMarkdown>{description}</ReactMarkdown>
                ) : (
                  <span className="text-[var(--text-muted)]">Click to add a description...</span>
                )}
              </div>
            )}
          </div>

          {item.assignees.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs text-[var(--text-muted)] mb-2">Assignees</label>
              <div className="flex gap-2 flex-wrap">
                {item.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]"
                  >
                    {a.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.labels.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs text-[var(--text-muted)] mb-2">Labels</label>
              <div className="flex gap-2 flex-wrap">
                {item.labels.map((l) => (
                  <span
                    key={l.id}
                    className="text-xs px-2 py-1 rounded-lg flex items-center gap-1.5"
                    style={{ backgroundColor: l.color + "20", color: l.color }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
