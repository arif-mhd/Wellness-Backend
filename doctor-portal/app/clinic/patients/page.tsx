"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface PatientRow {
  id: string;
  patientId: string;
  familyMemberId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  age: number | null;
  diagnosis: string;
  summary: string;
  lastConsult: string | null;
  doctors: { id: string; name: string; isOnline: boolean }[];
  consultations: { reason: string; date: string; status: string }[];
  nextAppointmentId: string | null;
  isNew: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, activeClass = "bg-[#24292E] text-white shadow-sm border border-transparent" }: { label: string; active: boolean; onClick: () => void; activeClass?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${active ? activeClass : "bg-white text-[#676E76] border border-[#D6DEFF] hover:border-[#5476FC] hover:text-[#5476FC]"}`}
    >
      {label}
    </button>
  );
}

function TimeFilter({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] font-medium transition-colors ${active ? "text-[#24292E] font-bold" : "text-[#A7AAB4] hover:text-[#24292E]"}`}
    >
      {label}
    </button>
  );
}

function AvatarPlaceholder({ avatarUrl, name, size = "w-10 h-10 text-sm" }: { avatarUrl?: string | null; name?: string; size?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name ?? ""} className={`${size} rounded-full object-cover shrink-0 border border-[#D6DEFF]`} />;
  }
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-[#D6DEFF]`}>
      <svg className="w-full h-full text-gray-400 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function profileHref(p: PatientRow, branchId: string | null) {
  const params = new URLSearchParams();
  if (p.familyMemberId) params.set("member", p.familyMemberId);
  if (branchId) params.set("branchId", branchId);
  const qs = params.toString();
  return `/clinic/patients/${p.patientId}${qs ? `?${qs}` : ""}`;
}

// Fixed Column Widths
const COL = {
  profile: "240px",
  age: "70px",
  diagnosis: "140px",
  summary: "140px",
  lastConsult: "120px",
};

export default function PatientsListPage() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reminderState, setReminderState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  useEffect(() => {
    apiFetch(`/api/clinics/patients${qs}`)
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data.patients) ? data.patients : []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [qs]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (activeTab === "NEW" && !p.isNew) return false;

      if (timeFilter !== "All") {
        if (!p.lastConsult) return false;
        const d = new Date(p.lastConsult);
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
        if (!p.name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [patients, activeTab, timeFilter, searchQuery]);

  const selectedPatient = patients.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const sendReminder = async (p: PatientRow) => {
    if (!p.nextAppointmentId) return;
    setReminderState((s) => ({ ...s, [p.id]: "sending" }));
    try {
      const res = await apiFetch(`/api/appointments/${p.nextAppointmentId}/remind`, { method: "POST" });
      if (!res.ok) throw new Error();
      setReminderState((s) => ({ ...s, [p.id]: "sent" }));
    } catch {
      setReminderState((s) => ({ ...s, [p.id]: "error" }));
    }
  };

  function PatientRowItem({ p }: { p: PatientRow }) {
    const isSelected = selectedId === p.id;
    const state = reminderState[p.id] ?? "idle";
    return (
      <div
        onClick={() => setSelectedId(p.id)}
        className={`flex items-center px-4 py-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-[#F4F7FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
          }`}
      >
        {/* Profile Column */}
        <div style={{ width: COL.profile, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
          <AvatarPlaceholder avatarUrl={p.avatarUrl} name={p.name} size="w-[42px] h-[42px]" />
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{p.name}</span>
            <span className="text-[#A7AAB4] text-[11px] truncate">{p.email}</span>
          </div>
        </div>

        {/* Age */}
        <div style={{ width: COL.age, flexShrink: 0 }} className="text-[#24292E] text-[13px] font-medium text-center">{p.age ?? "—"}</div>

        {/* Diagnosis */}
        <div style={{ width: COL.diagnosis, flexShrink: 0 }} className="text-[#676E76] text-[12px] text-center truncate" title={p.diagnosis}>{p.diagnosis}</div>

        {/* Summary */}
        <div style={{ width: COL.summary, flexShrink: 0 }} className="text-[#676E76] text-[12px] text-center truncate" title={p.summary}>{p.summary}</div>

        {/* Last Consult */}
        <div style={{ width: COL.lastConsult, flexShrink: 0 }} className="flex flex-col items-center justify-center">
          <span className="text-[#676E76] text-[12px]">Last Consult</span>
          <span className="text-[#24292E] text-[12px] font-medium">{formatDate(p.lastConsult)}</span>
        </div>

        {/* Actions */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); sendReminder(p); }}
            disabled={!p.nextAppointmentId || state === "sending"}
            className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title={p.nextAppointmentId ? "Send a reminder about their next appointment" : "No upcoming appointment to remind about"}
          >
            {state === "sending" ? "Sending..." : state === "sent" ? "Sent" : state === "error" ? "Retry" : "Remind"}
          </button>
          <Link href={profileHref(p, branchId)} onClick={(e) => e.stopPropagation()} className="text-[#24292E] text-[12px] font-medium flex items-center gap-1 hover:text-[#5476FC] transition-colors">
            View
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const selectedReminderState = selectedPatient ? (reminderState[selectedPatient.id] ?? "idle") : "idle";

  return (
    <div className="px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB] font-outfit relative">
      <div className="flex flex-col xl:flex-row gap-6 items-start">

        {/* ── Left: Main Content ───────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <h1 className="text-[#24292E] text-[26px] font-bold tracking-tight">Patients</h1>

          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill label="All" active={activeTab === "ALL"} onClick={() => setActiveTab("ALL")} />
              <FilterPill label="New" active={activeTab === "NEW"} onClick={() => setActiveTab("NEW")} activeClass="bg-[#EAECEF] text-[#24292E] shadow-sm border border-transparent" />
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-64 h-10 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-[13px] outline-none focus:border-[#5476FC] text-[#24292E] placeholder-[#A7AAB4]"
                  />
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7AAB4]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <TimeFilter label="All" active={timeFilter === "All"} onClick={() => setTimeFilter("All")} />
                <TimeFilter label="Today" active={timeFilter === "Today"} onClick={() => setTimeFilter("Today")} />
                <TimeFilter label="This Week" active={timeFilter === "This Week"} onClick={() => setTimeFilter("This Week")} />
                <TimeFilter label="This month" active={timeFilter === "This month"} onClick={() => setTimeFilter("This month")} />
              </div>
            </div>
          </div>

          <span className="text-[#24292E] text-[13px] font-bold mt-2">Recent</span>

          {/* Table List */}
          <div className="w-full flex flex-col gap-3 pb-4">
            {loading ? (
              <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-sm text-[#A0A8B0] py-12">No patients found.</div>
            ) : (
              filtered.map(p => <PatientRowItem key={p.id} p={p} />)
            )}
          </div>
        </div>

        {/* ── Right: Patient Details Card ──────────────── */}
        {selectedPatient && (
          <div className="w-full xl:w-[320px] bg-[#EEF0F8] rounded-3xl p-6 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm relative">
            <h2 className="text-[#24292E] text-[16px] font-bold mb-6">Patient Details</h2>

            {/* Profile snippet */}
            <div className="flex items-center gap-4 mb-6">
              <AvatarPlaceholder avatarUrl={selectedPatient.avatarUrl} name={selectedPatient.name} size="w-12 h-12" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[14px] font-bold truncate">{selectedPatient.name}</span>
                <span className="text-[#676E76] text-[11px] truncate">{selectedPatient.email}</span>
              </div>
            </div>

            <Link href={profileHref(selectedPatient, branchId)} className="w-full flex items-center justify-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all mb-6">
              View Profile
            </Link>

            {/* Doctors List */}
            {selectedPatient.doctors.length > 0 && (
              <>
                <div className="flex flex-col gap-3 mb-6">
                  {selectedPatient.doctors.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3">
                      <div className="relative">
                        <AvatarPlaceholder name={doc.name} size="w-7 h-7" />
                        {doc.isOnline && <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#1FAF65] border border-white rounded-full" />}
                      </div>
                      <span className="text-[#676E76] text-[13px]">{doc.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[#D6DEFF] mb-6 w-full" />
              </>
            )}

            {/* Consultations */}
            <h3 className="text-[#24292E] text-[13px] font-bold mb-3">Consultations</h3>
            <div className="flex flex-col gap-2 mb-8 max-h-[180px] overflow-y-auto">
              {selectedPatient.consultations.length === 0 ? (
                <span className="text-[#A7AAB4] text-[12px]">No consultations yet.</span>
              ) : (
                selectedPatient.consultations.slice(0, 8).map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-[#676E76] text-[12px]">Reason: {c.reason}</span>
                    <span className="text-[#A7AAB4] text-[11px]">{formatDate(c.date)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="h-px bg-[#D6DEFF] mb-6 w-full" />

            {/* Send Reminder */}
            <h3 className="text-[#24292E] text-[13px] font-bold mb-3">Send Reminder</h3>
            {selectedPatient.nextAppointmentId ? (
              <>
                <p className="text-[11px] text-[#676E76] mb-3">
                  Sends a reminder about their next upcoming appointment with your clinic.
                </p>
                <button
                  onClick={() => sendReminder(selectedPatient)}
                  disabled={selectedReminderState === "sending"}
                  className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {selectedReminderState === "sending" ? "Sending..." : selectedReminderState === "sent" ? "Reminder Sent" : "Remind for consultation"}
                </button>
                {selectedReminderState === "error" && <p className="text-[11px] text-red-600 mt-2">Failed to send. Try again.</p>}
              </>
            ) : (
              <p className="text-[11px] text-[#A7AAB4]">No upcoming appointment to remind about.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
