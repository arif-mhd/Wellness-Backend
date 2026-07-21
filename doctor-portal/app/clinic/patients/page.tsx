"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_PATIENTS = [
  {
    id: "1",
    name: "Helena",
    email: "email@figmasfakedomain.net",
    age: 32,
    diagnosis: "Primary Diagnosis",
    summary: "Summary",
    lastConsult: "12/10/2024",
    doctors: [
      { name: "DR. Name abc", statusColor: "bg-[#FF5C5C]" },
      { name: "DR. Name abc", statusColor: "bg-[#FF5C5C]" }
    ],
    consultations: [
      { reason: "Fever", date: "12/10/2024" },
      { reason: "Fever", date: "12/10/2024" },
      { reason: "Fever", date: "12/10/2024" }
    ]
  },
  {
    id: "2",
    name: "Helena",
    email: "email@figmasfakedomain.net",
    age: 32,
    diagnosis: "Primary Diagnosis",
    summary: "Summary",
    lastConsult: "12/10/2024",
    doctors: [
      { name: "DR. Name abc", statusColor: "bg-[#179353]" }
    ],
    consultations: [
      { reason: "Checkup", date: "11/10/2024" }
    ]
  },
  {
    id: "3",
    name: "Helena",
    email: "email@figmasfakedomain.net",
    age: 32,
    diagnosis: "Primary Diagnosis",
    summary: "Summary",
    lastConsult: "12/10/2024",
    doctors: [],
    consultations: []
  },
  {
    id: "4",
    name: "Helena",
    email: "email@figmasfakedomain.net",
    age: 32,
    diagnosis: "Primary Diagnosis",
    summary: "Summary",
    lastConsult: "12/10/2024",
    doctors: [],
    consultations: []
  },
  {
    id: "5",
    name: "Helena",
    email: "email@figmasfakedomain.net",
    age: 32,
    diagnosis: "Primary Diagnosis",
    summary: "Summary",
    lastConsult: "12/10/2024",
    doctors: [],
    consultations: []
  }
];

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

function AvatarPlaceholder({ size = "w-10 h-10 text-sm" }: { size?: string }) {
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-[#D6DEFF]`}>
      <svg className="w-full h-full text-gray-400 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

// Fixed Column Widths
const COL = {
  profile: "240px",
  age: "70px",
  diagnosis: "140px",
  summary: "100px",
  lastConsult: "120px",
};

export default function PatientsListPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState("1");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");

  const selectedPatient = MOCK_PATIENTS.find(p => p.id === selectedId) ?? MOCK_PATIENTS[0];

  function PatientRow({ p }: { p: typeof MOCK_PATIENTS[0] }) {
    const isSelected = selectedId === p.id;
    return (
      <div
        onClick={() => setSelectedId(p.id)}
        className={`flex items-center px-4 py-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? "bg-[#F4F7FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
          }`}
      >
        {/* Profile Column */}
        <div style={{ width: COL.profile, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
          <AvatarPlaceholder size="w-[42px] h-[42px]" />
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{p.name}</span>
            <span className="text-[#A7AAB4] text-[11px] truncate">{p.email}</span>
          </div>
        </div>

        {/* Age */}
        <div style={{ width: COL.age, flexShrink: 0 }} className="text-[#24292E] text-[13px] font-medium text-center">{p.age}</div>

        {/* Diagnosis */}
        <div style={{ width: COL.diagnosis, flexShrink: 0 }} className="text-[#676E76] text-[12px] text-center truncate">{p.diagnosis}</div>

        {/* Summary */}
        <div style={{ width: COL.summary, flexShrink: 0 }} className="text-[#676E76] text-[12px] text-center">{p.summary}</div>

        {/* Last Consult */}
        <div style={{ width: COL.lastConsult, flexShrink: 0 }} className="flex flex-col items-center justify-center">
          <span className="text-[#676E76] text-[12px]">Last Consult</span>
          <span className="text-[#24292E] text-[12px] font-medium">{p.lastConsult}</span>
        </div>

        {/* Actions */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
            Lorem
          </button>
          <Link href={`/clinic/patients/${p.id}`} className="text-[#24292E] text-[12px] font-medium flex items-center gap-1 hover:text-[#5476FC] transition-colors">
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
                <button className="text-[#676E76] hover:text-[#5476FC] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="20" x2="15" y2="20" /></svg>
                </button>
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
            {MOCK_PATIENTS.map(p => <PatientRow key={p.id} p={p} />)}
          </div>
        </div>

        {/* ── Right: Patient Details Card ──────────────── */}
        <div className="w-full xl:w-[320px] bg-[#EEF0F8] rounded-3xl p-6 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm relative">
          <h2 className="text-[#24292E] text-[16px] font-bold mb-6">Patient Details</h2>

          {/* Profile snippet */}
          <div className="flex items-center gap-4 mb-6">
            <AvatarPlaceholder size="w-12 h-12" />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] text-[14px] font-bold truncate">{selectedPatient.name}</span>
              <span className="text-[#676E76] text-[11px] truncate">{selectedPatient.email}</span>
            </div>
          </div>

          <Link href={`/clinic/patients/${selectedPatient.id}`} className="w-full flex items-center justify-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all mb-6">
            View Profile
          </Link>

          {/* Doctors List */}
          <div className="flex flex-col gap-3 mb-6">
            {selectedPatient.doctors.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <AvatarPlaceholder size="w-7 h-7" />
                <span className="text-[#676E76] text-[13px]">{doc.name}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-[#D6DEFF] mb-6 w-full" />

          {/* Summary */}
          <h3 className="text-[#24292E] text-[13px] font-bold mb-2">Summary of patient history</h3>
          <p className="text-[#676E76] text-[11px] leading-relaxed mb-6">
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
            <br /><br />
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
          </p>

          {/* Consultations */}
          <h3 className="text-[#24292E] text-[13px] font-bold mb-3">Consultations</h3>
          <div className="flex flex-col gap-2 mb-8">
            {selectedPatient.consultations.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[#676E76] text-[12px]">Reason: {c.reason}</span>
                <span className="text-[#A7AAB4] text-[11px]">{c.date}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-[#D6DEFF] mb-6 w-full" />

          {/* Send Reminder Form (Triggers Modal) */}
          <h3 className="text-[#24292E] text-[13px] font-bold mb-3">Send Reminder</h3>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-[#676E76]">Type message</label>
            <div 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-20 bg-[#E5E7EB] rounded-xl border border-transparent hover:border-[#D6DEFF] cursor-pointer transition-colors p-3 text-[12px] text-[#A7AAB4]"
            >
              Click to type reminder...
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all mt-3"
            >
              Remind for consultation
            </button>
          </div>
        </div>

      </div>

      {/* ── Send Reminder Modal ───────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#EEF0F8] rounded-3xl w-full max-w-[500px] p-10 relative shadow-2xl animate-scale-in">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-[#A7AAB4] hover:text-[#24292E] transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h2 className="text-[20px] font-bold text-[#24292E] text-center mb-8">Send Reminder / Follow-up request</h2>
            
            <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#24292E]">Patient Name</label>
                <input 
                  type="text" 
                  value={selectedPatient.name} 
                  readOnly 
                  className="w-full bg-transparent text-[13px] text-[#676E76] outline-none" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#24292E]">Date</label>
                <input 
                  type="date" 
                  required
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                  className="w-full h-12 bg-white border border-[#D6DEFF] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#24292E]">Message</label>
                <textarea 
                  required
                  value={reminderMsg}
                  onChange={e => setReminderMsg(e.target.value)}
                  className="w-full bg-white border border-[#D6DEFF] rounded-xl p-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm resize-none h-32" 
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-3 rounded-lg shadow-sm hover:shadow-md transition-all mt-4"
              >
                Send Follow-up Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
