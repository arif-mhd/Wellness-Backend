"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const mockActivities = [
  { id: 1, dateTime: "21 Sep, 2020, 11:40 PM", action: "Profile Updated", details: "Dr. Sarah Lee, Specialty updated to Pediatrics", by: "Admin" },
  { id: 2, dateTime: "22 Sep, 2020, 09:15 AM", action: "Appointment Canceled", details: "John Smith, Age: 35, Condition: Heart Disease", by: "Patient" },
  { id: 3, dateTime: "23 Sep, 2020, 03:30 PM", action: "Appointment Scheduled", details: "Mary Johnson, Date: 25 Sep, Time: 2:00 PM", by: "Patient" },
  { id: 4, dateTime: "24 Sep, 2020, 10:20 AM", action: "Lab Results Received", details: "Mark Davis, Test: Blood Test, Results: Normal", by: "Lab Technician" },
  { id: 5, dateTime: "25 Sep, 2020, 08:45 AM", action: "Prescription Issued", details: "Emily White, Medication: Antibiotics, Dosage: 500mg", by: "Pharmacist" },
  { id: 6, dateTime: "26 Sep, 2020, 12:00 PM", action: "Record Updated", details: "Michael Brown, Procedure: Appendectomy, Recovery: Stable", by: "Patient" },
  { id: 7, dateTime: "27 Sep, 2020, 04:30 PM", action: "Appointment Canceled", details: "Anna Taylor, Discharge Date: 28 Sep, Instructions: Rest at Home", by: "Patient" },
  { id: 8, dateTime: "28 Sep, 2020, 11:10 AM", action: "Follow-up Appointment...", details: "David Wilson, Date: 5 Oct, Time: 10:30 AM", by: "Dr. Sarah Lee" },
  { id: 9, dateTime: "29 Sep, 2020, 02:55 PM", action: "Insurance Claim Submi...", details: "Olivia Martinez, Claim Type: Dental, Amount: $200", by: "Patient" },
  { id: 10, dateTime: "30 Sep, 2020, 09:40 AM", action: "Medical Records Updat...", details: "Christopher Adams, Notes: Allergies added, Medications updated", by: "Patient" },
  { id: 11, dateTime: "1 Oct, 2020, 03:15 PM", action: "Patient Feedback Recei...", details: "Sophia Clark, Rating: 4.5 stars, Comments: Great experience", by: "Patient" },
];

export default function ActivityLogPage() {
  const [activeTab, setActiveTab] = useState<"all" | "recent" | "past">("all");

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto space-y-8 pb-12 font-sans px-1 animate-in fade-in duration-300">
        
        {/* Top Header */}
        <div className="pt-2">
          <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Activity Log</h1>
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setActiveTab("all")} 
                className={`px-7 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'all' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                ALL
              </button>
              <button 
                onClick={() => setActiveTab("recent")} 
                className={`px-7 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'recent' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                Recent log
              </button>
              <button 
                onClick={() => setActiveTab("past")} 
                className={`px-7 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'past' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                Past Log
              </button>
          </div>
          
          <button className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-800 transition">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
             </svg>
          </button>
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-7 px-8 text-[13px] font-black text-slate-800 w-1/4">Date/Time</th>
                <th className="py-7 px-4 text-[13px] font-black text-slate-800 w-1/4">Action</th>
                <th className="py-7 px-4 text-[13px] font-black text-slate-800 w-[35%]">Details</th>
                <th className="py-7 px-8 text-[13px] font-black text-slate-800">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {mockActivities.map((log, idx) => (
                <tr key={log.id} className={`group border-b border-slate-50/70 last:border-0 ${idx === 0 ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"} transition-colors`}>
                  <td className="py-5 px-8 text-[11px] font-bold text-slate-500 whitespace-nowrap">{log.dateTime}</td>
                  <td className="py-5 px-4 text-[11px] font-medium text-slate-500">{log.action}</td>
                  <td className="py-5 px-4 text-[11px] font-medium text-slate-500 truncate max-w-sm">{log.details}</td>
                  <td className="py-5 px-8 text-[11px] font-medium text-slate-500">{log.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-white rounded-[2rem] flex items-center justify-between px-6 py-4 shadow-sm border border-slate-50 mt-4">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            aria-label="Previous page"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button 
                key={num}
                className={`w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center transition-all ${
                  num === 1 
                    ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-200" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            aria-label="Next page"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" />
            </svg>
          </button>
        </div>

      </div>
    </ProtectedRoute>
  );
}
