"use client";

import React, { useState } from "react";

interface DiseaseCase {
  name: string;
  cases: number;
}

export default function DiagnosticsStatus() {
  const [activeTab, setActiveTab] = useState<"all" | "diseases" | "diagnose">("all");

  const diseaseCases: DiseaseCase[] = [
    { name: "Hypertension", cases: 150 },
    { name: "Diabetes", cases: 80 },
    { name: "Asthma", cases: 43 },
    { name: "Osteoarthritis", cases: 32 },
    { name: "Migraine", cases: 27 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Title */}
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px] select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
          Diagnostics status
        </h2>

        {/* Filter Bar Below Heading */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "all"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("diseases")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "diseases"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Diseases
          </button>
          <button
            onClick={() => setActiveTab("diagnose")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "diagnose"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Diagnose
          </button>
        </div>
      </div>

      {/* ── Grid Container ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Diagnostics status table card */}
        <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative">
          {/* Table Header */}
          <div className="flex justify-between items-center w-full pb-2 border-b border-[#EBEEF5]">
            <div className="flex items-center gap-10">
              <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider">Disease Name</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider mr-6">Number of Cases</span>
              <div className="flex items-center gap-1 cursor-pointer select-none">
                <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Disease List */}
          <div className="flex flex-col gap-1.5 mt-2">
            {diseaseCases.map((item, idx) => {
              // First item is subtly highlighted like in the mockup image
              const isFirst = idx === 0;
              return (
                <div
                  key={item.name}
                  className={`flex justify-between items-center px-4 py-3.5 rounded-xl transition-all ${
                    isFirst ? "bg-[#F5F6FA]" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[#24292E] text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.name}
                  </span>
                  <span className="text-[#24292E] text-xs font-semibold mr-24" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.cases}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Growth Bar Chart Card */}
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

          {/* Bar Chart using Flexbox for perfect layout */}
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
                <span className="text-[9px] text-[#24292E] font-bold tracking-tight">
                  {bar.val}
                </span>

                {/* Vertical Bar with gold-orange gradient */}
                <div
                  className="w-full bg-gradient-to-t from-[#FAD281] to-[#F8B34B] rounded-lg transition-all duration-300 hover:scale-x-105 shadow-xs"
                  style={{ height: `${bar.pct * 1.2}px` }}
                />

                <span className="text-xs font-semibold text-[#24292E]">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
