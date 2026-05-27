"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import PatientRatings from "@/components/analytics/PatientRatings";
import AllConsultations from "@/components/analytics/AllConsultations";
import PatientsOutcome from "@/components/analytics/PatientsOutcome";
import DiagnosticsStatus from "@/components/analytics/DiagnosticsStatus";
import ScreeningRecommendations from "@/components/analytics/ScreeningRecommendations";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <div className="px-5 pb-12 select-none">
        {/* Title row */}
        <div className="flex flex-col justify-center items-start gap-1 mb-8 mt-2">
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Analytics
          </h1>
        </div>

        {/* ── Two-Column Main Layout Grid ────────────────────────────────────── */}
        <div className="grid gap-8 items-start w-full" style={{ gridTemplateColumns: "1fr 372px" }}>
          {/* Left Side: Stats + Main Analytics Reports (col-span-3) */}
          <div className="flex flex-col gap-10 min-w-0">
            {/* Stats Row (exact replica of dashboard cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Consultations Today */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Consultations Today
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  24 Consultations
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="text-[#179353] font-medium mr-1">20% Increase</span>
                    <span className="text-[#707070]">from yesterday</span>
                  </span>
                </div>
              </div>

              {/* Card 2: Tasks to be Completed */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Tasks to be Completed
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  24 Tasks
                </div>
                <div className="text-[#179353] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  12 Tasks Completed
                </div>
              </div>

              {/* Card 3: Revenue */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Revenue
                  </span>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>July</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  $56,565
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="text-[#F25252] font-medium mr-1">8% Decrease</span>
                    <span className="text-[#707070]">from last month</span>
                  </span>
                </div>
              </div>
            </div>

            <AllConsultations />
            <PatientsOutcome />
            <DiagnosticsStatus />
            <ScreeningRecommendations />
          </div>

          {/* Right Side: Patient Ratings — fixed width, height auto */}
          <div className="self-start">
            <PatientRatings />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
