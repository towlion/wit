"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WorkspaceListItem } from "@/lib/types";
import NotificationBell from "./NotificationBell";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
          <span className="text-sm text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  const currentSlug = pathname.split("/")[1];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-[var(--border)] flex items-center px-4 gap-4 shrink-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <span className="text-white font-bold text-[10px] tracking-wider">W</span>
          </div>
          <span className="font-semibold text-sm tracking-wide text-[var(--text-primary)]">WIT</span>
        </Link>

        <div className="w-px h-5 bg-[var(--border)] mx-1" />

        <nav className="flex items-center gap-1">
          {workspaces.map((ws) => (
            <Link
              key={ws.slug}
              href={`/${ws.slug}`}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                currentSlug === ws.slug
                  ? "bg-[var(--accent-subtle)] text-[var(--accent-hover)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {ws.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <NotificationBell />
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[10px] text-white font-semibold shadow-sm">
                {user.display_name[0].toUpperCase()}
              </div>
              <span className="text-sm text-[var(--text-secondary)] hidden sm:block">{user.display_name}</span>
              <svg className="w-3 h-3 text-[var(--text-muted)] hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/40 z-50 animate-fade-in overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[var(--border)]">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{user.display_name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{user.email}</div>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => { setProfileOpen(false); logout(); }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
