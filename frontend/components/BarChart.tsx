interface BarItem {
  label: string;
  value: number;
  color: string;
}

export default function BarChart({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const barHeight = 28;
  const gap = 6;
  const labelWidth = 120;
  const valueWidth = 40;
  const chartWidth = 300;
  const totalWidth = labelWidth + chartWidth + valueWidth + 16;
  const totalHeight = items.length * (barHeight + gap) - gap + 8;

  if (items.length === 0) {
    return (
      <div className="card-surface p-6 text-center text-sm text-[var(--text-muted)]">
        No data
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full"
      style={{ maxHeight: Math.max(totalHeight, 60) }}
    >
      {items.map((item, i) => {
        const y = i * (barHeight + gap);
        const barW = (item.value / max) * chartWidth;
        return (
          <g key={item.label}>
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2 + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[11px] fill-[var(--text-secondary)]"
            >
              {item.label.length > 14 ? item.label.slice(0, 13) + "..." : item.label}
            </text>
            <rect
              x={labelWidth}
              y={y + 2}
              width={Math.max(barW, 2)}
              height={barHeight - 4}
              rx={4}
              fill={item.color}
              opacity={0.85}
            />
            <text
              x={labelWidth + chartWidth + 8}
              y={y + barHeight / 2 + 1}
              textAnchor="start"
              dominantBaseline="middle"
              className="text-[11px] fill-[var(--text-muted)] font-medium"
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
