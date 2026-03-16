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
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Project settings</h1>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Workflow states</h2>
        <div className="space-y-2 mb-4">
          {states.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3.5 card-surface"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-[var(--bg-secondary)]"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {s.category}
                </span>
              </div>
              <button
                onClick={() => deleteState(s.id)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
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
            className="input-base flex-1"
          />
          <select
            value={newStateCategory}
            onChange={(e) => setNewStateCategory(e.target.value)}
            className="input-base w-auto"
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <input
            type="color"
            value={newStateColor}
            onChange={(e) => setNewStateColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer p-1"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Labels</h2>
        <div className="space-y-2 mb-4">
          {labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3.5 card-surface"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-[var(--bg-secondary)]"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-sm font-medium">{l.name}</span>
              </div>
              <button
                onClick={() => deleteLabel(l.id)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
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
            className="input-base flex-1"
          />
          <input
            type="color"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer p-1"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
