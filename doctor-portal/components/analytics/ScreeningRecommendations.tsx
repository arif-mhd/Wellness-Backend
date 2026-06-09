"use client";

import React, { useState } from "react";

interface ScreeningItem {
  name: string;
  count: number;
}

export default function ScreeningRecommendations() {
  const [activeTab, setActiveTab] = useState<"guideline" | "age" | "disease">("guideline");

  const recommendations: ScreeningItem[] = [
    { name: "Hypertension", count: 150 },
    { name: "Diabetes", count: 80 },
    { name: "Asthma", count: 43 },
    { name: "Osteoarthritis", count: 32 },
    { name: "Migraine", count: 27 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Title */}
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px] select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
          Screening Recommendations
        </h2>

        {/* Filter Bar Below Heading */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("guideline")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "guideline"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Guideline Based
          </button>
          <button
            onClick={() => setActiveTab("age")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "age"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Age related
          </button>
          <button
            onClick={() => setActiveTab("disease")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "disease"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Disease screening
          </button>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-4 relative w-full">
        {/* Table Header */}
        <div className="flex justify-between items-center w-full pb-2 border-b border-[#EBEEF5]">
          <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider">Screening</span>
          <div className="flex items-center gap-5">
            <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider mr-6">Number of Patients Recommended</span>
            <div className="flex items-center gap-1 cursor-pointer select-none">
              <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Screening List */}
        <div className="flex flex-col gap-1.5 mt-2">
          {recommendations.map((item, idx) => {
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
                <span className="text-[#24292E] text-xs font-semibold mr-32" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
