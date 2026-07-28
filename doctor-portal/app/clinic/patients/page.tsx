"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

function PatientsListContent() {
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
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const hasMatchingConsult = p.consultations.some(c => {
          if (!c.date) return false;
          const d = new Date(c.date);
          if (timeFilter === "Today") {
            return d.toDateString() === today.toDateString();
          } else if (timeFilter === "This Week") {
            return d >= weekStart && d < weekEnd;
          } else if (timeFilter === "This month") {
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          }
          return false;
        });
        if (!hasMatchingConsult) return false;
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
        className={`flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-0 px-4 py-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-[#F4F7FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
          }`}
      >
        {/* Profile Column */}
        <div className="w-full md:w-[220px] shrink-0 flex items-center gap-3 pr-3">
          <AvatarPlaceholder avatarUrl={p.avatarUrl} name={p.name} size="w-[42px] h-[42px]" />
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{p.name}</span>
            <span className="text-[#A7AAB4] text-[11px] truncate">{p.email}</span>
          </div>
        </div>

        {/* Mobile grid wrapper / Desktop flex wrapper */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row w-full gap-y-4 gap-x-2 md:gap-0 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100">
          {/* Age */}
          <div className="md:w-[60px] shrink-0 flex flex-col md:block justify-start"><span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Age</span><span className="text-[#24292E] text-[13px] font-medium block md:text-center text-left">{p.age ?? "—"}</span></div>

          {/* Diagnosis */}
          <div className="md:w-[160px] shrink-0 flex flex-col md:block justify-start"><span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Diagnosis</span><span className="text-[#676E76] text-[12px] block md:text-center text-left truncate" title={p.diagnosis}>{p.diagnosis}</span></div>

          {/* Summary */}
          <div className="md:w-[200px] shrink-0 flex flex-col md:block justify-start"><span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Summary</span><span className="text-[#676E76] text-[12px] block md:text-center text-left truncate" title={p.summary}>{p.summary}</span></div>

          {/* Last Consult */}
          <div className="md:w-[120px] shrink-0 flex flex-col md:items-center justify-start">
            <span className="text-[#9EA5AD] md:text-[#676E76] text-[10px] md:text-[12px] uppercase md:normal-case font-semibold md:font-normal tracking-wider md:tracking-normal mb-0.5 md:mb-0 md:block md:text-center">Last Consult</span>
            <span className="text-[#24292E] text-[12px] font-medium">{formatDate(p.lastConsult)}</span>
          </div>

          {/* Actions */}
          <div className="w-full md:flex-1 flex items-center justify-start md:justify-end md:pr-2 col-span-2 sm:col-span-1">
            <button
              onClick={(e) => { e.stopPropagation(); sendReminder(p); }}
              disabled={!p.nextAppointmentId || state === "sending"}
              className="w-full md:w-auto bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={p.nextAppointmentId ? "Send a reminder about their next appointment" : "No upcoming appointment to remind about"}
            >
              {state === "sending" ? "Sending..." : state === "sent" ? "Sent" : state === "error" ? "Retry" : "Remind"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedReminderState = selectedPatient ? (reminderState[selectedPatient.id] ?? "idle") : "idle";

  return (
    <div className="px-4 md:px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB] font-outfit relative">
      <div className="flex flex-col xl:flex-row gap-6 xl:items-start w-full">
        {/* ── Left: Main Content ───────────────────────────── */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
          <h1 className="text-[#24292E] text-[26px] font-bold tracking-tight">Patients</h1>

          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill label="All" active={activeTab === "ALL"} onClick={() => setActiveTab("ALL")} />
              <FilterPill label="New" active={activeTab === "NEW"} onClick={() => setActiveTab("NEW")} />
            </div>

            <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 h-10 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-[13px] outline-none focus:border-[#5476FC] text-[#24292E] placeholder-[#A7AAB4]"
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

          {/* Table List */}
          <div className="w-full flex flex-col gap-3 pb-4 mt-2">
            <div className="hidden md:flex items-center px-4 pb-2 text-[12px] font-semibold text-[#676E76] border-b border-[#E4E8F0]">
              <div className="w-[220px] shrink-0">Name</div>
              <div className="w-[60px] shrink-0 text-center">Age</div>
              <div className="w-[160px] shrink-0 text-center">Diagnosis</div>
              <div className="w-[200px] shrink-0 text-center">Summary</div>
              <div className="w-[120px] shrink-0 text-center">Last Consult</div>
              <div className="flex-1" />
            </div>

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
            <div className="flex flex-col gap-2 mb-8 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
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

export default function PatientsListPage() {
  return (
    <Suspense fallback={null}>
      <PatientsListContent />
    </Suspense>
  );
}
