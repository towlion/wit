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

const TEMPLATE_COLORS: Record<string, string> = {
  software: "bg-indigo-500/20 text-indigo-400",
  home: "bg-amber-500/20 text-amber-400",
  event: "bg-emerald-500/20 text-emerald-400",
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
            <div
              key={i}
              className="h-32 rounded-xl bg-[var(--bg-secondary)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="flex gap-2">
          <Link
            href={`/${wsSlug}/settings`}
            className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition"
          >
            Settings
          </Link>
          <button
            onClick={() => router.push(`/${wsSlug}/new`)}
            className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition"
          >
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] mb-4">No projects yet</p>
          <button
            onClick={() => router.push(`/${wsSlug}/new`)}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm transition"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/${wsSlug}/${p.slug}`}
              className="group p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    TEMPLATE_COLORS[p.template] || TEMPLATE_COLORS.software
                  }`}
                >
                  {TEMPLATE_ICONS[p.template] || "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm group-hover:text-[var(--accent)] transition truncate">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-2">
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
