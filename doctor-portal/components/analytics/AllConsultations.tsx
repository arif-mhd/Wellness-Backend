"use client";

import React, { useState, useMemo } from "react";

interface RecentConsultation {
  id: string;
  name: string;
  age: number;
  email: string;
  avatar: string;
  disease: string;
  date: string;
}

interface AllConsultationsProps {
  appointments: any[];
}

function formatRecentDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "N/A";
  }
}

export default function AllConsultations({ appointments = [] }: AllConsultationsProps) {
  const [activeFilter, setActiveFilter] = useState<"total" | "new" | "followups">("total");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 1. Identify completed consultations
  const completedAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === "completed" || a.status === "Completed"
    ).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()); // sort chronological for first-visit calculation
  }, [appointments]);

  // Determine which completed appointments are "New" (1st consultation for patient) vs "Follow up" (subsequent)
  const categorizedAppointments = useMemo(() => {
    const patientFirstVisitMap = new Map<string, string>(); // patientId -> appointmentId of first completed visit
    const list: Array<{ apt: any; category: "new" | "followups" }> = [];

    completedAppointments.forEach((apt) => {
      const pId = apt.patientId;
      if (!pId) return;

      if (!patientFirstVisitMap.has(pId)) {
        patientFirstVisitMap.set(pId, apt.id);
        list.push({ apt, category: "new" });
      } else {
        list.push({ apt, category: "followups" });
      }
    });

    return list;
  }, [completedAppointments]);

  // Filter completed consultations based on current tab selection
  const filteredAppointments = useMemo(() => {
    if (activeFilter === "total") {
      return completedAppointments;
    }
    return categorizedAppointments
      .filter((item) => item.category === activeFilter)
      .map((item) => item.apt);
  }, [activeFilter, completedAppointments, categorizedAppointments]);

  // 2. Generate dynamic Area Chart points for the last 8 days (relative to current time)
  const chartData = useMemo(() => {
    // Generate dates for the last 8 days
    const dates: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    // Group active filtered appointments by date
    const counts = dates.map((date) => {
      const dateStr = date.toISOString().slice(0, 10);
      const count = filteredAppointments.filter(
        (a) => a.scheduledAt?.slice(0, 10) === dateStr
      ).length;
      return {
        label: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        dateStr,
        count,
      };
    });

    // Compute SVG coordinates (width 350, height 140)
    // Map to y-axis: 120 (bottom) to 20 (top). Max value at least 5.
    const maxVal = Math.max(5, ...counts.map((c) => c.count));
    const points = counts.map((item, idx) => {
      const x = (idx / 7) * 350;
      const y = 120 - (item.count / maxVal) * 100;
      return { x, y, count: item.count, label: item.label };
    });

    // Generate SVG path string
    let pathD = "";
    let areaD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      areaD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
        areaD += ` L ${points[i].x} ${points[i].y}`;
      }
      areaD += ` L 350 140 L 0 140 Z`;
    }

    // Identify highlighted point (e.g. peak value, or last element if multiple/zero)
    let peakIndex = 7;
    let maxCount = -1;
    points.forEach((pt, idx) => {
      if (pt.count > maxCount) {
        maxCount = pt.count;
        peakIndex = idx;
      }
    });
    const highlightPoint = points[peakIndex];

    return {
      points,
      pathD,
      areaD,
      highlightPoint,
      labels: counts.map((c) => c.label),
    };
  }, [filteredAppointments]);

  // 3. Recent consultations: last 3 completed consultations sorted by date DESC
  const recentConsultations: RecentConsultation[] = useMemo(() => {
    // Sort completedAppointments DESC
    const sorted = [...completedAppointments].sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );

    return sorted.slice(0, 3).map((a) => {
      const dob = a.patientDob || "";
      let age = 0;
      if (dob) {
        const birthYear = new Date(dob).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      return {
        id: a.id,
        name: a.patientName ?? "Unknown Patient",
        age,
        email: a.patientEmail ?? "",
        avatar: a.patientAvatarUrl || "/patient-avatar-1.png",
        disease: a.reason ?? "Consultation",
        date: formatRecentDate(a.scheduledAt),
      };
    });
  }, [completedAppointments]);

  const activePoint = hoveredIdx !== null ? chartData.points[hoveredIdx] : chartData.highlightPoint;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Section Title & Filter Header ───────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Title */}
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px] select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
          All Consultations
        </h2>

        {/* Filter Bar Below Heading */}
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          {/* Separate Rounded Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFilter("total")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeFilter === "total"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Total
            </button>
            <button
              onClick={() => setActiveFilter("new")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeFilter === "new"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              New Consultations
            </button>
            <button
              onClick={() => setActiveFilter("followups")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeFilter === "followups"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Follow ups
            </button>
          </div>

          {/* Today Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-[#EBEEF5] select-none text-xs">
            <span className="text-[#676E76] font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Live Data Feed</span>
          </div>
        </div>
      </div>

      {/* ── Grid Container ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Total Consultation Area Chart Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Total Consultation
            </span>
            <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              Last 8 Days
            </span>
          </div>

          {/* SVG Area Chart Container */}
          <div className="relative w-full h-[180px] mt-4 flex items-end">
            {chartData.pathD ? (
              <svg className="w-full h-full" viewBox="0 0 350 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="120" x2="350" y2="120" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="70" x2="350" y2="70" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="20" x2="350" y2="20" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />

                {/* Area path */}
                <path d={chartData.areaD} fill="url(#chartGradient)" />

                {/* Line path */}
                <path
                  d={chartData.pathD}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Highlight dot */}
                {activePoint && (
                  <>
                    <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#10B981" className="transition-all duration-150" />
                    <circle cx={activePoint.x} cy={activePoint.y} r="10" fill="#10B981" fillOpacity="0.15" className="transition-all duration-150" />
                  </>
                )}

                {/* Invisible hover overlay zones */}
                {chartData.points.map((pt, idx) => {
                  const width = idx === 0 || idx === 7 ? 25 : 50;
                  const x = idx === 0 ? 0 : idx * 50 - 25;
                  return (
                    <rect
                      key={idx}
                      x={x}
                      y={0}
                      width={width}
                      height={140}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="text-center text-xs text-gray-400 w-full mb-8">No consultation trend data.</div>
            )}

            {/* Interactive Tooltip matching mockup */}
            {activePoint && (
              <div
                className="absolute bg-[#24292E] text-white px-2.5 py-1 rounded-lg flex flex-col gap-0.5 items-center justify-center shadow-lg pointer-events-none z-10 transition-all duration-150"
                style={{
                  top: `${Math.max(0, activePoint.y - 45)}px`,
                  left: `${Math.max(10, Math.min(300, activePoint.x - 45))}px`,
                }}
              >
                <span className="text-[8px] text-gray-400 font-medium tracking-wide uppercase">
                  {activePoint.label}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold">{activePoint.count}</span>
                  <span className="text-[9px] text-gray-300 font-light">visits</span>
                </div>
              </div>
            )}
          </div>

          {/* Weekday X-Axis Labels */}
          <div className="flex justify-between items-center text-[10px] text-[#838B95] px-1 select-none font-medium">
            {chartData.labels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Consultations List Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Recent Consultations
            </span>
            <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              Completed Visits
            </span>
          </div>

          {/* Consultation List */}
          <div className="flex flex-col gap-3.5 mt-2 max-h-[220px] overflow-y-auto pr-1">
            {recentConsultations.length === 0 ? (
              <div className="text-center text-xs text-[#838B95] py-12">
                No recent consultations.
              </div>
            ) : (
              recentConsultations.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
                  {/* Left side: Avatar & Name details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-slate-100">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/patient-avatar-1.png";
                        }}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[#24292E] text-xs font-semibold leading-tight truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {item.name}{item.age > 0 ? `, ${item.age} y/o` : ""}
                      </span>
                      <span className="text-[#838B95] text-[10px] font-normal mt-0.5 truncate" style={{ fontFamily: "Inter, sans-serif" }}>
                        {item.email}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Diagnosis Tag & Date info */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    {/* Disease Capsule Tag */}
                    <span className="px-2.5 py-1 rounded-full bg-[#E2EAFE] text-[#213159] text-[10.5px] font-normal tracking-wide max-w-[100px] truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {item.disease}
                    </span>

                    {/* Date text */}
                    <span className="text-[#838B95] text-[11px] font-medium min-w-[70px] text-right" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {item.date}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
