"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

type SummaryStat = { label: string; value: string };

const OVERVIEW_STATS: { reportType: string; label: string; pickIndex: number }[] = [
  { reportType: "number-of-appointments", label: "Total appointments", pickIndex: 0 },
  { reportType: "number-of-consultations", label: "Total consultations", pickIndex: 0 },
  { reportType: "appointment-cancellation", label: "Cancellation rate", pickIndex: 2 },
  { reportType: "patient-satisfaction-doctor", label: "Average rating", pickIndex: 1 },
];

function useOverviewStats() {
  const [stats, setStats] = useState<SummaryStat[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          OVERVIEW_STATS.map(async (s) => {
            const res = await adminFetch("/api/admin/reports/preview", {
              method: "POST",
              body: JSON.stringify({ reportType: s.reportType }),
            });
            if (!res.ok) return { label: s.label, value: "—" };
            const body = await res.json();
            return { label: s.label, value: body.summary?.[s.pickIndex]?.value ?? "—" };
          })
        );
        if (!cancelled) setStats(results);
      } catch {
        if (!cancelled) setError("Couldn't load live numbers.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, error };
}

const ReportCard = ({ title, description, slug }: { title: string, description: string, slug: string }) => {
  const router = useRouter();
  
  return (
    <div 
      onClick={() => router.push(`/dashboard/analytics/${slug}`)}
      className="bg-white rounded-2xl p-6 flex items-start gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
    >
      <div className="w-[52px] h-[52px] rounded-full bg-[#E5EDFF] text-[#6A8BFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 20h14v2H3V4h2v16zM7 13h3v5H7v-5zm5-4h3v9h-3V9zm5-5h3v14h-3V4z"/>
        </svg>
      </div>
      <div className="flex flex-col gap-1.5 pt-1">
        <h3 className="text-[14px] font-semibold text-[#4861e9] tracking-tight group-hover:text-[#6A8BFF] transition-colors pr-2">
          {title}
        </h3>
        <p className="text-[12px] font-normal text-slate-500 leading-relaxed pr-2">
          {description}
        </p>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const { stats, error } = useOverviewStats();

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto pb-12 font-sans px-1 animate-in fade-in duration-300" style={{ fontFamily: 'Outfit, sans-serif' }}>

        {/* Page Header */}
        <div className="pt-2 mb-8">
          <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Analytics</h1>
          <p className="text-[13px] text-slate-500 mt-1">Live platform numbers, plus configurable reports below.</p>
        </div>

        {/* Live overview strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {(stats ?? OVERVIEW_STATS.map((s) => ({ label: s.label, value: null }))).map((s, i) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-50">
              <div className="text-[11px] font-medium text-slate-400 tracking-tight mb-1.5">{s.label}</div>
              <div className="text-[24px] font-medium text-[#1e293b] tabular-nums tracking-tight">
                {s.value ?? (
                  <span className="inline-block w-14 h-6 rounded bg-slate-100 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="text-[12px] text-red-500 -mt-8 mb-8">{error}</p>}

        <div className="space-y-10">
          
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ReportCard 
              title="Appointment Booking Trends" 
              description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
              slug="appointment-booking-trends"
            />
            <ReportCard 
              title="Primary Appointment Reasons" 
              description="Helping identify primary patient concerns for better engagement." 
              slug="primary-appointment-reasons-1"
            />
            <ReportCard 
              title="Appointment Cancellation and Rescheduling" 
              description="Helping identify primary patient concerns for better engagement." 
              slug="appointment-cancellation"
            />
          </div>

          {/* Doctor Activity Section */}
          <div className="space-y-4">
            <h2 className="text-[15px] font-medium text-slate-800 tracking-tight ml-1">Doctor Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ReportCard 
                title="Number of Consultations" 
                description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
                slug="number-of-consultations"
              />
              <ReportCard 
                title="Patient Satisfaction Ratings" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="patient-satisfaction-doctor"
              />
              <ReportCard 
                title="Number of Prescriptions Issued" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="number-of-prescriptions"
              />
            </div>
          </div>

          {/* Patient Activity Section */}
          <div className="space-y-4">
            <h2 className="text-[15px] font-medium text-slate-800 tracking-tight ml-1">Patient Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <ReportCard 
                title="Number of Appointments" 
                description="Visualizing appointment patterns to optimize scheduling efficiency and patient care." 
                slug="number-of-appointments"
              />
              <ReportCard 
                title="Primary Appointment Reasons" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="primary-appointment-reasons-2"
              />
              <ReportCard 
                title="Patient Satisfaction Ratings" 
                description="Helping identify primary patient concerns for better engagement." 
                slug="patient-satisfaction-patient"
              />
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
