"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Doctor {
  id: string;
  clinicId?: string | null;
  fullName: string;
  email: string;
  phone?: string;
  license?: string | null;
  emiratesId?: string | null;
  gender?: string | null;
  specialty?: string | null;
  specializations?: { name: string }[];
  qualification?: string | null;
  address?: string | null;
  languages?: string[] | string | null;
  fees?: number | null;
  isOnline?: boolean;
  avatarUrl?: string | null;
  slots?: Slot[];
  consultations?: number;
  consultationsOnline?: number;
  prescriptions?: number;
  rating?: number;
  avgConsultation?: number;
}

interface BranchOption { id: string; name: string; status: string; }

// A doctor's own branch (clinicId) is always the authoritative scope for its
// detail page — reusing the *page's* branchId query param breaks as soon as
// you're viewing "ALL" branches aggregated, since that has no branchId at all.
function doctorLinkQs(doc: { clinicId?: string | null }) {
  return doc.clinicId ? `?branchId=${doc.clinicId}` : "";
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, activeClass = "bg-black text-white" }: { label: string; active: boolean; onClick: () => void; activeClass?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${active ? activeClass : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
    >
      {label}
    </button>
  );
}

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-60 shrink-0">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function AvatarPlaceholder({ name, avatarUrl, size = "w-10 h-10 text-sm" }: { name: string; avatarUrl?: string | null; size?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover shrink-0 border border-gray-200`} />;
  }
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-gray-200`}>
      <svg className="w-full h-full text-gray-400 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center text-[#5476FC]">
        {[1, 2, 3, 4, 5].map(i => (
          i <= rounded ? (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          ) : (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          )
        ))}
      </div>
      <span className="text-[#24292E] text-[11px] font-medium">({rating})</span>
    </div>
  );
}

function formatLanguages(languages: string[] | string | null | undefined) {
  if (Array.isArray(languages)) return languages.join(", ") || "—";
  if (typeof languages === "string") return languages.trim() || "—";
  return "—";
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr12 = h % 12 || 12;
  return m === 0 ? `${hr12} ${ampm}` : `${hr12}.${String(m).padStart(2, "0")} ${ampm}`;
}

const TIMING_DAYS = [
  { label: "Monday", dow: 1 },
  { label: "Tuesday", dow: 2 },
  { label: "Wednesday", dow: 3 },
  { label: "Thursday", dow: 4 },
  { label: "Friday", dow: 5 },
  { label: "Saturday", dow: 6 },
];

// Fixed Column Widths
const COL = {
  name: "190px",
  cons1: "90px",
  cons2: "90px",
  avg: "90px",
  presc: "90px",
  feedback: "110px",
};

export default function ManageDoctorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSelectBranchModal, setShowSelectBranchModal] = useState(false);
  const [addDoctorBranchId, setAddDoctorBranchId] = useState("");
  const [deptFilters, setDeptFilters] = useState<Set<string>>(new Set());

  // Every org owner's own account is at least its own main branch, so this
  // always succeeds with >= 1 entry for them (empty/403 for a branch-user
  // login). Branch-picking UI only makes sense once there's more than just
  // the one main branch.
  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, []);

  const hasMultipleBranches = branches.length > 1;
  const activeBranchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? "Branch" : null;

  useEffect(() => {
    apiFetch(`/api/clinics/doctors${qs}`)
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data.doctors) ? data.doctors : []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [qs]);

  const departments = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialty || "General Physician"))).sort(),
    [doctors]
  );

  const handleAddDoctorClick = () => {
    if (hasMultipleBranches && !branchId) {
      setAddDoctorBranchId("");
      setShowSelectBranchModal(true);
      return;
    }
    router.push(`/clinic/doctors/add${qs}`);
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      if (activeFilter === "Online" && !d.isOnline) return false;
      if (activeFilter === "Offline" && d.isOnline) return false;
      if (deptFilters.size > 0 && !deptFilters.has(d.specialty || "General Physician")) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!d.fullName.toLowerCase().includes(q) && !(d.specialty ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [doctors, activeFilter, deptFilters, searchQuery]);

  const onlineDoctors = filteredDoctors.filter((d) => d.isOnline);
  const offlineDoctors = filteredDoctors.filter((d) => !d.isOnline);

  const selectedDoctor = doctors.find((d) => d.id === selectedId) ?? filteredDoctors[0] ?? doctors[0] ?? null;

  useEffect(() => {
    if (!selectedId && doctors.length > 0) setSelectedId(doctors[0].id);
  }, [doctors, selectedId]);

  function DoctorRow({ doc }: { doc: Doctor }) {
    const isSelected = selectedId === doc.id;
    const displayName = doc.fullName?.startsWith("Dr.") ? doc.fullName : `Dr. ${doc.fullName}`;
    const secondarySpecialty = doc.specializations?.[0]?.name ?? "";
    const specialties = secondarySpecialty
      ? [doc.specialty ?? "General Physician", "+", secondarySpecialty]
      : [doc.specialty ?? "General Physician", "", ""];

    return (
      <div
        onClick={() => setSelectedId(doc.id)}
        className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
          }`}
      >
        {/* Name Column */}
        <div style={{ width: COL.name, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
          <div className="relative">
            <AvatarPlaceholder name={displayName} avatarUrl={doc.avatarUrl} size="w-10 h-10" />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${doc.isOnline ? 'bg-[#179353]' : 'bg-[#9EA5AD]'}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{displayName}</span>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className={doc.isOnline ? "text-[#179353]" : "text-[#9EA5AD]"}>{doc.isOnline ? "Online" : "Not available"}</span>
              {doc.isOnline && <span className="text-[#5476FC]">Clinic</span>}
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="flex-1 min-w-[90px] pr-2 flex flex-col text-[#24292E] text-[11px] font-medium leading-tight justify-center">
          <span>{specialties[0]} {specialties[1]}</span>
          <span>{specialties[2]}</span>
        </div>

        {/* Cons 1 */}
        <div style={{ width: COL.cons1, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultations ?? 0}</div>

        {/* Cons 2 */}
        <div style={{ width: COL.cons2, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultationsOnline ?? 0}</div>

        {/* Avg */}
        <div style={{ width: COL.avg, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.avgConsultation ?? 0}</div>

        {/* Prescriptions */}
        <div style={{ width: COL.presc, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.prescriptions ?? 0}</div>

        {/* Feedback */}
        <div style={{ width: COL.feedback, flexShrink: 0 }} className="flex justify-center">
          <StarRating rating={doc.rating ?? 0} />
        </div>

        {/* Action */}
        <div className="w-[50px] flex shrink-0 items-center justify-end">
          <Link href={`/clinic/doctors/${doc.id}${doctorLinkQs(doc)}`} className="text-[#24292E] text-[12px] font-medium flex items-center gap-1 hover:text-[#5476FC] transition-colors">
            View
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Left: Main Content ───────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-[#24292E] text-[26px] font-medium tracking-tight">Manage Doctors</h1>
          </div>

          {hasMultipleBranches && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/clinic/doctors")}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${!branchId ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
              >
                All
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowBranchDropdown((v) => !v)}
                  className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all flex items-center gap-1.5 ${branchId ? "bg-[#5476FC] text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
                >
                  {activeBranchName ?? "Select Branch"}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                </button>
                {showBranchDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                    <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-48 z-20">
                      {branches.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">No active branches</div>
                      ) : (
                        branches.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => { router.push(`/clinic/doctors?branchId=${b.id}`); setShowBranchDropdown(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${branchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                          >
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Department filters */}
          {departments.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[12px] font-semibold text-[#24292E]">Department filters</span>
              {departments.map((dept) => (
                <label key={dept} className="flex items-center gap-1.5 text-[12px] text-[#344054] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deptFilters.size === 0 || deptFilters.has(dept)}
                    onChange={() => {
                      setDeptFilters((prev) => {
                        const next = new Set(prev.size === 0 ? departments : prev);
                        if (next.has(dept)) next.delete(dept); else next.add(dept);
                        return next.size === departments.length ? new Set() : next;
                      });
                    }}
                    className="accent-[#5476FC]"
                  />
                  {dept.toUpperCase()}
                </label>
              ))}
              <button
                onClick={handleAddDoctorClick}
                className="ml-auto bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-2 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              >
                Add Doctor
              </button>
            </div>
          )}

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill label="All" active={activeFilter === "All"} onClick={() => setActiveFilter("All")} />
              <FilterPill label="Online" active={activeFilter === "Online"} onClick={() => setActiveFilter("Online")} activeClass="bg-[#EAECEF] text-[#24292E] border border-[#C8D0DA]" />
              <FilterPill label="Offline/Clinic" active={activeFilter === "Offline"} onClick={() => setActiveFilter("Offline")} activeClass="bg-[#EAECEF] text-[#24292E] border border-[#C8D0DA]" />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-60 h-9 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-sm outline-none focus:border-[#5476FC] text-[#24292E]"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              {departments.length === 0 && (
                <button
                  onClick={handleAddDoctorClick}
                  className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-2 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center whitespace-nowrap"
                >
                  Add Doctor
                </button>
              )}
              <button className="text-[#676E76] hover:text-black transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="20" x2="15" y2="20" /></svg>
              </button>
            </div>
          </div>

          {/* Table — horizontally scrollable */}
          <div className="w-full overflow-x-auto mt-2 pb-4 custom-scrollbar">
            <div style={{ minWidth: "810px" }}>

              {/* Table Header */}
              <div className="flex items-center px-4 py-2 text-[10px] font-medium text-[#24292E] border-b border-[#EBEEF5]">
                <div style={{ width: COL.name, flexShrink: 0 }} className="flex items-center gap-1 cursor-pointer">Name <ChevronDown /></div>
                <div className="flex-1 min-w-[90px]" /> {/* Spacer for specialties */}
                <div style={{ width: COL.cons1, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Total No. of<br />Consultation <ChevronDown /></div>
                <div style={{ width: COL.cons2, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Online<br />Consultations <ChevronDown /></div>
                <div style={{ width: COL.avg, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Average<br />Consultation <ChevronDown /></div>
                <div style={{ width: COL.presc, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Number of<br />prescription <ChevronDown /></div>
                <div style={{ width: COL.feedback, flexShrink: 0 }} className="flex justify-center items-center gap-1 cursor-pointer">P. Feedback <ChevronDown /></div>
                <div className="w-[50px] flex shrink-0" />
              </div>

              {loading ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">No doctors found.</div>
              ) : (
                <>
                  {/* Online Doctors */}
                  <div className="flex flex-col gap-2 mt-4">
                    {onlineDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} />)}
                  </div>

                  {/* Offline header */}
                  {offlineDoctors.length > 0 && (
                    <>
                      <h2 className="text-[#24292E] text-sm font-bold mt-6 mb-3">Offline</h2>
                      <div className="flex flex-col gap-2">
                        {offlineDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} />)}
                      </div>
                    </>
                  )}
                </>
              )}

            </div>
          </div>

        </div>

        {/* ── Right: Doctor Details Card ──────────────── */}
        {selectedDoctor && (
          <div className="w-full xl:w-[320px] bg-[#EEF0F6] rounded-2xl p-5 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm relative">

            <h2 className="text-[#24292E] text-[15px] font-bold mb-5">Doctor Details</h2>

            {/* Profile snippet */}
            <div className="flex items-center gap-3 mb-6">
              <AvatarPlaceholder name={selectedDoctor.fullName} avatarUrl={selectedDoctor.avatarUrl} size="w-12 h-12" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[13px] font-bold truncate">
                  {selectedDoctor.fullName?.startsWith("Dr.") ? selectedDoctor.fullName : `Dr. ${selectedDoctor.fullName}`}
                </span>
                <span className="text-[#9EA5AD] text-[11px] font-medium truncate">Lic:{selectedDoctor.license ?? "—"}</span>
                <span className={`${selectedDoctor.isOnline ? "text-[#179353]" : "text-[#9EA5AD]"} text-[11px] font-medium mt-0.5`}>
                  {selectedDoctor.isOnline ? "Available" : "Not Available"}
                </span>
              </div>
            </div>

            <div className="h-px bg-[#D6DEFF] mb-5 w-full" />

            {/* Details Grid */}
            <div className="flex flex-col gap-3 mb-8">
              {[
                { label: "Emirates ID", val: selectedDoctor.emiratesId ?? "—" },
                { label: "Gender", val: selectedDoctor.gender?.toUpperCase() ?? "—" },
                { label: "Specialization", val: selectedDoctor.specialty ?? "—" },
                { label: "Qualification", val: selectedDoctor.qualification ?? "—" },
                { label: "Location", val: selectedDoctor.address ?? "—" },
                { label: "Consultation Fees", val: selectedDoctor.fees != null ? `$${selectedDoctor.fees}` : "—" },
                { label: "Email", val: selectedDoctor.email ?? "—" },
                { label: "Contact Number", val: selectedDoctor.phone ?? "—" },
                { label: "Office Phone", val: "—" },
                { label: "Languages", val: formatLanguages(selectedDoctor.languages) },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[#24292E] text-[12px] font-medium">{row.label}</span>
                  <span className="text-[#676E76] text-[11px] text-right truncate w-32">{row.val}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mb-8">
              <Link href={`/clinic/doctors/${selectedDoctor.id}${doctorLinkQs(selectedDoctor)}`} className="w-full flex items-center justify-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
                View Profile
              </Link>
              <button className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
                Message
              </button>
            </div>

            {/* Timing Section */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#24292E] text-[13px] font-bold uppercase">TIMING</span>
              <Link href={`/clinic/doctors/${selectedDoctor.id}?tab=schedules${doctorLinkQs(selectedDoctor) ? `&branchId=${selectedDoctor.clinicId}` : ""}`} className="text-[#24292E] hover:text-[#5476FC] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              </Link>
            </div>

            <div className="flex flex-col gap-2.5 mb-6">
              {TIMING_DAYS.map(({ label, dow }) => {
                const daySlots = (selectedDoctor.slots ?? []).filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
                const hours = daySlots.length > 0 ? daySlots.map((s) => `${fmt12(s.startTime)} to ${fmt12(s.endTime)}`).join(", ") : "Not available";
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[#676E76] text-[12px]">{label}</span>
                    <span className="text-[#24292E] text-[12px] font-medium text-right max-w-[60%] truncate" title={hours}>{hours}</span>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* Select Branch modal — gates Add Doctor when viewing the multi-branch aggregate */}
      {showSelectBranchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[380px] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[#111827] text-[16px] font-bold">Select Branch?</h2>
              <button onClick={() => setShowSelectBranchModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Branch name</label>
              <select
                value={addDoctorBranchId}
                onChange={(e) => setAddDoctorBranchId(e.target.value)}
                className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC] cursor-pointer"
              >
                <option value="">Select a branch…</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <Link
              href="/clinic/branches"
              className="flex items-center gap-2 text-[13px] font-semibold text-[#5476FC] hover:text-[#3B59E3] transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[14px] leading-none">+</span>
              Add Branch
            </Link>
            <button
              disabled={!addDoctorBranchId}
              onClick={() => { setShowSelectBranchModal(false); router.push(`/clinic/doctors/add?branchId=${addDoctorBranchId}`); }}
              className="w-full bg-[#1E293B] text-white text-[13px] font-bold tracking-widest uppercase py-3 rounded-lg hover:bg-[#0f172a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
