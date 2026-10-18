"use client";
import type { PairPrice, Trade } from "@/lib/types";

export default function PriceChart({
  prices,
  symbols,
  trades,
  selectedDate,
}: {
  prices: PairPrice[];
  symbols: string[];
  trades: Trade[];
  selectedDate: string;
}) {
  if (!prices.length) return null;
  const width = 1000;
  const height = 300;
  const left = 50;
  const right = 16;
  const top = 18;
  const bottom = 32;
  const yValues = prices.map((p) => (p.y_price / prices[0].y_price) * 100);
  const xValues = prices.map((p) => (p.x_price / prices[0].x_price) * 100);
  const all = [...yValues, ...xValues];
  const min = Math.floor(Math.min(...all) / 25) * 25;
  const max = Math.ceil(Math.max(...all) / 25) * 25;
  const span = max - min || 1;
  const px = (i: number) =>
    left + (i / (prices.length - 1)) * (width - left - right);
  const py = (v: number) => top + ((max - v) / span) * (height - top - bottom);
  const line = (values: number[]) =>
    values
      .map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(" ");
  const index = new Map(prices.map((point, i) => [point.date, i]));
  const selectedIndex = prices.findIndex((point) => point.date >= selectedDate);
  return (
    <div
      className="price-chart"
      role="img"
      aria-label={`${symbols[0]} and ${symbols[1]} adjusted research prices, indexed to 100 on ${prices[0].date}. Circles mark modeled trade entries and squares mark exits.`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((fraction) => {
          const value = max - fraction * span;
          const yy = py(value);
          return (
            <g key={fraction}>
              <line
                x1={left}
                x2={width - right}
                y1={yy}
                y2={yy}
                stroke="#d9dcd8"
                strokeDasharray="3 6"
              />
              <text
                x={left - 9}
                y={yy + 4}
                textAnchor="end"
                fill="#64706e"
                fontSize="12"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        <path
          d={line(yValues)}
          fill="none"
          stroke="#197b69"
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line(xValues)}
          fill="none"
          stroke="#c4774a"
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
        {selectedIndex >= 0 && (
          <line
            x1={px(selectedIndex)}
            x2={px(selectedIndex)}
            y1={top}
            y2={height - bottom}
            stroke="#1c3132"
            strokeDasharray="5 5"
            strokeWidth="1.5"
          />
        )}
        {trades.map((trade) => {
          const entry = index.get(trade.entry_date);
          const exit = index.get(trade.exit_date);
          if (entry === undefined || exit === undefined) return null;
          return (
            <g key={trade.signal_date}>
              <circle
                cx={px(entry)}
                cy={py(yValues[entry])}
                r="6"
                fill="#197b69"
                stroke="white"
                strokeWidth="2"
              />
              <rect
                x={px(exit) - 5}
                y={py(yValues[exit]) - 5}
                width="10"
                height="10"
                fill="#1c3132"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          );
        })}
        <text x={left} y={height - 5} fill="#64706e" fontSize="12">
          {prices[0].date}
        </text>
        <text
          x={width - right}
          y={height - 5}
          textAnchor="end"
          fill="#64706e"
          fontSize="12"
        >
          {prices.at(-1)?.date}
        </text>
      </svg>
      <div className="price-legend">
        <span>
          <i className="green" />
          {symbols[0]}
        </span>
        <span>
          <i className="orange" />
          {symbols[1]}
        </span>
        <span>
          <i className="entry" />
          Modeled entry
        </span>
        <span>
          <i className="exit" />
          Modeled exit
        </span>
        <span>Dashed line: selected day</span>
      </div>
    </div>
  );
}
