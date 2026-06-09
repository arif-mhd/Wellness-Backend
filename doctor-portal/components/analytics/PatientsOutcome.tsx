"use client";

import React, { useState } from "react";

export default function PatientsOutcome() {
  const [activeSegment, setActiveSegment] = useState<"new" | "established" | "chronic">("new");

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
          <div className="flex flex-col xl:items-end justify-center select-none">
            <span className="text-[#24292E] text-sm font-semibold tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patients Outcome / Satisfaction
            </span>
            <span className="text-[#838B95] text-xs font-normal mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Based on clinical data{" "}
              <span className="text-[#5476FC] font-semibold cursor-pointer hover:underline">
                (From rating and reviews)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Grid Container ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Growth Bar Chart Card */}
        <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Growth
            </span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Bar Chart using Flexbox for high resolution/type safety */}
          <div className="flex items-end justify-between w-full h-[180px] px-2 mt-4 select-none relative">
            {[
              { day: "M", val: "120K", pct: 90 },
              { day: "T", val: "80K", pct: 60 },
              { day: "W", val: "70K", pct: 53 },
              { day: "T", val: "50K", pct: 38 },
              { day: "F", val: "50K", pct: 38 },
              { day: "S", val: "50K", pct: 38 },
              { day: "S", val: "50K", pct: 38 },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 w-[10%]">
                {/* Floating label inside or above the bar */}
                <span className="text-[9px] text-[#24292E] font-bold tracking-tight">
                  {bar.val}
                </span>

                {/* Vertical Bar with custom gradient */}
                <div
                  className="w-full bg-gradient-to-t from-[#FAD281] to-[#F8B34B] rounded-lg transition-all duration-300 hover:scale-x-105 shadow-xs"
                  style={{ height: `${bar.pct * 1.2}px` }}
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
        <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patients
            </span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* SVG Area Chart Container */}
          <div className="relative w-full h-[180px] mt-4 flex items-end">
            <svg className="w-full h-full" viewBox="0 0 350 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="patientsBlueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5476FC" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5476FC" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="105" x2="350" y2="105" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="70" x2="350" y2="70" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="35" x2="350" y2="35" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />

              {/* Area path */}
              <path
                d="M 0 115 C 35 115, 35 85, 70 85 C 105 85, 105 40, 140 40 C 175 40, 175 110, 210 110 C 245 110, 245 60, 280 60 C 315 60, 315 15, 350 15 L 350 140 L 0 140 Z"
                fill="url(#patientsBlueGradient)"
              />

              {/* Line path */}
              <path
                d="M 0 115 C 35 115, 35 85, 70 85 C 105 85, 105 40, 140 40 C 175 40, 175 110, 210 110 C 245 110, 245 60, 280 60 C 315 60, 315 15, 350 15"
                fill="none"
                stroke="#5476FC"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Highlight dot on October 4 (x=140, y=40) */}
              <circle cx="140" cy="40" r="5" fill="#5476FC" />
              <circle cx="140" cy="40" r="10" fill="#5476FC" fillOpacity="0.15" />
            </svg>

            {/* Interactive Tooltip matching mockup */}
            <div className="absolute top-[12px] left-[105px] bg-[#24292E] text-white px-3 py-1.5 rounded-lg flex flex-col gap-0.5 items-center justify-center shadow-lg pointer-events-none z-10">
              <span className="text-[8px] text-gray-400 font-medium tracking-wide uppercase">Oct 4 00:00</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold">50</span>
                <span className="px-1 py-0.2 rounded bg-[#10B981]/25 text-[#10B981] text-[9px] font-bold">+3.4%</span>
              </div>
            </div>
          </div>

          {/* Weekday X-Axis Labels */}
          <div className="flex justify-between items-center text-[10px] text-[#838B95] px-1 select-none font-medium">
            <span>Oct 01</span>
            <span>Oct 02</span>
            <span>Oct 03</span>
            <span>Oct 04</span>
            <span>Oct 05</span>
            <span>Oct 06</span>
            <span>Oct 07</span>
            <span>Oct 08</span>
          </div>
        </div>
      </div>
    </div>
  );
}
