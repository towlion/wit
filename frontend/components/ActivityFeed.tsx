"use client";

import { useEffect, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import type { ActivityEvent } from "@/lib/types";

interface ActivityFeedProps {
  basePath: string;
  itemNumber: number;
}

function formatEventDescription(event: ActivityEvent): string {
  const actor = event.user?.display_name || "Someone";
  switch (event.event_type) {
    case "created":
      return `${actor} created this item`;
    case "status_change":
      return `${actor} changed status from **${event.old_value}** to **${event.new_value}**`;
    case "priority_change":
      return `${actor} changed priority from **${event.old_value}** to **${event.new_value}**`;
    case "assignee_added":
      return `${actor} assigned **${event.new_value}**`;
    case "assignee_removed":
      return `${actor} unassigned **${event.old_value}**`;
    case "label_added":
      return `${actor} added label **${event.new_value}**`;
    case "label_removed":
      return `${actor} removed label **${event.old_value}**`;
    case "archived":
      return `${actor} archived this item`;
    default:
      return `${actor} performed ${event.event_type}`;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ basePath, itemNumber }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const activityPath = `${basePath}/items/${itemNumber}`;

  useEffect(() => {
    api.get<ActivityEvent[]>(`${activityPath}/activity`).then(setEvents);
  }, [activityPath]);

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    const event = await api.post<ActivityEvent>(`${activityPath}/comments`, { body: comment });
    setEvents((prev) => [event, ...prev]);
    setComment("");
    setSubmitting(false);
  }

  async function handleEditComment(id: number) {
    if (!editBody.trim()) return;
    const event = await api.patch<ActivityEvent>(`${activityPath}/comments/${id}`, { body: editBody });
    setEvents((prev) => prev.map((e) => (e.id === id ? event : e)));
    setEditingId(null);
    setEditBody("");
  }

  async function handleDeleteComment(id: number) {
    await api.delete(`${activityPath}/comments/${id}`);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      {/* Comment input */}
      <form onSubmit={handleSubmitComment} className="mb-4">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment... (Markdown supported)"
          rows={3}
          className="input-base resize-none mb-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmitComment(e);
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[var(--text-muted)]">Cmd+Enter to submit</span>
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {submitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>

      {/* Timeline */}
      <div className="space-y-0">
        {events.map((event) => (
          <div key={event.id} className="relative pl-6 pb-4 border-l border-[var(--border)]">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[5px] top-1 w-[10px] h-[10px] rounded-full border-2 border-[var(--bg-primary)] ${
                event.event_type === "comment"
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--border-hover)]"
              }`}
            />

            <div className="flex items-start gap-2">
              {event.user && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/80 to-violet-500/80 flex items-center justify-center text-[8px] text-white font-medium shrink-0 mt-0.5">
                  {event.user.display_name[0].toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {event.event_type === "comment" ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{event.user?.display_name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {timeAgo(event.created_at)}
                      </span>
                    </div>
                    {editingId === event.id ? (
                      <div>
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={3}
                          className="input-base resize-none mb-1 text-xs"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditComment(event.id)}
                            className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)]"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-xs p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                        <ReactMarkdown>{event.body || ""}</ReactMarkdown>
                      </div>
                    )}
                    {editingId !== event.id && (
                      <div className="flex gap-2 mt-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(event.id);
                            setEditBody(event.body || "");
                          }}
                          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(event.id)}
                          className="text-[10px] text-red-400/70 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[var(--text-secondary)]">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <span>{children}</span>,
                          strong: ({ children }) => (
                            <span className="font-semibold text-[var(--text-primary)]">{children}</span>
                          ),
                        }}
                      >
                        {formatEventDescription(event)}
                      </ReactMarkdown>
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {timeAgo(event.created_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
