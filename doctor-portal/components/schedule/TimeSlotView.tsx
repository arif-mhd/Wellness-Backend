"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Session from "supertokens-web-js/recipe/session";

interface TimeSlotRange {
  dayOfWeek: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  slotDurationMins: number;
  isActive: boolean;
}

interface Task {
  id: number;
  title: string;
  desc?: string;
  sub?: string;
  completed: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const HOURS_SLOT = [
  { label: "7 AM", start: "07:00", mid: "07:30" },
  { label: "8 AM", start: "08:00", mid: "08:30" },
  { label: "9 AM", start: "09:00", mid: "09:30" },
  { label: "10 AM", start: "10:00", mid: "10:30" },
  { label: "11 AM", start: "11:00", mid: "11:30" },
  { label: "12 PM", start: "12:00", mid: "12:30" },
  { label: "1 PM", start: "13:00", mid: "13:30" },
  { label: "2 PM", start: "14:00", mid: "14:30" },
  { label: "3 PM", start: "15:00", mid: "15:30" },
  { label: "4 PM", start: "16:00", mid: "16:30" },
  { label: "5 PM", start: "17:00", mid: "17:30" },
  { label: "6 PM", start: "18:00", mid: "18:30" },
  { label: "7 PM", start: "19:00", mid: "19:30" },
  { label: "8 PM", start: "20:00", mid: "20:30" },
  { label: "9 PM", start: "21:00", mid: "21:30" }
];

const INTERVALS = HOURS_SLOT.flatMap(h => [h.start, h.mid]);

const monthLabels = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatSlotRange = (timeStr: string) => {
  try {
    const [hStr, mStr] = timeStr.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    
    let endH = h;
    let endM = m + 30;
    if (endM >= 60) {
      endH += 1;
      endM -= 60;
    }
    
    const formatTime = (hour: number, min: number) => {
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      const hourPart = hour >= 12 ? String(displayHour).padStart(2, "0") : String(displayHour);
      const minPart = min === 0 ? "" : `:${String(min).padStart(2, "0")}`;
      return `${hourPart}${minPart} ${ampm}`;
    };
    
    return `${formatTime(h, m)} - ${formatTime(endH, endM)}`;
  } catch {
    return timeStr;
  }
};

export default function TimeSlotView() {
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  
  // Slot tracking sets
  const [originalSlots, setOriginalSlots] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsPending, setSlotsPending] = useState(false);

  // Date switching reference
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Local tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Calculate day numbers and labels for current week based on currentDate
  const weekDays = useMemo(() => {
    const week = [];
    const distance = currentDate.getDay(); // Sunday is index 0
    const sunday = new Date(currentDate);
    sunday.setDate(currentDate.getDate() - distance);

    const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      week.push({
        label: dayLabels[i],
        num: String(d.getDate()),
        isToday: d.toDateString() === new Date().toDateString(),
        dayOfWeek: i,
      });
    }
    return week;
  }, [currentDate]);

  // Week switcher handlers
  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Fetch slots from backend
  const fetchSlots = useCallback(async () => {
    try {
      const accessToken = await Session.getAccessToken();
      if (!accessToken) return;
      const headers = { Authorization: `Bearer ${accessToken}` };

      const res = await fetch(`${API_URL}/api/doctors/slots`, { headers });
      if (res.ok) {
        const data = await res.json();
        const slots: TimeSlotRange[] = data.slots ?? [];
        const tempSlots: TimeSlotRange[] = data.tempSlots ?? [];
        const pending: boolean = data.slotsPending ?? false;
        setSlotsPending(pending);
        
        const parseToKeys = (ranges: TimeSlotRange[]) => {
          const keys = new Set<string>();
          ranges.forEach((range) => {
            if (range.isActive) {
              const [startH, startM] = range.startTime.split(":").map(Number);
              const [endH, endM] = range.endTime.split(":").map(Number);
              
              let currentMin = startH * 60 + startM;
              const endMin = endH * 60 + endM;
              
              while (currentMin < endMin) {
                const h = Math.floor(currentMin / 60);
                const m = currentMin % 60;
                const timeKey = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                keys.add(`${range.dayOfWeek}-${timeKey}`);
                currentMin += 30;
              }
            }
          });
          return keys;
        };

        const originalKeys = parseToKeys(slots);
        const selectedKeys = pending ? parseToKeys(tempSlots) : originalKeys;

        setOriginalSlots(originalKeys);
        setSelectedSlots(selectedKeys);
      }
    } catch (err) {
      console.error("Error loading doctor slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Load tasks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("doctor_tasks");
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error reading tasks from localStorage:", err);
    }
    setTasksLoaded(true);
  }, []);

  // Sync tasks back to localStorage
  useEffect(() => {
    if (tasksLoaded) {
      localStorage.setItem("doctor_tasks", JSON.stringify(tasks));
    }
  }, [tasks, tasksLoaded]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleCellClick = (dayOfWeek: number, timeStr: string) => {
    const key = `${dayOfWeek}-${timeStr}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Merge selected 30-min intervals into daily ranges and save
  const handleSaveAvailability = async () => {
    try {
      const allSlotsToSend: TimeSlotRange[] = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        // Filter times active for this day
        const activeTimes = Array.from(selectedSlots)
          .filter((key) => key.startsWith(`${dayIdx}-`))
          .map((key) => key.split("-")[1]);

        if (activeTimes.length === 0) continue;

        activeTimes.sort(); // Sort chronologically

        // Merge contiguous slots
        const ranges: { start: number; end: number }[] = [];
        let currentRange: { start: number; end: number } | null = null;

        activeTimes.forEach((timeStr) => {
          const [h, m] = timeStr.split(":").map(Number);
          const minutes = h * 60 + m;

          if (!currentRange) {
            currentRange = { start: minutes, end: minutes + 30 };
          } else if (minutes === currentRange.end) {
            currentRange.end = minutes + 30;
          } else {
            ranges.push(currentRange);
            currentRange = { start: minutes, end: minutes + 30 };
          }
        });

        if (currentRange) {
          ranges.push(currentRange);
        }

        // Convert merged ranges to DB schema
        ranges.forEach((r) => {
          const startH = Math.floor(r.start / 60).toString().padStart(2, "0");
          const startM = (r.start % 60).toString().padStart(2, "0");
          const endH = Math.floor(r.end / 60).toString().padStart(2, "0");
          const endM = (r.end % 60).toString().padStart(2, "0");

          allSlotsToSend.push({
            dayOfWeek: dayIdx,
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            slotDurationMins: 30,
            isActive: true,
          });
        });
      }

      let accessToken: string | undefined;
      try {
        accessToken = await Session.getAccessToken();
      } catch (err) {
        console.error("Failed to retrieve access token:", err);
      }

      if (!accessToken) {
        alert("Authentication Required: You are not logged in. Please log in to your Doctor account to save availability slots.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      const res = await fetch(`${API_URL}/api/doctors/slots`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ slots: allSlotsToSend }),
      });

      if (res.ok) {
        // Availability saved successfully: keep newly added slots yellow and deleted slots white (pending admin approval)
        setSlotsPending(true);
        setShowApprovalDialog(false);
        alert("Availability updates sent to admin for approval successfully!");
      } else if (res.status === 403) {
        alert("Access Denied (403): You must be logged in as a Doctor. If you are logged in as an Admin in another tab, please log out of the Admin Portal or open the Doctor Portal in an Incognito/Private window.");
      } else if (res.status === 401) {
        alert("Session Expired (401): Please log in to the Doctor Portal to save availability slots.");
      } else {
        alert("Failed to save slots. Please try again.");
      }
    } catch (err) {
      console.error("Error saving slots:", err);
      alert("Error saving slots. Please try again.");
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 w-full select-none">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span
          className="text-[#24292E] font-medium text-[16px] tracking-[-0.32px]"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Set Availability
        </span>
      </div>

      {/* ── Information Banner ──────────────────────────────────────────────── */}
      <div className="bg-[#EEF2FF] border border-[#BAC7FF] rounded-[18px] p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-[#5476FC] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex flex-col gap-0.5">
          <span className="text-[#243D7F] text-xs font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>
            Weekly Template Notice
          </span>
          <span className="text-[#4E5D8F] text-[11px] font-medium leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
            Changes made in this grid update your **weekly recurring slot template**. To mark dynamic unavailability (such as specific vacations, sick leaves, or holidays), please use the <strong>Schedule Absences</strong> tab instead.
          </span>
        </div>
      </div>

      {/* ── Two-column layout: calendar + task panel ─────────────────────── */}
      <div className="flex gap-6 items-start w-full">
        {/* Left: calendar grid */}
        <div className="flex-1 min-w-0">

          {/* Calendar nav header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors"
              >
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M4 8L1 4.5L4 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 border border-[#EBEEF5] rounded-full text-xs font-semibold text-[#676E76] bg-white hover:bg-slate-50 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors"
              >
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M1 8L4 4.5L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {/* Dropdown week date changer */}
              <div className="flex items-center gap-1.5 ml-2 border border-[#EBEEF5] bg-white px-3.5 py-1.5 rounded-full hover:bg-slate-50 transition-all cursor-pointer">
                <select
                  value={currentDate.getMonth()}
                  onChange={(e) => {
                    const nextDate = new Date(currentDate);
                    nextDate.setMonth(parseInt(e.target.value));
                    setCurrentDate(nextDate);
                  }}
                  className="bg-transparent text-[#24292E] font-semibold text-xs tracking-[-0.2px] outline-none cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {monthLabels.map((lbl, idx) => (
                    <option key={idx} value={idx}>{lbl} {currentDate.getFullYear()}</option>
                  ))}
                </select>
              </div>
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

          {/* Scrollable grid wrapper to prevent dashboard layout stretch */}
          <div className="overflow-x-auto relative">
            <div className="min-w-[840px] border border-[#EBEEF5] rounded-[14px] overflow-hidden bg-white relative max-h-[520px] overflow-y-auto">

              {/* Header */}
              <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                <div className="bg-[#F9FAFC] border-b border-r border-[#EBEEF5] py-3 px-1 flex items-center justify-center text-[9px] font-bold text-[#9EA5AD]"
                  style={{ fontFamily: "Outfit, sans-serif" }}>
                  GMT
                </div>
                {weekDays.map((day) => {
                  return (
                    <div
                      key={day.label}
                      className={`${day.isToday ? "bg-[#F2F5FF]" : "bg-[#F9FAFC]"} border-b border-r border-[#EBEEF5] py-3 px-1 flex flex-col items-center gap-0.5`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span className="text-[8px] font-bold text-[#9EA5AD] tracking-widest uppercase">{day.label}</span>
                      <span className="text-[13px] font-bold text-[#24292E]">{day.num}</span>
                    </div>
                  );
                })}
                <div className="bg-[#F9FAFC] border-b border-[#EBEEF5] py-3 px-1 flex items-center justify-center text-[9px] font-bold text-[#9EA5AD]"
                  style={{ fontFamily: "Outfit, sans-serif" }}>
                  GMT
                </div>
              </div>

              {/* Main Body */}
              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                
                {/* Time label Left (Spans hourly rows) */}
                <div className="flex flex-col bg-[#F9FAFC]/60 border-r border-[#EBEEF5] shrink-0">
                  {HOURS_SLOT.map((hour) => (
                    <div
                      key={`left-${hour.label}`}
                      className="border-b border-[#EBEEF5] py-2 px-1 flex items-center justify-end text-[9px] font-semibold text-[#9EA5AD] pr-2 shrink-0"
                      style={{ fontFamily: "Outfit, sans-serif", height: "64px" }}
                    >
                      {hour.label}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((day) => {
                  return (
                    <div
                      key={day.label}
                      className="flex flex-col border-r border-[#EBEEF5]"
                    >
                      {HOURS_SLOT.map((hour) => {
                        const subslots = [hour.start, hour.mid];
                        return subslots.map((timeStr) => {
                          const key = `${day.dayOfWeek}-${timeStr}`;
                          const isSelected = selectedSlots.has(key);
                          const isOriginal = originalSlots.has(key);

                          let cellBg = "bg-white hover:bg-[#F2F5FF]";
                          let cellBorder = "border-b border-[#EBEEF5]/40";
                          
                          if (isSelected && isOriginal) {
                            cellBg = "bg-[#BAC7FF] hover:bg-[#A3B4FF]"; // Approved slot (Blue)
                          } else if (isSelected && !isOriginal) {
                            // Light yellow shade without borders, matching custom color derived from #F4A308
                            cellBg = "bg-[#FFF0CC] hover:bg-[#FFE0A3]";
                          } else if (day.isToday) {
                            cellBg = "bg-[#F2F5FF] hover:bg-[#E2E6FF]"; // Today column default
                          }

                          // If it is the second slot in the hour, draw solid border at hour limit
                          if (timeStr === hour.mid) {
                            cellBorder = "border-b border-[#EBEEF5]";
                          }

                          return (
                            <button
                              key={`${day.label}-${timeStr}`}
                              onClick={() => handleCellClick(day.dayOfWeek, timeStr)}
                              className={`w-full transition-colors outline-none shrink-0 ${cellBg} ${cellBorder} relative group`}
                              style={{ height: "32px" }}
                            >
                              {(isSelected || isOriginal) && (
                                <div
                                  className="hidden group-hover:block absolute left-[calc(100%-12px)] z-20 bg-white border border-[#EBEEF5] rounded-[10px] px-3.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[9px] font-bold text-[#24292E] whitespace-nowrap pointer-events-none"
                                  style={{
                                    top: "0px",
                                    fontFamily: "Outfit, sans-serif",
                                  }}
                                >
                                  {formatSlotRange(timeStr)}
                                </div>
                              )}
                            </button>
                          );
                        });
                      })}
                    </div>
                  );
                })}

                {/* Time label Right (Spans hourly rows) */}
                <div className="flex flex-col bg-[#F9FAFC]/60">
                  {HOURS_SLOT.map((hour) => (
                    <div
                      key={`right-${hour.label}`}
                      className="border-b border-[#EBEEF5] py-2 px-1 flex items-center justify-start text-[9px] font-semibold text-[#9EA5AD] pl-2 shrink-0"
                      style={{ fontFamily: "Outfit, sans-serif", height: "64px" }}
                    >
                      {hour.label}
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* ── Floating Popup Dialog inside grid ── */}
            {showApprovalDialog && (
              <div className="absolute bottom-4 right-4 z-30 bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-[0_12px_45px_rgba(0,0,0,0.12)] w-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Dialog header */}
                <div className="flex items-center justify-between mb-4">
                  <h4
                    className="text-[#24292E] font-semibold text-[16px] tracking-[-0.32px]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Send for approval
                  </h4>
                  <button
                    onClick={() => setShowApprovalDialog(false)}
                    className="w-7 h-7 rounded-full hover:bg-[#F5F6FA] flex items-center justify-center text-[#9EA5AD] hover:text-[#383F45] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 10.5l9-9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Info box */}
                <div className="bg-[#FFF9E6] rounded-[14px] p-4 mb-4">
                  <p className="text-[#8A6D1C] text-[12px] leading-[1.6] font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Confirm your availability updates. Yellow highlights represent your newly added slots. All updates will be saved immediately to the system.
                  </p>
                </div>

                <hr className="border-t border-[#EBEEF5] mb-4" />

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowApprovalDialog(false)}
                    className="flex-1 py-3 rounded-[14px] bg-[#EEF2FF] text-[#243D7F] hover:bg-[#E4EAFF] font-bold text-[13px] tracking-[-0.26px] transition-all"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAvailability}
                    className="flex-1 py-3 rounded-[14px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] text-white font-bold text-[13px] tracking-[-0.26px] transition-all duration-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Confirm & Send Request
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Send for Approval button */}
          <div className="mt-5 flex justify-start">
            <button
              onClick={() => setShowApprovalDialog(true)}
              className="px-6 py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#547FCF] hover:from-[#758FFF] hover:to-[#4065FB] hover:shadow-[0_8px_20px_rgba(84,118,252,0.25)] text-white font-bold text-xs rounded-full transition-all duration-200"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Send for Approval
            </button>
          </div>
        </div>

        {/* Right: Task panel */}
        <div className="w-[280px] shrink-0 bg-white border border-[#EBEEF5] rounded-[24px] p-5 shadow-sm flex flex-col gap-4 max-h-[500px] overflow-y-auto">
          {/* Tasks header */}
          <div className="flex items-center justify-between">
            <span
              className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {tasks.length} Tasks
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="w-full h-1.5 bg-[#EBEEF5] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[#9EA5AD] text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {progressPct}% of tasks are completed
            </span>
          </div>

          {/* Task items */}
          <div className="flex flex-col gap-3">
            {tasks.length === 0 ? (
              <span className="text-xs text-[#9EA5AD] text-center py-4">No tasks found. Add tasks in the dashboard.</span>
            ) : (
              tasks.slice(0, 8).map((task) => {
                const isChecked = task.completed;
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-[14px] bg-[#F9FAFC] border border-[#EBEEF5]/60 cursor-pointer hover:bg-[#ECEFFE]/50 transition-colors"
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span
                        className={`text-[12px] font-semibold tracking-[-0.24px] truncate ${isChecked ? "text-[#9EA5AD] line-through" : "text-[#24292E]"}`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {task.title}
                      </span>
                      <span
                        className="text-[10px] text-[#9EA5AD] truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {task.sub || task.desc || "Pending checklist item."}
                      </span>
                    </div>

                    {/* Circle checkbox */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                        isChecked
                          ? "border-[#5476FC] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC]"
                          : "border-[#D1D5DB] bg-white"
                      }`}
                    >
                      {isChecked && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
