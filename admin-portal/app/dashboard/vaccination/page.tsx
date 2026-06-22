"use client";

import { useState, useEffect } from "react";
import Pagination from "@/components/Pagination";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

interface Vaccine {
  id: string;
  name: string;
  manufacturer?: string;
  vaccineType?: string;
  category?: string;
  description?: string;
  recommendedFor?: string;
  ageRange?: string;
  targetGroups?: string[];
  doseSchedule?: string;
  howAdministered?: string;
  sideEffects?: string;
  patientInstructions?: string;
  price: number;
  originalPrice?: number;
  doses_required?: number;
  age_group?: string;
  is_active: boolean;
  createdAt?: string;
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

export default function ManageVaccinationPage() {
  const router = useRouter();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVaccineId, setSelectedVaccineId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const selected = vaccines.find(v => v.id === selectedVaccineId) ?? null;

  useEffect(() => {
    adminFetch("/api/admin/vaccines")
      .then(r => r.json())
      .then(data => {
        setVaccines(Array.isArray(data) ? data : []);
        if (data?.length) setSelectedVaccineId(data[0].id);
      })
      .catch(() => setVaccines([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vaccines.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.manufacturer ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (v.vaccineType ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const res = await adminFetch(`/api/admin/vaccines/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const updated = await res.json();
        setVaccines(prev => prev.map(v => v.id === id ? updated : v));
      }
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selected ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Vaccines</h1>
              <button
                onClick={() => router.push("/dashboard/vaccination/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Vaccine
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search vaccines..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-100 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
              </div>
            </div>

            {/* Sort row */}
            <div className="flex items-center justify-between text-[13px] font-semibold text-[#64748B] select-none mt-2">
              <div className="flex items-center gap-8 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Name <DoubleCaret /></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Type <DoubleCaret /></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Price <DoubleCaret /></span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[500px] flex flex-col justify-between">
              {loading ? (
                <div className="flex items-center justify-center flex-1 py-20">
                  <div className="w-8 h-8 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800 tracking-wider">
                        <th className="pb-4 pt-1 font-semibold pl-2">Name</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Type</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Doses</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Price</th>
                        <th className="pb-4 pt-1 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(vaccine => {
                        const isSelected = selectedVaccineId === vaccine.id;
                        return (
                          <tr
                            key={vaccine.id}
                            onClick={() => setSelectedVaccineId(isSelected ? null : vaccine.id)}
                            className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                                  <svg className="w-4 h-4 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m18 2 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m17 7 3-3" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 19-3 3" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14 4 6 6" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-blue-500 transition-colors">{vaccine.name}</p>
                                  {vaccine.manufacturer && <p className="text-[11px] text-slate-400 font-medium">{vaccine.manufacturer}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-[12px] text-slate-500 font-medium text-center">
                              {vaccine.vaccineType ?? vaccine.age_group ?? "General"}
                            </td>
                            <td className="py-4 text-[12px] text-slate-500 font-medium text-center">
                              {vaccine.doses_required ?? 1}
                            </td>
                            <td className="py-4 text-[13px] font-semibold text-slate-700 text-center">
                              AED {vaccine.price.toFixed(2)}
                            </td>
                            <td className="py-4 text-center">
                              <button
                                onClick={e => { e.stopPropagation(); handleToggle(vaccine.id); }}
                                disabled={togglingId === vaccine.id}
                                className={`px-3 py-1 rounded-full text-[10px] font-semibold transition ${vaccine.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                              >
                                {togglingId === vaccine.id ? "..." : vaccine.is_active ? "Active" : "Inactive"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {paged.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 text-[13px] font-medium">
                            {search ? `No vaccines found for "${search}"` : "No vaccines added yet. Click 'Add Vaccine' to get started."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 border-t border-slate-50 pt-5">
                {paged.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(paged.length / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
              )}
            </div>
          </div>

          {/* RIGHT — Vaccine Detail Panel */}
          {selected && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Vaccine Details</h2>
                <button
                  onClick={() => setSelectedVaccineId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Vaccine Header */}
              <div className="mb-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18 2 4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m17 7 3-3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 4 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 19-3 3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14 4 6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-slate-800">{selected.name}</h3>
                  {selected.manufacturer && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selected.manufacturer}</p>}
                </div>
              </div>

              {/* Status badge */}
              <div className="mb-5">
                <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${selected.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  {selected.is_active ? "● Active" : "○ Inactive"}
                </span>
              </div>

              {/* Target groups chips */}
              {(selected.targetGroups?.length ?? 0) > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-slate-400 mb-2">Target Groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.targetGroups!.map(g => (
                      <span key={g} className="px-2.5 py-1 bg-[#EEF2FF] text-[#6A8BFF] text-[10px] font-semibold rounded-full">{g}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-4 mb-6 px-1">
                {[
                  { label: "Vaccine Type", value: selected.vaccineType ?? selected.age_group ?? "General" },
                  { label: "Category", value: selected.category ?? "—" },
                  { label: "Age Range", value: selected.ageRange ?? "—" },
                  { label: "Doses Required", value: String(selected.doses_required ?? 1) },
                  { label: "Price", value: `AED ${selected.price.toFixed(2)}` },
                  { label: "Original Price", value: selected.originalPrice ? `AED ${selected.originalPrice.toFixed(2)}` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2 shrink-0">{label}</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{value}</span>
                  </div>
                ))}
              </div>

              {/* Rich text fields */}
              {[
                { label: "About", value: selected.description },
                { label: "Recommended For", value: selected.recommendedFor },
                { label: "Dose Schedule", value: selected.doseSchedule },
                { label: "How Administered", value: selected.howAdministered },
                { label: "Side Effects", value: selected.sideEffects },
                { label: "Patient Instructions", value: selected.patientInstructions },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} className="mb-4 px-1">
                  <p className="text-[11px] font-semibold text-slate-400 mb-1">{label}</p>
                  <p className="text-[12px] text-slate-700 leading-relaxed">{value}</p>
                </div>
              ))}

              {/* Toggle button */}
              <button
                onClick={() => handleToggle(selected.id)}
                disabled={togglingId === selected.id}
                className={`w-full py-3.5 rounded-[1rem] text-[13px] font-semibold transition duration-200 mt-2 ${selected.is_active ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-[#6A8BFF] text-white hover:bg-[#5a7ae6] shadow-[0_4px_10px_rgba(84,118,252,0.2)]"}`}
              >
                {togglingId === selected.id ? "Updating..." : selected.is_active ? "Deactivate Vaccine" : "Activate Vaccine"}
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
