"use client";

import { useState } from "react";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_APPOINTMENTS = [
  {
    id: "1",
    patientName: "Helena",
    patientEmail: "email@figmasfakedomain.net",
    patientAge: 32,
    reason: "Fever",
    department: "General Medicine",
    status: "Consulting",
    statusColor: "text-[#5476FC]",
    doctorName: "DR. Name abc",
    doctorEmail: "email@figmasfakedomain.net",
    doctorOnline: true,
    timeLabel: "Time - 11:30",
    dateLabel: "12/10/2024",
    isNew: true,
    tab: "ALL",
    mode: "CLINIC"
  },
  {
    id: "2",
    patientName: "Helena",
    patientEmail: "email@figmasfakedomain.net",
    patientAge: 32,
    reason: "Primary Diagnosis",
    department: "Paediatrics",
    status: "Waiting...",
    statusColor: "text-[#F59E0B]",
    doctorName: "DR. Name abc",
    doctorEmail: "email@figmasfakedomain.net",
    doctorOnline: true,
    timeLabel: "Time - 11:30",
    dateLabel: "12/10/2024",
    isNew: true,
    tab: "ALL",
    mode: "CLINIC"
  },
  {
    id: "3",
    patientName: "Helena",
    patientEmail: "email@figmasfakedomain.net",
    patientAge: 32,
    reason: "Primary Diagnosis",
    department: "Paediatrics",
    status: "Waiting...",
    statusColor: "text-[#F59E0B]",
    doctorName: "DR. Name abc",
    doctorEmail: "email@figmasfakedomain.net",
    doctorOnline: true,
    timeLabel: "Time - 11:30",
    dateLabel: "12/10/2024",
    isNew: true,
    tab: "ALL",
    mode: "CLINIC"
  },
  {
    id: "4",
    patientName: "Helena",
    patientEmail: "email@figmasfakedomain.net",
    patientAge: 32,
    reason: "Primary Diagnosis",
    department: "Paediatrics",
    status: "Waiting...",
    statusColor: "text-[#F59E0B]",
    doctorName: "DR. Name abc",
    doctorEmail: "email@figmasfakedomain.net",
    doctorOnline: true,
    timeLabel: "Time - 11:30",
    dateLabel: "12/10/2024",
    isNew: true,
    tab: "ALL",
    mode: "CLINIC"
  },
  {
    id: "5",
    patientName: "Helena",
    patientEmail: "email@figmasfakedomain.net",
    patientAge: 32,
    reason: "Primary Diagnosis",
    department: "Summary",
    status: "Consult Now",
    statusColor: "",
    doctorName: "DR. Name abc",
    doctorEmail: "email@figmasfakedomain.net",
    doctorOnline: true,
    timeLabel: "Time - 11:30",
    dateLabel: "12/10/2024",
    isNew: false,
    tab: "ALL",
    mode: "CLINIC"
  }
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function Avatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold shrink-0`}>
      {name.slice(0, 1).toUpperCase()}
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

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-60 shrink-0">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// Column widths — shared between header and rows
const COL = {
  name:      "200px",
  age:       "48px",
  reason:    "140px",
  dept:      "140px",
  diagnosis: "140px",
};

export default function ClinicAppointmentsPage() {
  const [activeTab, setActiveTab]     = useState("All");
  const [activeMode, setActiveMode]   = useState("Clinic");
  const [timeFilter, setTimeFilter]   = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId]   = useState("1");
  const [showPreVisitModal, setShowPreVisitModal] = useState(false);

  const selectedAppt = MOCK_APPOINTMENTS.find(a => a.id === selectedId) ?? MOCK_APPOINTMENTS[0];
  const newAppts     = MOCK_APPOINTMENTS.filter(a => a.isNew);
  const allAppts     = MOCK_APPOINTMENTS.filter(a => !a.isNew);

  // ── Row renderer ────────────────────────────────────────────
  function AppointmentRow({ appt, showActions }: { appt: typeof MOCK_APPOINTMENTS[0]; showActions?: boolean }) {
    const isSelected = selectedId === appt.id;
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
        <div style={{ width: COL.age, flexShrink: 0 }} className="text-[#24292E] text-[13px]">{appt.patientAge}</div>
        {/* Reason */}
        <div style={{ width: COL.reason, flexShrink: 0 }} className="text-[#24292E] text-[13px] truncate pr-3">{appt.reason}</div>
        {/* Dept */}
        <div style={{ width: COL.dept, flexShrink: 0 }} className="text-[#24292E] text-[13px] truncate pr-3">{appt.department}</div>
        {/* Diagnosis / Time */}
        <div style={{ width: COL.diagnosis, flexShrink: 0 }} className="flex flex-col pr-3">
          <span className="text-[#24292E] text-[12px] font-medium">{appt.timeLabel}</span>
          <span className="text-[#676E76] text-[11px]">{appt.dateLabel}</span>
        </div>
        {/* Status + Doctor + Action */}
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          {showActions ? (
            <div className="flex items-center gap-3">
              <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[11px] font-medium px-4 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0">
                Consult Now
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[12px] font-medium whitespace-nowrap ${appt.statusColor}`}>{appt.status}</span>
              <Avatar name={appt.doctorName} size="w-7 h-7 text-[11px]" />
              <span className="text-[#24292E] text-[12px] truncate hidden lg:block">{appt.doctorName}</span>
            </div>
          )}
          <button className="text-[#5476FC] text-[12px] font-medium flex items-center gap-0.5 shrink-0 hover:underline">
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

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {["All", "Upcoming", "Past"].map(t => (
                  <FilterPill key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />
                ))}
              </div>
              <div className="flex items-center gap-2">
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
                <button className="text-[#676E76] hover:text-black transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
                </button>
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
                <div style={{ width: COL.name,      flexShrink: 0 }} className="flex items-center gap-0.5 cursor-pointer">Name <ChevronDown /></div>
                <div style={{ width: COL.age,       flexShrink: 0 }} className="flex items-center gap-0.5 cursor-pointer">Age <ChevronDown /></div>
                <div style={{ width: COL.reason,    flexShrink: 0 }} className="flex items-center gap-0.5 cursor-pointer">Reason For Visit <ChevronDown /></div>
                <div style={{ width: COL.dept,      flexShrink: 0 }} className="flex items-center">Department</div>
                <div style={{ width: COL.diagnosis, flexShrink: 0 }} className="flex items-center gap-0.5 cursor-pointer">Primary Diagnosis <ChevronDown /></div>
                <div className="flex-1 flex items-center gap-0.5 cursor-pointer">Status <ChevronDown /></div>
              </div>

              {/* New */}
              <h2 className="text-[#24292E] text-sm font-bold mt-4 mb-2">New</h2>
              <div className="flex flex-col gap-2">
                {newAppts.map(appt => <AppointmentRow key={appt.id} appt={appt} />)}
              </div>

              <div className="h-px bg-[#EBEEF5] my-5" />

              {/* All */}
              <h2 className="text-[#24292E] text-sm font-bold mb-2">All</h2>
              <div className="flex flex-col gap-2">
                {allAppts.map(appt => <AppointmentRow key={appt.id} appt={appt} showActions />)}
              </div>

            </div>
          </div>
        </div>

        {/* ── Right: Appointment Details Card ──────────────── */}
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
          <p className="text-[#9EA5AD] text-[11px] text-center">Time and Details of Consultation</p>
          <button className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
            View Profile
          </button>

          <div className="h-px bg-[#EBEEF5]" />

          {/* Doctor */}
          <div className="flex items-center gap-3">
            <Avatar name={selectedAppt.doctorName} size="w-11 h-11 text-sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] text-[13px] font-semibold truncate">{selectedAppt.doctorName}</span>
              <span className="text-[#9EA5AD] text-[11px] truncate">{selectedAppt.doctorEmail}</span>
              <span className="text-[#179353] text-[11px] font-medium mt-0.5">Online</span>
            </div>
          </div>

          <div className="h-px bg-[#EBEEF5]" />

          {/* Details */}
          {[
            { title: "Reason for visit", text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s." },
            { title: "Lorem",            text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s." },
          ].map(({ title, text }) => (
            <div key={title} className="flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-semibold">{title}</span>
              <p className="text-[#9EA5AD] text-[11px] leading-relaxed">{text}</p>
            </div>
          ))}

          {/* Pre-visit */}
          <div className="flex flex-col gap-1">
            <span className="text-[#24292E] text-[12px] font-semibold">Pre-visit form</span>
            <p className="text-[#9EA5AD] text-[11px] leading-relaxed">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s.
            </p>
            <p className="text-[11px] mt-0.5">
              <span onClick={() => setShowPreVisitModal(true)} className="text-[#5476FC] underline cursor-pointer font-medium hover:text-[#3B59DF] transition-colors">Pre-Visit Form</span>
              <span className="text-[#9EA5AD]"> : Updated / Reviewed/Not filled</span>
            </p>
          </div>

          {/* Reschedule */}
          <button className="w-full mt-1 border border-[#C8D0DA] text-[#676E76] text-[12px] font-medium py-2 rounded-lg hover:bg-gray-50 transition-all">
            Reschedule - Consultation
          </button>
        </div>

      </div>

      {/* Pre-Visit Form Modal */}
      {showPreVisitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#E4E8F0] w-full max-w-[540px] rounded-xl p-6 shadow-2xl flex flex-col gap-4">
            <h2 className="text-[#111827] text-[13px] font-bold tracking-wide uppercase">PRE-VISIT FORM</h2>
            
            <div className="bg-white rounded-lg p-5 flex flex-col gap-5 shadow-sm">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <h3 className="text-[#111827] text-[15px] font-semibold">Lorem</h3>
                  <p className="text-[#676E76] text-[13px] leading-relaxed">
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s,
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-2">
              <button 
                onClick={() => setShowPreVisitModal(false)}
                className="flex-1 bg-[#0A56D9] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md hover:bg-[#094BBF] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Read
              </button>
              <button 
                onClick={() => setShowPreVisitModal(false)}
                className="flex-1 bg-[#0A56D9] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md hover:bg-[#094BBF] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Read
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
