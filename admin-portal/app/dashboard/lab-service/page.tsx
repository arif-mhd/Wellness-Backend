"use client";

import Pagination from "@/components/Pagination";
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

interface LabService {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  location: string;
  director?: string;
  manager?: string;
  labLicense?: string;
  healthAuthorityLicense?: string;
  accreditationNumber?: string;
  specializations: string[];
  totalTests: number;
  rating: number;
  createdAt: string;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1 justify-center">
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-3.5 h-3.5 ${i < rating ? "text-[#6A8BFF]" : "text-slate-200"}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

function Avatar({ lab, size = "md" }: { lab: LabService; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : size === "xl" ? "w-[3.5rem] h-[3.5rem] text-xl" : "w-10 h-10 text-sm";
  const name = lab.name || "?";
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium shadow-sm`}>
        {name[0].toUpperCase()}
      </div>
    </div>
  );
}

export default function ManageLabServicePage() {
  const router = useRouter();
  const [labs, setLabs] = useState<LabService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchLabs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/lab");
      if (res.ok) {
        const { labs: data } = await res.json();
        const list: LabService[] = data ?? [];
        setLabs(list);
        setSelectedLabId((prev) => prev ?? list[0]?.id ?? null);
      }
    } catch {
      setLabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  const selectedLab = labs.find((l) => l.id === selectedLabId) ?? null;

  const displayedLabs = labs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.director ?? "").toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q) ||
      l.specializations.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT COLUMN */}
          <div className={`${selectedLab ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">
                Manage Lab Services
              </h1>
              <button
                onClick={() => router.push("/dashboard/lab-service/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Lab Service
              </button>
            </div>

            {/* Search Row */}
            <div className="flex items-center justify-end mt-2">
              <div className="flex items-center gap-2">
                {searchOpen && (
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search labs…"
                    className="w-44 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm"
                  />
                )}
                <button
                  onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearch(""); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border transition ${searchOpen ? "bg-[#6A8BFF] text-white border-[#6A8BFF]" : "bg-white text-slate-400 hover:text-slate-800 border-slate-100"}`}
                >
                  {searchOpen
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Main Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-20 text-center text-[13px] text-slate-400">Loading labs…</div>
                ) : displayedLabs.length === 0 ? (
                  <div className="py-20 text-center text-[13px] text-slate-400">
                    {labs.length === 0 ? "No lab services onboarded yet." : "No labs match your search."}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800 tracking-wider">
                        <th className="pb-4 pt-1 font-semibold pl-2">Name</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Total Tests</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Rating</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lab) => {
                        const isSelected = selectedLabId === lab.id;
                        return (
                          <tr
                            key={lab.id}
                            onClick={() => setSelectedLabId(lab.id)}
                            className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 ${isSelected ? "bg-slate-50/70" : ""}`}
                          >
                            <td className="py-4 px-3 flex items-center gap-3">
                              <Avatar lab={lab} size="md" />
                              <div className="min-w-0 flex flex-col justify-center">
                                <p className="text-[13px] font-semibold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                  {lab.name}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 truncate">{lab.email}</p>
                              </div>
                            </td>
                            <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                              {lab.totalTests.toLocaleString()}
                            </td>
                            <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                              <StarRating rating={lab.rating} />
                            </td>
                            <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                              {fmtDate(lab.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="mt-6 border-t border-slate-50 pt-5">
                {displayedLabs.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(displayedLabs.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Lab Details Panel */}
          {selectedLab && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-semibold text-slate-800 tracking-tight">Lab Details</h2>
                <button
                  onClick={() => setSelectedLabId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header */}
              <div className="mb-6 mt-2 flex items-center gap-4">
                <Avatar lab={selectedLab} size="xl" />
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-800">{selectedLab.name}</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedLab.email}</p>
                </div>
              </div>

              {/* Specializations */}
              {selectedLab.specializations.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-semibold text-slate-400 mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLab.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="px-2.5 py-1 bg-[#EEF2FF] text-[#6A8BFF] text-[10px] font-semibold rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Details List */}
              <div className="space-y-5 px-1">
                {[
                  { label: "Lab License", value: selectedLab.labLicense },
                  { label: "Health Authority License", value: selectedLab.healthAuthorityLicense },
                  { label: "Accreditation No.", value: selectedLab.accreditationNumber },
                  { label: "Director", value: selectedLab.director },
                  { label: "Manager", value: selectedLab.manager },
                  { label: "Location", value: selectedLab.location },
                  { label: "Contact Number", value: selectedLab.contactNumber },
                  { label: "Email ID", value: selectedLab.email },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2 shrink-0">{label}</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
