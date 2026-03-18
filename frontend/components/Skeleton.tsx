interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = "100%", height = "14px", className = "" }: SkeletonLineProps) {
  return <div className={`skeleton ${className}`} style={{ height, width }} />;
}

interface SkeletonBlockProps {
  height?: string;
  className?: string;
}

export function SkeletonBlock({ height = "80px", className = "" }: SkeletonBlockProps) {
  return <div className={`skeleton ${className}`} style={{ height }} />;
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skeleton h-3 flex-1" style={{ maxWidth: c === 0 ? "30%" : "15%" }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-[var(--border)] last:border-0 px-4 py-3 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1 rounded-lg" style={{ maxWidth: c === 0 ? "30%" : "15%" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface PageSkeletonProps {
  text?: string;
}

export function PageSkeleton({ text = "Loading..." }: PageSkeletonProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse" />
        <span className="text-sm text-[var(--text-muted)]">{text}</span>
      </div>
    </div>
  );
}
