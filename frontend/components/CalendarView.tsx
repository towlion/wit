"use client";

import { useMemo } from "react";
import type { WorkItem } from "@/lib/types";

interface CalendarViewProps {
  items: WorkItem[];
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onCardClick: (item: WorkItem) => void;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-indigo-500",
  low: "border-l-zinc-500",
};

export default function CalendarView({ items, month, onMonthChange, onCardClick }: CalendarViewProps) {
  const [year, mon] = month.split("-").map(Number);
  const days = getDaysInMonth(year, mon - 1);
  const today = new Date().toISOString().split("T")[0];

  const itemsByDate = useMemo(() => {
    const map: Record<string, WorkItem[]> = {};
    for (const item of items) {
      if (item.due_date) {
        if (!map[item.due_date]) map[item.due_date] = [];
        map[item.due_date].push(item);
      }
    }
    return map;
  }, [items]);

  // Pad start of month to align with day of week
  const firstDayOfWeek = days[0].getDay();
  const paddedStart = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold tracking-tight">{formatMonth(month)}</h2>
        <button
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] text-center py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-xl overflow-hidden">
        {paddedStart.map((i) => (
          <div key={`pad-${i}`} className="bg-[var(--bg-primary)] min-h-[100px]" />
        ))}
        {days.map((day) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayItems = itemsByDate[dateStr] || [];
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`bg-[var(--bg-primary)] min-h-[100px] p-1.5 ${
                isToday ? "ring-1 ring-inset ring-[var(--accent)]/30" : ""
              }`}
            >
              <div
                className={`text-[11px] font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onCardClick(item)}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] truncate border-l-2 transition-colors ${
                      PRIORITY_COLORS[item.priority] || "border-l-zinc-500"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[9px] text-[var(--text-muted)] px-1.5">
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
