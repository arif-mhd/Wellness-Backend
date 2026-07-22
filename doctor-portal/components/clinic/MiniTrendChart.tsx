"use client";

import { useState } from "react";

interface TrendPoint {
  label: string;
  count: number;
}

// A compact, self-contained line chart for "N over the last 8 days"-style
// widgets (branch cards, dashboard stat card, branch detail header). Ported
// from admin-portal's MiniLineChart, simplified to a single data shape.
export default function MiniTrendChart({ data, color = "#5476FC", height = 120 }: { data: TrendPoint[]; color?: string; height?: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>No data yet.</div>;
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 260;
  const H = height;
  const paddingLeft = 22;
  const paddingBottom = 16;
  const chartW = W - paddingLeft;
  const chartH = H - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = chartH - (d.count / max) * chartH;
    return { x, y, count: d.count, label: d.label };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaD = `M ${paddingLeft},${chartH} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${paddingLeft + chartW},${chartH} Z`;
  const gradId = `mtc-grad-${color.replace("#", "")}`;
  const ticks = [0, max * 0.5, max];
  const active = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full">
      {active && (
        <div
          className="absolute bg-[#24292E] text-white px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5 items-center shadow-lg pointer-events-none z-10 whitespace-nowrap"
          style={{ top: `${Math.max(0, active.y - 46)}px`, left: `${active.x}px`, transform: "translateX(-50%)" }}
        >
          <span className="text-[8px] text-gray-300 font-medium tracking-wide">{active.label}</span>
          <span className="text-xs font-bold">{active.count} patients</span>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: `${H}px` }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => {
          const y = chartH - (t / max) * chartH;
          return (
            <g key={i}>
              <text x={paddingLeft - 6} y={y + 3} fontSize="8" fill="#9ca3af" textAnchor="end">{Math.round(t)}</text>
              <line x1={paddingLeft} y1={y} x2={W} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            </g>
          );
        })}

        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {active && (
          <>
            <circle cx={active.x} cy={active.y} r="10" fill={color} fillOpacity="0.15" />
            <circle cx={active.x} cy={active.y} r="4" fill="white" stroke={color} strokeWidth="2" />
          </>
        )}

        {points.map((p, i) => (
          <text key={`l-${i}`} x={p.x} y={H - 4} fontSize="7.5" fill="#9ca3af" textAnchor="middle">{p.label}</text>
        ))}

        {points.map((p, i) => (
          <rect
            key={`r-${i}`}
            x={i === 0 ? paddingLeft : p.x - chartW / Math.max(data.length - 1, 1) / 2}
            y={0}
            width={chartW / Math.max(data.length - 1, 1)}
            height={H}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>
    </div>
  );
}
