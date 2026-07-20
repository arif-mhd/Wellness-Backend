"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import PatientRatings from "@/components/analytics/PatientRatings";
import AllConsultations from "@/components/analytics/AllConsultations";
import PatientsOutcome from "@/components/analytics/PatientsOutcome";
import DiagnosticsStatus from "@/components/analytics/DiagnosticsStatus";
import ScreeningRecommendations from "@/components/analytics/ScreeningRecommendations";

interface TaskCounts {
  upcomingConsultations: number;
  pendingEmr: number;
  total: number;
}

function pctChange(today: number, yesterday: number): { value: number; direction: "up" | "down" | "none" } {
  if (yesterday === 0 && today === 0) return { value: 0, direction: "none" };
  if (yesterday === 0) return { value: 100, direction: "up" };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { value: pct, direction: "up" };
  if (pct < 0) return { value: Math.abs(pct), direction: "down" };
  return { value: 0, direction: "none" };
}

export default function AnalyticsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ upcomingConsultations: 0, pendingEmr: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Doctor's Appointments
      const apptRes = await apiFetch("/api/appointments/doctor");
      let apptData: any[] = [];
      if (apptRes.ok) {
        const data = await apptRes.json();
        apptData = data.appointments ?? [];
        setAppointments(apptData);
      }

      // 2. Fetch Doctor's Feedback
      const feedbackRes = await apiFetch("/api/feedback/doctor");
      if (feedbackRes.ok) {
        const fbData = await feedbackRes.json();
        setFeedback(fbData ?? []);
      }

      // 3. Fetch Doctor's outstanding tasks (same live-derived source as the dashboard)
      const tasksRes = await apiFetch("/api/appointments/doctor/tasks");
      if (tasksRes.ok) {
        const { counts } = await tasksRes.json();
        setTaskCounts(counts ?? { upcomingConsultations: 0, pendingEmr: 0, total: 0 });
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

  // Compute Statistics:
  // Card 1: Consultations Today & Percentage Increase from yesterday
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const todaysApps = appointments.filter(
    (a) => a.scheduledAt?.startsWith(todayStr) && a.status !== "cancelled"
  );
  const yesterdaysApps = appointments.filter(
    (a) => a.scheduledAt?.startsWith(yesterdayStr) && a.status !== "cancelled"
  );

  const consultationsToday = todaysApps.length;
  const consultationsChange = pctChange(todaysApps.length, yesterdaysApps.length);

  // Card 2: Tasks to be Completed — live-derived (upcoming consultations + pending EMR),
  // same source as the dashboard's task list. There is no "completed tasks" history:
  // a task simply disappears once the consult happens or the EMR is saved.
  const totalTasks = taskCounts.total;

  // Card 3: Revenue (Sum of paymentAmount of completed appointments this month vs last month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth];

  const completedThisMonth = appointments.filter((a) => {
    if (a.status !== "completed" && a.status !== "Completed") return false;
    if (!a.scheduledAt) return false;
    const d = new Date(a.scheduledAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const revenueThisMonth = completedThisMonth.reduce((sum, a) => sum + (a.paymentAmount || 0), 0);

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const completedPrevMonth = appointments.filter((a) => {
    if (a.status !== "completed" && a.status !== "Completed") return false;
    if (!a.scheduledAt) return false;
    const d = new Date(a.scheduledAt);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });
  const revenuePrevMonth = completedPrevMonth.reduce((sum, a) => sum + (a.paymentAmount || 0), 0);

  const revenueChange = pctChange(revenueThisMonth, revenuePrevMonth);

  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(revenueThisMonth);

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
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Consultations Today */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Consultations Today
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {consultationsToday} {consultationsToday === 1 ? "Consultation" : "Consultations"}
                </div>
                <div className="flex items-center gap-1">
                  {consultationsChange.direction === "up" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {consultationsChange.direction === "down" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {consultationsChange.direction === "up" && (
                      <>
                        <span className="text-[#179353] font-medium mr-1">{consultationsChange.value}% Increase</span>
                        <span className="text-[#707070]">from yesterday</span>
                      </>
                    )}
                    {consultationsChange.direction === "down" && (
                      <>
                        <span className="text-[#F25252] font-medium mr-1">{consultationsChange.value}% Decrease</span>
                        <span className="text-[#707070]">from yesterday</span>
                      </>
                    )}
                    {consultationsChange.direction === "none" && (
                      <span className="text-[#707070]">No change from yesterday</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Card 2: Tasks to be Completed */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Tasks to be Completed
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {totalTasks} {totalTasks === 1 ? "Task" : "Tasks"}
                </div>
                <div className="text-[#179353] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {taskCounts.pendingEmr} pending EMR{taskCounts.pendingEmr === 1 ? "" : "s"}
                </div>
              </div>

              {/* Card 3: Revenue */}
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Revenue
                  </span>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {currentMonthName}
                    </span>
                  </div>
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {formattedRevenue}
                </div>
                <div className="flex items-center gap-1">
                  {revenueChange.direction === "up" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {revenueChange.direction === "down" && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {revenueChange.direction === "up" && (
                      <>
                        <span className="text-[#179353] font-medium mr-1">{revenueChange.value}% Increase</span>
                        <span className="text-[#707070]">from last month</span>
                      </>
                    )}
                    {revenueChange.direction === "down" && (
                      <>
                        <span className="text-[#F25252] font-medium mr-1">{revenueChange.value}% Decrease</span>
                        <span className="text-[#707070]">from last month</span>
                      </>
                    )}
                    {revenueChange.direction === "none" && (
                      <span className="text-[#707070]">No change from last month</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <AllConsultations appointments={appointments} />
            <PatientsOutcome appointments={appointments} feedback={feedback} />
            <DiagnosticsStatus appointments={appointments} />
            <ScreeningRecommendations appointments={appointments} />
          </div>

          {/* Right Side: Patient Ratings */}
          <div className="self-start">
            <PatientRatings feedback={feedback} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
