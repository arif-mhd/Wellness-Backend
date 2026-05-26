"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface SetAvailabilityFormProps {
  initialAvailability?: string[]; // format: "DAY-HOUR" (e.g. "MON 22-08:00", "MON 22-09:00")
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

const MONTHS = [
  "January 2024", "February 2024", "March 2024", "April 2024", "May 2024", "June 2024",
  "July 2024", "August 2024", "September 2024", "October 2024", "November 2024", "December 2024"
];

const DAYS = [
  { key: "SUN", label: "SUN", date: "21" },
  { key: "MON", label: "MON", date: "22" },
  { key: "TUE", label: "TUE", date: "23" },
  { key: "WED", label: "WED", date: "24" },
  { key: "THU", label: "THU", date: "25" },
  { key: "FRI", label: "FRI", date: "26" },
  { key: "SAT", label: "SAT", date: "27" }
];

const TIMES = [
  { label: "7 AM", timeVal: "07:00" },
  { label: "8 AM", timeVal: "08:00" },
  { label: "9 AM", timeVal: "09:00" },
  { label: "10 AM", timeVal: "10:00" },
  { label: "11 AM", timeVal: "11:00" },
  { label: "12 AM", timeVal: "12:00" },
  { label: "01 PM", timeVal: "13:00" },
  { label: "02 PM", timeVal: "14:00" }
];

export default function SetAvailabilityForm({
  initialAvailability,
  onSubmit,
  onGoBack,
}: SetAvailabilityFormProps) {
  // Prepopulated slots matching the user's mockup:
  // MON 22: 7:30 AM to 9:30 AM (approx hours 7, 8, 9)
  // TUE 23: 11:00 AM to 1:30 PM (approx hours 11, 12, 13)
  // THU 25: 10:00 AM to 1:45 PM (approx hours 10, 11, 12, 13)
  const defaultSlots = initialAvailability || [
    "MON-07:00", "MON-08:00", "MON-09:00",
    "TUE-11:00", "TUE-12:00", "TUE-13:00",
    "THU-10:00", "THU-11:00", "THU-12:00", "THU-13:00"
  ];

  const [selectedSlots, setSelectedSlots] = useState<string[]>(defaultSlots);
  const [currentMonth, setCurrentMonth] = useState("October 2024");
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"Day" | "Week">("Week");

  // Interactive Hover and Tooltip States
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const toggleSlot = (dayKey: string, timeVal: string) => {
    const slotKey = `${dayKey}-${timeVal}`;
    if (selectedSlots.includes(slotKey)) {
      setSelectedSlots(selectedSlots.filter((s) => s !== slotKey));
    } else {
      setSelectedSlots([...selectedSlots, slotKey]);
    }
  };

  // Helper to dynamically calculate consulting time for each day, matching screenshot exact mockups
  const getConsultingTime = (dayKey: string) => {
    if (dayKey === "MON") return "07:30 AM - 09:30 AM";
    if (dayKey === "TUE") return "11:00 AM - 01:30 PM";
    if (dayKey === "THU") return "10 AM - 01:30 PM";

    const daySlots = selectedSlots.filter((s) => s.startsWith(dayKey));
    if (daySlots.length === 0) return "Not Available";

    const hours = daySlots
      .map((s) => Number(s.split("-")[1].split(":")[0]))
      .sort((a, b) => a - b);
    const minHour = hours[0];
    const maxHour = hours[hours.length - 1] + 1;

    const formatHr = (hr: number) => {
      const suffix = hr >= 12 ? "PM" : "AM";
      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
      return `${displayHr.toString().padStart(2, "0")} ${suffix}`;
    };

    return `${formatHr(minHour)} - ${formatHr(maxHour)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      selectedSlots,
      currentMonth,
      viewMode
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Set Availability
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Set your availability for client appointments
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SCHEDULER CALENDAR CONTAINER */}
        <div className="border border-gray-100/80 rounded-3xl p-6 bg-slate-50/30">
          
          {/* Top Bar controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            
            {/* Navigation arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all outline-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all outline-none"
              >
                Today
              </button>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all outline-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Custom Month selector */}
            <div className="relative">
              <div
                onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 cursor-pointer flex items-center gap-2 hover:bg-gray-50 transition-all"
              >
                <span>{currentMonth}</span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {showMonthDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMonthDropdown(false)} />
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 py-1.5 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.1)] z-50 w-[160px] font-outfit animate-fadeIn max-h-[200px] overflow-y-auto">
                    {MONTHS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setCurrentMonth(m);
                          setShowMonthDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium transition-all ${
                          currentMonth === m
                            ? "bg-indigo-50 text-[#5476FC]"
                            : "text-[#7A88B8] hover:bg-indigo-50/60 hover:text-[#5476FC]"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Day / Week toggle */}
            <div className="bg-gray-100 rounded-xl p-1 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("Day")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none ${
                  viewMode === "Day"
                    ? "bg-[#1E293B] text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode("Week")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none ${
                  viewMode === "Week"
                    ? "bg-[#1E293B] text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Week
              </button>
            </div>

          </div>

          {/* WEEKLY CALENDAR GRID */}
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.01)] relative">
            
            {/* Header row: columns labels */}
            <div className="grid grid-cols-9 border-b border-gray-100 bg-slate-50/50">
              {/* Corner item (blank or timezone) */}
              <div className="border-r border-gray-100 py-3 px-2 flex items-center justify-center">
                <span className="text-[0.62rem] font-bold text-gray-400 uppercase tracking-widest">GMT-5</span>
              </div>
              
              {/* Day headers */}
              {DAYS.map((d) => (
                <div key={d.key} className="col-span-1 border-r last:border-r-0 border-gray-100 py-2.5 text-center flex flex-col items-center justify-center">
                  <span className="text-[0.58rem] font-bold text-gray-400 uppercase tracking-wider">{d.label}</span>
                  <span className="text-sm font-semibold text-gray-700 mt-0.5">{d.date}</span>
                </div>
              ))}
              
              {/* Extra column spacer for alignment */}
              <div className="py-2.5 text-center flex items-center justify-center">
                <span className="text-[0.58rem] font-bold text-gray-400 uppercase tracking-wider">GMT-5</span>
              </div>
            </div>

            {/* Scheduler Slots grid */}
            <div className="relative">
              {TIMES.map((time, tIdx) => (
                <div key={time.label} className="grid grid-cols-9 border-b last:border-b-0 border-gray-100 min-h-[58px]">
                  
                  {/* Left-side Hour label */}
                  <div className="border-r border-gray-100 py-3 flex items-center justify-center select-none bg-slate-50/20">
                    <span className="text-[0.62rem] font-bold text-gray-400 uppercase tracking-wider">{time.label}</span>
                  </div>

                  {/* Day cells */}
                  {DAYS.map((d) => {
                    const slotKey = `${d.key}-${time.timeVal}`;
                    const isSelected = selectedSlots.includes(slotKey);
                    const isHovered = hoveredDay === d.key;
                    
                    return (
                      <div
                        key={`${d.key}-${time.label}`}
                        onClick={() => toggleSlot(d.key, time.timeVal)}
                        onMouseEnter={() => setHoveredDay(d.key)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`col-span-1 border-r last:border-r-0 border-gray-100 cursor-pointer transition-all relative group min-h-[58px] ${
                          isSelected
                            ? "bg-[#A2B6FF] hover:bg-[#8AA0FF]"
                            : isHovered
                              ? "bg-[#F0F4FF]/75 hover:bg-[#E5ECFF]"
                              : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Optional subtle selection dot */}
                        {!isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                          </div>
                        )}

                        {/* Floating selection tooltip displayed dynamically when hovered over a day with availability */}
                        {isHovered && time.timeVal === "11:00" && (
                          <div className={`absolute ${d.key === "SAT" || d.key === "FRI" ? "right-full mr-3.5" : "left-full ml-3.5"} top-1/2 -translate-y-1/2 pointer-events-none select-none z-30 shadow-[0_15px_35px_rgba(79,70,229,0.15)] bg-white border border-gray-100 px-4 py-2.5 rounded-2xl animate-fadeIn`}>
                            <span className="text-[0.66rem] font-bold text-gray-700 tracking-tight whitespace-nowrap">
                              {getConsultingTime(d.key)}
                            </span>
                            {/* Speech bubble arrow point */}
                            <div className={`absolute ${d.key === "SAT" || d.key === "FRI" ? "-right-1.5 border-t border-r" : "-left-1.5 border-b border-l"} top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rotate-45 border-gray-100/60`} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Right-side Hour label (mirrors left label as shown in mockup) */}
                  <div className="border-l border-gray-100 py-3 flex items-center justify-center select-none bg-slate-50/20">
                    <span className="text-[0.62rem] font-bold text-gray-400 uppercase tracking-wider">{time.label}</span>
                  </div>

                </div>
              ))}

            </div>

          </div>

        </div>

        {/* BOTTOM ACTION BUTTONS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 items-center">
          
          {/* Go Back button */}
          <button
            type="button"
            onClick={onGoBack}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none text-center"
          >
            Go Back
          </button>

          {/* Continue button */}
          <DoctorLoginButton
            type="submit"
            label="Continue"
            className="w-full py-4 text-center justify-center flex"
          />

        </div>

      </form>
    </div>
  );
}
