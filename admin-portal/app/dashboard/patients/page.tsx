"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { mockPatients, Patient } from "@/lib/mockData";

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function ManagePatientsPage() {
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(1);
  const selectedPatient = mockPatients.find((p) => p.id === selectedPatientId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {/* Full-width split grid — header lives inside left col */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selectedPatient ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Patients</h1>
              <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[13px] font-bold px-6 py-3 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Patient
              </button>
            </div>

            {/* Text Filter Row */}
            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none">
              <div className="flex items-center gap-12 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Total Consultation <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Diagnosis <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
              </div>
              <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Main Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-800 tracking-wider">
                      <th className="pb-4 pt-1 font-bold pl-2">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                          Total Appointments <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                          Last Appointment <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPatients.map((patient) => {
                      const isSelected = selectedPatientId === patient.id;
                      return (
                        <tr
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected 
                              ? "bg-[#f8fafd] rounded-2xl" 
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-2 flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                {patient.name}, <span className="font-semibold text-slate-500">{patient.age}</span>
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{patient.email}</p>
                            </div>
                          </td>
                          <td className="py-3 text-[13px] text-slate-500 font-medium text-center">
                            {patient.totalAppointments}
                          </td>
                          <td className="py-3 text-[13px] text-slate-500 font-medium text-center">
                            {patient.lastAppointment}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {isSelected ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/patients/${patient.id}`); }}
                                className="bg-[#6A8BFF] text-white text-[12px] font-bold px-6 py-2 rounded-full shadow-md shadow-blue-200/50"
                              >
                                View Details
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/patients/${patient.id}`); }}
                                className="text-[12px] font-bold text-slate-800 mr-6 hover:text-blue-500 transition-colors"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button 
                    key={num}
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      num === 1 
                        ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          {/* Right Patient Details panel */}
          {selectedPatient && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Patient Details</h2>
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header Card */}
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-slate-100">
                    <img src={selectedPatient.avatar} alt={selectedPatient.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-slate-800">{selectedPatient.name}</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedPatient.detailEmail}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                  {selectedPatient.bio}
                </p>
              </div>

              {/* Details List inside grey card */}
              <div className="bg-[#f8fafd] rounded-[1.5rem] p-6 space-y-6 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Emirates ID</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.emiratesId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Gender</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.gender}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Date of Birth</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.dob}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Contact Number</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Email ID</span>
                  <span className="text-[11px] text-slate-800 font-bold truncate max-w-[170px]">{selectedPatient.detailEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Location</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.address}</span>
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => router.push(`/dashboard/patients/${selectedPatient.id}`)}
                className="w-full py-4 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98]"
              >
                View Detailed Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
