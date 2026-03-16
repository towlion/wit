"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, Label } from "@/lib/types";

export default function ProjectSettingsPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;

  const [states, setStates] = useState<WorkflowState[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);

  const [newStateName, setNewStateName] = useState("");
  const [newStateCategory, setNewStateCategory] = useState("todo");
  const [newStateColor, setNewStateColor] = useState("#6b7280");

  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6b7280");

  useEffect(() => {
    api.get<WorkflowState[]>(`${basePath}/states`).then(setStates);
    api.get<Label[]>(`${basePath}/labels`).then(setLabels);
  }, [basePath]);

  async function addState(e: FormEvent) {
    e.preventDefault();
    const state = await api.post<WorkflowState>(`${basePath}/states`, {
      name: newStateName,
      category: newStateCategory,
      position: states.length,
      color: newStateColor,
    });
    setStates([...states, state]);
    setNewStateName("");
  }

  async function deleteState(id: number) {
    await api.delete(`${basePath}/states/${id}`);
    setStates(states.filter((s) => s.id !== id));
  }

  async function addLabel(e: FormEvent) {
    e.preventDefault();
    const label = await api.post<Label>(`${basePath}/labels`, {
      name: newLabelName,
      color: newLabelColor,
    });
    setLabels([...labels, label]);
    setNewLabelName("");
  }

  async function deleteLabel(id: number) {
    await api.delete(`${basePath}/labels/${id}`);
    setLabels(labels.filter((l) => l.id !== id));
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Project settings</h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Workflow states</h2>
        <div className="space-y-2 mb-4">
          {states.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm">{s.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{s.category}</span>
              </div>
              <button
                onClick={() => deleteState(s.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addState} className="flex gap-2">
          <input
            type="text"
            value={newStateName}
            onChange={(e) => setNewStateName(e.target.value)}
            placeholder="State name"
            required
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <select
            value={newStateCategory}
            onChange={(e) => setNewStateCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm"
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <input
            type="color"
            value={newStateColor}
            onChange={(e) => setNewStateColor(e.target.value)}
            className="w-10 h-9 rounded border border-[var(--border)] bg-transparent cursor-pointer"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Labels</h2>
        <div className="space-y-2 mb-4">
          {labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-sm">{l.name}</span>
              </div>
              <button
                onClick={() => deleteLabel(l.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addLabel} className="flex gap-2">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name"
            required
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <input
            type="color"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            className="w-10 h-9 rounded border border-[var(--border)] bg-transparent cursor-pointer"
          />
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
