"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_DOCTORS = [
  {
    id: "1",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Online",
    statusColor: "text-[#179353]", // Green
    subtext: "Clinic",
    subtextColor: "text-[#5476FC]",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: false,
  },
  {
    id: "2",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Online",
    statusColor: "text-[#179353]",
    subtext: "Clinic",
    subtextColor: "text-[#5476FC]",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: false,
  },
  {
    id: "3",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Online",
    statusColor: "text-[#179353]",
    subtext: "Clinic",
    subtextColor: "text-[#5476FC]",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: false,
  },
  {
    id: "4",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Online",
    statusColor: "text-[#179353]",
    subtext: "Clinic",
    subtextColor: "text-[#5476FC]",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: false,
  },
  // Offline
  {
    id: "5",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Not available",
    statusColor: "text-[#9EA5AD]", // Gray
    subtext: "",
    subtextColor: "",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: true,
  },
  {
    id: "6",
    name: "Dr. Helena Thomas",
    lic: "1234567888",
    status: "Not available",
    statusColor: "text-[#9EA5AD]",
    subtext: "",
    subtextColor: "",
    specialties: ["Gynaecologist", "+", "General Physician"],
    totalCons1: 68,
    totalCons2: 10,
    avgCons: 10,
    prescriptions: 10,
    feedback: 4.1,
    isOffline: true,
  }
];

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

function AvatarPlaceholder({ name, size = "w-10 h-10 text-sm" }: { name: string; size?: string }) {
  // We'll just generate an image placeholder or simple initial to match mockup
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-gray-200`}>
      <svg className="w-full h-full text-gray-400 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center text-[#5476FC]">
        {[1, 2, 3, 4].map(i => (
          <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        ))}
        {/* Empty star */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      </div>
      <span className="text-[#24292E] text-[11px] font-medium">({rating})</span>
    </div>
  );
}

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
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState("1");

  const selectedDoctor = MOCK_DOCTORS.find(d => d.id === selectedId) ?? MOCK_DOCTORS[0];
  const onlineDoctors = MOCK_DOCTORS.filter(d => !d.isOffline);
  const offlineDoctors = MOCK_DOCTORS.filter(d => d.isOffline);

  function DoctorRow({ doc }: { doc: typeof MOCK_DOCTORS[0] }) {
    const isSelected = selectedId === doc.id;
    return (
      <div
        onClick={() => setSelectedId(doc.id)}
        className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
          }`}
      >
        {/* Name Column */}
        <div style={{ width: COL.name, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
          <div className="relative">
            <AvatarPlaceholder name={doc.name} size="w-10 h-10" />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${doc.status === 'Online' ? 'bg-[#179353]' : 'bg-[#9EA5AD]'}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#24292E] text-[13px] font-medium truncate">{doc.name}</span>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className={doc.statusColor}>{doc.status}</span>
              {doc.subtext && (
                <span className={doc.subtextColor}>{doc.subtext}</span>
              )}
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="flex-1 min-w-[90px] pr-2 flex flex-col text-[#24292E] text-[11px] font-medium leading-tight justify-center">
          <span>{doc.specialties[0]} {doc.specialties[1]}</span>
          <span>{doc.specialties[2]}</span>
        </div>

        {/* Cons 1 */}
        <div style={{ width: COL.cons1, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.totalCons1}</div>

        {/* Cons 2 */}
        <div style={{ width: COL.cons2, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.totalCons2}</div>

        {/* Avg */}
        <div style={{ width: COL.avg, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.avgCons}</div>

        {/* Prescriptions */}
        <div style={{ width: COL.presc, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.prescriptions}</div>

        {/* Feedback */}
        <div style={{ width: COL.feedback, flexShrink: 0 }} className="flex justify-center">
          <StarRating rating={doc.feedback} />
        </div>

        {/* Action */}
        <div className="w-[50px] flex shrink-0 items-center justify-end">
          <Link href={`/clinic/doctors/${doc.id}`} className="text-[#24292E] text-[12px] font-medium flex items-center gap-1 hover:text-[#5476FC] transition-colors">
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
            <Link href="/clinic/doctors/add" className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-2 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
              Add Doctor
            </Link>
          </div>

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
                <div style={{ width: COL.cons2, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Total No. of<br />Consultation <ChevronDown /></div>
                <div style={{ width: COL.avg, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Average<br />Consultation <ChevronDown /></div>
                <div style={{ width: COL.presc, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center leading-tight">Number of<br />prescription <ChevronDown /></div>
                <div style={{ width: COL.feedback, flexShrink: 0 }} className="flex justify-center items-center gap-1 cursor-pointer">P. Feedback <ChevronDown /></div>
                <div className="w-[50px] flex shrink-0" />
              </div>

              {/* Online Doctors */}
              <div className="flex flex-col gap-2 mt-4">
                {onlineDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} />)}
              </div>

              {/* Offline header */}
              <h2 className="text-[#24292E] text-sm font-bold mt-6 mb-3">Offline</h2>
              <div className="flex flex-col gap-2">
                {offlineDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} />)}
              </div>

            </div>
          </div>

        </div>

        {/* ── Right: Doctor Details Card ──────────────── */}
        <div className="w-full xl:w-[320px] bg-[#EEF0F6] rounded-2xl p-5 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm relative">

          <h2 className="text-[#24292E] text-[15px] font-bold mb-5">Doctor Details</h2>

          {/* Profile snippet */}
          <div className="flex items-center gap-3 mb-6">
            <AvatarPlaceholder name={selectedDoctor.name} size="w-12 h-12" />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] text-[13px] font-bold truncate">{selectedDoctor.name}</span>
              <span className="text-[#9EA5AD] text-[11px] font-medium truncate">Lic:{selectedDoctor.lic}</span>
              <span className={`${selectedDoctor.status === "Online" ? "text-[#179353]" : "text-[#9EA5AD]"} text-[11px] font-medium mt-0.5`}>
                {selectedDoctor.status === "Online" ? "Available" : "Not Available"}
              </span>
            </div>
          </div>

          <div className="h-px bg-[#D6DEFF] mb-5 w-full" />

          {/* Details Grid */}
          <div className="flex flex-col gap-3 mb-8">
            {[
              { label: "Emirates ID", val: "ABC1234" },
              { label: "Gender", val: "FEMALE" },
              { label: "Specialization", val: "Lorem Ipsum" },
              { label: "Qualification", val: "Lorem Ipsum" },
              { label: "Location", val: "Lorem Ipsum" },
              { label: "Consultation Fees", val: "Lorem Ipsum" },
              { label: "Email", val: "email@123.com" },
              { label: "Contact Number", val: "1234567890" },
              { label: "Office Phone", val: "Lorem Ipsum" },
              { label: "Languages", val: "Lorem Ipsum" },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[#24292E] text-[12px] font-medium">{row.label}</span>
                <span className="text-[#676E76] text-[11px] text-right truncate w-32">{row.val}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mb-8">
            <Link href={`/clinic/doctors/${selectedId}`} className="w-full flex items-center justify-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
              View Profile
            </Link>
            <button className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
              Message
            </button>
          </div>

          {/* Timing Section */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#24292E] text-[13px] font-bold uppercase">TIMING</span>
            <button className="text-[#24292E] hover:text-[#5476FC] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </button>
          </div>

          <div className="flex flex-col gap-2.5 mb-6">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
              <div key={day} className="flex items-center justify-between">
                <span className="text-[#676E76] text-[12px]">{day}</span>
                <span className="text-[#24292E] text-[12px] font-medium">9 am to 8pm</span>
              </div>
            ))}
          </div>



        </div>

      </div>
    </div>
  );
}
