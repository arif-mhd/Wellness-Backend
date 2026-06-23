"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useCallback, ReactElement } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Range = "day" | "week" | "month";
const RANGE_LABEL: Record<Range, string> = { day: "Today", week: "This Week", month: "This Month" };

interface DashboardStats {
  range: Range;
  labels: string[];
  appointmentsBooked: { data: number[]; total: number; totalLabel: string; change: { value: number; positive: boolean }; hasData: boolean };
  bookingTrends: { data: number[]; value: number; change: { value: number; positive: boolean }; hasData: boolean };
  cancellation: { totalBooking: number; totalBookingLabel: string; cancellations: number; cancellationsLabel: string; bookingPct: number; cancelPct: number; change: { value: number; positive: boolean }; bookingChange: { value: number; positive: boolean }; total: number; totalLabel: string; hasData: boolean };
  consultations: { data: number[]; total: number; totalLabel: string; change: { value: number; positive: boolean }; hasData: boolean };
  doctorSatisfaction: { data: number[]; value: number; change: { value: number; positive: boolean }; hasData: boolean };
  prescriptions: { data: number[]; total: number; totalLabel: string; change: { value: number; positive: boolean }; hasData: boolean };
  patientAppointments: { data: number[]; value: number; change: { value: number; positive: boolean }; hasData: boolean };
  primaryReasons: { reasons: { reason: string; count: number }[]; total: number; totalLabel: string; hasData: boolean };
  patientSatisfaction: { data: number[]; value: number; change: { value: number; positive: boolean }; hasData: boolean };
}

async function fetchStats(range: Range): Promise<{ data: DashboardStats | null; error: string | null }> {
  try {
    const accessToken = await Session.getAccessToken();
    if (!accessToken) return { data: null, error: "Not authenticated" };
    const res = await fetch(`${API_URL}/api/admin/dashboard/stats?range=${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { data: null, error: `Request failed (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "Network error" };
  }
}

type TaskType = "doctor_approval" | "pharmacy_approval" | "support_ticket" | "slot_change";

interface AdminTask {
  id: string;
  type: TaskType;
  title: string;
  email: string;
  summary: string;
  priority: "High Priority" | null;
  createdAt: string;
  link: string;
}

interface TaskCounts {
  doctorApprovals: number;
  pharmacyApprovals: number;
  openTickets: number;
  slotChanges: number;
  total: number;
}

async function fetchTasks(): Promise<{ tasks: AdminTask[]; counts: TaskCounts | null; error: string | null }> {
  try {
    const accessToken = await Session.getAccessToken();
    if (!accessToken) return { tasks: [], counts: null, error: "Not authenticated" };
    const res = await fetch(`${API_URL}/api/admin/dashboard/tasks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { tasks: [], counts: null, error: `Request failed (${res.status}): ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    return { tasks: data.tasks ?? [], counts: data.counts ?? null, error: null };
  } catch (err: any) {
    return { tasks: [], counts: null, error: err?.message ?? "Network error" };
  }
}

function formatTaskTime(iso: string): string {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  } catch {
    return iso;
  }
}

// ─── Empty State ───────────────────────────────────────────────────────────
function NoDataState({ range }: { range: Range }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3">
      <svg className="w-7 h-7 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6h6zm0 0h6m-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0h6v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" />
      </svg>
      <p className="text-[10px] font-semibold text-slate-300 text-center">
        No data available for {RANGE_LABEL[range].toLowerCase()}
      </p>
    </div>
  );
}

// ─── Interactive Mini Bar Chart with Hover Tooltip ────────────────────────────
function MiniBarChart({ data, labels, color = "#FFC107" }: { data: number[]; labels: string[]; color?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data, 1);
  const isDense = data.length > 14;
  const H = 130;
  const W = isDense ? data.length * 40 : 250;

  const chart = (
    <div className="relative pt-4 flex-1 flex flex-col justify-end mt-4" style={isDense ? { width: `${W}px` } : undefined}>
      <div className="w-full flex items-end justify-between relative" style={{ height: `${H}px` }}>
        {data.map((v, i) => {
          const isHovered = hoveredIdx === i;
          const barHeight = Math.max((v / max) * (H - 20), 4);
          return (
            <div key={i} className="flex flex-col items-center justify-end h-full" style={{ width: isDense ? "28px" : "36px" }}>
              <div className="relative w-full flex flex-col items-center justify-end" style={{ height: `${H - 20}px` }}>
                <div
                  className="w-full relative cursor-pointer group rounded-[4px] transition-all duration-300 shadow-sm overflow-hidden"
                  style={{
                    height: `${barHeight}px`,
                    background: `linear-gradient(to bottom, #fef3c7, #fde68a, #fcd34d)`,
                    opacity: isHovered ? 0.9 : 1,
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span 
                  className="absolute text-[11px] font-medium text-slate-800 transition-all duration-300 pointer-events-none" 
                  style={{ 
                    fontFamily: "Outfit, sans-serif",
                    bottom: barHeight > 24 ? `${barHeight - 20}px` : `${barHeight + 4}px`
                  }}
                >
                  {v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                </span>
              </div>
              <span className="text-[9px] font-medium text-[#9ca3af] mt-2 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return isDense ? <div className="chart-scroll-x pb-1 -mb-1 mt-auto">{chart}</div> : <div className="mt-auto flex-1 flex flex-col">{chart}</div>;
}

// ─── Interactive Mini Line Chart with Hover Tooltip ───────────────────────────
function MiniLineChart({ data, labels, color = "#3b82f6" }: { data: number[]; labels: string[]; color?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data, 100);
  const min = 0;
  const range = max - min || 1;
  const isDense = data.length > 14;
  const W = isDense ? data.length * 40 : 250;
  const H = 140;

  const paddingLeft = 30;
  const paddingBottom = 20;
  const chartW = W - paddingLeft;
  const chartH = H - paddingBottom;

  const points = data.map((v, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = chartH - ((v - min) / range) * chartH;
    return { x, y, val: v };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaD = `M ${paddingLeft},${chartH} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${paddingLeft + chartW},${chartH} Z`;
  const gradId = `grad-${color.replace("#", "")}`;

  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];

  const chart = (
    <div className="relative flex-1 flex flex-col justify-end mt-4" style={isDense ? { width: `${W}px` } : undefined}>
      {hoveredIdx !== null && (
        <div
          className="absolute bg-white px-3 py-2 rounded-xl flex flex-col gap-1 items-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-none z-10 transition-all duration-200 whitespace-nowrap border border-slate-100"
          style={{
            top: `${Math.max(0, points[hoveredIdx].y - 65)}px`,
            left: `${points[hoveredIdx].x}px`,
            transform: "translateX(-50%)"
          }}
        >
          <span className="text-[10px] text-slate-400 font-medium tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>{labels[hoveredIdx]} 00:00</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-medium text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>{data[hoveredIdx] >= 1000 ? `${(data[hoveredIdx]/1000).toFixed(0)}K` : data[hoveredIdx]}</span>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded text-emerald-600 bg-emerald-50">+3.4%</span>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        style={{ height: `${H}px`, ...(isDense ? { width: `${W}px` } : {}) }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => {
          const y = chartH - (t / max) * chartH;
          return (
            <g key={i}>
              <text x={paddingLeft - 10} y={y + 3} fontSize="9" fill="#9ca3af" textAnchor="end" style={{ fontFamily: "Outfit, sans-serif" }}>
                {t >= 1000 ? `${(t/1000).toFixed(0)}K` : Math.round(t)}
              </text>
              <line x1={paddingLeft} y1={y} x2={W} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            </g>
          );
        })}

        {points.map((p, i) => (
           <line key={`v-${i}`} x1={p.x} y1={0} x2={p.x} y2={chartH} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
        ))}

        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hoveredIdx !== null && (
          <>
            <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].y} r="12" fill={color} fillOpacity="0.15" className="transition-all duration-200" />
            <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].y} r="4" fill="white" stroke={color} strokeWidth="2" className="transition-all duration-200" />
          </>
        )}

        {points.map((p, i) => (
          <text key={`l-${i}`} x={p.x} y={H - 5} fontSize="8" fill="#9ca3af" textAnchor="middle" style={{ fontFamily: "Outfit, sans-serif" }}>
            {labels[i]}
          </text>
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

  return isDense ? <div className="chart-scroll-x pb-1 -mb-1 mt-auto">{chart}</div> : <div className="mt-auto flex-1 flex flex-col">{chart}</div>;
}

// ─── Segmented Progress Bar Component ──────────────────────────────────────────
function SegmentedProgressBar({ percentage, color = "#3b82f6", blocksCount = 40 }: { percentage: number; color?: string; blocksCount?: number }) {
  return (
    <div className="flex gap-[1.5px] w-full mt-1.5 select-none h-[8px]">
      {Array.from({ length: blocksCount }).map((_, i) => (
        <div
          key={i}
          className="h-full rounded-[1px] flex-1"
          style={{ backgroundColor: color, opacity: 0.4 }}
        />
      ))}
    </div>
  );
}

// ─── Range Toggle + Card Header ────────────────────────────────────────────
function CardHeader({
  title,
  range,
  onChangeRange,
  showDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  title: string;
  range: Range;
  onChangeRange: (r: Range) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex items-start justify-between relative z-10 gap-3">
      <p className="text-xs font-medium text-[#6c7278] leading-snug pr-2">{title}</p>
      <div className="flex items-center gap-2 shrink-0">
        {/* Range Dropdown */}
        <div className="relative">
          <button
            onClick={onToggleDropdown}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap"
          >
            {RANGE_LABEL[range]}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={onCloseDropdown} />
              <div className="absolute right-0 top-6 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-32 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                {(["day", "week", "month"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      onChangeRange(r);
                      onCloseDropdown();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      range === r ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Settings 3-dots Dropdown */}
        <div className="relative">
          <button onClick={() => setShowSettings(!showSettings)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          {showSettings && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 py-2 w-44 z-30">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Download Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card (Bar) ─────────────────────────────────────────────────────────
function BarStatCard({
  title,
  data,
  labels,
  color,
  totalLabel,
  change,
  hasData,
  loading,
  range,
  onChangeRange,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  title: string;
  data: number[];
  labels: string[];
  color?: string;
  totalLabel: string;
  change: { value: number; positive: boolean };
  hasData: boolean;
  loading: boolean;
  range: Range;
  onChangeRange: (r: Range) => void;
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col h-full min-h-[230px] overflow-visible">
      <CardHeader
        title={title}
        range={range}
        onChangeRange={onChangeRange}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : !hasData ? (
        <NoDataState range={range} />
      ) : (
        <div className="flex-1 flex flex-col">
          <MiniBarChart data={data} labels={labels} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Stat Card (Line) ────────────────────────────────────────────────────────
function LineStatCard({
  title,
  value,
  change,
  data,
  labels,
  color,
  hasData,
  loading,
  range,
  onChangeRange,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  title: string;
  value: string | number;
  change: { value: number; positive: boolean };
  data: number[];
  labels: string[];
  color?: string;
  hasData: boolean;
  loading: boolean;
  range: Range;
  onChangeRange: (r: Range) => void;
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col h-full min-h-[230px] overflow-visible">
      <CardHeader
        title={title}
        range={range}
        onChangeRange={onChangeRange}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : !hasData ? (
        <NoDataState range={range} />
      ) : (
        <div className="flex-1 flex flex-col">
          <MiniLineChart data={data} labels={labels} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Consult & Rescheduling Card (Cancellation Card) ─────────────────────────
function ConsultCard({
  cancellation,
  hasData,
  loading,
  range,
  onChangeRange,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  cancellation: DashboardStats["cancellation"] | null;
  hasData: boolean;
  loading: boolean;
  range: Range;
  onChangeRange: (r: Range) => void;
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  const title = "Appointment Cancellation and Rescheduling";
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col h-full min-h-[230px] overflow-visible">
      <CardHeader
        title={title}
        range={range}
        onChangeRange={onChangeRange}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : !hasData || !cancellation ? (
        <NoDataState range={range} />
      ) : (
        <div className="flex-1 flex flex-col mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-medium text-[#24292E] tracking-tight leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
              {parseFloat(cancellation.totalLabel.replace(/,/g, '')) >= 1000 ? `${(parseFloat(cancellation.totalLabel.replace(/,/g, ''))/1000).toFixed(1)}K` : cancellation.totalLabel}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${cancellation.bookingChange.positive ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"}`}>
              {cancellation.bookingChange.positive ? "+" : "-"}{cancellation.bookingChange.value}%
            </span>
          </div>

          <div className="flex gap-2 mt-5">
            <div className="flex-1">
              <SegmentedProgressBar percentage={cancellation.bookingPct} color="#a855f7" />
            </div>
            <div className="flex-1">
              <SegmentedProgressBar percentage={cancellation.cancelPct} color="#4ade80" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
            <div className="border border-[#eef2f7] rounded-xl p-3 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                Total Booking
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {parseFloat(cancellation.totalBookingLabel.replace(/,/g, '')) >= 1000 ? `${(parseFloat(cancellation.totalBookingLabel.replace(/,/g, ''))/1000).toFixed(1)}K` : cancellation.totalBookingLabel}
                </span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${cancellation.bookingChange.positive ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"}`}>
                  {cancellation.bookingChange.positive ? "+" : "-"}{cancellation.bookingChange.value}%
                </span>
              </div>
            </div>
            <div className="border border-[#eef2f7] rounded-xl p-3 bg-white shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                Cancellations
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {parseFloat(cancellation.cancellationsLabel.replace(/,/g, '')) >= 1000 ? `${(parseFloat(cancellation.cancellationsLabel.replace(/,/g, ''))/1000).toFixed(1)}K` : cancellation.cancellationsLabel}
                </span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${cancellation.change.positive ? "text-emerald-600 bg-emerald-50" : "text-rose-500 bg-rose-50"}`}>
                  {cancellation.change.positive ? "+" : "-"}{cancellation.change.value}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Primary Appointment Reasons Card ─────────────────────────────────────────
const REASON_COLORS = ["#a855f7", "#4ade80", "#fcd34d", "#4ade80"];

function PrimaryReasonsCard({
  primaryReasons,
  hasData,
  loading,
  range,
  onChangeRange,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  primaryReasons: DashboardStats["primaryReasons"] | null;
  hasData: boolean;
  loading: boolean;
  range: Range;
  onChangeRange: (r: Range) => void;
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  const title = "Primary Appointment Reasons";
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col h-full min-h-[230px] overflow-visible">
      <CardHeader
        title={title}
        range={range}
        onChangeRange={onChangeRange}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : !hasData || !primaryReasons ? (
        <NoDataState range={range} />
      ) : (
        <div className="flex-1 flex flex-col mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-medium text-[#24292E] tracking-tight leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
              {parseFloat(primaryReasons.totalLabel.replace(/,/g, '')) >= 1000 ? `${(parseFloat(primaryReasons.totalLabel.replace(/,/g, ''))/1000).toFixed(1)}K` : primaryReasons.totalLabel}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md text-emerald-600 bg-emerald-50">+3.4%</span>
          </div>

          <div className="flex gap-[4px] w-full mt-5 select-none">
            {(() => {
              const blocksCount = 20;
              const shownTotal = primaryReasons.reasons.reduce((s, r) => s + r.count, 0);

              if (shownTotal === 0) {
                return Array.from({ length: blocksCount }).map((_, i) => (
                  <div key={i} className="h-[8px] rounded-full flex-1" style={{ backgroundColor: "#ecf0f6" }} />
                ));
              }

              const raw = primaryReasons.reasons.map((r) => (r.count / shownTotal) * blocksCount);
              const base = raw.map((v) => Math.floor(v));
              let used = base.reduce((s, v) => s + v, 0);
              const remainders = raw.map((v, i) => ({ i, frac: v - base[i] })).sort((a, b) => b.frac - a.frac);
              const counts = [...base];
              for (let k = 0; used < blocksCount && k < remainders.length; k++, used++) {
                counts[remainders[k].i]++;
              }

              const blocks: string[] = [];
              counts.forEach((n, i) => {
                for (let j = 0; j < n; j++) blocks.push(REASON_COLORS[i % REASON_COLORS.length]);
              });

              return blocks.slice(0, blocksCount).map((color, i) => (
                <div key={i} className="h-[8px] rounded-full flex-1 transition-all duration-300" style={{ backgroundColor: color }} />
              ));
            })()}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-auto pt-4">
            {primaryReasons.reasons.map((r, i) => (
              <div key={r.reason} className="border border-[#eef2f7] rounded-xl p-2.5 bg-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: REASON_COLORS[i % REASON_COLORS.length] }} />
                  <span className="truncate">{r.reason.length > 8 ? `${r.reason.slice(0, 7)}.` : r.reason}</span>
                </div>
                <p className="text-[13px] font-medium text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {r.count >= 1000 ? `${(r.count/1000).toFixed(1)}K` : r.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-medium text-[#212b36] flex items-center gap-2">
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500 normal-case tracking-normal">
            {count} pending
          </span>
        )}
      </h2>
    </div>
  );
}

const TASK_TYPE_ICON: Record<TaskType, ReactElement> = {
  doctor_approval: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  pharmacy_approval: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-9 9-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7h18M5 7l1.5 12.5A2 2 0 008.5 21h7a2 2 0 002-1.5L19 7" />
    </svg>
  ),
  support_ticket: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  slot_change: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    const { tasks: t, counts, error } = await fetchTasks();
    setTasks(t);
    setTaskCounts(counts);
    if (error) setFetchError(error);
    setLoadingTasks(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Each section has its own range — matches the per-card "This Week" dropdown pattern
  const [bookingRange, setBookingRange] = useState<Range>("week");
  const [doctorRange, setDoctorRange] = useState<Range>("week");
  const [patientRange, setPatientRange] = useState<Range>("week");

  const [bookingStats, setBookingStats] = useState<DashboardStats | null>(null);
  const [doctorStats, setDoctorStats] = useState<DashboardStats | null>(null);
  const [patientStats, setPatientStats] = useState<DashboardStats | null>(null);

  const [loadingBooking, setLoadingBooking] = useState(true);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingPatient, setLoadingPatient] = useState(true);

  const toggleDropdown = (cardTitle: string) => {
    setActiveDropdown(activeDropdown === cardTitle ? null : cardTitle);
  };

  const loadBooking = useCallback(async (r: Range) => {
    setLoadingBooking(true);
    const { data, error } = await fetchStats(r);
    setBookingStats(data);
    if (error) setFetchError(error);
    setLoadingBooking(false);
  }, []);

  const loadDoctor = useCallback(async (r: Range) => {
    setLoadingDoctor(true);
    const { data, error } = await fetchStats(r);
    setDoctorStats(data);
    if (error) setFetchError(error);
    setLoadingDoctor(false);
  }, []);

  const loadPatient = useCallback(async (r: Range) => {
    setLoadingPatient(true);
    const { data, error } = await fetchStats(r);
    setPatientStats(data);
    if (error) setFetchError(error);
    setLoadingPatient(false);
  }, []);

  useEffect(() => { loadBooking(bookingRange); }, [bookingRange, loadBooking]);
  useEffect(() => { loadDoctor(doctorRange); }, [doctorRange, loadDoctor]);
  useEffect(() => { loadPatient(patientRange); }, [patientRange, loadPatient]);

  useEffect(() => {
    async function loadName() {
      try {
        const accessToken = await Session.getAccessToken();
        if (!accessToken) return;
        const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.ok) {
          const data = await res.json();
          setAdminName(data.profile?.name ?? null);
        }
      } catch {
        // greeting falls back to "Wellness Admin!"
      }
    }
    loadName();
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-[1400px] mx-auto space-y-8 pb-12 px-2">

        {fetchError && (
          <div className="px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-[13px] font-medium text-red-600">
            Failed to load dashboard data: {fetchError}
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#6c7278] mb-1">Good Morning!</p>
            <h1 className="text-[28px] font-medium text-[#212b36]">
              {adminName ? `${adminName}!` : "Wellness Admin!"}
            </h1>
          </div>
          <button
            id="generate-report-btn"
            className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white px-6 py-2.5 rounded-xl text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-95"
          >
            Generate Report
          </button>
        </div>

        {/* ── Appointment Bookings Section ───────────────────────────── */}
        <div>
          <SectionHeader title="Appointment bookings" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <BarStatCard
              title="Appointments Booked"
              data={bookingStats?.appointmentsBooked.data ?? []}
              labels={bookingStats?.labels ?? []}
              color="#8b5cf6"
              totalLabel={bookingStats?.appointmentsBooked.totalLabel ?? "0"}
              change={bookingStats?.appointmentsBooked.change ?? { value: 0, positive: true }}
              hasData={bookingStats?.appointmentsBooked.hasData ?? false}
              loading={loadingBooking}
              range={bookingRange}
              onChangeRange={setBookingRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Appointments Booked")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Appointment Booking Trends"
              value={bookingStats?.bookingTrends.value ?? 0}
              change={bookingStats?.bookingTrends.change ?? { value: 0, positive: true }}
              data={bookingStats?.bookingTrends.data ?? []}
              labels={bookingStats?.labels ?? []}
              color="#3b82f6"
              hasData={bookingStats?.bookingTrends.hasData ?? false}
              loading={loadingBooking}
              range={bookingRange}
              onChangeRange={setBookingRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Appointment Booking Trends")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <ConsultCard
              cancellation={bookingStats?.cancellation ?? null}
              hasData={bookingStats?.cancellation.hasData ?? false}
              loading={loadingBooking}
              range={bookingRange}
              onChangeRange={setBookingRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Appointment Cancellation and Rescheduling")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
          </div>
        </div>

        {/* ── Doctor Activity Section ────────────────────────────────── */}
        <div>
          <SectionHeader title="Doctor Activity" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <BarStatCard
              title="Number of Consultations"
              data={doctorStats?.consultations.data ?? []}
              labels={doctorStats?.labels ?? []}
              color="#10B981"
              totalLabel={doctorStats?.consultations.totalLabel ?? "0"}
              change={doctorStats?.consultations.change ?? { value: 0, positive: true }}
              hasData={doctorStats?.consultations.hasData ?? false}
              loading={loadingDoctor}
              range={doctorRange}
              onChangeRange={setDoctorRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Number of Consultations")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Patient Satisfaction Ratings"
              value={doctorStats?.doctorSatisfaction.value ?? 0}
              change={doctorStats?.doctorSatisfaction.change ?? { value: 0, positive: true }}
              data={doctorStats?.doctorSatisfaction.data ?? []}
              labels={doctorStats?.labels ?? []}
              color="#f59e0b"
              hasData={doctorStats?.doctorSatisfaction.hasData ?? false}
              loading={loadingDoctor}
              range={doctorRange}
              onChangeRange={setDoctorRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Doctor Patient Satisfaction Ratings")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <BarStatCard
              title="Number of Prescriptions Issued"
              data={doctorStats?.prescriptions.data ?? []}
              labels={doctorStats?.labels ?? []}
              color="#ec4899"
              totalLabel={doctorStats?.prescriptions.totalLabel ?? "0"}
              change={doctorStats?.prescriptions.change ?? { value: 0, positive: true }}
              hasData={doctorStats?.prescriptions.hasData ?? false}
              loading={loadingDoctor}
              range={doctorRange}
              onChangeRange={setDoctorRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Number of Prescriptions Issued")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
          </div>
        </div>

        {/* ── Patient Activity Section ───────────────────────────────── */}
        <div>
          <SectionHeader title="Patient Activity" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <LineStatCard
              title="Number of Appointments"
              value={patientStats?.patientAppointments.value ?? 0}
              change={patientStats?.patientAppointments.change ?? { value: 0, positive: true }}
              data={patientStats?.patientAppointments.data ?? []}
              labels={patientStats?.labels ?? []}
              color="#10B981"
              hasData={patientStats?.patientAppointments.hasData ?? false}
              loading={loadingPatient}
              range={patientRange}
              onChangeRange={setPatientRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Number of Appointments")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <PrimaryReasonsCard
              primaryReasons={patientStats?.primaryReasons ?? null}
              hasData={patientStats?.primaryReasons.hasData ?? false}
              loading={loadingPatient}
              range={patientRange}
              onChangeRange={setPatientRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Primary Appointment Reasons")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Patient Satisfaction Ratings"
              value={patientStats?.patientSatisfaction.value ?? 0}
              change={patientStats?.patientSatisfaction.change ?? { value: 0, positive: true }}
              data={patientStats?.patientSatisfaction.data ?? []}
              labels={patientStats?.labels ?? []}
              color="#f59e0b"
              hasData={patientStats?.patientSatisfaction.hasData ?? false}
              loading={loadingPatient}
              range={patientRange}
              onChangeRange={setPatientRange}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Patient Satisfaction Ratings 2")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
          </div>
        </div>

        {/* ── Tasks Section ──────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Tasks" count={taskCounts?.total} />
          <div className="bg-white rounded-3xl shadow-sm border border-[#eef2f7] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_3fr_2fr_auto] gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              <span>Task</span>
              <span>Summary</span>
              <span>Time</span>
              <span className="text-right pr-6">Action</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {loadingTasks ? (
                <div className="px-8 py-10 text-center text-sm text-slate-400 font-medium">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="px-8 py-10 text-center text-sm text-slate-400 font-medium">
                  No pending tasks — you're all caught up.
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(task.link)}
                    className="grid grid-cols-[2fr_3fr_2fr_auto] gap-4 px-8 py-4 items-center hover:bg-slate-50/40 transition-colors cursor-pointer"
                  >
                    {/* Task Name & Email */}
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-[#4F83FD]/10 text-[#4F83FD] flex items-center justify-center shrink-0 shadow-sm">
                        {TASK_TYPE_ICON[task.type]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                        {task.email && <p className="text-xs text-slate-400 truncate">{task.email}</p>}
                      </div>
                    </div>

                    {/* Summary & Badge */}
                    <div className="flex items-center gap-3">
                      {task.priority && (
                        <span className="text-[9px] font-medium px-2 py-0.5 rounded bg-red-100 text-red-600 uppercase tracking-wider shrink-0">
                          {task.priority}
                        </span>
                      )}
                      <p className="text-sm text-slate-600 truncate">{task.summary}</p>
                    </div>

                    {/* Time */}
                    <p className="text-xs text-slate-400 font-medium">{formatTaskTime(task.createdAt)}</p>

                    {/* Action */}
                    <div className="flex items-center gap-3 pr-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(task.link); }}
                        className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white px-5 py-2 rounded-xl text-[12px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-95 duration-150"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
