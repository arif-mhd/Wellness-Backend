"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";

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

const formatTimeOnly = (isoStr: string) => {
  try {
    const d = new Date(isoStr);
    const h = d.getUTCHours() % 12 || 12;
    const m = d.getUTCMinutes();
    const ampm = d.getUTCHours() >= 12 ? "PM" : "AM";
    const hourPart = d.getUTCHours() >= 12 ? String(h).padStart(2, "0") : String(h);
    const minPart = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
    return `${hourPart}${minPart} ${ampm}`;
  } catch {
    return "";
  }
};

const formatAbsenceRange = (abs: any) => {
  return `${formatTimeOnly(abs.startDate)} - ${formatTimeOnly(abs.endDate)}`;
};

const formatAbsenceDates = (startDateStr: string, endDateStr: string) => {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const startF = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endF = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    
    if (startF === endF) {
      const startT = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const endT = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${startF}, ${startT} - ${endT}`;
    }
    return `${startF} - ${endF}`;
  } catch {
    return "Invalid Dates";
  }
};

const formatPillDate = (date: Date) => {
  try {
    const day = date.getUTCDate();
    const months = ["June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
    // Wait, let's use standard index ordering for months
    const standardMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = standardMonths[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    
    const hour = date.getUTCHours() % 12 || 12;
    const minute = date.getUTCMinutes();
    const ampm = date.getUTCHours() >= 12 ? "PM" : "AM";
    
    const padH = date.getUTCHours() >= 12 ? String(hour).padStart(2, "0") : String(hour);
    const padM = String(minute).padStart(2, "0");
    
    return `${day} ${month}, ${year}, ${padH}:${padM} ${ampm}`;
  } catch {
    return "";
  }
};

const getAge = (dobString: string | null) => {
  if (!dobString) return "";
  const birthYear = new Date(dobString).getFullYear();
  if (isNaN(birthYear)) return "";
  const age = new Date().getFullYear() - birthYear;
  return `, ${age} y/o`;
};

export default function ScheduleAbsencesView() {
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");
  const [showMarkAbsence, setShowMarkAbsence] = useState(false);
  const [reasonComment, setReasonComment] = useState("");

  const [absences, setAbsences] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(true);

  // Form states for adding absences
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  // Range selection states on calendar grid
  const [selectStart, setSelectStart] = useState<Date | null>(null);
  const [selectEnd, setSelectEnd] = useState<Date | null>(null);

  const handleCellClick = (cellStart: Date, cellEnd: Date) => {
    if (!selectStart || (selectStart && selectEnd && selectStart.getTime() !== selectEnd.getTime() - 30 * 60 * 1000)) {
      setSelectStart(cellStart);
      setSelectEnd(cellEnd);
    } else {
      if (cellStart.getTime() < selectStart.getTime()) {
        setSelectStart(cellStart);
      } else {
        setSelectEnd(cellEnd);
      }
    }
  };

  const handleMarkAbsenceClick = () => {
    if (!selectStart || !selectEnd) {
      alert("Please click on the calendar cells to select your absence time range first.");
      return;
    }
    setStartDate(selectStart.toISOString());
    setEndDate(selectEnd.toISOString());
    setShowMarkAbsence(true);
  };

  // Date navigation states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

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
        dateStr: d.toISOString().split("T")[0], // YYYY-MM-DD
      });
    }
    return week;
  }, [currentDate]);

  const monthYearLabel = useMemo(() => {
    const month = currentDate.toLocaleString("default", { month: "long" });
    const year = currentDate.getFullYear();
    return `${month} ${year}`;
  }, [currentDate]);

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

  const fetchAbsences = useCallback(async () => {
    try {
      const res = await apiFetch("/api/doctors/absences");
      if (res.ok) {
        const data = await res.json();
        setAbsences(data.absences ?? []);
      }
    } catch (err) {
      console.error("Error fetching absences:", err);
    } finally {
      setLoadingAbsences(false);
    }
  }, []);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  // Real-time conflict checking
  useEffect(() => {
    if (!startDate || !endDate) {
      setConflicts([]);
      return;
    }

    const checkConflicts = async () => {
      try {
        const isoStart = new Date(startDate).toISOString();
        const isoEnd = new Date(endDate).toISOString();

        const res = await apiFetch("/api/doctors/absences/check-conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: isoStart, endDate: isoEnd })
        });
        if (res.ok) {
          const data = await res.json();
          setConflicts(data.conflicts ?? []);
        }
      } catch (err) {
        console.error("Error checking conflicts:", err);
      }
    };

    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFileUploading(true);
    try {
      const form = new FormData();
      form.append("other", selectedFile);

      const res = await apiFetch("/api/doctors/upload", {
        method: "POST",
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        if (data.urls?.other) {
          setFileName(selectedFile.name);
          setFileUrl(data.urls.other);
        }
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("File upload failed.");
    } finally {
      setFileUploading(false);
    }
  };

  const handleConfirmAbsence = async () => {
    if (!startDate || !endDate || !reasonComment) {
      alert("Please fill in start date, end date, and reason.");
      return;
    }
    
    try {
      const isoStart = new Date(startDate).toISOString();
      const isoEnd = new Date(endDate).toISOString();

      const res = await apiFetch("/api/doctors/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: isoStart,
          endDate: isoEnd,
          reason: reasonComment,
          fileUrl,
          fileName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAbsences(data.absences ?? []);
        setShowMarkAbsence(false);
        setStartDate("");
        setEndDate("");
        setReasonComment("");
        setFileName("");
        setFileUrl("");
        setSelectStart(null);
        setSelectEnd(null);
        alert("Absence marked and conflicting appointments cancelled successfully.");
      } else {
        const err = await res.json();
        alert(err.error ?? "Failed to mark absence.");
      }
    } catch (err) {
      console.error("Error saving absence:", err);
      alert("Error saving absence.");
    }
  };

  const handleDeleteAbsence = async (id: string) => {
    if (!confirm("Are you sure you want to delete this absence? This will restore your normal availability slots.")) return;
    
    try {
      const res = await apiFetch(`/api/doctors/absences/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        setAbsences(data.absences ?? []);
        alert("Absence deleted successfully.");
      } else {
        alert("Failed to delete absence.");
      }
    } catch (err) {
      console.error("Error deleting absence:", err);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full select-none relative">
      
      {/* Top action link below tabs */}
      <div className="flex justify-start">
        <button
          onClick={handleMarkAbsenceClick}
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
              <button
                className="flex items-center gap-1.5 text-[#24292E] font-medium text-[14px] tracking-[-0.28px] ml-1 hover:opacity-75 transition-opacity"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {monthYearLabel}
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
            <div className="min-w-[560px] border border-[#EBEEF5] rounded-[14px] overflow-hidden bg-white relative max-h-[520px] overflow-y-auto">
              
              {/* Header Grid */}
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
 
              {/* Body Grid */}
              <div className="grid relative" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                
                {/* Left GMT Labels */}
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
                      className="flex flex-col border-r border-[#EBEEF5] relative"
                    >
                      {HOURS_SLOT.map((hour) => {
                        const subslots = [hour.start, hour.mid];
                        return subslots.map((timeStr) => {
                          const cellStart = new Date(`${day.dateStr}T${timeStr}:00.000Z`);
                          const cellEnd = new Date(cellStart.getTime() + 30 * 60 * 1000);
                          const matchedAbs = absences.find((abs: any) => {
                            const absStart = new Date(abs.startDate);
                            const absEnd = new Date(abs.endDate);
                            return cellStart < absEnd && cellEnd > absStart;
                          });
                          const isAbsent = !!matchedAbs;
  
                          const isSelected = !!(selectStart && selectEnd && cellStart >= selectStart && cellEnd <= selectEnd);
  
                           let cellBg = "bg-white hover:bg-slate-50/50";
                           let cellBorder = "border-b border-[#EBEEF5]/40";
                           if (isAbsent) {
                             cellBg = "bg-[#F38B8B] hover:bg-[#E27777]";
                           } else if (isSelected) {
                             cellBg = "bg-[#BAC7FF] hover:bg-[#A3B4FF]";
                           } else if (day.isToday) {
                             cellBg = "bg-[#F2F5FF] hover:bg-[#E4ECFF]";
                           }
 
                           if (timeStr === hour.mid) {
                             cellBorder = "border-b border-[#EBEEF5]";
                           }
 
                           return (
                             <button
                               key={`${day.label}-${timeStr}`}
                               onClick={() => {
                                 if (!isAbsent) {
                                   handleCellClick(cellStart, cellEnd);
                                 }
                               }}
                               className={`transition-colors outline-none shrink-0 ${cellBg} ${cellBorder} relative group w-full text-left block cursor-pointer`}
                               style={{ height: "32px" }}
                             >
                               {isAbsent && matchedAbs && (
                                 <div
                                   className="hidden group-hover:block absolute left-[calc(100%-12px)] z-20 bg-white border border-[#EBEEF5] rounded-[10px] px-3.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[9px] font-bold text-[#24292E] whitespace-nowrap pointer-events-none"
                                   style={{
                                     top: "0px",
                                     fontFamily: "Outfit, sans-serif",
                                   }}
                                 >
                                   {formatAbsenceRange(matchedAbs)}
                                 </div>
                               )}
                             </button>
                           );
                         });
                       })}
                     </div>
                   );
                 })}

                {/* Right GMT Labels */}
                <div className="flex flex-col bg-[#F9FAFC]/60 shrink-0">
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
            {loadingAbsences ? (
              <span className="text-xs text-[#9EA5AD] text-center py-4">Loading absences...</span>
            ) : absences.length === 0 ? (
              <span className="text-xs text-[#9EA5AD] text-center py-4">No absences logged.</span>
            ) : (
              absences.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1.5 p-4 rounded-[16px] bg-[#F9FAFC] border border-[#EBEEF5]/60"
                >
                  <div className="flex justify-between items-start gap-1">
                    <div
                      className="text-[12px] font-semibold tracking-[-0.24px] text-[#24292E]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {formatAbsenceDates(log.startDate, log.endDate)} <span className="text-[#5476FC]">({log.duration})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAbsence(log.id)}
                      className="text-[#9EA5AD] hover:text-red-500 transition-colors shrink-0 p-0.5"
                      title="Delete Absence"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div
                    className="text-[10px] text-[#9EA5AD] leading-[1.5]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {log.reason}
                  </div>

                  {log.fileUrl && (
                    <a
                      href={log.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-1 text-[#5476FC] hover:underline cursor-pointer text-[10px] font-semibold"
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
                        <path
                          d="M6 1.5v6M3.5 5.5L6 8l2.5-2.5M1.5 9.5h9"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {log.fileName || "Attached Certificate"}
                    </a>
                  )}
                </div>
              ))
            )}
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
                  {selectStart ? formatPillDate(selectStart) : ""}
                </span>
                <span className="text-[#9EA5AD] font-medium">-</span>
                <span
                  className="px-4 py-2 bg-[#EEF2FF] text-[#5476FC] font-semibold text-[11px] rounded-full"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {selectEnd ? formatPillDate(selectEnd) : ""}
                </span>
              </div>
            </div>
 
            {/* Warning Alert Box with Conflict Card */}
            {conflicts.length > 0 && (
              <div className="bg-[#FFF0F0] rounded-[16px] p-4 flex flex-col gap-3 max-h-[180px] overflow-y-auto">
                <p
                  className="text-[#24292E] text-[11px] font-semibold leading-[1.5]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  An appointment is already scheduled on this day. This appointment will be canceled if you choose to mark absence.
                </p>
                
                {conflicts.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 bg-white/95 border border-[#FFD4D4] rounded-[12px]">
                    <img
                      src={apt.patientAvatarUrl || "/default-avatar.svg"}
                      alt={apt.patientName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#EBEEF5]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-avatar.svg";
                      }}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="text-[12px] font-bold text-[#24292E] truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {apt.patientName}{getAge(apt.patientDob)}
                      </span>
                      <span
                        className="text-[10px] font-semibold text-[#E05252]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {formatPillDate(new Date(apt.scheduledAt))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                Attach certificate/ file
              </span>
              <label className="flex items-center justify-between p-3.5 bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={fileUploading}
                />
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
                    {fileUploading ? "Uploading..." : fileName ? fileName : "Attach file"}
                  </span>
                </div>
              </label>
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
                onClick={handleConfirmAbsence}
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
