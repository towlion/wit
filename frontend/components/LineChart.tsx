interface Point {
  label: string;
  value: number;
}

export default function LineChart({
  points,
  color = "#6366f1",
}: {
  points: Point[];
  color?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="card-surface p-6 text-center text-sm text-[var(--text-muted)]">
        No data
      </div>
    );
  }

  const height = 200;
  const padding = { top: 20, right: 16, bottom: 32, left: 40 };
  const chartW = 600;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = (chartW - padding.left - padding.right) / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - (p.value / max) * chartH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`;

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padding.top + chartH - frac * chartH,
    label: Math.round(frac * max),
  }));

  return (
    <svg viewBox={`0 0 ${chartW} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {/* Grid */}
      {gridLines.map((g) => (
        <g key={g.y}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={chartW - padding.right}
            y2={g.y}
            stroke="var(--border)"
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 6}
            y={g.y + 1}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-[9px] fill-[var(--text-muted)]"
          >
            {g.label}
          </text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.1} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} />
      ))}
      {/* X-axis labels */}
      {points.map((p, i) => {
        if (points.length <= 10 || i % 5 === 0 || i === points.length - 1) {
          return (
            <text
              key={i}
              x={coords[i].x}
              y={height - 6}
              textAnchor="middle"
              className="text-[8px] fill-[var(--text-muted)]"
            >
              {p.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
