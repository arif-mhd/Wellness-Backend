"use client";

import Pagination from "@/components/Pagination";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Doctor {
  id: string;
  supertokens_id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  emiratesId: string | null;
  specialty: string | null;
  license: string | null;
  bio: string | null;
  fees: string | null;
  languages: string | null;
  avatarUrl?: string | null;
  status: "pending_approval" | "approved" | "rejected";
  registeredAt: string;
  approvedAt: string | null;
  consultations?: number;
  avgConsultation?: number;
  prescriptions?: number;
  rating?: number;
}

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

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-40 ml-1.5 shrink-0">
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex items-center justify-center gap-[3px]">
    {Array.from({ length: 5 }).map((_, i) => {
      const filled = i < (rating ?? 0);
      return (
        <svg key={i} className={`w-3.5 h-3.5 ${filled ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#6A8BFF] opacity-25"}`} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    })}
  </div>
);

function DoctorAvatar({ doctor, size = "md" }: { doctor: Doctor; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-16 h-16 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-[11px]";
  if (doctor.avatarUrl) {
    return <img src={doctor.avatarUrl} alt={doctor.fullName} className={`${sz} rounded-full object-cover border border-slate-100 shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-medium shrink-0`}>
      {doctor.fullName?.split(" ").slice(0, 2).map(n => n[0]).join("") || "?"}
    </div>
  );
}

function ManageDoctorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState<"onboard" | "queue">("onboard");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [queue, setQueue] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [approveError, setApproveError] = useState("");

  const fetchDoctors = useCallback(async () => {
    setFetchError("");
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        adminFetch("/api/admin/doctors/pending"),
        adminFetch("/api/admin/doctors/approved"),
      ]);
      if (!pendingRes.ok) {
        const b = await pendingRes.json().catch(() => ({}));
        setFetchError(pendingRes.status === 403 ? "Access denied — admin role required." : b.error ?? `Error ${pendingRes.status}`);
        return;
      }
      if (!approvedRes.ok) {
        const b = await approvedRes.json().catch(() => ({}));
        setFetchError(b.error ?? `Error ${approvedRes.status}`);
        return;
      }
      const { doctors: pending } = await pendingRes.json();
      const { doctors: approved } = await approvedRes.json();
      setQueue(pending ?? []);
      setDoctors(approved ?? []);

      if (targetId) {
        if (pending?.some((d: Doctor) => d.id === targetId)) {
          setActiveTab("queue");
          setSelectedDoctorId(targetId);
          return;
        }
        if (approved?.some((d: Doctor) => d.id === targetId)) {
          setActiveTab("onboard");
          setSelectedDoctorId(targetId);
          return;
        }
      }

      if (!selectedDoctorId) {
        if (approved?.length > 0) setSelectedDoctorId(approved[0].id);
        else if (pending?.length > 0) { setActiveTab("queue"); setSelectedDoctorId(pending[0].id); }
      }
    } catch {
      setFetchError("Could not reach the backend.");
    }
  }, [targetId]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleApprove = async (id: string) => {
    setLoadingApprove(true);
    setApproveError("");
    try {
      const res = await adminFetch(`/api/admin/doctors/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const approved = queue.find(d => d.id === id);
        if (approved) {
          setQueue(prev => prev.filter(d => d.id !== id));
          setDoctors(prev => [{ ...approved, status: "approved", approvedAt: new Date().toISOString() }, ...prev]);
        }
        setSelectedDoctorId(null);
        setActiveTab("onboard");
      } else {
        setApproveError(data.error || "Approval failed.");
      }
    } catch {
      setApproveError("Cannot reach the server.");
    } finally {
      setLoadingApprove(false);
    }
  };

  const currentList = activeTab === "onboard" ? doctors : queue;
  const sortedDoctors = currentList.filter(doc => {
    const q = searchQuery.toLowerCase();
    return !q || doc.fullName?.toLowerCase().includes(q) || doc.email?.toLowerCase().includes(q) || doc.specialty?.toLowerCase().includes(q);
  });

  const selectedDoctor = [...doctors, ...queue].find(d => d.id === selectedDoctorId) ?? null;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300" style={{ fontFamily: 'Outfit, sans-serif' }}>

        {(fetchError || approveError) && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {fetchError || approveError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selectedDoctor ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Doctors</h1>
              <button
                onClick={() => router.push("/dashboard/doctors/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Doctor
              </button>
            </div>

            {/* Tab & search row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setActiveTab("onboard"); setSelectedDoctorId(doctors[0]?.id ?? null); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                    activeTab === "onboard" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
                  }`}
                >
                  Doctors Onboard
                </button>
                <button
                  onClick={() => { setActiveTab("queue"); setSelectedDoctorId(queue[0]?.id ?? null); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
                    activeTab === "queue" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
                  }`}
                >
                  Onboarding Queue
                  {queue.length > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${activeTab === "queue" ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"}`}>
                      {queue.length}
                    </span>
                  )}
                </button>

                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-sm ml-1"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {isSearchOpen && (
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search doctor..."
                      className="border border-slate-200 bg-white rounded-full px-4 py-2 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-44 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="text-[13px] font-medium text-slate-500 flex items-center gap-1.5 hover:text-slate-800 transition">
                  Today
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <button onClick={fetchDoctors} className="text-[12px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Sort labels */}
            <div className="flex items-center justify-between text-[13px] font-medium text-[#64748B] px-3 select-none">
              <div className="flex items-center gap-12 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Total Consultation <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Diagnosis <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition mr-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
            </div>

            {/* Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">

                {sortedDoctors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                    <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[13px] font-semibold">
                      {activeTab === "queue" ? "No pending applications" : "No doctors onboarded yet"}
                    </p>
                  </div>
                ) : activeTab === "onboard" ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        <th className="pb-4 pt-1 font-medium pl-2">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">Name <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-medium text-center">
                          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">No. of Consultation <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-medium text-center">
                          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">Avg. Consultation <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-medium text-center">
                          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">No. of Prescription <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-medium text-center">
                          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">Ratings <DoubleCaret /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(doc => {
                        const isSelected = selectedDoctorId === doc.id;
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDoctorId(doc.id)}
                            className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-3 px-2 flex items-center gap-3">
                              <div className="relative shrink-0">
                                <DoctorAvatar doctor={doc} size="md" />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-white rounded-full" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 group-hover:text-blue-500 transition-colors truncate">{doc.fullName}</p>
                                <p className="text-[11px] font-normal text-slate-400 truncate">{doc.email}</p>
                              </div>
                            </td>
                            <td className="py-3 text-[13px] text-slate-700 font-medium text-center">{doc.consultations ?? 0}</td>
                            <td className="py-3 text-[13px] text-slate-700 font-medium text-center">{doc.avgConsultation ?? 0}</td>
                            <td className="py-3 text-[13px] text-slate-700 font-medium text-center">{doc.prescriptions ?? 0}</td>
                            <td className="py-3 text-center"><StarRow rating={doc.rating ?? 0} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        <th className="pb-4 pt-1 font-medium pl-2">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">Name <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(doc => {
                        const isSelected = selectedDoctorId === doc.id;
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setSelectedDoctorId(doc.id)}
                            className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${isSelected ? "bg-[#f8fafd] rounded-2xl" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-3 px-2 flex items-center gap-3">
                              <div className="relative shrink-0">
                                <DoctorAvatar doctor={doc} size="md" />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 border-2 border-white rounded-full" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 group-hover:text-blue-500 transition-colors truncate">{doc.fullName}</p>
                                <p className="text-[11px] font-normal text-slate-400 truncate">{doc.email}</p>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              {isSelected ? (
                                <button className="bg-[#6A8BFF] text-white text-[11px] font-medium px-6 py-2 rounded-full shadow-[0_4px_10px_rgba(84,118,252,0.2)]">
                                  Verify Manually
                                </button>
                              ) : (
                                <span className="text-[12px] font-medium text-slate-800 mr-6">Verify Manually</span>
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
              {sortedDoctors.length > 0 && (
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={Math.ceil(sortedDoctors.length / itemsPerPage)} 
                  onPageChange={setCurrentPage} 
                />
              )}</div>
          </div>

          {/* RIGHT — Doctor Details Panel */}
          {selectedDoctor && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Doctor Details</h2>
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Profile card */}
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <DoctorAvatar doctor={selectedDoctor} size="lg" />
                    <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${selectedDoctor.status === "approved" ? "bg-[#10b981]" : "bg-amber-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-slate-800">{selectedDoctor.fullName}</h3>
                    {selectedDoctor.license && (
                      <p className="text-[10px] font-medium text-[#6A8BFF] uppercase tracking-wide mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded">
                        LICENSE NUMBER {selectedDoctor.license}
                      </p>
                    )}
                    <div className="mt-2"><StarRow rating={selectedDoctor.rating ?? 0} /></div>
                  </div>
                </div>
              </div>

              {/* Specialty + bio */}
              <div className="mb-6 px-1">
                {selectedDoctor.specialty && (
                  <span className="inline-block px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-medium tracking-wide uppercase mb-4">
                    {selectedDoctor.specialty}
                  </span>
                )}
                {selectedDoctor.bio && (
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-4">{selectedDoctor.bio}</p>
                )}
              </div>

              {/* Details */}
              <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-5 mb-6">
                {[
                  { label: "Emirates ID",               value: selectedDoctor.emiratesId },
                  { label: "Gender",                    value: selectedDoctor.gender },
                  { label: "Date of Birth",             value: selectedDoctor.dateOfBirth },
                  { label: "Contact Number",            value: selectedDoctor.phone },
                  { label: "Email ID",                  value: selectedDoctor.email },
                  { label: "General Consultation Fees", value: selectedDoctor.fees },
                  { label: "Languages",                 value: selectedDoctor.languages },
                  {
                    label: activeTab === "queue" ? "Applied On" : "Approved On",
                    value: activeTab === "queue"
                      ? new Date(selectedDoctor.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : selectedDoctor.approvedAt
                        ? new Date(selectedDoctor.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : null,
                  },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">{label}</span>
                    <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/dashboard/doctors/${selectedDoctor.id}`)}
                  className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
                >
                  View Detailed Profile
                </button>
                {activeTab === "queue" && (
                  <button
                    onClick={() => handleApprove(selectedDoctor.id)}
                    disabled={loadingApprove}
                    className="w-full py-3.5 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loadingApprove ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Approving…
                      </>
                    ) : "Complete Onboarding"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ManageDoctorsPage() {
  return (
    <Suspense fallback={null}>
      <ManageDoctorsPageInner />
    </Suspense>
  );
}
