"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  bloodGroup?: string;
  avatarUrl?: string;
  address?: string;
  postalCode?: string;
  height?: string;
  weight?: string;
  bio?: string;
  status: string;
  createdAt: string;
  allergies?: string[];
  medications?: string[];
  chronicDiseases?: string[];
  totalAppointments?: number;
  lastAppointment?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return `${Math.floor((Date.now() - d.getTime()) / 31557600000)} y/o`;
}

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" />
    </svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

function Avatar({ patient, size = "md" }: { patient: Patient; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  if (patient.avatarUrl) {
    return <img src={patient.avatarUrl} alt={patient.fullName} className={`${sz} rounded-full object-cover border border-slate-100 shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-bold shrink-0`}>
      {(patient.fullName ?? "?")[0].toUpperCase()}
    </div>
  );
}

export default function ManagePatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await adminFetch("/api/admin/patients");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFetchError(body.error ?? `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setPatients(data.patients ?? []);
      if ((data.patients ?? []).length > 0 && !selectedId) {
        setSelectedId(data.patients[0].id);
      }
    } catch (e: any) {
      setFetchError(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = patients.filter(p =>
    !search ||
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPatient = filtered.find(p => p.id === selectedId) ?? null;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {fetchError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {fetchError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selectedPatient ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Patients</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-full px-4 h-10 shadow-sm">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search patients…"
                    className="text-[13px] text-slate-700 placeholder-slate-400 outline-none bg-transparent w-36"
                  />
                </div>
                <button
                  onClick={fetchPatients}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Text Filter Row */}
            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none">
              <div className="flex items-center gap-12 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Total Consultations <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Table Panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-8 h-8 border-[3px] border-[#6A8BFF]/30 border-t-[#6A8BFF] rounded-full animate-spin" />
                    <p className="text-sm text-slate-400 font-semibold">Loading patients…</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="9" r="4" strokeWidth={1.5} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    </svg>
                    <p className="text-sm font-semibold">{search ? "No patients match your search" : "No patients yet"}</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-800 tracking-wider">
                        <th className="pb-4 pt-1 font-bold pl-2">
                          <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">Name <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-bold">
                          <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">Total Appointments <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-bold">
                          <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">Last Appointment <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(patient => {
                        const isSelected = selectedId === patient.id;
                        return (
                          <tr
                            key={patient.id}
                            onClick={() => setSelectedId(patient.id)}
                            className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                              isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"
                            }`}
                          >
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-3">
                                <Avatar patient={patient} size="md" />
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                    {patient.fullName}
                                    {age(patient.dateOfBirth) && (
                                      <span className="font-semibold text-slate-400 ml-1">{age(patient.dateOfBirth)}</span>
                                    )}
                                  </p>
                                  <p className="text-[11px] font-semibold text-slate-400 truncate">{patient.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-[13px] text-slate-500 font-medium text-center">
                              {patient.totalAppointments ?? "—"}
                            </td>
                            <td className="py-3 text-[13px] text-slate-500 font-medium text-center">
                              {patient.lastAppointment ? formatDate(patient.lastAppointment) : "—"}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              {isSelected ? (
                                <button
                                  onClick={e => { e.stopPropagation(); router.push(`/dashboard/patients/${patient.id}`); }}
                                  className="bg-[#6A8BFF] text-white text-[12px] font-bold px-6 py-2 rounded-full shadow-md shadow-blue-200/50 transition"
                                >
                                  View Details
                                </button>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); router.push(`/dashboard/patients/${patient.id}`); }}
                                  className="text-[12px] font-bold text-slate-500 mr-6 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
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
                )}
              </div>

              {/* Pagination */}
              {!loading && filtered.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition" aria-label="Previous">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${n === 1 ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{n}</button>
                  ))}
                  <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition" aria-label="Next">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Patient Details Panel */}
          {selectedPatient && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Patient Details</h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Avatar + name */}
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar patient={selectedPatient} size="lg" />
                  <div>
                    <h3 className="text-[14px] font-black text-slate-800">{selectedPatient.fullName}</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedPatient.email}</p>
                  </div>
                </div>
                {selectedPatient.bio && (
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">{selectedPatient.bio}</p>
                )}
              </div>

              {/* Details card */}
              <div className="bg-[#f8fafd] rounded-[1.5rem] p-6 space-y-5 mb-6">
                {selectedPatient.emiratesId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Emirates ID</span>
                    <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.emiratesId}</span>
                  </div>
                )}
                {selectedPatient.gender && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Gender</span>
                    <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.gender}</span>
                  </div>
                )}
                {selectedPatient.dateOfBirth && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Date of Birth</span>
                    <span className="text-[11px] text-slate-800 font-bold">{formatDate(selectedPatient.dateOfBirth)}</span>
                  </div>
                )}
                {selectedPatient.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Contact Number</span>
                    <span className="text-[11px] text-slate-800 font-bold">{selectedPatient.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Email ID</span>
                  <span className="text-[11px] text-slate-800 font-bold truncate max-w-[170px]">{selectedPatient.email}</span>
                </div>
                {selectedPatient.address && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Location</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-800 font-bold text-right max-w-[160px] truncate">{selectedPatient.address}</span>
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
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
