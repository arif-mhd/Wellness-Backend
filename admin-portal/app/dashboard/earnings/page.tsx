"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import Pagination from "@/components/Pagination";
import ProtectedRoute from "@/components/ProtectedRoute";

// ─────────────────────────────────────────────────────────────────────────
// Real, backend-driven clinic-wise and doctor-wise consultation earnings
// (GET /api/admin/earnings/*) — replaces the previous flat mock transaction
// table. Pharmacy/Lab/Radiology have no earnings tracking anywhere in the
// system yet, so those tabs are left as "Coming Soon" rather than showing
// fabricated numbers.
// ─────────────────────────────────────────────────────────────────────────

interface Summary { totalEarnings: number; cashEarnings: number; insuranceEarnings: number; }
interface ClinicRow {
  id: string; name: string; avatarUrl: string | null; branchCount: number; doctorCount: number;
  totalEarnings: number; cashEarnings: number; insuranceEarnings: number;
}
interface DoctorRow {
  id: string; fullName: string; specialty?: string | null; avatarUrl?: string | null;
  totalEarnings: number; cashEarnings: number; insuranceEarnings: number;
}

const TABS = [
  { key: "consultations", label: "Consultations" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "lab", label: "Lab" },
  { key: "radiology", label: "Radiology" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fmtMoney(n: number): string {
  return `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold text-xs shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatCard({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex-1">
      <span className="text-slate-500 text-xs font-medium">{label}</span>
      <span className="text-[#1e293b] text-[24px] font-semibold tracking-tight">{amount}</span>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-16 flex flex-col items-center justify-center gap-3 min-h-[400px]">
      <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="text-slate-700 font-medium text-sm">{label} earnings — Coming Soon</p>
      <p className="text-slate-400 text-xs text-center max-w-xs">Earnings tracking for {label.toLowerCase()} orders isn&apos;t wired up yet.</p>
    </div>
  );
}

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("consultations");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicSearch, setClinicSearch] = useState("");
  const [clinicPage, setClinicPage] = useState(1);
  const clinicsPerPage = 8;

  const [selectedClinic, setSelectedClinic] = useState<{ id: string; name: string } | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<DoctorRow[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorPage, setDoctorPage] = useState(1);
  const doctorsPerPage = 8;

  useEffect(() => {
    if (activeTab !== "consultations") return;
    setLoadingClinics(true);
    Promise.all([
      apiFetch("/api/admin/earnings/summary").then((r) => r.json()),
      apiFetch("/api/admin/earnings/clinics").then((r) => r.json()),
    ])
      .then(([s, c]) => {
        setSummary(s);
        setClinics(Array.isArray(c.clinics) ? c.clinics : []);
      })
      .catch(() => { setSummary(null); setClinics([]); })
      .finally(() => setLoadingClinics(false));
  }, [activeTab]);

  useEffect(() => {
    if (!selectedClinic) return;
    setLoadingDoctors(true);
    apiFetch(`/api/admin/earnings/clinics/${selectedClinic.id}/doctors`)
      .then((r) => r.json())
      .then((d) => setClinicDoctors(Array.isArray(d.doctors) ? d.doctors : []))
      .catch(() => setClinicDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [selectedClinic]);

  const filteredClinics = useMemo(() => {
    if (!clinicSearch) return clinics;
    const q = clinicSearch.toLowerCase();
    return clinics.filter((c) => c.name.toLowerCase().includes(q));
  }, [clinics, clinicSearch]);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Consultations & Earnings</h1>
          <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white px-5 py-2.5 rounded-xl text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition self-start sm:self-auto">
            Export Report
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedClinic(null); }}
              className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === tab.key ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== "consultations" ? (
          <ComingSoon label={TABS.find((t) => t.key === activeTab)!.label} />
        ) : (
          <>
            {/* Summary cards */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <StatCard label="Total Earnings" amount={summary ? fmtMoney(summary.totalEarnings) : "—"} />
              <StatCard label="Cash Earnings" amount={summary ? fmtMoney(summary.cashEarnings) : "—"} />
              <StatCard label="Insurance Earnings" amount={summary ? fmtMoney(summary.insuranceEarnings) : "—"} />
            </div>

            {selectedClinic ? (
              /* ── Doctor-wise breakdown for the selected clinic ── */
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[600px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setSelectedClinic(null)}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-[18px] font-medium text-[#1e293b]">{selectedClinic.name} — Doctor Earnings</h2>
                  </div>

                  {loadingDoctors ? (
                    <div className="py-16 text-center text-[13px] text-slate-400">Loading…</div>
                  ) : clinicDoctors.length === 0 ? (
                    <div className="py-16 text-center text-[13px] text-slate-400">No doctors with completed, paid consultations yet.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-full">
                        <thead>
                          <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-500">
                            <th className="pb-4 pt-1 font-medium">Doctor</th>
                            <th className="pb-4 pt-1 font-medium">Specialty</th>
                            <th className="pb-4 pt-1 font-medium text-right">Total Earnings</th>
                            <th className="pb-4 pt-1 font-medium text-right">Cash</th>
                            <th className="pb-4 pt-1 font-medium text-right">Insurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clinicDoctors.slice((doctorPage - 1) * doctorsPerPage, doctorPage * doctorsPerPage).map((d) => (
                            <tr key={d.id} className="border-b border-slate-50 last:border-0 h-[64px]">
                              <td className="py-2">
                                <div className="flex items-center gap-3">
                                  <Avatar name={d.fullName} url={d.avatarUrl} />
                                  <span className="text-[13px] font-medium text-slate-800">{d.fullName}</span>
                                </div>
                              </td>
                              <td className="py-2 text-[12.5px] text-slate-500">{d.specialty ?? "—"}</td>
                              <td className="py-2 text-[13px] font-semibold text-slate-800 text-right">{fmtMoney(d.totalEarnings)}</td>
                              <td className="py-2 text-[12.5px] text-slate-500 text-right">{fmtMoney(d.cashEarnings)}</td>
                              <td className="py-2 text-[12.5px] text-slate-500 text-right">{fmtMoney(d.insuranceEarnings)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col gap-4 mt-2">
                      {clinicDoctors.slice((doctorPage - 1) * doctorsPerPage, doctorPage * doctorsPerPage).map((d) => (
                        <div key={d.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 relative">
                          <div className="flex items-center gap-3">
                            <Avatar name={d.fullName} url={d.avatarUrl} />
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold text-slate-800">{d.fullName}</span>
                              <span className="text-[12px] text-slate-500">{d.specialty ?? "—"}</span>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-50 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Total Earnings</span>
                              <span className="text-[13px] font-semibold text-slate-800">{fmtMoney(d.totalEarnings)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Cash</span>
                              <span className="text-[12px] font-medium text-slate-600">{fmtMoney(d.cashEarnings)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Insurance</span>
                              <span className="text-[12px] font-medium text-slate-600">{fmtMoney(d.insuranceEarnings)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  )}
                </div>
                {clinicDoctors.length > 0 && (
                  <Pagination currentPage={doctorPage} totalPages={Math.ceil(clinicDoctors.length / doctorsPerPage)} onPageChange={setDoctorPage} />
                )}
              </div>
            ) : (
              /* ── Clinic-wise rollup ── */
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[600px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[18px] font-medium text-[#1e293b]">Clinics</h2>
                    <input
                      type="text"
                      value={clinicSearch}
                      onChange={(e) => { setClinicSearch(e.target.value); setClinicPage(1); }}
                      placeholder="Search clinics…"
                      className="w-56 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30"
                    />
                  </div>

                  {loadingClinics ? (
                    <div className="py-16 text-center text-[13px] text-slate-400">Loading…</div>
                  ) : filteredClinics.length === 0 ? (
                    <div className="py-16 text-center text-[13px] text-slate-400">No clinics with completed, paid consultations yet.</div>
                  ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-full">
                        <thead>
                          <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-500">
                            <th className="pb-4 pt-1 font-medium">Clinic</th>
                            <th className="pb-4 pt-1 font-medium">Branches</th>
                            <th className="pb-4 pt-1 font-medium">Doctors</th>
                            <th className="pb-4 pt-1 font-medium text-right">Total Earnings</th>
                            <th className="pb-4 pt-1 font-medium text-right">Cash</th>
                            <th className="pb-4 pt-1 font-medium text-right">Insurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClinics.slice((clinicPage - 1) * clinicsPerPage, clinicPage * clinicsPerPage).map((c) => (
                            <tr
                              key={c.id}
                              onClick={() => setSelectedClinic({ id: c.id, name: c.name })}
                              className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors h-[68px]"
                            >
                              <td className="py-2">
                                <div className="flex items-center gap-3">
                                  <Avatar name={c.name} url={c.avatarUrl} />
                                  <span className="text-[13px] font-medium text-slate-800">{c.name}</span>
                                </div>
                              </td>
                              <td className="py-2 text-[12.5px] text-slate-500">{c.branchCount}</td>
                              <td className="py-2 text-[12.5px] text-slate-500">{c.doctorCount}</td>
                              <td className="py-2 text-[13px] font-semibold text-slate-800 text-right">{fmtMoney(c.totalEarnings)}</td>
                              <td className="py-2 text-[12.5px] text-slate-500 text-right">{fmtMoney(c.cashEarnings)}</td>
                              <td className="py-2 text-[12.5px] text-slate-500 text-right">{fmtMoney(c.insuranceEarnings)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col gap-4 mt-2">
                      {filteredClinics.slice((clinicPage - 1) * clinicsPerPage, clinicPage * clinicsPerPage).map((c) => (
                        <div key={c.id} onClick={() => setSelectedClinic({ id: c.id, name: c.name })} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 relative cursor-pointer active:scale-[0.98] transition-transform">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} url={c.avatarUrl} />
                            <span className="text-[14px] font-semibold text-slate-800">{c.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-slate-500 font-medium">Branches: {c.branchCount}</span>
                            <span className="text-[12px] text-slate-500 font-medium">Doctors: {c.doctorCount}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-50 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Total Earnings</span>
                              <span className="text-[13px] font-semibold text-slate-800">{fmtMoney(c.totalEarnings)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Cash</span>
                              <span className="text-[12px] font-medium text-slate-600">{fmtMoney(c.cashEarnings)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Insurance</span>
                              <span className="text-[12px] font-medium text-slate-600">{fmtMoney(c.insuranceEarnings)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  )}
                </div>
                {filteredClinics.length > 0 && (
                  <Pagination currentPage={clinicPage} totalPages={Math.ceil(filteredClinics.length / clinicsPerPage)} onPageChange={setClinicPage} />
                )}
              </div>
            )}
          </>
        )}

      </div>
    </ProtectedRoute>
  );
}
