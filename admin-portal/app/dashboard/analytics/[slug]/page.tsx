"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

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
          <h1 className="text-[22px] font-black text-[#1e293b] tracking-tight">{title}</h1>
        </div>

        {/* Configuration Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          
          {/* Row 1: Date Range & Appointment Status */}
          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-bold text-slate-800 mb-4 tracking-tight">Date Range</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input type="text" placeholder="From date" className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <input type="text" placeholder="To Date" className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-bold text-slate-800 mb-4 tracking-tight">Appointment Status</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Scheduled</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Specialization</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

          {/* Row 2: Payment Status & Patient Demographics */}
          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-bold text-slate-800 mb-4 tracking-tight">Payment Status</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Paid</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Insurance Provider</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                     <svg className="w-3 h-3 text-slate-400 -mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                     <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-bold text-slate-800 mb-4 tracking-tight">Patient Demographics</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Age</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                     <svg className="w-3 h-3 text-slate-400 -mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                     <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Gender</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

          {/* Row 3: Appointment Duration */}
          <div className="bg-white rounded-[1.5rem] p-7 shadow-sm border border-slate-50">
             <h3 className="text-[11px] font-bold text-slate-800 mb-4 tracking-tight">Appointment Duration</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>15 minutes</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div className="relative">
                  <select className="w-full bg-[#f8fafd] rounded-[1rem] px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Time Slot</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
                     <svg className="w-3 h-3 text-slate-400 -mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                     <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>
          </div>

        </div>

        {/* Bottom Action Footer */}
        <div className="mt-16 flex items-center gap-6 w-full">
           <button 
             onClick={() => router.push("/dashboard/analytics")}
             className="flex-1 bg-[#e8eefa] hover:bg-[#dce3f3] text-[#2f4281] py-4 rounded-[1.25rem] text-[13px] font-bold transition-colors"
           >
             Cancel
           </button>
           <button 
             className="flex-1 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white py-4 rounded-[1.25rem] text-[13px] font-bold transition-colors shadow-md shadow-blue-200/50"
           >
             Generate report
           </button>
        </div>

      </div>
    </ProtectedRoute>
  );
}
