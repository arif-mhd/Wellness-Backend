"use client";

import React, { useState, useMemo } from "react";

export interface CalendarAppointment {
  id: string | number;
  patientName: string;
  patientAvatar: string;
  patientAge: number;
  day: string; // SUN, MON, TUE, WED, THU, FRI, SAT
  hour: string; // "7 AM", "8 AM" etc.
  patientBio: string;
  reasonForVisit: string;
}

interface ScheduleCalendarViewProps {
  appointments: CalendarAppointment[];
  onConsultClick?: (appointment: CalendarAppointment) => void;
}

const HOURS = [
  "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM",
  "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM",
  "7 PM", "8 PM", "9 PM"
];

export default function ScheduleCalendarView({
  appointments = [],
  onConsultClick,
}: ScheduleCalendarViewProps) {
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointment | null>(null);
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");

  // Dynamically calculate the dates of the current week (Sunday to Saturday)
  const currentWeekDays = useMemo(() => {
    const current = new Date();
    const week = [];
    const distance = current.getDay(); // Sunday is index 0
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - distance);

    const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      week.push({
        label: dayLabels[i],
        num: String(d.getDate()),
        isToday: d.toDateString() === current.toDateString(),
      });
    }
    return week;
  }, []);

  const currentMonthYear = useMemo(() => {
    const d = new Date();
    const monthLabels = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const getCellAppointments = (day: string, hour: string) =>
    appointments.filter(
      (a) => a.day.toUpperCase() === day.toUpperCase() && a.hour.toUpperCase() === hour.toUpperCase()
    );

  return (
    <div className="relative flex flex-col w-full min-h-[640px] select-none">

      {/* ── Calendar Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-2">
        <div className="flex items-center gap-3">
          {/* Month label */}
          <span
            className="text-[#24292E] font-medium text-[16px] tracking-[-0.3px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {currentMonthYear}
          </span>
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
      <div className="overflow-x-auto relative">
        <div className="min-w-[840px] border border-[#EBEEF5] rounded-[16px] overflow-hidden bg-white max-h-[600px] overflow-y-auto">

          {/* Header row: Left GMT + 7 day columns + Right GMT */}
          <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: "72px repeat(7, 1fr) 72px" }}>
            {/* GMT corner Left */}
            <div
              className="bg-[#F9FAFC] border-b border-r border-[#EBEEF5] py-3 px-2 flex items-center justify-center text-[10px] font-bold text-[#9EA5AD]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              GMT
            </div>
            {currentWeekDays.map((day) => {
              return (
                <div
                  key={day.label}
                  className={`${day.isToday ? "bg-[#F2F5FF]" : "bg-[#F9FAFC]"} border-b border-r border-[#EBEEF5] py-3 px-2 flex flex-col items-center justify-center gap-0.5`}
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
              GMT
            </div>
          </div>

          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-[#EBEEF5] last:border-b-0"
              style={{ gridTemplateColumns: "72px repeat(7, 1fr) 72px" }}
            >
              {/* Time label Left */}
              <div
                className="bg-[#F9FAFC]/60 border-r border-[#EBEEF5] py-4 px-2 flex items-center justify-end text-[10px] font-semibold text-[#9EA5AD]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {hour}
              </div>

              {/* Day cells */}
              {currentWeekDays.map((day) => {
                const cellAppts = getCellAppointments(day.label, hour);
                return (
                  <div
                    key={`${day.label}-${hour}`}
                    className={`${day.isToday ? "bg-[#F2F5FF]" : "bg-white"} border-r border-[#EBEEF5] min-h-[60px] p-1.5 flex flex-col gap-1 justify-center`}
                  >
                    {cellAppts.map((appt) => (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(selectedAppt?.id === appt.id ? null : appt)}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-[#ECEFFE]/50 hover:bg-[#ECEFFE] transition-all cursor-pointer text-left shrink-0"
                      >
                        <img
                          src={appt.patientAvatar}
                          alt={appt.patientName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-white shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/patient-avatar-1.png";
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
                  (e.target as HTMLImageElement).src = "/patient-avatar-1.png";
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

          {/* Consult Now */}
          <button
            onClick={() => {
              onConsultClick?.(selectedAppt);
              setSelectedAppt(null);
            }}
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
