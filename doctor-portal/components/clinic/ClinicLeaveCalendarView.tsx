"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface ClinicAbsence {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatarUrl: string | null;
  startDate: string;
  endDate: string;
  reason: string;
  duration: string;
  status: "pending" | "approved" | "rejected";
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  approved: "bg-[#5476FC]",
  rejected: "bg-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function ClinicLeaveCalendarView({ qs = "" }: { qs?: string }) {
  const [absences, setAbsences] = useState<ClinicAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const loadAbsences = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/clinics/absences${qs}`)
      .then((r) => r.json())
      .then((data) => setAbsences(Array.isArray(data.absences) ? data.absences : []))
      .catch(() => setAbsences([]))
      .finally(() => setLoading(false));
  }, [qs]);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  const filteredAbsences = useMemo(
    () => (statusFilter === "all" ? absences : absences.filter((a) => a.status === statusFilter)),
    [absences, statusFilter]
  );

  const monthLabel = useMemo(
    () => currentDate.toLocaleString("default", { month: "long", year: "numeric" }),
    [currentDate]
  );

  // Weeks of the visible month, padded with the leading/trailing days of
  // adjacent months so every week row is a full 7 days (calendar-grid
  // convention) — cells outside the current month are dimmed, not hidden.
  const weeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);

    const days: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push({ date: d, inMonth: d.getMonth() === month });
    }

    const rows: { date: Date; inMonth: boolean }[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    // Drop a trailing all-next-month row so short months don't show 6 rows.
    if (rows.length === 6 && rows[5].every((d) => !d.inMonth)) rows.pop();
    return rows;
  }, [currentDate]);

  const absencesByDay = useMemo(() => {
    const map = new Map<string, ClinicAbsence[]>();
    for (const abs of filteredAbsences) {
      const start = toDateOnly(new Date(abs.startDate));
      const end = toDateOnly(new Date(abs.endDate));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(abs);
      }
    }
    return map;
  }, [filteredAbsences]);

  const selectedDayAbsences = selectedDay ? absencesByDay.get(selectedDay.toDateString()) ?? [] : [];

  const todayKey = new Date().toDateString();

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors"
          >
            <svg width="6" height="10" viewBox="0 0 5 9" fill="none">
              <path d="M4 8L1 4.5L4 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3.5 py-1.5 border border-[#EBEEF5] rounded-full text-xs font-semibold text-[#676E76] bg-white hover:bg-slate-50 transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] hover:bg-slate-50 hover:text-[#5879FC] transition-colors"
          >
            <svg width="6" height="10" viewBox="0 0 5 9" fill="none">
              <path d="M1 8L4 4.5L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[#24292E] font-medium text-[15px] tracking-[-0.3px] ml-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            {monthLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all capitalize ${
                statusFilter === s ? "bg-[#24292E] text-white" : "bg-white border border-[#EBEEF5] text-[#676E76] hover:bg-slate-50"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        <div className="flex-1 min-w-0 bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-sm">
          {loading ? (
            <div className="text-center text-sm text-[#9EA5AD] py-12">Loading leave calendar...</div>
          ) : (
            <div className="border border-[#EBEEF5] rounded-[14px] overflow-hidden">
              <div className="grid grid-cols-7 bg-[#F9FAFC]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="py-2.5 text-center text-[10px] font-bold text-[#9EA5AD] uppercase tracking-wider border-b border-r border-[#EBEEF5] last:border-r-0"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {d}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                  {week.map(({ date, inMonth }) => {
                    const key = date.toDateString();
                    const dayAbsences = absencesByDay.get(key) ?? [];
                    const isToday = key === todayKey;
                    const isSelected = selectedDay?.toDateString() === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(date)}
                        className={`min-h-[92px] p-2 flex flex-col gap-1 items-stretch text-left border-b border-r border-[#EBEEF5] last:border-r-0 transition-colors ${
                          isSelected ? "bg-[#EEF2FF]" : isToday ? "bg-[#F2F5FF]" : "bg-white hover:bg-slate-50/60"
                        } ${!inMonth ? "opacity-40" : ""}`}
                      >
                        <span
                          className={`text-[11px] font-semibold ${isToday ? "text-[#5476FC]" : "text-[#24292E]"}`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {date.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {dayAbsences.slice(0, 3).map((abs) => (
                            <div
                              key={`${abs.id}-${key}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F5F6FA] text-[9px] font-semibold text-[#383F45] truncate"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                              title={`${abs.doctorName} — ${STATUS_LABEL[abs.status]}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[abs.status]}`} />
                              <span className="truncate">{abs.doctorName}</span>
                            </div>
                          ))}
                          {dayAbsences.length > 3 && (
                            <span className="text-[9px] font-semibold text-[#9EA5AD] pl-1">+{dayAbsences.length - 3} more</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full xl:w-[300px] shrink-0 bg-white border border-[#EBEEF5] rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
          <span className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {selectedDay
              ? selectedDay.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "Select a day"}
          </span>

          {!selectedDay ? (
            <p className="text-xs text-[#9EA5AD]">Click a day on the calendar to see who's on leave.</p>
          ) : selectedDayAbsences.length === 0 ? (
            <p className="text-xs text-[#9EA5AD]">No doctors on leave this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedDayAbsences.map((abs) => (
                <div key={abs.id} className="flex items-start gap-3 p-3.5 rounded-[16px] bg-[#F9FAFC] border border-[#EBEEF5]/60">
                  {abs.doctorAvatarUrl ? (
                    <img src={abs.doctorAvatarUrl} alt={abs.doctorName} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold text-xs shrink-0">
                      {(abs.doctorName || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#24292E] truncate">{abs.doctorName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          abs.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : abs.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {STATUS_LABEL[abs.status]}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#9EA5AD]">{abs.duration}</span>
                    <span className="text-[10px] text-[#676E76] leading-relaxed">{abs.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
