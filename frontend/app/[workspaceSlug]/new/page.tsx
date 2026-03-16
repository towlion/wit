"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

const TEMPLATES = [
  {
    value: "software",
    label: "Software",
    desc: "Open, In Progress, In Review, Done",
    gradient: "from-indigo-500 to-violet-600",
    icon: "S",
  },
  {
    value: "home",
    label: "Home",
    desc: "To Do, Doing, Done",
    gradient: "from-amber-500 to-orange-600",
    icon: "H",
  },
  {
    value: "event",
    label: "Event",
    desc: "Idea, Getting Quotes, Confirmed",
    gradient: "from-emerald-500 to-teal-600",
    icon: "E",
  },
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
    <div className="p-6 max-w-lg animate-fade-in-up">
      <h1 className="text-xl font-semibold tracking-tight mb-6">New project</h1>

      {error && (
        <div className="flex items-center gap-2 bg-[var(--danger-subtle)] border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-4 text-sm animate-fade-in">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="input-base"
            placeholder="My Project"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="input-base font-mono"
            placeholder="my-project"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-base resize-none"
            placeholder="Optional description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2.5">Template</label>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  template === t.value
                    ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_0_0_1px_var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)]"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center text-[10px] font-bold text-white mb-2.5`}>
                  {t.icon}
                </div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating..." : "Create project"}
        </button>
      </form>
    </div>
  );
}
