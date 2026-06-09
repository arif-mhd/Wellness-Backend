"use client";

import React, { useState } from "react";

interface RecentConsultation {
  id: number;
  name: string;
  age: number;
  email: string;
  avatar: string;
  disease: string;
  date: string;
}

export default function AllConsultations() {
  const [activeFilter, setActiveFilter] = useState<"total" | "new" | "followups">("total");

  const recentList: RecentConsultation[] = [
    {
      id: 1,
      name: "Albert Flores",
      age: 32,
      email: "yelena@example.com",
      avatar: "/patient-avatar-1.png",
      disease: "Cough",
      date: "17 Oct, 2020",
    },
    {
      id: 2,
      name: "Savannah Nguyen",
      age: 32,
      email: "yelena@example.com",
      avatar: "/patient-avatar-2.png",
      disease: "Asthma",
      date: "22 Oct, 2020",
    },
    {
      id: 3,
      name: "Darlene Robertson",
      age: 32,
      email: "yelena@example.com",
      avatar: "/patient-avatar-1.png",
      disease: "Cough",
      date: "21 Sep, 2020",
    },
  ];

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

            {/* Separate Search Icon Pill */}
            <button className="w-10 h-10 bg-white rounded-full border border-[#EBEEF5] flex items-center justify-center text-[#24292E] hover:bg-gray-50 active:scale-95 transition-all shadow-xs">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>

          {/* Today Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-[#EBEEF5] cursor-pointer hover:bg-gray-50 transition-colors shadow-xs select-none">
            <span className="text-[#676E76] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Today</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="#676E76" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Grid Container ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Total Consultation Area Chart Card */}
        <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Total Consultation
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
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="105" x2="350" y2="105" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="70" x2="350" y2="70" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />
              <line x1="0" y1="35" x2="350" y2="35" stroke="#F1F3F7" strokeWidth="1" strokeDasharray="3" />

              {/* Area path */}
              <path
                d="M 0 110 C 35 110, 35 90, 70 90 C 105 90, 105 35, 140 35 C 175 35, 175 120, 210 120 C 245 120, 245 70, 280 70 C 315 70, 315 20, 350 20 L 350 140 L 0 140 Z"
                fill="url(#chartGradient)"
              />

              {/* Line path */}
              <path
                d="M 0 110 C 35 110, 35 90, 70 90 C 105 90, 105 35, 140 35 C 175 35, 175 120, 210 120 C 245 120, 245 70, 280 70 C 315 70, 315 20, 350 20"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Highlight dot on October 4 (x=140, y=35) */}
              <circle cx="140" cy="35" r="5" fill="#10B981" />
              <circle cx="140" cy="35" r="10" fill="#10B981" fillOpacity="0.15" />
            </svg>

            {/* Interactive Tooltip matching mockup */}
            <div className="absolute top-[8px] left-[105px] bg-[#24292E] text-white px-3 py-1.5 rounded-lg flex flex-col gap-0.5 items-center justify-center shadow-lg pointer-events-none z-10">
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

        {/* Right Column: Recent Consultations List Card */}
        <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#24292E] text-[15px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
              Recent Consultations
            </span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Consultation List */}
          <div className="flex flex-col gap-3.5 mt-2">
            {recentList.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
                {/* Left side: Avatar & Name details */}
                <div className="flex items-center gap-3">
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
                  <div className="flex flex-col">
                    <span className="text-[#24292E] text-xs font-semibold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {item.name}, {item.age} y/o
                    </span>
                    <span className="text-[#838B95] text-[10px] font-normal mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
                      {item.email}
                    </span>
                  </div>
                </div>

                {/* Right side: Diagnosis Tag & Date info */}
                <div className="flex items-center justify-between sm:justify-end gap-5">
                  {/* Disease Capsule Tag */}
                  <span className="px-2.5 py-1 rounded-full bg-[#E2EAFE] text-[#213159] text-[10.5px] font-normal tracking-wide" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.disease}
                  </span>

                  {/* Date text */}
                  <span className="text-[#838B95] text-[11px] font-medium min-w-[70px] text-right" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
