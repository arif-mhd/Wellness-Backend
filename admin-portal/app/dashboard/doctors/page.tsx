"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

// ── Types ────────────────────────────────────────────────────────────────────
interface Doctor {
  id:           string;
  supertokens_id: string;
  fullName:     string;
  email:        string;
  phone:        string;
  gender:       string | null;
  dateOfBirth:  string | null;
  emiratesId:   string | null;
  specialty:    string | null;
  license:      string | null;
  bio:          string | null;
  fees:         string | null;
  languages:    string | null;
  status:       "pending_approval" | "approved" | "rejected";
  registeredAt: string;
  approvedAt:   string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Helper: fetch with admin auth header ─────────────────────────────────────
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
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" />
    </svg>
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ManageDoctorsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]           = useState<"onboard" | "queue">("queue");
  const [doctors, setDoctors]               = useState<Doctor[]>([]);
  const [queue, setQueue]                   = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState("");
  const [isSearchOpen, setIsSearchOpen]     = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [fetchError, setFetchError]         = useState("");
  const [approveError, setApproveError]     = useState("");

  // ── Fetch both lists ───────────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    setFetchError("");
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        adminFetch("/api/admin/doctors/pending"),
        adminFetch("/api/admin/doctors/approved"),
      ]);

      if (pendingRes.ok) {
        const { doctors: pending } = await pendingRes.json();
        setQueue(pending);
        if (activeTab === "queue" && pending.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(pending[0].id);
        }
      }

      if (approvedRes.ok) {
        const { doctors: approved } = await approvedRes.json();
        setDoctors(approved);
        if (activeTab === "onboard" && approved.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(approved[0].id);
        }
      }
    } catch {
      setFetchError("Could not load doctors. Make sure the backend is running.");
    }
  }, [activeTab, selectedDoctorId]);

  useEffect(() => {
    fetchDoctors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Approve action ─────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    setLoadingApprove(true);
    setApproveError("");
    try {
      const res = await adminFetch(`/api/admin/doctors/${id}/approve`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        // Move doctor from queue → onboard in local state
        const approved = queue.find((d) => d.id === id);
        if (approved) {
          setQueue((prev) => prev.filter((d) => d.id !== id));
          setDoctors((prev) => [{ ...approved, status: "approved", approvedAt: new Date().toISOString() }, ...prev]);
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

  const currentList  = activeTab === "onboard" ? doctors : queue;
  const filteredList = currentList.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.fullName?.toLowerCase().includes(q) ||
      doc.email?.toLowerCase().includes(q) ||
      doc.specialty?.toLowerCase().includes(q)
    );
  });

  const selectedDoctor =
    doctors.find((d) => d.id === selectedDoctorId) ||
    queue.find((d)   => d.id === selectedDoctorId);

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto space-y-7 pb-12 font-sans">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Doctors</h1>
          </div>
          <button
            onClick={() => router.push("/dashboard/doctors/add")}
            className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[13px] font-bold px-6 py-3 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Doctor
          </button>
        </div>

        {/* ── Error banners ── */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm">
            {fetchError}
          </div>
        )}
        {approveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-3 text-sm">
            {approveError}
          </div>
        )}

        {/* ── Tab row ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none px-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveTab("onboard");
                setSelectedDoctorId(doctors[0]?.id ?? null);
              }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                activeTab === "onboard"
                  ? "bg-[#1E293B] text-white shadow-md shadow-slate-200"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              Doctors Onboard
              {doctors.length > 0 && (
                <span className="ml-2 bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {activeTab === "onboard" ? doctors.length : <span className="text-slate-400">{doctors.length}</span>}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("queue");
                setSelectedDoctorId(queue[0]?.id ?? null);
              }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 ${
                activeTab === "queue"
                  ? "bg-[#1E293B] text-white shadow-md shadow-slate-200"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              Onboarding Queue
              {queue.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === "queue" ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"
                }`}>
                  {queue.length}
                </span>
              )}
            </button>

            {/* Search */}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctor..."
                  className="border border-slate-200 bg-white rounded-full px-4 py-2 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-44 shadow-sm"
                  autoFocus
                />
              )}
            </div>
          </div>

          <button
            onClick={fetchDoctors}
            className="text-[12px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── Column headers ── */}
        <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] px-3 select-none">
          <div className="flex items-center gap-12 flex-1">
            <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition">
              Name <DoubleCaret />
            </span>
            {activeTab === "onboard" && (
              <>
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition">
                  Specialty <DoubleCaret />
                </span>
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition">
                  Joined <DoubleCaret />
                </span>
              </>
            )}
            {activeTab === "queue" && (
              <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition">
                Applied <DoubleCaret />
              </span>
            )}
          </div>
        </div>

        {/* ── Split grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* Left: table */}
          <div className={`${selectedDoctor ? "lg:col-span-8" : "lg:col-span-12"} bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[400px] flex flex-col justify-between`}>

            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-slate-400 gap-3">
                <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-[13px] font-semibold">
                  {activeTab === "queue" ? "No pending applications" : "No doctors onboarded yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {filteredList.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {/* Avatar initials */}
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[11px] font-black">
                                  {doc.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "?"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                  {doc.fullName}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 truncate">{doc.email}</p>
                              </div>
                            </div>
                          </td>

                          {activeTab === "onboard" && (
                            <>
                              <td className="py-3 text-[12px] text-slate-500 font-semibold">
                                {doc.specialty || "—"}
                              </td>
                              <td className="py-3 text-[12px] text-slate-400 font-medium">
                                {doc.approvedAt ? new Date(doc.approvedAt).toLocaleDateString() : "—"}
                              </td>
                            </>
                          )}

                          {activeTab === "queue" && (
                            <>
                              <td className="py-3 text-[12px] text-slate-400 font-medium">
                                {new Date(doc.registeredAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 text-[11px] font-bold px-3 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Pending
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: doctor details panel */}
          {selectedDoctor && (
            <div className="lg:col-span-4 bg-[#F6F9FF] rounded-[2rem] shadow-sm border border-white p-7">

              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Doctor Details</h2>
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile card */}
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-[18px] font-black">
                      {selectedDoctor.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "?"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-slate-800">{selectedDoctor.fullName}</h3>
                    {selectedDoctor.license && (
                      <p className="text-[10px] font-bold text-[#6A8BFF] uppercase tracking-wide mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded">
                        LICENSE {selectedDoctor.license}
                      </p>
                    )}
                    {/* Status badge */}
                    <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${
                      selectedDoctor.status === "approved"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedDoctor.status === "approved" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                      }`} />
                      {selectedDoctor.status === "approved" ? "Approved" : "Pending Approval"}
                    </div>
                  </div>
                </div>
              </div>

              {selectedDoctor.specialty && (
                <div className="mb-4 px-1">
                  <span className="inline-block px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-black tracking-wide uppercase">
                    {selectedDoctor.specialty}
                  </span>
                </div>
              )}

              {selectedDoctor.bio && (
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-5 px-1">
                  {selectedDoctor.bio}
                </p>
              )}

              {/* Details table */}
              <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-4 mb-6">
                {[
                  { label: "Email",        value: selectedDoctor.email },
                  { label: "Phone",        value: selectedDoctor.phone },
                  { label: "Gender",       value: selectedDoctor.gender },
                  { label: "Date of Birth",value: selectedDoctor.dateOfBirth },
                  { label: "Emirates ID",  value: selectedDoctor.emiratesId },
                  { label: "Applied On",   value: selectedDoctor.registeredAt ? new Date(selectedDoctor.registeredAt).toLocaleDateString() : null },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-bold">{label}</span>
                      <span className="text-[11px] text-slate-800 font-bold truncate max-w-[160px]">{value}</span>
                    </div>
                  ) : null
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {activeTab === "queue" && (
                  <button
                    onClick={() => handleApprove(selectedDoctor.id)}
                    disabled={loadingApprove}
                    className="w-full py-3.5 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loadingApprove ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Approving…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Complete Onboarding
                      </>
                    )}
                  </button>
                )}
                {activeTab === "onboard" && (
                  <button
                    onClick={() => router.push(`/dashboard/doctors/${selectedDoctor.id}`)}
                    className="w-full py-3.5 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98]"
                  >
                    View Detailed Profile
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
