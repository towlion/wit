"use client";

interface AttachmentItem {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

interface AttachmentListProps {
  attachments: AttachmentItem[];
  downloadUrl: (id: number) => string;
  onDelete: (id: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ attachments, downloadUrl, onDelete }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] group"
        >
          <svg className="w-4 h-4 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <div className="flex-1 min-w-0">
            <a
              href={downloadUrl(att.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] truncate block"
            >
              {att.filename}
            </a>
            <span className="text-[10px] text-[var(--text-muted)]">{formatSize(att.size_bytes)}</span>
          </div>
          <button
            onClick={() => onDelete(att.id)}
            className="text-[10px] text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
