"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

const TEMPLATE_ICONS: Record<string, string> = {
  software: "S",
  home: "H",
  event: "E",
};

const TEMPLATE_GRADIENTS: Record<string, string> = {
  software: "from-indigo-500 to-violet-600",
  home: "from-amber-500 to-orange-600",
  event: "from-emerald-500 to-teal-600",
};

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const wsSlug = params.workspaceSlug as string;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Project[]>(`/workspaces/${wsSlug}/projects`)
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wsSlug]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <div className="flex gap-2">
          <Link href={`/${wsSlug}/settings`} className="btn-secondary text-xs py-2">
            Settings
          </Link>
          <button onClick={() => router.push(`/${wsSlug}/new`)} className="btn-primary text-xs py-2">
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-[var(--text-secondary)] font-medium mb-1">No projects yet</p>
          <p className="text-sm text-[var(--text-muted)] mb-5">Create your first project to get started</p>
          <button onClick={() => router.push(`/${wsSlug}/new`)} className="btn-primary">
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, idx) => (
            <Link
              key={p.id}
              href={`/${wsSlug}/${p.slug}`}
              className="group card-surface-hover p-4 animate-fade-in-up"
              style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "backwards" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                    TEMPLATE_GRADIENTS[p.template] || TEMPLATE_GRADIENTS.software
                  } flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0`}
                >
                  {TEMPLATE_ICONS[p.template] || "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm group-hover:text-[var(--accent-hover)] transition-colors truncate">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-2.5">
                    {p.item_counter} item{p.item_counter !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
