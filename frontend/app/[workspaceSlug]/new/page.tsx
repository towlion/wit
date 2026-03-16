"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

const TEMPLATES = [
  { value: "software", label: "Software", desc: "Open, In Progress, In Review, Done" },
  { value: "home", label: "Home", desc: "To Do, Doing, Done" },
  { value: "event", label: "Event", desc: "Idea, Getting Quotes, Confirmed" },
];

export default function NewProjectPage() {
  const params = useParams();
  const router = useRouter();
  const wsSlug = params.workspaceSlug as string;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("software");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const project = await api.post<Project>(`/workspaces/${wsSlug}/projects`, {
        name,
        slug,
        description: description || null,
        template,
      });
      router.push(`/${wsSlug}/${project.slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
    setSubmitting(false);
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">New project</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-sm resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Template</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`p-3 rounded-lg border text-left transition ${
                  template === t.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:border-[var(--border-hover)]"
                }`}
              >
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create project"}
        </button>
      </form>
    </div>
  );
}
