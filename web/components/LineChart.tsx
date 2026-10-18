"use client";
import type { CurvePoint } from "@/lib/types";

type Series = { name: string; color: string; points: CurvePoint[] };
export default function LineChart({ series }: { series: Series[] }) {
  if (!series.length || !series[0].points.length) return null;
  const width = 900,
    height = 250,
    left = 50,
    right = 14,
    top = 12,
    bottom = 32;
  const values = series.flatMap((s) => s.points.map((p) => p.equity));
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min || 1;
  const count = series[0].points.length;
  const x = (i: number) =>
    left + (i * (width - left - right)) / Math.max(1, count - 1);
  const y = (value: number) =>
    top + ((max - value) * (height - top - bottom)) / span;
  const path = (points: CurvePoint[]) =>
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.equity).toFixed(1)}`,
      )
      .join(" ");
  const start = series[0].points[0].date,
    end = series[0].points.at(-1)?.date;
  return (
    <div
      className="chart-shell"
      role="img"
      aria-label={`Equity chart from ${start} to ${end}`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              x2={width - right}
              y1={top + f * (height - top - bottom)}
              y2={top + f * (height - top - bottom)}
              stroke="#dce6e9"
              strokeDasharray="4 5"
            />
            <text
              x={left - 8}
              y={top + f * (height - top - bottom) + 4}
              textAnchor="end"
              fill="#6c7e87"
              fontSize="11"
            >
              ${Math.round(max - f * span).toLocaleString()}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.name}
            d={path(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.7"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <text x={left} y={height - 5} fill="#6c7e87" fontSize="11">
          {start}
        </text>
        <text
          x={width - right}
          y={height - 5}
          textAnchor="end"
          fill="#6c7e87"
          fontSize="11"
        >
          {end}
        </text>
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
