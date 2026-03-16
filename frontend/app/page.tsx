"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WorkspaceListItem } from "@/lib/types";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    api.get<WorkspaceListItem[]>("/workspaces").then((ws) => {
      if (ws.length > 0) {
        router.replace(`/${ws[0].slug}`);
      }
    });
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
    </div>
  );
}
