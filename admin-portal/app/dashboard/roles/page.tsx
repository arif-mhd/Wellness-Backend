"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Doctor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  dateJoined: string;
  emiratesId: string;
  speciality: string;
  license: string;
  rating: number;
}

const mockDoctors: Doctor[] = [
  { id: "1", name: "Dr. Nusrat Chowdhury", email: "yelena@example.com", avatar: "NC", dateJoined: "Feb 2, 2019 19:28", emiratesId: "784-1990-1234567-8", speciality: "Cardiology", license: "DHA-12345678", rating: 4 },
  { id: "2", name: "Dr. Zafar Islam", email: "yelena@example.com", avatar: "ZI", dateJoined: "Mar 20, 2019 23:14", emiratesId: "784-1990-1234567-8", speciality: "Dermatology", license: "DHA-12345678", rating: 4 },
  { id: "3", name: "Dr. Anika Rahman", email: "yelena@example.com", avatar: "AR", dateJoined: "Dec 7, 2019 23:26", emiratesId: "784-1990-1234567-8", speciality: "Neurology", license: "DHA-12345678", rating: 4 },
  { id: "4", name: "Dr. Aminul Haque", email: "yelena@example.com", avatar: "AH", dateJoined: "Dec 4, 2019 21:42", emiratesId: "784-1990-1234567-8", speciality: "Pediatrics", license: "DHA-12345678", rating: 4 },
  { id: "5", name: "Dr. Shama Islam", email: "yelena@example.com", avatar: "SI", dateJoined: "Dec 30, 2019 05:18", emiratesId: "784-1990-1234567-8", speciality: "Orthopedics", license: "DHA-12345678", rating: 4 },
  { id: "6", name: "Dr. Mehnaz Khan", email: "yelena@example.com", avatar: "MK", dateJoined: "Dec 4, 2019 21:42", emiratesId: "784-1990-1234567-8", speciality: "Neurology", license: "DHA-12345678", rating: 4 },
  { id: "7", name: "Dr. Selima Khan", email: "yelena@example.com", avatar: "SK", dateJoined: "Dec 30, 2019 05:18", emiratesId: "784-1990-1234567-8", speciality: "Dermatology", license: "DHA-12345678", rating: 4 },
  { id: "8", name: "Dr. Taslima Khan", email: "yelena@example.com", avatar: "TK", dateJoined: "Dec 30, 2019 05:18", emiratesId: "784-1990-1234567-8", speciality: "Cardiology", license: "DHA-12345678", rating: 4 },
  { id: "9", name: "Dr. Nargis Ahmed", email: "yelena@example.com", avatar: "NA", dateJoined: "Dec 30, 2019 07:52", emiratesId: "784-1990-1234567-8", speciality: "Cardiology", license: "DHA-12345678", rating: 4 },
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
  >
    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${checked ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1 mt-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-3.5 h-3.5 ${star <= rating ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#dce5fe] fill-[#dce5fe]"}`}
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState<"Doctors" | "Patients" | "Admin">("Doctors");
  const [selectedId, setSelectedId] = useState<string | null>("1");

  // Mock toggle states
  const [toggles, setToggles] = useState({
    medicalRecords: true,
    prescription: true,
    emrUpdates: true,
    systemConfig: false
  });

  const selected = mockDoctors.find(d => d.id === selectedId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* LEFT COLUMN */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>
            
            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">User roles</h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["Doctors", "Patients", "Admin"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                      activeTab === tab ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button className="ml-2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm border border-slate-100 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
              <button className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Today
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-1">
              <div className="flex items-center gap-10 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[650px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                    <th className="pb-4 pt-1 font-bold pl-2 w-[30%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Name <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[25%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Date Joined <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[25%]">Emirates id</th>
                    <th className="pb-4 pt-1 font-bold w-[20%]">Speciality</th>
                  </tr>
                </thead>
                <tbody>
                  {mockDoctors.map((doc) => {
                    const isSelected = selectedId === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedId(doc.id)}
                        className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src="/doctor-avatar.png" alt={doc.name} className="w-full h-full object-cover" />
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-800 leading-tight">{doc.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{doc.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{doc.dateJoined}</td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{doc.emiratesId}</td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{doc.speciality}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${n === 1 ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{n}</button>
                ))}
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Doctor Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              <div className="flex items-center justify-between pb-5 border-b border-slate-50">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Doctor Details</h2>
                <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Profile Block */}
              <div className="flex items-center gap-4 mt-6 mb-5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                  <img src="/doctor-avatar.png" alt={selected.name} className="w-full h-full object-cover" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="text-[15px] font-black text-slate-800">{selected.name}</p>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider my-0.5">LICENSE NUMBER {selected.license}</p>
                  <StarRating rating={selected.rating} />
                </div>
              </div>

              {/* Speciality Pills */}
              <div className="flex gap-2 mb-6">
                <span className="px-4 py-1.5 bg-[#eef2ff] text-[#6A8BFF] text-[11px] font-bold rounded-full">Cardiology</span>
                <span className="px-4 py-1.5 bg-[#eef2ff] text-[#6A8BFF] text-[11px] font-bold rounded-full">Neurology</span>
              </div>

              {/* Description */}
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed mb-8">
                A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I...
              </p>

              {/* Access Controls */}
              <div className="border-t border-slate-50 pt-6">
                <h3 className="text-[13px] font-bold text-slate-800 mb-5">Access Controls</h3>
                
                <div className="space-y-4">
                  {/* Control 1 */}
                  <div className="flex items-start gap-4 p-4 rounded-[1.25rem] border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                    <div className="flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 mb-1">Patient Medical Records Access</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Can view and update the medical records of their assigned patients, including diagnoses, treatments, and history.</p>
                    </div>
                    <ToggleSwitch checked={toggles.medicalRecords} onChange={(v) => setToggles(p => ({ ...p, medicalRecords: v }))} />
                  </div>

                  {/* Control 2 */}
                  <div className="flex items-start gap-4 p-4 rounded-[1.25rem] border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                    <div className="flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 mb-1">Prescription Management</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Can prescribe medication, adjust dosages, and send prescriptions directly to pharmacies.</p>
                    </div>
                    <ToggleSwitch checked={toggles.prescription} onChange={(v) => setToggles(p => ({ ...p, prescription: v }))} />
                  </div>

                  {/* Control 3 */}
                  <div className="flex items-start gap-4 p-4 rounded-[1.25rem] border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                    <div className="flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 mb-1">EMR System Updates</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Can input updates in Electronic Medical Records (EMR), including notes, treatment plans, and follow-up reminders.</p>
                    </div>
                    <ToggleSwitch checked={toggles.emrUpdates} onChange={(v) => setToggles(p => ({ ...p, emrUpdates: v }))} />
                  </div>

                  {/* Control 4 */}
                  <div className="flex items-start gap-4 p-4 rounded-[1.25rem] border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                    <div className="flex-1">
                      <p className="text-[12.5px] font-bold text-slate-800 mb-1">System-Wide Configuration</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Can input updates in Electronic Medical Records (EMR), including notes, treatment plans, and follow-up reminders.</p>
                    </div>
                    <ToggleSwitch checked={toggles.systemConfig} onChange={(v) => setToggles(p => ({ ...p, systemConfig: v }))} />
                  </div>
                </div>
              </div>

              {/* Save Changes CTA */}
              <button className="w-full py-4 mt-8 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold shadow-md shadow-blue-200/50 transition duration-200 active:scale-[0.98]">
                Save Changes
              </button>

            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
