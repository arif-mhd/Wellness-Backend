"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string | null;
  visitType: "online" | "offline";
  scheduledAt: string;
  reason: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  patientWaitingSince?: string | null;
  patientName: string;
  patientEmail: string;
  patientAge: number | null;
  patientAvatarUrl: string | null;
  doctorName: string;
  doctorEmail: string;
  doctorAvatarUrl: string | null;
  doctorSpecialty: string;
  doctorIsOnline: boolean;
  primaryDiagnosis: string;
  emr?: any;
  preVisitData?: {
    primaryReason: string | null;
    symptoms: string[];
    severity: string;
    duration: string;
    conditions: string;
    medications: string;
    allergies: string;
    additionalNotes: string;
    submittedAt: string;
  } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function Avatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold shrink-0`}>
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

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

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Scheduled",
  in_progress: "Consulting",
  completed: "Done",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<Appointment["status"], string> = {
  scheduled: "text-[#F59E0B]",
  in_progress: "text-[#5476FC]",
  completed: "text-[#179353]",
  cancelled: "text-[#D92D20]",
};

function statusLabel(apt: Appointment) {
  if (apt.status === "scheduled" && apt.patientWaitingSince) return "Waiting...";
  if (apt.status === "completed" && !apt.emr) return "EMR Pending";
  return STATUS_LABEL[apt.status];
}

function statusColor(apt: Appointment) {
  if (apt.status === "scheduled" && apt.patientWaitingSince) return "text-[#D92D20]";
  if (apt.status === "completed" && !apt.emr) return "text-[#F59E0B]";
  return STATUS_COLOR[apt.status];
}

function isActiveNow(apt: Appointment) {
  return apt.status === "in_progress" || (apt.status === "scheduled" && new Date(apt.scheduledAt).getTime() >= Date.now());
}

function toLocalInputValue(iso: string) {
  const clean = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
  return clean.slice(0, 16);
}

// Column widths — shared between header and rows
const COL = {
  name: "200px",
  age: "48px",
  reason: "140px",
  dept: "140px",
  diagnosis: "160px",
};

interface BranchOption { id: string; name: string; status: string; }

export default function ClinicAppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [activeMode, setActiveMode] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreVisitModal, setShowPreVisitModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [isMultiBranchOrg, setIsMultiBranchOrg] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => setIsMultiBranchOrg(!!data.clinic?.isMultiBranchOrg))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMultiBranchOrg) return;
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, [isMultiBranchOrg]);

  const activeBranchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? "Branch" : null;

  const loadAppointments = () => {
    apiFetch(`/api/clinics/appointments${qs}`)
      .then((r) => r.json())
      .then((data) => setAppointments(Array.isArray(data.appointments) ? data.appointments : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAppointments(); }, [qs]);

  const now = Date.now();

  const filtered = useMemo(() => {
    return appointments.filter((apt) => {
      if (activeTab === "Upcoming") {
        const upcoming = apt.status === "in_progress" || (apt.status === "scheduled" && new Date(apt.scheduledAt).getTime() >= now);
        if (!upcoming) return false;
      } else if (activeTab === "Past") {
        const past = apt.status === "completed" || apt.status === "cancelled" || new Date(apt.scheduledAt).getTime() < now;
        if (!past) return false;
      }

      if (activeMode === "Clinic" && apt.visitType !== "offline") return false;
      if (activeMode === "Online" && apt.visitType !== "online") return false;

      if (timeFilter !== "All") {
        const d = new Date(apt.scheduledAt);
        const today = new Date();
        if (timeFilter === "Today") {
          if (d.toDateString() !== today.toDateString()) return false;
        } else if (timeFilter === "This Week") {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          if (d < weekStart || d >= weekEnd) return false;
        } else if (timeFilter === "This month") {
          if (d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!apt.patientName.toLowerCase().includes(q) && !apt.patientEmail.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [appointments, activeTab, activeMode, timeFilter, searchQuery, now]);

  const newAppts = useMemo(() => filtered.filter(isActiveNow), [filtered]);
  const allAppts = filtered;

  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const handleReschedule = async () => {
    if (!selectedAppt || !rescheduleValue) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await apiFetch(`/api/appointments/${selectedAppt.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: `${rescheduleValue}:00.000Z` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to reschedule.");
      }
      setShowRescheduleModal(false);
      loadAppointments();
    } catch (err: any) {
      setActionError(err.message ?? "Failed to reschedule.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppt) return;
    if (!window.confirm(`Cancel the appointment with ${selectedAppt.patientName}?`)) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await apiFetch(`/api/appointments/${selectedAppt.id}/cancel`, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to cancel.");
      }
      loadAppointments();
    } catch (err: any) {
      setActionError(err.message ?? "Failed to cancel.");
    } finally {
      setActionBusy(false);
    }
  };

  // ── Row renderer ────────────────────────────────────────────
  function AppointmentRow({ appt }: { appt: Appointment }) {
    const isSelected = selectedId === appt.id;
    const dateObj = new Date(appt.scheduledAt);
    return (
      <div
        onClick={() => setSelectedId(appt.id)}
        className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${
          isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
        }`}
      >
        {/* Name */}
        <div style={{ width: COL.name, flexShrink: 0 }} className="flex items-center gap-2 pr-3">
          <Avatar name={appt.patientName} size="w-9 h-9 text-sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{appt.patientName}</span>
            <span className="text-[#A0A8B0] text-[11px] truncate">{appt.patientEmail}</span>
          </div>
        </div>
        {/* Age */}
        <div style={{ width: COL.age, flexShrink: 0 }} className="text-[#24292E] text-[13px]">{appt.patientAge ?? "—"}</div>
        {/* Reason */}
        <div style={{ width: COL.reason, flexShrink: 0 }} className="text-[#24292E] text-[13px] truncate pr-3">{appt.reason}</div>
        {/* Dept */}
        <div style={{ width: COL.dept, flexShrink: 0 }} className="text-[#24292E] text-[13px] truncate pr-3">{appt.doctorSpecialty}</div>
        {/* Diagnosis / Time */}
        <div style={{ width: COL.diagnosis, flexShrink: 0 }} className="flex flex-col pr-3">
          <span className="text-[#24292E] text-[12px] font-medium truncate" title={appt.primaryDiagnosis}>{appt.primaryDiagnosis}</span>
          <span className="text-[#676E76] text-[11px]">
            {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        {/* Status + Doctor + Action */}
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[12px] font-medium whitespace-nowrap ${statusColor(appt)}`}>{statusLabel(appt)}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${appt.doctorIsOnline ? "bg-[#1FAF65]" : "bg-[#D0D5DD]"}`} title={appt.doctorIsOnline ? "Doctor online" : "Doctor offline"} />
            <Avatar name={appt.doctorName} size="w-7 h-7 text-[11px]" />
            <span className="text-[#24292E] text-[12px] truncate hidden lg:block">{appt.doctorName}</span>
          </div>
          <button onClick={() => setSelectedId(appt.id)} className="text-[#5476FC] text-[12px] font-medium flex items-center gap-0.5 shrink-0 hover:underline">
            View <ArrowRight />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Left: Main Content ───────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <h1 className="text-[#24292E] text-[26px] font-medium tracking-tight">Appointments</h1>

          {isMultiBranchOrg && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/clinic/appointments")}
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
                            onClick={() => { router.push(`/clinic/appointments?branchId=${b.id}`); setShowBranchDropdown(false); }}
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

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {["All", "Upcoming", "Past"].map(t => (
                  <FilterPill key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <FilterPill label="All" active={activeMode === "All"} onClick={() => setActiveMode("All")} activeClass="bg-[#24292E] text-white" />
                <FilterPill label="Clinic" active={activeMode === "Clinic"} onClick={() => setActiveMode("Clinic")} activeClass="bg-[#545D67] text-white" />
                <FilterPill label="Online" active={activeMode === "Online"} onClick={() => setActiveMode("Online")} activeClass="bg-[#179353] text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-52 h-9 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-sm outline-none focus:border-[#5476FC] text-[#24292E]"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#9EA5AD]">
                {["All", "Today", "This Week", "This month"].map(t => (
                  <button key={t} onClick={() => setTimeFilter(t)} className={`transition-colors ${timeFilter === t ? "text-[#24292E] font-semibold" : "hover:text-[#24292E]"}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Table — horizontally scrollable */}
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: "780px" }}>

              {/* Table Header */}
              <div className="flex items-center px-4 py-2 text-[12px] font-medium text-[#9EA5AD] border-b border-[#EBEEF5]">
                <div style={{ width: COL.name, flexShrink: 0 }}>Name</div>
                <div style={{ width: COL.age, flexShrink: 0 }}>Age</div>
                <div style={{ width: COL.reason, flexShrink: 0 }}>Reason For Visit</div>
                <div style={{ width: COL.dept, flexShrink: 0 }}>Department</div>
                <div style={{ width: COL.diagnosis, flexShrink: 0 }}>Primary Diagnosis</div>
                <div className="flex-1">Status</div>
              </div>

              {loading ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">No appointments found.</div>
              ) : (
                <>
                  {/* New */}
                  <h2 className="text-[#24292E] text-sm font-bold mt-4 mb-2">New</h2>
                  <div className="flex flex-col gap-2">
                    {newAppts.length === 0 ? (
                      <div className="text-[#A0A8B0] text-xs py-3">No upcoming or in-progress appointments.</div>
                    ) : (
                      newAppts.map(appt => <AppointmentRow key={appt.id} appt={appt} />)
                    )}
                  </div>

                  <div className="h-px bg-[#EBEEF5] my-5" />

                  {/* All */}
                  <h2 className="text-[#24292E] text-sm font-bold mb-2">All</h2>
                  <div className="flex flex-col gap-2">
                    {allAppts.map(appt => <AppointmentRow key={appt.id} appt={appt} />)}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* ── Right: Appointment Details Card ──────────────── */}
        {selectedAppt && (
          <div className="w-full xl:w-[300px] bg-white rounded-2xl p-5 flex flex-col gap-4 shrink-0 border border-[#E4E8F0] shadow-sm">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Appointment Details</h2>
            <div className="h-px bg-[#EBEEF5]" />

            {/* Patient */}
            <div className="flex items-center gap-3">
              <Avatar name={selectedAppt.patientName} size="w-11 h-11 text-sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[13px] font-semibold truncate">{selectedAppt.patientName}</span>
                <span className="text-[#9EA5AD] text-[11px] truncate">{selectedAppt.patientEmail}</span>
              </div>
            </div>
            <p className="text-[#9EA5AD] text-[11px] text-center">
              {new Date(selectedAppt.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" · "}
              {new Date(selectedAppt.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
            <a href={`/clinic/patients/${selectedAppt.patientId}${qs}`} className="w-full text-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              View Profile
            </a>

            <div className="h-px bg-[#EBEEF5]" />

            {/* Doctor */}
            <div className="flex items-center gap-3">
              <Avatar name={selectedAppt.doctorName} size="w-11 h-11 text-sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[13px] font-semibold truncate">{selectedAppt.doctorName}</span>
                <span className="text-[#9EA5AD] text-[11px] truncate">{selectedAppt.doctorEmail}</span>
                <span className={`text-[11px] font-medium mt-0.5 ${selectedAppt.doctorIsOnline ? "text-[#179353]" : "text-gray-400"}`}>
                  {selectedAppt.doctorIsOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <div className="h-px bg-[#EBEEF5]" />

            {/* Reason for visit */}
            <div className="flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-semibold">Reason for visit</span>
              <p className="text-[#9EA5AD] text-[11px] leading-relaxed">{selectedAppt.reason}</p>
            </div>

            {/* Pre-visit */}
            <div className="flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-semibold">Pre-visit form</span>
              <p className="text-[11px] mt-0.5">
                {selectedAppt.preVisitData ? (
                  <span onClick={() => setShowPreVisitModal(true)} className="text-[#5476FC] underline cursor-pointer font-medium hover:text-[#3B59DF] transition-colors">
                    View Pre-Visit Form
                  </span>
                ) : (
                  <span className="text-[#9EA5AD]">Not filled by patient yet</span>
                )}
              </p>
            </div>

            {actionError && <p className="text-[11px] text-red-600">{actionError}</p>}

            {/* Reschedule + Cancel */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => { setRescheduleValue(toLocalInputValue(selectedAppt.scheduledAt)); setShowRescheduleModal(true); setActionError(""); }}
                disabled={selectedAppt.status === "cancelled" || selectedAppt.status === "completed"}
                className="w-full border border-[#C8D0DA] text-[#676E76] text-[12px] font-medium py-2 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reschedule Consultation
              </button>
              <button
                onClick={handleCancel}
                disabled={actionBusy || selectedAppt.status === "cancelled" || selectedAppt.status === "completed"}
                className="w-full border border-[#F5C2C2] text-[#D92D20] text-[12px] font-medium py-2 rounded-lg hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Pre-Visit Form Modal */}
      {showPreVisitModal && selectedAppt?.preVisitData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#E4E8F0] w-full max-w-[540px] rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-[#111827] text-[13px] font-bold tracking-wide uppercase">Pre-Visit Form</h2>

            <div className="bg-white rounded-lg p-5 flex flex-col gap-5 shadow-sm">
              {[
                { label: "Primary Reason", value: selectedAppt.preVisitData.primaryReason || "—" },
                { label: "Symptoms", value: selectedAppt.preVisitData.symptoms.length > 0 ? selectedAppt.preVisitData.symptoms.join(", ") : "—" },
                { label: "Severity", value: selectedAppt.preVisitData.severity || "—" },
                { label: "Duration", value: selectedAppt.preVisitData.duration || "—" },
                { label: "Existing Conditions", value: selectedAppt.preVisitData.conditions || "—" },
                { label: "Current Medications", value: selectedAppt.preVisitData.medications || "—" },
                { label: "Allergies", value: selectedAppt.preVisitData.allergies || "—" },
                { label: "Additional Notes", value: selectedAppt.preVisitData.additionalNotes || "—" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-1">
                  <h3 className="text-[#111827] text-[13px] font-semibold">{f.label}</h3>
                  <p className="text-[#676E76] text-[13px] leading-relaxed">{f.value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPreVisitModal(false)}
              className="w-full bg-[#0A56D9] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md hover:bg-[#094BBF] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[420px] rounded-xl p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-[#111827] text-[15px] font-bold">Reschedule Consultation</h2>
            <p className="text-[#676E76] text-[12px]">
              New time for {selectedAppt.patientName} with {selectedAppt.doctorName}.
            </p>
            <input
              type="datetime-local"
              value={rescheduleValue}
              onChange={(e) => setRescheduleValue(e.target.value)}
              className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC]"
            />
            {actionError && <p className="text-[11px] text-red-600">{actionError}</p>}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={actionBusy || !rescheduleValue}
                className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {actionBusy ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
