"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { WorkItem, WorkflowState } from "@/lib/types";

interface Props {
  items: WorkItem[];
  states: WorkflowState[];
  onCardClick: (item: WorkItem) => void;
  onItemUpdate?: (itemNumber: number, data: Partial<WorkItem>) => Promise<void>;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 40;
const LABEL_WIDTH = 180;
const DAY_WIDTH = 32;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TimelineView({ items, states, onCardClick, onItemUpdate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    itemNumber: number;
    startX: number;
    originalEnd: Date;
    deltaDays: number;
  } | null>(null);

  const stateColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of states) m[s.id] = s.color;
    return m;
  }, [states]);

  const { timelineItems, startDate, totalDays, dates } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemsWithDates = items.filter((i) => !i.archived).map((item) => {
      const created = new Date(item.created_at);
      created.setHours(0, 0, 0, 0);
      let end: Date;
      let hasDueDate = false;
      if (item.due_date) {
        end = new Date(item.due_date);
        end.setHours(0, 0, 0, 0);
        hasDueDate = true;
      } else {
        end = addDays(created, 7);
      }
      if (end < created) end = created;
      return { item, start: created, end, hasDueDate };
    });

    if (itemsWithDates.length === 0) {
      const start = addDays(today, -7);
      const days = 28;
      const dateArr: Date[] = [];
      for (let i = 0; i <= days; i++) dateArr.push(addDays(start, i));
      return { timelineItems: [], startDate: start, totalDays: days, dates: dateArr };
    }

    let minDate = itemsWithDates[0].start;
    let maxDate = itemsWithDates[0].end;
    for (const ti of itemsWithDates) {
      if (ti.start < minDate) minDate = ti.start;
      if (ti.end > maxDate) maxDate = ti.end;
    }

    const start = addDays(minDate, -2);
    const days = daysBetween(start, maxDate) + 4;
    const totalD = Math.max(days, 14);
    const dateArr: Date[] = [];
    for (let i = 0; i <= totalD; i++) dateArr.push(addDays(start, i));

    return { timelineItems: itemsWithDates, startDate: start, totalDays: totalD, dates: dateArr };
  }, [items]);

  const svgWidth = LABEL_WIDTH + totalDays * DAY_WIDTH;
  const svgHeight = HEADER_HEIGHT + timelineItems.length * ROW_HEIGHT + 20;

  // Build dependency arrows
  const arrows = useMemo(() => {
    const itemIndexMap: Record<number, number> = {};
    timelineItems.forEach((ti, i) => { itemIndexMap[ti.item.id] = i; });

    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const ti of timelineItems) {
      for (const blocked of ti.item.blocks) {
        const blockedIdx = itemIndexMap[blocked.item_id];
        if (blockedIdx === undefined) continue;
        const blockedItem = timelineItems[blockedIdx];

        const fromDay = daysBetween(startDate, ti.end);
        const toDay = daysBetween(startDate, blockedItem.start);
        const fromIdx = itemIndexMap[ti.item.id];

        result.push({
          x1: LABEL_WIDTH + fromDay * DAY_WIDTH,
          y1: HEADER_HEIGHT + fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
          x2: LABEL_WIDTH + toDay * DAY_WIDTH,
          y2: HEADER_HEIGHT + blockedIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
        });
      }
    }
    return result;
  }, [timelineItems, startDate]);

  const todayOffset = daysBetween(startDate, new Date());

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    setDragState((prev) => prev ? { ...prev, deltaDays } : null);
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState || !onItemUpdate) return;
    const newEnd = addDays(dragState.originalEnd, dragState.deltaDays);
    const newDateStr = toDateString(newEnd);
    if (dragState.deltaDays !== 0) {
      onItemUpdate(dragState.itemNumber, { due_date: newDateStr } as Partial<WorkItem>);
    }
    setDragState(null);
  }, [dragState, onItemUpdate]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex-1 overflow-auto" ref={scrollRef}>
      <svg
        width={svgWidth}
        height={svgHeight}
        className="select-none"
        style={{ minWidth: svgWidth, minHeight: svgHeight }}
      >
        {/* Date headers */}
        {dates.map((d, i) => {
          const x = LABEL_WIDTH + i * DAY_WIDTH;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <g key={i}>
              {isWeekend && (
                <rect x={x} y={0} width={DAY_WIDTH} height={svgHeight} fill="var(--bg-tertiary)" opacity={0.3} />
              )}
              <text
                x={x + DAY_WIDTH / 2}
                y={16}
                textAnchor="middle"
                className="text-[9px] fill-[var(--text-muted)]"
              >
                {formatDate(d)}
              </text>
              <line x1={x} y1={HEADER_HEIGHT - 4} x2={x} y2={svgHeight} stroke="var(--border)" strokeWidth={0.5} opacity={0.3} />
            </g>
          );
        })}

        {/* Header bottom line */}
        <line x1={0} y1={HEADER_HEIGHT - 4} x2={svgWidth} y2={HEADER_HEIGHT - 4} stroke="var(--border)" strokeWidth={1} />

        {/* Today line */}
        {todayOffset >= 0 && todayOffset <= totalDays && (
          <line
            x1={LABEL_WIDTH + todayOffset * DAY_WIDTH}
            y1={HEADER_HEIGHT - 4}
            x2={LABEL_WIDTH + todayOffset * DAY_WIDTH}
            y2={svgHeight}
            stroke="var(--accent)"
            strokeWidth={1.5}
            opacity={0.6}
          />
        )}

        {/* Items */}
        {timelineItems.map((ti, idx) => {
          const y = HEADER_HEIGHT + idx * ROW_HEIGHT;
          const startDay = daysBetween(startDate, ti.start);
          const endDay = daysBetween(startDate, ti.end);
          const isDragging = dragState?.itemNumber === ti.item.item_number;
          const adjustedEndDay = isDragging ? endDay + dragState.deltaDays : endDay;
          const barX = LABEL_WIDTH + startDay * DAY_WIDTH;
          const barWidth = Math.max((adjustedEndDay - startDay + 1) * DAY_WIDTH - 4, 8);
          const color = stateColorMap[ti.item.status_id] || "#6b7280";

          return (
            <g key={ti.item.id}>
              {/* Row background on hover */}
              <rect
                x={0}
                y={y}
                width={svgWidth}
                height={ROW_HEIGHT}
                fill="transparent"
                className="hover:fill-[var(--bg-secondary)] cursor-pointer transition-colors"
                onClick={() => onCardClick(ti.item)}
              />

              {/* Label */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2 + 4}
                className="text-[11px] fill-[var(--text-secondary)] font-medium"
              >
                <tspan>#{ti.item.item_number}</tspan>
                <tspan dx={6} className="fill-[var(--text-primary)]">
                  {ti.item.title.length > 18 ? ti.item.title.slice(0, 18) + "..." : ti.item.title}
                </tspan>
              </text>

              {/* Bar */}
              <rect
                x={barX}
                y={y + 6}
                width={barWidth}
                height={ROW_HEIGHT - 12}
                rx={4}
                fill={color}
                opacity={isDragging ? 0.5 : 0.8}
                className="cursor-pointer hover:opacity-100 transition-opacity"
                onClick={() => onCardClick(ti.item)}
                strokeDasharray={ti.hasDueDate ? undefined : "4 2"}
                stroke={ti.hasDueDate ? undefined : color}
                strokeWidth={ti.hasDueDate ? undefined : 1.5}
                fillOpacity={ti.hasDueDate ? (isDragging ? 0.5 : 0.8) : 0.2}
              />

              {/* Drag handle at right edge of bar (only for items with due dates) */}
              {ti.hasDueDate && onItemUpdate && (
                <rect
                  x={barX + barWidth - 8}
                  y={y + 6}
                  width={8}
                  height={ROW_HEIGHT - 12}
                  rx={2}
                  fill="transparent"
                  cursor="ew-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      itemNumber: ti.item.item_number,
                      startX: e.clientX,
                      originalEnd: ti.end,
                      deltaDays: 0,
                    });
                  }}
                />
              )}

              {/* Row separator */}
              <line x1={0} y1={y + ROW_HEIGHT} x2={svgWidth} y2={y + ROW_HEIGHT} stroke="var(--border)" strokeWidth={0.5} opacity={0.2} />
            </g>
          );
        })}

        {/* Dependency arrows */}
        {arrows.map((a, i) => {
          const midX = (a.x1 + a.x2) / 2;
          return (
            <path
              key={i}
              d={`M ${a.x1} ${a.y1} C ${midX} ${a.y1}, ${midX} ${a.y2}, ${a.x2} ${a.y2}`}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              opacity={0.4}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth={8}
            markerHeight={6}
            refX={8}
            refY={3}
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" opacity={0.6} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
