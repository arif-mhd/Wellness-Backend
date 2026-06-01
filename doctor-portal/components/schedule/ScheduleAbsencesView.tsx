"use client";

import React, { useState } from "react";

interface AbsenceBlock {
  day: string;
  startHour: number; // grid row start (0 = 7AM)
  endHour: number;   // grid row end (exclusive)
}

const DAYS_SLOT = [
  { label: "SUN", num: "21" },
  { label: "MON", num: "22" },
  { label: "TUE", num: "23" },
  { label: "WED", num: "24" },
  { label: "THU", num: "25" },
  { label: "FRI", num: "26" },
  { label: "SAT", num: "27" },
];

const HOURS_SLOT = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 AM", "01 PM", "02 PM"];

// Absences from mockup
const ABSENCE_BLOCKS: AbsenceBlock[] = [
  { day: "MON", startHour: 1, endHour: 3 }, // 8 AM - 10 AM
  { day: "TUE", startHour: 4, endHour: 7 }, // 11 AM - 2 PM
  { day: "WED", startHour: 3, endHour: 4 }, // 10 AM - 11 AM
  { day: "THU", startHour: 4, endHour: 7 }, // 11 AM - 2 PM
];

// Absence logs for right panel
const ABSENCE_LOGS = [
  {
    id: 1,
    dates: "March 10, 2024 - March 15, 2024",
    duration: "5 days",
    reason: "Family Emergency",
  },
  {
    id: 2,
    dates: "February 10, 2024 - February 15, 2024",
    duration: "5 days",
    reason: "Due to a scheduled surgery and recovery period. Doctor's note attached for verification.",
    file: "Medical Certificate.pdf",
  },
];

export default function ScheduleAbsencesView() {
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");
  const [showMarkAbsence, setShowMarkAbsence] = useState(false);
  const [reasonComment, setReasonComment] = useState("");

  return (
    <div className="flex flex-col gap-5 w-full select-none relative">
      
      {/* Top action link below tabs */}
      <div className="flex justify-start">
        <button
          onClick={() => setShowMarkAbsence(true)}
          className="text-[#5476FC] hover:text-[#4065FB] text-xs font-semibold tracking-[-0.24px] hover:underline transition-all flex items-center gap-1.5 cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Mark Absence
        </button>
      </div>

      {/* Double Column Layout: Calendar + Right Log Panel */}
      <div className="flex gap-6 items-start w-full">
        {/* Left Column: Calendar Grid Card */}
        <div className="flex-1 min-w-0 bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-sm flex flex-col gap-5">
          
          {/* Header */}
          <div className="flex flex-col gap-0.5">
            <h2
              className="text-[#24292E] font-medium text-[16px] tracking-[-0.32px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Schedule Absences
            </h2>
            <p
              className="text-[#9EA5AD] text-xs font-medium"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Set your unavailability here
            </p>
          </div>

          {/* Calendar Navigation header */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M4 8L1 4.5L4 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="px-3.5 py-1.5 border border-[#EBEEF5] rounded-full text-xs font-semibold text-[#676E76] bg-white hover:bg-slate-50 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Today
              </button>
              <button className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M1 8L4 4.5L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="flex items-center gap-1.5 text-[#24292E] font-medium text-[14px] tracking-[-0.28px] ml-1 hover:opacity-75 transition-opacity"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                October 2024
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                  <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(["Day", "Week"] as const).map((r) => {
                const isActive = activeRange === r;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={`px-5 py-2 rounded-full text-xs font-semibold tracking-[-0.24px] transition-all duration-200 ${
                      isActive
                        ? "bg-[#24292E] text-white border border-transparent shadow-sm"
                        : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-slate-50"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable grid */}
          <div className="overflow-x-auto relative">
            <div className="min-w-[560px] border border-[#EBEEF5] rounded-[14px] overflow-hidden bg-white relative">
              
              {/* Header Grid */}
              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                <div className="bg-[#F9FAFC] border-b border-r border-[#EBEEF5] py-3 px-1 flex items-center justify-center text-[9px] font-bold text-[#9EA5AD]"
                  style={{ fontFamily: "Outfit, sans-serif" }}>
                  GMT-5
                </div>
                {DAYS_SLOT.map((day) => {
                  const isToday = day.label === "THU";
                  return (
                    <div
                      key={day.label}
                      className={`${isToday ? "bg-[#F2F5FF]" : "bg-[#F9FAFC]"} border-b border-r border-[#EBEEF5] py-3 px-1 flex flex-col items-center gap-0.5`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span className="text-[8px] font-bold text-[#9EA5AD] tracking-widest uppercase">{day.label}</span>
                      <span className="text-[13px] font-bold text-[#24292E]">{day.num}</span>
                    </div>
                  );
                })}
                <div className="bg-[#F9FAFC] border-b border-[#EBEEF5] py-3 px-1 flex items-center justify-center text-[9px] font-bold text-[#9EA5AD]"
                  style={{ fontFamily: "Outfit, sans-serif" }}>
                  GMT-5
                </div>
              </div>

              {/* Body Grid */}
              <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                
                {/* Left GMT Labels */}
                <div className="flex flex-col bg-[#F9FAFC]/60 border-r border-[#EBEEF5]">
                  {HOURS_SLOT.map((hour) => (
                    <div
                      key={`left-${hour}`}
                      className="h-[52px] border-b border-[#EBEEF5] last:border-b-0 py-4 px-1 flex items-center justify-end text-[9px] font-semibold text-[#9EA5AD]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {DAYS_SLOT.map((day) => {
                  const isToday = day.label === "THU";
                  return (
                    <div
                      key={day.label}
                      className="flex flex-col border-r border-[#EBEEF5] relative"
                    >
                      {HOURS_SLOT.map((hour, hourIdx) => {
                        const isAbsent = ABSENCE_BLOCKS.some(
                          (b) => b.day === day.label && hourIdx >= b.startHour && hourIdx < b.endHour
                        );

                        let cellBg = "bg-white";
                        if (isAbsent) {
                          cellBg = "bg-[#F38B8B]";
                        } else if (isToday) {
                          cellBg = "bg-[#F2F5FF]";
                        }

                        return (
                          <div
                            key={`${day.label}-${hour}`}
                            className={`h-[52px] border-b border-[#EBEEF5] last:border-b-0 ${cellBg}`}
                          />
                        );
                      })}

                      {/* Floating tooltip/popover THU 25 */}
                      {isToday && (
                        <div
                          className="absolute left-[calc(100%-12px)] z-20 bg-white border border-[#EBEEF5] rounded-[10px] px-3.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[9px] font-bold text-[#24292E] whitespace-nowrap pointer-events-none"
                          style={{
                            top: "226px",
                            fontFamily: "Outfit, sans-serif",
                          }}
                        >
                          10 AM - 01:30 PM
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Right GMT Labels */}
                <div className="flex flex-col bg-[#F9FAFC]/60">
                  {HOURS_SLOT.map((hour) => (
                    <div
                      key={`right-${hour}`}
                      className="h-[52px] border-b border-[#EBEEF5] last:border-b-0 py-4 px-1 flex items-center justify-start text-[9px] font-semibold text-[#9EA5AD]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {hour}
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Absence Log Sidebar Panel */}
        <div className="w-[280px] shrink-0 bg-white border border-[#EBEEF5] rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span
              className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Absence Log
            </span>
            <button
              className="text-[#5476FC] hover:text-[#4065FB] text-xs font-semibold transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              View All
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {ABSENCE_LOGS.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1.5 p-4 rounded-[16px] bg-[#F9FAFC] border border-[#EBEEF5]/60"
              >
                <div
                  className="text-[12px] font-semibold tracking-[-0.24px] text-[#24292E]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {log.dates} <span className="text-[#5476FC]">({log.duration})</span>
                </div>
                <div
                  className="text-[10px] text-[#9EA5AD] leading-[1.5]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {log.reason}
                </div>

                {log.file && (
                  <div className="flex items-center gap-1.5 mt-1 text-[#5476FC] hover:underline cursor-pointer text-[10px] font-semibold">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <path
                        d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5M1.5 9.5h9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {log.file}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Interactive Mark Absence Modal ────────────────────────────────────── */}
      {showMarkAbsence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-[0_12px_50px_rgba(0,0,0,0.15)] w-full max-w-[500px] mx-4 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h3
                className="text-[#24292E] font-semibold text-[17px] tracking-[-0.34px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Mark Absence
              </h3>
              <button
                onClick={() => setShowMarkAbsence(false)}
                className="w-7 h-7 rounded-full hover:bg-[#F5F6FA] flex items-center justify-center text-[#9EA5AD] hover:text-[#383F45] transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 10.5l9-9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Selected Date pills */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Selected Date
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-4 py-2 bg-[#EEF2FF] text-[#5476FC] font-semibold text-[11px] rounded-full"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  2 June, 2024, 06:00 PM
                </span>
                <span className="text-[#9EA5AD] font-medium">-</span>
                <span
                  className="px-4 py-2 bg-[#EEF2FF] text-[#5476FC] font-semibold text-[11px] rounded-full"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  3 June, 2024, 08:00 PM
                </span>
              </div>
            </div>

            {/* Warning Alert Box with Conflict Card */}
            <div className="bg-[#FFF0F0] rounded-[16px] p-4 flex flex-col gap-3">
              <p
                className="text-[#24292E] text-[11.5px] font-semibold leading-[1.5]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                An appointment is already scheduled on this day. This appointment will be canceled if you choose to mark absence.
              </p>
              
              {/* Conflicting Patient Details Card */}
              <div className="flex items-center gap-3 p-3 bg-white/70 border border-[#FFD4D4] rounded-[12px]">
                <img
                  src="/patient-avatar-2.png"
                  alt="Arlene McCoy"
                  className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#EBEEF5]"
                  onError={(e) => {
                    // Fallback avatar background
                    (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%23EEF2FF'/><text x='50%' y='55%' font-family='Outfit' font-size='12' font-weight='bold' fill='%235476FC' dominant-baseline='middle' text-anchor='middle'>AM</text></svg>";
                  }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-[12px] font-bold text-[#24292E] truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Arlene McCoy, 32 y/o
                  </span>
                  <span
                    className="text-[10px] font-semibold text-[#E05252]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    2 June, 2024, 06:30 PM
                  </span>
                </div>
              </div>
            </div>

            {/* Reason Comments */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Reason*
              </span>
              <textarea
                placeholder="Comments here.."
                value={reasonComment}
                onChange={(e) => setReasonComment(e.target.value)}
                className="w-full bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] p-4 text-[13px] text-[#24292E] placeholder-[#9EA5AD] min-h-[100px] outline-none focus:border-[#5476FC] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Attach Screenshot/ File */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Attach screenshot/ file
              </span>
              <div className="flex items-center justify-between p-3.5 bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#9EA5AD]">
                    <path
                      d="M8.5 4.5l-3.5 3.5c-.8.8-2 .8-2.8 0s-.8-2 0-2.8l4.5-4.5c1.2-1.2 3.2-1.2 4.4 0s1.2 3.2 0 4.4l-4.5 4.5c-1.6 1.6-4.2 1.6-5.8 0s-1.6-4.2 0-5.8l3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className="text-[#9EA5AD] text-xs font-semibold"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Attach file
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowMarkAbsence(false)}
                className="flex-1 py-3 rounded-[14px] bg-[#EEF2FF] text-[#243D7F] hover:bg-[#E4EAFF] font-bold text-[13px] tracking-[-0.26px] transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowMarkAbsence(false)}
                className="flex-1 py-3 rounded-[14px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] text-white font-bold text-[13px] tracking-[-0.26px] transition-all duration-200"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Confirm Absence
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
