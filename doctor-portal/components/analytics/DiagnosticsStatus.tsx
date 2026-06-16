"use client";

import React, { useState, useMemo } from "react";

interface DiseaseCase {
  name: string;
  cases: number;
}

interface DiagnosticsStatusProps {
  appointments: any[];
}

const CHRONIC_DISEASES = [
  "hypertension",
  "diabetes",
  "asthma",
  "osteoarthritis",
  "migraine",
  "copd",
  "thyroid",
  "anxiety",
  "depression",
  "cough"
];

export default function DiagnosticsStatus({ appointments = [] }: DiagnosticsStatusProps) {
  const [activeTab, setActiveTab] = useState<"all" | "diseases" | "diagnose">("all");

  // Filter completed appointments
  const completedAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === "completed" || a.status === "Completed"
    );
  }, [appointments]);

  // Group by diagnosis (reason) and classify
  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};

    completedAppointments.forEach((apt) => {
      // Clean up reason: trim, capitalize first letter of each word
      let reason = (apt.reason || "Consultation").trim();
      reason = reason.charAt(0).toUpperCase() + reason.slice(1);
      
      if (!groups[reason]) {
        groups[reason] = [];
      }
      groups[reason].push(apt);
    });

    const allList: DiseaseCase[] = [];
    const diseaseList: DiseaseCase[] = [];
    const diagnoseList: DiseaseCase[] = [];

    const allAptsList: any[] = [];
    const diseaseAptsList: any[] = [];
    const diagnoseAptsList: any[] = [];

    Object.keys(groups).forEach((name) => {
      const apts = groups[name];
      const isChronic = CHRONIC_DISEASES.some((d) => name.toLowerCase().includes(d));
      const caseItem = { name, cases: apts.length };

      allList.push(caseItem);
      allAptsList.push(...apts);

      if (isChronic) {
        diseaseList.push(caseItem);
        diseaseAptsList.push(...apts);
      } else {
        diagnoseList.push(caseItem);
        diagnoseAptsList.push(...apts);
      }
    });

    // Sort descending by cases
    allList.sort((a, b) => b.cases - a.cases);
    diseaseList.sort((a, b) => b.cases - a.cases);
    diagnoseList.sort((a, b) => b.cases - a.cases);

    return {
      table: {
        all: allList,
        diseases: diseaseList,
        diagnose: diagnoseList,
      },
      apts: {
        all: allAptsList,
        diseases: diseaseAptsList,
        diagnose: diagnoseAptsList,
      }
    };
  }, [completedAppointments]);

  // Table cases based on active tab
  const currentCases = useMemo(() => {
    return groupedData.table[activeTab];
  }, [groupedData, activeTab]);

  // Appointments corresponding to active tab for Growth Chart
  const currentCategoryApts = useMemo(() => {
    return groupedData.apts[activeTab];
  }, [groupedData, activeTab]);

  // Compute Growth Bar Chart for the current week (Monday to Sunday)
  const growthBarData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    
    // Find the start of the current week (Monday)
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const counts = days.map((day, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const dateStr = targetDate.toISOString().slice(0, 10);

      const count = currentCategoryApts.filter(
        (a) => a.scheduledAt?.slice(0, 10) === dateStr
      ).length;

      return { day, count };
    });

    const maxVal = Math.max(5, ...counts.map((c) => c.count));

    return counts.map((item) => {
      const pct = (item.count / maxVal) * 80;
      return {
        day: item.day,
        val: item.count > 0 ? String(item.count) : "0",
        pct: pct || 2,
      };
    });
  }, [currentCategoryApts]);

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
        <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative">
          {/* Table Header */}
          <div className="flex justify-between items-center w-full pb-2 border-b border-[#EBEEF5]">
            <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider">Disease / Reason</span>
            <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider mr-10">Cases</span>
          </div>

          {/* Disease List */}
          <div className="flex flex-col gap-1.5 mt-2 max-h-[200px] overflow-y-auto pr-1">
            {currentCases.length === 0 ? (
              <div className="text-center text-xs text-[#838B95] py-12">
                No cases recorded.
              </div>
            ) : (
              currentCases.map((item, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={item.name}
                    className={`flex justify-between items-center px-4 py-3 rounded-xl transition-all ${
                      isFirst ? "bg-[#F5F6FA]" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[#24292E] text-xs font-semibold truncate max-w-[180px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {item.name}
                    </span>
                    <span className="text-[#24292E] text-xs font-bold mr-12" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {item.cases}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Growth Bar Chart Card */}
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

                {/* Vertical Bar with gold-orange gradient */}
                <div
                  className="w-full bg-gradient-to-t from-[#FAD281] to-[#F8B34B] rounded-lg transition-all duration-300 hover:scale-x-105 shadow-xs"
                  style={{ height: `${bar.pct}px` }}
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
