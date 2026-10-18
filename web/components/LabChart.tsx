"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type ChartSeries = { name: string; color: string; values: number[] };
export default function LabChart({
  dates,
  series,
  start,
  end,
  selected,
  onSelect,
  unit,
}: {
  dates: string[];
  series: ChartSeries[];
  start: number;
  end: number;
  selected: number;
  onSelect: (index: number) => void;
  unit: "index" | "USD" | "%";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(260, entries[0].contentRect.width)),
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const point = Math.min(end, Math.max(start, hover ?? selected));
  const drawing = useMemo(() => {
    const values = series.flatMap((s) => s.values.slice(start, end + 1));
    let min = Math.min(...values),
      max = Math.max(...values);
    if (unit === "%") {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const pad = (max - min) * 0.09 || 1;
    min -= pad;
    max += pad;
    if (unit !== "%" && Math.min(...values) >= 0) min = Math.max(0, min);
    const x = (i: number) =>
      48 + ((i - start) / Math.max(1, end - start)) * (width - 64);
    const y = (v: number) => 16 + ((max - v) / (max - min)) * 264;
    return {
      min,
      max,
      x,
      y,
      paths: series.map((s) => ({
        name: s.name,
        color: s.color,
        d: s.values
          .slice(start, end + 1)
          .map(
            (v, i) =>
              `${i ? "L" : "M"}${x(i + start).toFixed(2)},${y(v).toFixed(2)}`,
          )
          .join(" "),
      })),
    };
  }, [series, start, end, unit, width]);
  const format = (v: number) =>
    unit === "USD"
      ? `$${Math.round(v).toLocaleString()}`
      : unit === "%"
        ? `${v.toFixed(1)}%`
        : v.toFixed(1);
  const indexFromX = (clientX: number, rect: DOMRect) =>
    Math.max(
      start,
      Math.min(
        end,
        Math.round(
          start +
            ((((clientX - rect.left) / rect.width) * width - 48) /
              (width - 64)) *
              (end - start),
        ),
      ),
    );
  return (
    <div className="lab-chart-shell" ref={frame}>
      <div className="chart-readout" aria-live="off">
        <time>{dates[point]}</time>
        <div>
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name} <b>{format(s.values[point])}</b>
            </span>
          ))}
        </div>
      </div>
      <svg
        className="lab-chart"
        viewBox={`0 0 ${width} 306`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Interactive ${unit} chart from ${dates[start]} to ${dates[end]}. Click to choose a historical date.`}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse")
            setHover(
              indexFromX(e.clientX, e.currentTarget.getBoundingClientRect()),
            );
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) =>
          onSelect(
            indexFromX(e.clientX, e.currentTarget.getBoundingClientRect()),
          )
        }
      >
        {[0, 0.5, 1].map((f) => {
          const v = drawing.max - f * (drawing.max - drawing.min),
            y = drawing.y(v);
          return (
            <g key={f}>
              <line
                x1="48"
                x2={width - 16}
                y1={y}
                y2={y}
                stroke="#e3e7ec"
                strokeDasharray="3 5"
              />
              <text
                x="39"
                y={y + 4}
                textAnchor="end"
                fill="#7a8493"
                fontSize="12"
              >
                {unit === "USD"
                  ? `${(v / 1000).toFixed(0)}k`
                  : unit === "%"
                    ? `${v.toFixed(0)}%`
                    : v.toFixed(0)}
              </text>
            </g>
          );
        })}
        {unit === "%" && (
          <line
            x1="48"
            x2={width - 16}
            y1={drawing.y(0)}
            y2={drawing.y(0)}
            stroke="#8f99a7"
          />
        )}
        {drawing.paths.map((p) => (
          <path
            key={p.name}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1={drawing.x(point)}
          x2={drawing.x(point)}
          y1="16"
          y2="280"
          stroke="#788799"
          strokeDasharray="4 5"
        />
        {series.map((s) => (
          <circle
            key={s.name}
            cx={drawing.x(point)}
            cy={drawing.y(s.values[point])}
            r="4"
            fill={s.color}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="lab-chart-axis">
        <span>{dates[start]}</span>
        <span>Click the chart to inspect a day</span>
        <span>{dates[end]}</span>
      </div>
      <input
        className="chart-date-slider"
        aria-label="Move selected historical date"
        type="range"
        min={start}
        max={end}
        value={Math.max(start, Math.min(end, selected))}
        onChange={(e) => onSelect(Number(e.target.value))}
      />
    </div>
  );
}
