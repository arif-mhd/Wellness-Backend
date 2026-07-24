"use client";

import { useState, useMemo } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface SetAvailabilityFormProps {
  initialAvailability?: string[];
  onSubmit: (data: any) => void;
  onGoBack: () => void;
  /** Overrides the default "Set Availability" heading — used to show e.g.
   *  "Branch 2 of 3 — Set Availability" during the multi-branch loop. */
  heading?: string;
  /** Hide action buttons until an edit is made (useful for standard profile pages) */
  hideButtonsIfUnchanged?: boolean;
}

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type DayKey = (typeof DAY_KEYS)[number];

// Default: Mon–Fri, 9AM–5PM (hours 09–17 inclusive = 9 slots, displays as 9AM–6PM end boundary)
// Each cell = "this hour is bookable". 09:00–17:00 selected means available 9AM through end of 5PM hour.
const DEFAULT_SLOTS: string[] = DAY_KEYS.flatMap((d) =>
  d === "SUN" || d === "SAT"
    ? []
    : Array.from({ length: 9 }, (_, i) => `${d}-${String(9 + i).padStart(2, "0")}:00`)
);

const TIMES = Array.from({ length: 24 }, (_, h) => {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return {
    label: `${String(display).padStart(2, "0")} ${suffix}`,
    timeVal: `${String(h).padStart(2, "0")}:00`,
    hour: h,
  };
});

function getWeekDates(weekOffset: number): Date[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay() + weekOffset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function formatMonthYear(dates: Date[]): string {
  const labels = [...new Set(dates.map((d) => d.toLocaleString("en-US", { month: "long", year: "numeric" })))];
  return labels.join(" / ");
}

function isToday(d: Date): boolean {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function getConsultingTime(selectedSlots: string[], dayKey: DayKey): string {
  const hours = selectedSlots
    .filter((s) => s.startsWith(`${dayKey}-`))
    .map((s) => parseInt(s.split("-")[1]))
    .sort((a, b) => a - b);
  if (!hours.length) return "Not Available";

  // Format: "5PM" means the 5PM slot (17:00) is selected — show as "5PM" start label.
  // Range display: first slot start → last slot start (e.g. 09–17 selected = "9AM–5PM").
  const fmt = (h: number) => {
    const sfx = h < 12 ? "AM" : "PM";
    const d = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${d}${sfx}`;
  };

  // Build contiguous ranges, end label = last hour in block (not +1)
  const ranges: string[] = [];
  let start = hours[0];
  let prev = hours[0];
  for (let i = 1; i <= hours.length; i++) {
    if (i === hours.length || hours[i] !== prev + 1) {
      ranges.push(start === prev ? fmt(start) : `${fmt(start)}–${fmt(prev)}`);
      if (i < hours.length) { start = hours[i]; prev = hours[i]; }
    } else {
      prev = hours[i];
    }
  }
  return ranges.join(", ");
}

export default function SetAvailabilityForm({ initialAvailability, onSubmit, onGoBack, heading, hideButtonsIfUnchanged }: SetAvailabilityFormProps) {
  const [selectedSlots, setSelectedSlots] = useState<string[]>(initialAvailability ?? DEFAULT_SLOTS);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => new Date().getDay()); // 0=Sun
  const [hoveredDay, setHoveredDay] = useState<DayKey | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthLabel = useMemo(() => formatMonthYear(weekDates), [weekDates]);
  const activeDayKey = DAY_KEYS[selectedDayIdx];

  const hasChanges = useMemo(() => {
    if (!initialAvailability) return true; // if initial is undefined, user must explicitly accept DEFAULT_SLOTS or we just consider it a new setup (where buttons usually shouldn't be hidden)
    if (initialAvailability.length !== selectedSlots.length) return true;
    const baseSet = new Set(initialAvailability);
    return selectedSlots.some((s) => !baseSet.has(s));
  }, [initialAvailability, selectedSlots]);

  const showButtons = hideButtonsIfUnchanged ? hasChanges : true;

  /* ── slot toggle helpers ─────────────────────────── */
  const applySlot = (dayKey: DayKey, timeVal: string, mode: "add" | "remove") => {
    const key = `${dayKey}-${timeVal}`;
    setSelectedSlots((prev) =>
      mode === "add"
        ? prev.includes(key) ? prev : [...prev, key]
        : prev.filter((s) => s !== key)
    );
  };

  const startDrag = (dayKey: DayKey, timeVal: string) => {
    const key = `${dayKey}-${timeVal}`;
    const mode = selectedSlots.includes(key) ? "remove" : "add";
    setDragMode(mode);
    setDragging(true);
    applySlot(dayKey, timeVal, mode);
  };

  const continueDrag = (dayKey: DayKey, timeVal: string) => {
    if (dragging) applySlot(dayKey, timeVal, dragMode);
  };

  const clearDay = (dayKey: DayKey) =>
    setSelectedSlots((prev) => prev.filter((s) => !s.startsWith(`${dayKey}-`)));

  const setDayFull = (dayKey: DayKey) => {
    const keys = TIMES.map((t) => `${dayKey}-${t.timeVal}`);
    setSelectedSlots((prev) => [...prev.filter((s) => !s.startsWith(`${dayKey}-`)), ...keys]);
  };

  /* ── submit ──────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ selectedSlots });
  };

  /* ── shared: day column cell ─────────────────────── */
  const DayCell = ({ dayKey, timeVal }: { dayKey: DayKey; timeVal: string }) => {
    const isSelected = selectedSlots.includes(`${dayKey}-${timeVal}`);
    const isHov = hoveredDay === dayKey;
    return (
      <div
        className={`border-r last:border-r-0 border-gray-100 cursor-pointer transition-colors relative group ${
          isSelected ? "bg-[#A2B6FF] hover:bg-[#8AA0FF]" : isHov ? "bg-indigo-50/60" : "hover:bg-slate-50"
        }`}
        style={{ minHeight: 44 }}
        onMouseDown={() => startDrag(dayKey, timeVal)}
        onMouseEnter={() => { setHoveredDay(dayKey); continueDrag(dayKey, timeVal); }}
        onMouseLeave={() => setHoveredDay(null)}
      >
        {!isSelected && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-indigo-200" />
          </div>
        )}
      </div>
    );
  };

  /* ── day header cell ─────────────────────────────── */
  const DayHeader = ({ dayKey, date, onClick }: { dayKey: DayKey; date: Date; onClick?: () => void }) => {
    const today = isToday(date);
    const count = selectedSlots.filter((s) => s.startsWith(`${dayKey}-`)).length;
    return (
      <div
        className={`border-r last:border-r-0 border-gray-100 py-2 px-1 flex flex-col items-center gap-0.5 ${onClick ? "cursor-pointer hover:bg-indigo-50/40 transition-colors" : ""}`}
        onClick={onClick}
      >
        <span className="text-[0.56rem] font-bold text-gray-400 uppercase tracking-wider">{dayKey}</span>
        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${today ? "bg-[#5476FC] text-white" : "text-gray-700"}`}>
          {String(date.getDate()).padStart(2, "0")}
        </span>
        {count > 0 ? (
          <div className="flex items-center gap-0.5">
            <span className="text-[0.52rem] text-indigo-400 font-bold">{count}h</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); clearDay(dayKey); }}
              className="text-[0.52rem] text-gray-300 hover:text-red-400 transition-colors leading-none">×</button>
          </div>
        ) : (
          <div className="h-[14px]" />
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit">
      <div className="mb-6">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          {heading ?? "Set Availability"}
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          {viewMode === "week"
            ? "Click a day header to switch to day view. Click or drag cells to set hours."
            : "You are editing one day. Switch to Week view to see all days."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border border-gray-100/80 rounded-3xl p-4 bg-slate-50/30">

          {/* Top controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

            {/* Prev / Today / Next */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWeekOffset((o) => o - 1)}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button type="button" onClick={() => { setWeekOffset(0); setSelectedDayIdx(new Date().getDay()); }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                Today
              </button>
              <button type="button" onClick={() => setWeekOffset((o) => o + 1)}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Month label */}
            <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-2">
              {monthLabel}
            </span>

            {/* Week / Day toggle */}
            <div className="bg-gray-100 rounded-xl p-1 flex items-center">
              {(["week", "day"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setViewMode(m)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none capitalize ${
                    viewMode === m ? "bg-[#1E293B] text-white" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {m === "week" ? "Week" : "Day"}
                </button>
              ))}
            </div>
          </div>

          {/* ═══ WEEK VIEW ═══════════════════════════════════════════════ */}
          {viewMode === "week" && (
            <div
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden select-none"
              style={{ maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}
              onMouseLeave={() => setDragging(false)}
              onMouseUp={() => setDragging(false)}
            >
              {/* Sticky header */}
              <div className="grid border-b border-gray-100 bg-white sticky top-0 z-10"
                style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="border-r border-gray-100 py-2" />
                {DAY_KEYS.map((key, i) => (
                  <DayHeader
                    key={key}
                    dayKey={key}
                    date={weekDates[i]}
                    onClick={() => { setSelectedDayIdx(i); setViewMode("day"); }}
                  />
                ))}
              </div>

              {/* Time rows */}
              {TIMES.map((time) => (
                <div key={time.timeVal} className="grid border-b last:border-b-0 border-gray-100"
                  style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minHeight: 44 }}>
                  <div className="border-r border-gray-100 flex items-center justify-center bg-slate-50/40">
                    <span className="text-[0.6rem] font-bold text-gray-400">{time.label}</span>
                  </div>
                  {DAY_KEYS.map((dayKey) => (
                    <DayCell key={dayKey} dayKey={dayKey} timeVal={time.timeVal} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ═══ DAY VIEW ════════════════════════════════════════════════ */}
          {viewMode === "day" && (
            <div>
              {/* Day selector strip */}
              <div className="grid mb-3 bg-white border border-gray-100 rounded-2xl overflow-hidden"
                style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {DAY_KEYS.map((key, i) => {
                  const isActive = i === selectedDayIdx;
                  const count = selectedSlots.filter((s) => s.startsWith(`${key}-`)).length;
                  return (
                    <button key={key} type="button"
                      onClick={() => setSelectedDayIdx(i)}
                      className={`py-3 flex flex-col items-center gap-0.5 border-r last:border-r-0 border-gray-100 transition-colors ${
                        isActive ? "bg-[#5476FC]" : "hover:bg-indigo-50/50"
                      }`}>
                      <span className={`text-[0.56rem] font-bold uppercase tracking-wider ${isActive ? "text-indigo-100" : "text-gray-400"}`}>{key}</span>
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday(weekDates[i]) && !isActive ? "bg-indigo-100 text-[#5476FC]" : isActive ? "text-white" : "text-gray-700"
                      }`}>
                        {String(weekDates[i].getDate()).padStart(2, "0")}
                      </span>
                      {count > 0 && (
                        <span className={`text-[0.52rem] font-bold ${isActive ? "text-indigo-200" : "text-indigo-400"}`}>{count}h</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day actions */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-gray-700">
                  {weekDates[selectedDayIdx].toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDayFull(activeDayKey)}
                    className="text-[0.7rem] font-semibold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                    Select All
                  </button>
                  <button type="button" onClick={() => clearDay(activeDayKey)}
                    className="text-[0.7rem] font-semibold text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    Clear
                  </button>
                </div>
              </div>

              {/* Single-day column grid */}
              <div
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden select-none"
                style={{ maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}
                onMouseLeave={() => setDragging(false)}
                onMouseUp={() => setDragging(false)}
              >
                {TIMES.map((time) => {
                  const key = `${activeDayKey}-${time.timeVal}`;
                  const isSelected = selectedSlots.includes(key);
                  return (
                    <div key={time.timeVal}
                      className="grid border-b last:border-b-0 border-gray-100"
                      style={{ gridTemplateColumns: "56px 1fr", minHeight: 52 }}>
                      {/* Hour label */}
                      <div className="border-r border-gray-100 flex items-center justify-center bg-slate-50/40">
                        <span className="text-[0.65rem] font-bold text-gray-400">{time.label}</span>
                      </div>
                      {/* Slot cell — wide single column */}
                      <div
                        className={`cursor-pointer transition-colors relative group flex items-center px-5 ${
                          isSelected ? "bg-[#A2B6FF] hover:bg-[#8AA0FF]" : "hover:bg-indigo-50/60"
                        }`}
                        onMouseDown={() => startDrag(activeDayKey, time.timeVal)}
                        onMouseEnter={() => continueDrag(activeDayKey, time.timeVal)}
                      >
                        {isSelected ? (
                          <span className="text-[0.7rem] font-semibold text-white/90 select-none">Available</span>
                        ) : (
                          <span className="text-[0.7rem] font-medium text-gray-300 opacity-0 group-hover:opacity-100 select-none transition-opacity">Click to mark available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day summary */}
              <div className="mt-3 px-1">
                <span className="text-[0.72rem] font-semibold text-gray-500">
                  {activeDayKey}:{" "}
                  <span className="text-indigo-600">{getConsultingTime(selectedSlots, activeDayKey)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Per-day summary chips */}
          {selectedSlots.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {DAY_KEYS.filter((k) => selectedSlots.some((s) => s.startsWith(`${k}-`))).map((k) => (
                <span key={k}
                  className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => { setSelectedDayIdx(DAY_KEYS.indexOf(k)); setViewMode("day"); }}>
                  <span className="font-bold">{k}</span>
                  <span className="text-indigo-400 font-normal">{getConsultingTime(selectedSlots, k)}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); clearDay(k); }}
                    className="text-indigo-300 hover:text-red-400 transition-colors leading-none ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        <p className="text-[0.7rem] text-gray-400 text-center font-light -mt-1">
          Tip: In Week view, click a day header to jump into Day view for that day.
          Selections are saved per weekday, not per specific date.
        </p>

        {/* Buttons */}
        {showButtons && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button type="button" onClick={onGoBack}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium text-sm py-4 flex items-center justify-center transition-colors cursor-pointer outline-none">
              Go Back
            </button>
            <DoctorLoginButton type="submit" label="Continue" className="w-full py-4 text-center justify-center flex" />
          </div>
        )}
      </form>
    </div>
  );
}
