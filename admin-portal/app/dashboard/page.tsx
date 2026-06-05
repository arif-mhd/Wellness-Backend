"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

// ─── Interactive Mini Bar Chart with Hover Tooltip ────────────────────────────
function MiniBarChart({ data, color = "#FFC107" }: { data: number[]; color?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="relative flex items-end gap-1.5 h-16 pt-4">
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute -top-6 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition-all duration-200 z-10"
          style={{
            left: `${(hoveredIdx / (data.length - 1)) * 75 + 10}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="whitespace-nowrap text-[8px] opacity-75 text-center">Oct 4 00:00</div>
          <div className="font-bold text-center">{data[hoveredIdx]} (+3.4%)</div>
        </div>
      )}

      {data.map((v, i) => {
        const isHovered = hoveredIdx === i;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1 cursor-pointer group"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              className="w-full rounded-sm transition-all duration-300 relative overflow-hidden"
              style={{
                height: `${(v / max) * 44}px`,
                background: isHovered
                  ? `linear-gradient(to top, ${color}cc, ${color})`
                  : `linear-gradient(to top, ${color}99, ${color}cc)`,
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[9px] font-semibold text-slate-400 group-hover:text-slate-700 transition-colors">
              {days[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Interactive Mini Line Chart with Hover Tooltip ───────────────────────────
function MiniLineChart({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 200;
  const H = 60;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 12) - 6;
    return { x, y, val: v };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaD = `M 0,${H} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${W},${H} Z`;
  const gradId = `grad-${color.replace("#", "")}`;

  return (
    <div className="relative pt-4">
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute -top-6 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none transition-all duration-200 z-10"
          style={{
            left: `${(hoveredIdx / (data.length - 1)) * 75 + 10}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="whitespace-nowrap text-[8px] opacity-75 text-center">Oct 4 00:00</div>
          <div className="font-bold text-center">{data[hoveredIdx]} (+3.4%)</div>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {hoveredIdx !== null && (
          <circle
            cx={points[hoveredIdx].x}
            cy={points[hoveredIdx].y}
            r="3.5"
            fill={color}
            stroke="white"
            strokeWidth="1.2"
          />
        )}

        {points.map((p, i) => (
          <rect
            key={i}
            x={i === 0 ? 0 : p.x - W / (data.length - 1) / 2}
            y={0}
            width={W / (data.length - 1)}
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

// ─── Segmented Progress Bar Component ──────────────────────────────────────────
function SegmentedProgressBar({ percentage, color = "#3b82f6", blocksCount = 20 }: { percentage: number; color?: string; blocksCount?: number }) {
  const activeBlocks = Math.round((percentage / 100) * blocksCount);
  return (
    <div className="flex gap-[3px] w-full mt-1.5 select-none">
      {Array.from({ length: blocksCount }).map((_, i) => {
        const isActive = i < activeBlocks;
        return (
          <div
            key={i}
            className="h-[6px] rounded-[1.5px] flex-1 transition-all duration-300"
            style={{
              backgroundColor: isActive ? color : "#ecf0f6",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Interactive Card Header ──────────────────────────────────────────────────
function CardHeader({
  title,
  week = "This Week",
  onToggleDropdown,
  showDropdown,
  onCloseDropdown,
}: {
  title: string;
  week?: string;
  onToggleDropdown: () => void;
  showDropdown: boolean;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="flex items-center justify-between relative">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleDropdown}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-slate-100 bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition-colors active:scale-95"
        >
          {week}
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={onToggleDropdown}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={onCloseDropdown} />
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-36 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  onCloseDropdown();
                  alert(`Downloading Report for: ${title}`);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Download Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card (Bar) ─────────────────────────────────────────────────────────
function BarStatCard({
  title,
  data,
  color,
  badge,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  title: string;
  data: number[];
  color?: string;
  badge?: { value: string; change: string; positive: boolean };
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col justify-between h-[190px]">
      <CardHeader
        title={title}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />
      {badge && (
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-slate-800">{badge.value}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-green-600 bg-green-50">
            {badge.change}
          </span>
        </div>
      )}
      <MiniBarChart data={data} color={color} />
    </div>
  );
}

// ─── Stat Card (Line) ────────────────────────────────────────────────────────
function LineStatCard({
  title,
  value,
  change,
  positive,
  data,
  color,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  data: number[];
  color?: string;
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col justify-between h-[190px]">
      <CardHeader
        title={title}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-black text-slate-800">{value}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${positive ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
          {change}
        </span>
      </div>
      <MiniLineChart data={data} color={color} />
    </div>
  );
}

// ─── Consult & Rescheduling Card (Cancellation Card) ─────────────────────────
function ConsultCard({
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  const title = "Appointment Cancellation and Rescheduling";
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col justify-between h-[190px]">
      <CardHeader
        title={title}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-black text-slate-800">6,4K</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-green-600 bg-green-50">+3.4%</span>
      </div>

      <div className="space-y-2 mt-1.5">
        <SegmentedProgressBar percentage={55} color="#818cf8" />
        <SegmentedProgressBar percentage={75} color="#34d399" />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-50">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
            Total Booking
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold text-slate-800">1,1K</span>
            <span className="text-[8px] font-bold text-green-500 bg-green-50 px-1 py-0.2 rounded">+3.4%</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            Cancellations
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold text-slate-800">2,3K</span>
            <span className="text-[8px] font-bold text-green-500 bg-green-50 px-1 py-0.2 rounded">+11.4%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Primary Appointment Reasons Card ─────────────────────────────────────────
function PrimaryReasonsCard({
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
}: {
  activeDropdown: string | null;
  onToggleDropdown: () => void;
  onCloseDropdown: () => void;
}) {
  const title = "Primary Appointment Reasons";
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#eef2f7] hover:shadow-md transition-shadow flex flex-col justify-between h-[190px]">
      <CardHeader
        title={title}
        showDropdown={activeDropdown === title}
        onToggleDropdown={onToggleDropdown}
        onCloseDropdown={onCloseDropdown}
      />

      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-black text-slate-800">6,4K</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-green-600 bg-green-50">+3.4%</span>
      </div>

      <div className="space-y-1.5 mt-1.5">
        <SegmentedProgressBar percentage={55} color="#3b82f6" />
        <SegmentedProgressBar percentage={45} color="#14b8a6" />
        <SegmentedProgressBar percentage={35} color="#f59e0b" />
        <SegmentedProgressBar percentage={70} color="#a855f7" />
      </div>

      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-50">
        <div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] shrink-0" />
            Fever
          </div>
          <p className="text-[10px] font-black text-slate-700 mt-0.5">1,1K</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] shrink-0" />
            Cough
          </div>
          <p className="text-[10px] font-black text-slate-700 mt-0.5">1,1K</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
            Asthma
          </div>
          <p className="text-[10px] font-black text-slate-700 mt-0.5">1,1K</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] shrink-0" />
            Head..
          </div>
          <p className="text-[10px] font-black text-slate-700 mt-0.5">2,3K</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h2>
      <button className="text-slate-300 hover:text-slate-500 transition active:scale-90" aria-label={`View details for ${title}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Task Data ───────────────────────────────────────────────────────────────
const tasks = [
  { id: 1, name: "Task 1", email: "yelene@example.com", summary: "Message from Phon…", time: "21 Sep, 2020, 11:40 PM", status: "High Priority" },
  { id: 2, name: "Task 2", email: "yelene@example.com", summary: "Complete EMR Check L&B Report", time: "1 Feb, 2020, 11:40 PM", status: null },
  { id: 3, name: "Task 2", email: "yelene@example.com", summary: "Complete EMR Check L&B Report", time: "1 Feb, 2020, 11:40 PM", status: null },
  { id: 4, name: "Task 2", email: "yelene@example.com", summary: "Complete EMR Check L&B Report", time: "1 Feb, 2020, 11:40 PM", status: null },
];

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [adminName, setAdminName] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (cardTitle: string) => {
    setActiveDropdown(activeDropdown === cardTitle ? null : cardTitle);
  };

  useEffect(() => {
    async function loadName() {
      try {
        const accessToken = await Session.getAccessToken();
        if (!accessToken) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/me`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
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
      <div className="w-full space-y-8 pb-12">
        
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Good Morning!</p>
            <h1 className="text-3xl font-black text-slate-800">
              {adminName ? `${adminName}!` : "Wellness Admin!"}
            </h1>
          </div>
          <button
            id="generate-report-btn"
            className="bg-[#4F83FD] hover:bg-[#3d70e6] hover:shadow-lg hover:shadow-blue-200/50 hover:-translate-y-0.5 active:translate-y-0 text-white text-xs font-bold px-6 py-3 rounded-full transition-all duration-200 shadow-md shadow-blue-100"
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
              data={[30, 45, 60, 40, 80, 55, 35]}
              color="#fbbf24"
              badge={{ value: "1.1K", change: "+3.4%", positive: true }}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Appointments Booked")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Appointment Booking Trends"
              value="50"
              change="+3.4%"
              positive
              data={[20, 40, 35, 60, 45, 70, 50, 80, 65]}
              color="#3b82f6"
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Appointment Booking Trends")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <ConsultCard
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
              data={[50, 70, 45, 90, 65, 40, 55]}
              color="#fbbf24"
              badge={{ value: "1.1K", change: "+3.4%", positive: true }}
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Number of Consultations")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Patient Satisfaction Ratings"
              value="50"
              change="+3.4%"
              positive
              data={[55, 40, 65, 50, 70, 45, 80, 60, 75]}
              color="#3b82f6"
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Patient Satisfaction Ratings")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <BarStatCard
              title="Number of Prescriptions Issued"
              data={[60, 45, 80, 55, 70, 40, 65]}
              color="#fbbf24"
              badge={{ value: "1.1K", change: "+3.4%", positive: true }}
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
              value="50"
              change="+3.4%"
              positive
              data={[40, 65, 50, 75, 55, 80, 60]}
              color="#3b82f6"
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Number of Appointments")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <PrimaryReasonsCard
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Primary Appointment Reasons")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
            <LineStatCard
              title="Patient Satisfaction Ratings"
              value="50"
              change="+5.4%"
              positive
              data={[50, 35, 65, 45, 70, 40, 75, 55, 80]}
              color="#3b82f6"
              activeDropdown={activeDropdown}
              onToggleDropdown={() => toggleDropdown("Patient Satisfaction Ratings 2")}
              onCloseDropdown={() => setActiveDropdown(null)}
            />
          </div>
        </div>

        {/* ── Tasks Section ──────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Tasks" />
          <div className="bg-white rounded-3xl shadow-sm border border-[#eef2f7] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_3fr_2fr_auto] gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Task</span>
              <span>Summary</span>
              <span>Time</span>
              <span className="text-right pr-6">Action</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[2fr_3fr_2fr_auto] gap-4 px-8 py-4 items-center hover:bg-slate-50/40 transition-colors"
                >
                  {/* Task Name & Email */}
                  <div className="flex items-center gap-4">
                    {/* Blue check icon indicator */}
                    <div className="w-7 h-7 rounded-full bg-[#4F83FD]/10 text-[#4F83FD] flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{task.name}</p>
                      <p className="text-xs text-slate-400 truncate">{task.email}</p>
                    </div>
                  </div>

                  {/* Summary & Badge */}
                  <div className="flex items-center gap-3">
                    {task.status && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 uppercase tracking-wider">
                        {task.status}
                      </span>
                    )}
                    <p className="text-sm text-slate-600 truncate">{task.summary}</p>
                  </div>

                  {/* Time */}
                  <p className="text-xs text-slate-400 font-medium">{task.time}</p>

                  {/* Complete Task button */}
                  <div className="flex items-center gap-3 pr-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition active:scale-90" aria-label="Details">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => alert(`Completed task: ${task.name}`)}
                      className={`text-xs font-bold px-5 py-2.5 rounded-full transition-all active:scale-95 duration-150 ${
                        idx === 0
                          ? "bg-[#4F83FD] hover:bg-[#3d70e6] text-white shadow-sm shadow-blue-100 hover:shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Complete Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
