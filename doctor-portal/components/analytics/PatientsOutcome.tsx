"use client";

import React, { useState, useMemo } from "react";

interface PatientsOutcomeProps {
  appointments: any[];
  feedback: any[];
}

export default function PatientsOutcome({ appointments = [], feedback = [] }: PatientsOutcomeProps) {
  const [activeSegment, setActiveSegment] = useState<"new" | "established" | "chronic">("new");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 1. Identify completed appointments and sort them chronologically
  const completedAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.status === "completed" || a.status === "Completed")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  // 2. Classify completed appointments by patient segment
  const segmentedAppointments = useMemo(() => {
    const patientFirstVisitMap = new Map<string, string>(); // patientId -> appointmentId
    const patientVisitCountMap = new Map<string, number>();

    // Pass 1: count total completed visits per patient
    completedAppointments.forEach((apt) => {
      const pId = apt.patientId;
      if (!pId) return;
      patientVisitCountMap.set(pId, (patientVisitCountMap.get(pId) || 0) + 1);
    });

    // Pass 2: mark first visit and build classified lists
    const newApts: any[] = [];
    const establishedApts: any[] = [];
    const chronicApts: any[] = [];

    completedAppointments.forEach((apt) => {
      const pId = apt.patientId;
      if (!pId) return;

      // Check if chronic illnesses exist
      const hasChronic =
        apt.patientChronicIllnesses &&
        apt.patientChronicIllnesses !== "None" &&
        apt.patientChronicIllnesses !== "None reported";

      if (hasChronic) {
        chronicApts.push(apt);
      }

      if (!patientFirstVisitMap.has(pId)) {
        patientFirstVisitMap.set(pId, apt.id);
        newApts.push(apt);
      } else {
        establishedApts.push(apt);
      }
    });

    return {
      new: newApts,
      established: establishedApts,
      chronic: chronicApts,
    };
  }, [completedAppointments]);

  // Appointments for the active segment
  const activeSegmentApts = useMemo(() => {
    return segmentedAppointments[activeSegment];
  }, [segmentedAppointments, activeSegment]);

  // 3. Compute Growth Bar Chart for the current week (Monday to Sunday)
  const growthBarData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    
    // Find the start of the current week (Monday)
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const counts = days.map((day, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const count = activeSegmentApts.filter(
        (a) => a.scheduledAt?.slice(0, 10) === dateStr
      ).length;

      return { day, count };
    });

    const maxVal = Math.max(5, ...counts.map((c) => c.count));

    return counts.map((item) => {
      const pct = (item.count / maxVal) * 80; // Scale to fit nicely in 180px container
      return {
        day: item.day,
        val: item.count > 0 ? String(item.count) : "0",
        pct: pct || 2, // minimum height so a thin line shows
      };
    });
  }, [activeSegmentApts]);

  // 4. Compute Patients Area Chart for the last 8 days
  const patientsAreaData = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    const counts = dates.map((date) => {
      const dateStr = date.toISOString().slice(0, 10);
      const count = activeSegmentApts.filter(
        (a) => a.scheduledAt?.slice(0, 10) === dateStr
      ).length;
      return {
        label: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        count,
      };
    });

    const maxVal = Math.max(5, ...counts.map((c) => c.count));
    const points = counts.map((item, idx) => {
      const x = (idx / 7) * 350;
      const y = 120 - (item.count / maxVal) * 100;
      return { x, y, count: item.count, label: item.label };
    });

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

    // Peak highlighter
    let peakIndex = 7;
    let maxCount = -1;
    points.forEach((pt, idx) => {
      if (pt.count > maxCount) {
        maxCount = pt.count;
        peakIndex = idx;
      }
    });

    return {
      points,
      pathD,
      areaD,
      highlightPoint: points[peakIndex],
      labels: counts.map((c) => c.label),
    };
  }, [activeSegmentApts]);

  const activePoint = hoveredIdx !== null ? patientsAreaData.points[hoveredIdx] : patientsAreaData.highlightPoint;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Filter & OutCome Indicator ────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Left: Section label */}
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px] select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
          Patients
        </h2>

        {/* Filter Bar Below Heading */}
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          {/* Separate Rounded Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSegment("new")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeSegment === "new"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              New
            </button>
            <button
              onClick={() => setActiveSegment("established")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeSegment === "established"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Established
            </button>
            <button
              onClick={() => setActiveSegment("chronic")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
                activeSegment === "chronic"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Chronic Patients
            </button>
          </div>

          {/* Right: Outcome indicator */}
          <div className="flex flex-col xl:items-end justify-center select-none text-xs">
            <span className="text-[#24292E] font-semibold tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patients Outcome / Satisfaction
            </span>
            <span className="text-[#838B95] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Computed from live clinic feedback reviews
            </span>
          </div>
        </div>
      </div>

      {/* ── Grid Container ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Growth Bar Chart Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Growth
            </span>
            <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              This Week
            </span>
          </div>

          {/* Bar Chart using Flexbox */}
          <div className="flex items-end justify-between w-full h-[180px] px-2 mt-4 select-none relative">
            {growthBarData.map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 w-[10%]">
                <span className="text-[9px] text-[#24292E] font-bold tracking-tight">
                  {bar.val}
                </span>

                {/* Vertical Bar with custom gradient */}
                <div
                  className="w-full bg-gradient-to-t from-[#FAD281] to-[#F8B34B] rounded-lg transition-all duration-300 hover:scale-x-105 shadow-xs"
                  style={{ height: `${bar.pct}px` }}
                />

                {/* Day label */}
                <span className="text-xs font-semibold text-[#24292E]">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Patients Area Chart Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patients
            </span>
            <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
              Last 8 Days
            </span>
          </div>

          {/* SVG Area Chart Container */}
          <div className="relative w-full h-[180px] mt-4 flex items-end">
            {patientsAreaData.pathD ? (
              <svg className="w-full h-full" viewBox="0 0 350 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="patientsBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5476FC" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#5476FC" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="120" x2="350" y2="120" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="70" x2="350" y2="70" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
                <line x1="0" y1="20" x2="350" y2="20" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />

                {/* Area path */}
                <path d={patientsAreaData.areaD} fill="url(#patientsBlueGradient)" />

                {/* Line path */}
                <path
                  d={patientsAreaData.pathD}
                  fill="none"
                  stroke="#5476FC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Highlight dot */}
                {/* Highlight dot */}
                {activePoint && (
                  <>
                    <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#5476FC" className="transition-all duration-150" />
                    <circle cx={activePoint.x} cy={activePoint.y} r="10" fill="#5476FC" fillOpacity="0.15" className="transition-all duration-150" />
                  </>
                )}

                {/* Invisible hover overlay zones */}
                {patientsAreaData.points.map((pt, idx) => {
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
              <div className="text-center text-xs text-gray-400 w-full mb-8">No patient trends available.</div>
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
                  <span className="text-[9px] text-gray-300 font-light">consulted</span>
                </div>
              </div>
            )}
          </div>

          {/* Weekday X-Axis Labels */}
          <div className="flex justify-between items-center text-[10px] text-[#838B95] px-1 select-none font-medium">
            {patientsAreaData.labels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
