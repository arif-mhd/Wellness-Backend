"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
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

const slugToTitle: Record<string, string> = {
  "appointment-booking-trends": "Appointment Booking Trends",
  "primary-appointment-reasons-1": "Primary Appointment Reasons",
  "appointment-cancellation": "Appointment Cancellation and Rescheduling",
  "number-of-consultations": "Number of Consultations",
  "patient-satisfaction-doctor": "Patient Satisfaction Ratings",
  "number-of-prescriptions": "Number of Prescriptions Issued",
  "number-of-appointments": "Number of Appointments",
  "primary-appointment-reasons-2": "Primary Appointment Reasons",
  "patient-satisfaction-patient": "Patient Satisfaction Ratings"
};

export default function ReportConfigPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);

  const title = slugToTitle[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [gender, setGender] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setGenError("");
    try {
      const res = await adminFetch("/api/admin/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          reportType: slug,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status || undefined,
          specialty: specialty || undefined,
          paymentStatus: paymentStatus || undefined,
          gender: gender || undefined,
          durationMins: durationMins || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setGenError(body.error ?? `Failed to generate report (${res.status}).`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setGenError(e?.message ?? "Network error.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto pb-12 font-sans px-1 animate-in fade-in duration-300">
        
        {/* Dynamic Header */}
        <div className="flex items-center gap-4 pt-2 mb-8">
          <button 
            onClick={() => router.push("/dashboard/analytics")}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-[0_2px_10px_rgba(0,0,0,0.03)] shrink-0 border border-slate-50"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[22px] font-medium text-[#1e293b] tracking-tight">{title}</h1>
        </div>

        {/* Configuration Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          
          {/* Row 1: Date Range & Appointment Status */}
          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-medium text-slate-800 mb-4 tracking-tight">Date Range</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="From date"
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="To Date"
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition"
                  />
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-medium text-slate-800 mb-4 tracking-tight">Appointment Status</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer"
                  >
                     <option value="">Any status</option>
                     <option value="scheduled">Scheduled</option>
                     <option value="in_progress">In progress</option>
                     <option value="completed">Completed</option>
                     <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Specialization"
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition"
                  />
                </div>
             </div>
          </div>

          {/* Row 2: Payment Status & Patient Demographics */}
          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-medium text-slate-800 mb-4 tracking-tight">Payment Status</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer"
                  >
                     <option value="">Any payment status</option>
                     <option value="paid">Paid</option>
                     <option value="unpaid">Unpaid</option>
                     <option value="refunded">Refunded</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer"
                  >
                     <option value="">Any gender</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-medium text-slate-800 mb-4 tracking-tight">Appointment Duration</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-medium text-slate-800 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer"
                  >
                     <option value="">Any duration</option>
                     <option value="15">15 minutes</option>
                     <option value="30">30 minutes</option>
                     <option value="45">45 minutes</option>
                     <option value="60">60 minutes</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                     <svg className="w-3 h-3 text-slate-400 -mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                     <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

        </div>

        {genError && (
          <div className="mt-6 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {genError}
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="mt-16 flex items-center gap-6 w-full">
           <button 
             onClick={() => router.push("/dashboard/analytics")}
             className="flex-1 bg-[#e8eefa] hover:bg-[#dce3f3] text-[#2f4281] py-4 rounded-[1.25rem] text-[13px] font-medium transition-colors"
           >
             Cancel
           </button>
           <button
             onClick={handleGenerate}
             disabled={generating}
             className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] disabled:opacity-60 text-white py-4 rounded-[1.25rem] text-[13px] font-medium transition-colors shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
           >
             {generating ? "Generating…" : "Generate report"}
           </button>
        </div>

      </div>
    </ProtectedRoute>
  );
}
