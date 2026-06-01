"use client";

import React, { useState } from "react";

export interface CalendarAppointment {
  id: number;
  patientName: string;
  patientAvatar: string;
  patientAge: number;
  day: string; // TUE, WED, THU, FRI, SAT
  hour: string; // "7 AM", "8 AM" etc
  patientBio: string;
  reasonForVisit: string;
}

interface ScheduleCalendarViewProps {
  appointments: CalendarAppointment[];
  onConsultClick?: (appointment: CalendarAppointment) => void;
}

const DAYS = [
  { label: "TUE", num: "23" },
  { label: "WED", num: "24" },
  { label: "THU", num: "25" },
  { label: "FRI", num: "26" },
  { label: "SAT", num: "27" },
];

const HOURS = ["7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 AM", "01 PM", "02 PM"];

export default function ScheduleCalendarView({
  appointments,
  onConsultClick,
}: ScheduleCalendarViewProps) {
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointment | null>(null);
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");

  const getCellAppointments = (day: string, hour: string) =>
    appointments.filter(
      (a) => a.day.toUpperCase() === day.toUpperCase() && a.hour.toUpperCase() === hour.toUpperCase()
    );

  return (
    <div className="relative flex flex-col w-full min-h-[640px] select-none">

      {/* ── Calendar Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-2">
        <div className="flex items-center gap-3">
          {/* Prev / Today / Next */}
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M5 9L1 5L5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="px-4 py-1.5 border border-[#EBEEF5] rounded-full text-xs font-semibold text-[#676E76] bg-white hover:bg-slate-50 transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Today
            </button>
            <button className="w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors">
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Month label */}
          <button
            className="flex items-center gap-1.5 text-[#24292E] font-medium text-[15px] tracking-[-0.3px] hover:opacity-75 transition-opacity"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            October 2024
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
              <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Day / Week toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {(["Day", "Week"] as const).map((range) => {
            const isActive = activeRange === range;
            return (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-[-0.24px] transition-all duration-200 ${
                  isActive
                    ? "bg-[#24292E] text-white border border-transparent shadow-sm"
                    : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-slate-50"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {range}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        {/* Use a table-like structure with explicit rows to avoid last:border-r-0 leaking across rows */}
        <div className="min-w-[720px] border border-[#EBEEF5] rounded-[16px] overflow-hidden bg-white">

          {/* Header row: Left GMT + 5 day columns + Right GMT */}
          <div className="grid" style={{ gridTemplateColumns: "72px repeat(5, 1fr) 72px" }}>
            {/* GMT corner Left */}
            <div
              className="bg-[#F9FAFC] border-b border-r border-[#EBEEF5] py-3 px-2 flex items-center justify-center text-[10px] font-bold text-[#9EA5AD]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              GMT-5
            </div>
            {DAYS.map((day, idx) => {
              const isToday = day.label === "THU";
              return (
                <div
                  key={day.label}
                  className={`${isToday ? "bg-[#F2F5FF]" : "bg-[#F9FAFC]"} border-b border-r border-[#EBEEF5] py-3 px-2 flex flex-col items-center justify-center gap-0.5`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span className="text-[9px] font-bold text-[#9EA5AD] tracking-widest uppercase">{day.label}</span>
                  <span className="text-[14px] font-bold text-[#24292E]">{day.num}</span>
                </div>
              );
            })}
            {/* GMT corner Right */}
            <div
              className="bg-[#F9FAFC] border-b border-[#EBEEF5] py-3 px-2 flex items-center justify-center text-[10px] font-bold text-[#9EA5AD]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              GMT-5
            </div>
          </div>

          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-[#EBEEF5] last:border-b-0"
              style={{ gridTemplateColumns: "72px repeat(5, 1fr) 72px" }}
            >
              {/* Time label Left */}
              <div
                className="bg-[#F9FAFC]/60 border-r border-[#EBEEF5] py-4 px-2 flex items-center justify-end text-[10px] font-semibold text-[#9EA5AD]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {hour}
              </div>

              {/* Day cells */}
              {DAYS.map((day, idx) => {
                const cellAppts = getCellAppointments(day.label, hour);
                const isToday = day.label === "THU";
                return (
                  <div
                    key={`${day.label}-${hour}`}
                    className={`${isToday ? "bg-[#F2F5FF]" : "bg-white"} border-r border-[#EBEEF5] min-h-[60px] p-1.5 flex flex-col gap-1 justify-center`}
                  >
                    {cellAppts.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(selectedAppt?.id === appt.id ? null : appt)}
                        className="w-full flex items-center gap-2 p-1 transition-all cursor-pointer text-left hover:opacity-80 shrink-0"
                      >
                        <img
                          src={appt.patientAvatar}
                          alt={appt.patientName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-white shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                          }}
                        />
                        <span
                          className="text-[11px] font-medium text-[#24292E] truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {appt.patientName}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}

              {/* Time label Right */}
              <div
                className="bg-[#F9FAFC]/60 py-4 px-2 flex items-center justify-start text-[10px] font-semibold text-[#9EA5AD]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {hour}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Appointment Details Overlay ───────────────────────────────────────── */}
      {selectedAppt && (
        <div className="absolute top-[130px] left-6 z-30 w-[330px] bg-white border border-[#EBEEF5] rounded-[24px] p-5 shadow-[0_16px_40px_rgba(36,41,46,0.16)] flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h4
              className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Appointment Details
            </h4>
            <button
              onClick={() => setSelectedAppt(null)}
              className="w-7 h-7 rounded-full hover:bg-[#F5F6FA] flex items-center justify-center text-[#9EA5AD] hover:text-[#383F45] transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 9l8-8M1 1l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Patient Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={selectedAppt.patientAvatar}
                alt={selectedAppt.patientName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#EBEEF5] shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                }}
              />
              <div>
                <p className="text-[#24292E] font-semibold text-[14px] tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {selectedAppt.patientName}
                </p>
                <p className="text-[#9EA5AD] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {selectedAppt.patientAge} Year Old
                </p>
              </div>
            </div>

            {/* View Profile button */}
            <button
              className="w-full py-2.5 rounded-[12px] bg-[#EEF2FF] text-[#5476FC] hover:bg-[#5476FC] hover:text-white font-semibold text-[13px] transition-all duration-200"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              View Profile
            </button>
          </div>

          {/* Bio */}
          <p className="text-[#9EA5AD] text-[11px] leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {selectedAppt.patientBio}
          </p>

          {/* Reason for visit */}
          <div className="bg-[#F5F6FA] rounded-[14px] p-3.5 flex flex-col gap-1.5">
            <span className="text-[#24292E] font-bold text-[9px] uppercase tracking-[0.08em]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Reason for visit
            </span>
            <p className="text-[#676E76] text-[11px] leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {selectedAppt.reasonForVisit}
            </p>
          </div>

          {/* Pre-visit Form */}
          <div className="bg-[#F5F6FA] rounded-[14px] p-3.5 flex flex-col gap-1.5">
            <span className="text-[#24292E] font-bold text-[9px] uppercase tracking-[0.08em]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Pre-visit Form
            </span>
            <p className="text-[#676E76] text-[11px] leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Review the patient's pre-visit form to understand their medical history and reason for the appointment.
            </p>
            <button
              className="flex items-center gap-1 text-[#5476FC] hover:text-[#4065FB] text-[11px] font-semibold transition-colors mt-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Read Pre-visit form
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5h10M7 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Consult Now */}
          <button
            onClick={() => onConsultClick?.(selectedAppt)}
            className="w-full py-3 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] hover:shadow-[0_8px_20px_rgba(84,118,252,0.3)] text-white font-bold text-[14px] tracking-[-0.28px] transition-all duration-200"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Consult Now
          </button>
        </div>
      )}
    </div>
  );
}
