interface Segment {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  segments: Segment[];
  height?: number;
}

export default function StackedBar({ segments, height = 20 }: StackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div
        className="rounded-full bg-[var(--bg-tertiary)]"
        style={{ height }}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-1 flex rounded-full overflow-hidden"
        style={{ height }}
      >
        {segments.map(
          (seg) =>
            seg.value > 0 && (
              <div
                key={seg.label}
                title={`${seg.label}: ${seg.value}`}
                style={{
                  width: `${(seg.value / total) * 100}%`,
                  backgroundColor: seg.color,
                }}
              />
            )
        )}
      </div>
    </div>
  );
}
