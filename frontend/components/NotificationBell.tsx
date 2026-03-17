"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Notification } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Poll unread count
  useEffect(() => {
    function poll() {
      /* Polling every 30s — fail silently to avoid toast spam */
      api.get<{ count: number }>("/notifications/unread-count").then((r) => setCount(r.count)).catch((e) => console.warn("Failed to poll notifications:", e.message));
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when opened
  useEffect(() => {
    if (open) {
      api.get<Notification[]>("/notifications?limit=20").then(setNotifications).catch(() => toast.error("Failed to load notifications"));
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      setCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { toast.error("Failed to mark notifications as read"); }
  }

  async function markRead(id: number) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setCount((c) => Math.max(0, c - 1));
    } catch { toast.error("Failed to mark notification as read"); }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span aria-live="polite" aria-label={`${count} unread notification${count !== 1 ? "s" : ""}`} className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black/40 z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
            <span className="text-xs font-semibold">Notifications</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div role="list" aria-label="Notifications" className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  role="listitem"
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-[var(--border-subtle)] transition-colors ${
                    n.read
                      ? "opacity-60"
                      : "bg-[var(--accent-subtle)]/30 hover:bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{n.title}</div>
                      {n.body && (
                        <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{n.body}</div>
                      )}
                      <div className="text-[9px] text-[var(--text-muted)] mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
