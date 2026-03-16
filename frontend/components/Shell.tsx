"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WorkspaceListItem } from "@/lib/types";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.get<WorkspaceListItem[]>("/workspaces").then(setWorkspaces);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  const currentSlug = pathname.split("/")[1];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-[var(--border)] flex items-center px-4 gap-4 shrink-0">
        <Link href="/" className="font-bold text-sm tracking-wide">
          WIT
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          {workspaces.map((ws) => (
            <Link
              key={ws.slug}
              href={`/${ws.slug}`}
              className={`px-3 py-1 rounded text-sm transition ${
                currentSlug === ws.slug
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {ws.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-[var(--text-muted)]">{user.display_name}</span>
          <button
            onClick={logout}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
