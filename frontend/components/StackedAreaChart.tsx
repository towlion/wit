interface Series {
  key: string;
  label: string;
  color: string;
}

interface DataPoint {
  label: string;
  values: Record<string, number>;
}

export default function StackedAreaChart({
  points,
  series,
}: {
  points: DataPoint[];
  series: Series[];
}) {
  if (points.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--text-muted)]">No data</div>
    );
  }

  const height = 200;
  const padding = { top: 20, right: 16, bottom: 32, left: 40 };
  const chartW = 600;
  const chartH = height - padding.top - padding.bottom;

  const totals = points.map((p) => series.reduce((sum, s) => sum + (p.values[s.key] || 0), 0));
  const maxY = Math.max(...totals, 1);
  const stepX = (chartW - padding.left - padding.right) / Math.max(points.length - 1, 1);

  const toX = (i: number) => padding.left + i * stepX;
  const toY = (val: number) => padding.top + chartH - (val / maxY) * chartH;

  // Grid lines (5 horizontal: 0/25/50/75/100%)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padding.top + chartH - frac * chartH,
    label: Math.round(frac * maxY),
  }));

  // Build stacked areas (bottom to top: series[0] at bottom)
  const areas = series.map((s, si) => {
    const topCoords = points.map((p, i) => {
      let cumulative = 0;
      for (let j = 0; j <= si; j++) {
        cumulative += p.values[series[j].key] || 0;
      }
      return { x: toX(i), y: toY(cumulative) };
    });

    const baseCoords = points.map((p, i) => {
      let cumulative = 0;
      for (let j = 0; j < si; j++) {
        cumulative += p.values[series[j].key] || 0;
      }
      return { x: toX(i), y: toY(cumulative) };
    });

    const topPath = topCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
    const basePath = baseCoords
      .slice()
      .reverse()
      .map((c, i) => `${i === 0 ? "L" : "L"} ${c.x} ${c.y}`)
      .join(" ");

    return {
      color: s.color,
      areaPath: `${topPath} ${basePath} Z`,
      strokePath: topCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" "),
    };
  });

  return (
    <div>
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
        {/* Stacked areas (render bottom to top) */}
        {areas.map((a, i) => (
          <g key={i}>
            <path d={a.areaPath} fill={a.color} opacity={0.75} />
            <path d={a.strokePath} fill="none" stroke={a.color} strokeWidth={1} />
          </g>
        ))}
        {/* X-axis labels */}
        {points.map((p, i) => {
          if (points.length <= 10 || i % 5 === 0 || i === points.length - 1) {
            return (
              <text
                key={i}
                x={toX(i)}
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
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
