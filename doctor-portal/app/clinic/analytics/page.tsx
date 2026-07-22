"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import AllConsultations from "@/components/analytics/AllConsultations";
import PatientsOutcome from "@/components/analytics/PatientsOutcome";
import DiagnosticsStatus from "@/components/analytics/DiagnosticsStatus";
import ScreeningRecommendations from "@/components/analytics/ScreeningRecommendations";

export default function ClinicAnalyticsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Temporary: fetching doctor appointments/feedback since clinic API is not fully implemented yet
      const apptRes = await apiFetch("/api/appointments/doctor");
      let apptData: any[] = [];
      if (apptRes.ok) {
        const data = await apptRes.json();
        apptData = data.appointments ?? [];
        setAppointments(apptData);
      }

      const feedbackRes = await apiFetch("/api/feedback/doctor");
      if (feedbackRes.ok) {
        const fbData = await feedbackRes.json();
        setFeedback(fbData ?? []);
      }
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="px-5 pb-12 select-none">
      {/* Title & Search Row */}
      <div className="flex justify-between items-center mb-8 mt-2 w-full">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Analytics
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search all"
            className="w-[280px] h-[40px] pl-4 pr-10 rounded-[8px] border border-[#EBEEF5] text-sm text-[#383F45] bg-white outline-none focus:border-[#5476FC] transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
          <svg
            className="absolute right-3 top-2.5 text-[#838B95]"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-10 min-w-0 w-full">
        {loading ? (
          <div className="flex justify-center py-20 text-[#707070] text-sm font-medium">
            Loading analytics data...
          </div>
        ) : (
          <>
            <AllConsultations appointments={appointments} />
            <PatientsOutcome appointments={appointments} feedback={feedback} />
            <DiagnosticsStatus appointments={appointments} />
            <ScreeningRecommendations appointments={appointments} />
          </>
        )}
      </div>
    </div>
  );
}
