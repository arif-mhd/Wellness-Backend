"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import AllConsultations from "@/components/analytics/AllConsultations";
import PatientsOutcome from "@/components/analytics/PatientsOutcome";
import DiagnosticsStatus from "@/components/analytics/DiagnosticsStatus";
import ScreeningRecommendations from "@/components/analytics/ScreeningRecommendations";

interface BranchOption { id: string; name: string; status: string; }

interface DashboardData {
  consultationsToday: number;
  consultationsYesterday: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  tasks: { total: number; items: any[] };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer: { name: string; avatar: string };
  createdAt: string;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function TrendLine({ value, suffix }: { value: number; suffix: string }) {
  const isUp = value >= 0;
  return (
    <div className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {isUp ? (
          <>
            <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
        <span className={`font-medium mr-1 ${isUp ? "text-[#179353]" : "text-[#F25252]"}`}>
          {Math.abs(value)}% {isUp ? "Increase" : "Decrease"}
        </span>
        <span className="text-[#707070]">{suffix}</span>
      </span>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i < Math.round(value) ? "#FBBF24" : "#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ClinicAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, apptRes, feedbackRes] = await Promise.all([
        apiFetch(`/api/clinics/dashboard${qs}`),
        apiFetch(`/api/clinics/appointments${qs}`),
        apiFetch(`/api/clinics/feedback${qs}`),
      ]);

      if (dashRes.ok) setDashboard(await dashRes.json());
      if (apptRes.ok) {
        const data = await apptRes.json();
        setAppointments(data.appointments ?? []);
      }
      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setReviews(data.reviews ?? []);
        setAvgRating(data.avgRating ?? 0);
      }
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasMultipleBranches = branches.length > 1;
  const activeBranchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? "Branch" : null;

  const consultationsPct = dashboard ? pctChange(dashboard.consultationsToday, dashboard.consultationsYesterday) : 0;
  const revenuePct = dashboard ? pctChange(dashboard.revenueThisMonth, dashboard.revenueLastMonth) : 0;
  const monthLabel = new Date().toLocaleString("en-US", { month: "long" });

  const scheduleTaskCount = dashboard?.tasks.items.filter((t) => t.type === "doctor_schedule_pending").length ?? 0;
  const docTaskCount = dashboard?.tasks.items.filter((t) => t.type === "missing_documentation").length ?? 0;
  const taskBreakdown =
    !dashboard || dashboard.tasks.total === 0
      ? "All caught up"
      : [
          scheduleTaskCount > 0 ? `${scheduleTaskCount} schedule approval${scheduleTaskCount === 1 ? "" : "s"}` : null,
          docTaskCount > 0 ? `${docTaskCount} missing note${docTaskCount === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="px-5 pb-12 select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Title & Search Row */}
      <div className="flex justify-between items-center mb-6 mt-2 w-full">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
          Analytics
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search all"
            className="w-[280px] h-[40px] pl-4 pr-10 rounded-[8px] border border-[#EBEEF5] text-sm text-[#383F45] bg-white outline-none focus:border-[#5476FC] transition-colors"
          />
          <svg
            className="absolute right-3 top-2.5 text-[#838B95]"
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* Branch selector — same ALL / Select Branch pattern used on Appointments/Doctors */}
      {hasMultipleBranches && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.push("/clinic/analytics")}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${!branchId ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            All
          </button>
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown((v) => !v)}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all flex items-center gap-1.5 ${branchId ? "bg-[#5476FC] text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
            >
              {activeBranchName ?? "Select Branch"}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-48 z-20">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { router.push(`/clinic/analytics?branchId=${b.id}`); setShowBranchDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${branchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-[#707070] text-sm font-medium">
          Loading analytics data...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8 items-start">
          {/* ── Main column ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-10 min-w-0 w-full">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Consultations Today</div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]">
                  {dashboard?.consultationsToday ?? 0} Consultations
                </div>
                <TrendLine value={consultationsPct} suffix="from yesterday" />
              </div>

              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Tasks to be Completed</div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]">
                  {dashboard?.tasks.total ?? 0} Tasks
                </div>
                <div className="text-xs font-normal tracking-[-0.24px] text-[#5476FC]">{taskBreakdown}</div>
              </div>

              <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Revenue</span>
                  <span className="text-[#707070] text-[11px] font-medium tracking-[-0.24px]">{monthLabel}</span>
                </div>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]">
                  ${Math.round(dashboard?.revenueThisMonth ?? 0).toLocaleString()}
                </div>
                <TrendLine value={revenuePct} suffix="from last month" />
              </div>
            </div>

            <AllConsultations appointments={appointments} />
            <PatientsOutcome appointments={appointments} feedback={reviews} />
            <DiagnosticsStatus appointments={appointments} />
            <ScreeningRecommendations appointments={appointments} />
          </div>

          {/* ── Right sidebar: Patient Ratings ──────────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 xl:sticky xl:top-6">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <span className="text-[#24292E] text-[15px] font-semibold">Patient Ratings</span>
                <span className="flex items-center gap-1 text-[#24292E] text-xs font-semibold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#FBBF24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {avgRating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 max-h-[560px] overflow-y-auto pr-1">
              {reviews.length === 0 ? (
                <div className="text-center text-xs text-[#838B95] py-12">No reviews yet.</div>
              ) : (
                reviews.slice(0, 12).map((r) => (
                  <div key={r.id} className="flex flex-col gap-1.5 pb-3.5 border-b border-[#F1F3F7] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[#24292E] text-xs font-semibold truncate">{r.reviewer?.name ?? "Patient"}</span>
                      <StarRating value={r.rating ?? 0} />
                    </div>
                    <p className="text-[#838B95] text-[11px] leading-relaxed line-clamp-2">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
