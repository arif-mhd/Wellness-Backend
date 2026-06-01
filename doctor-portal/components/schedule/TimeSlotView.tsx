"use client";

import React, { useState } from "react";

interface TimeSlotBlock {
  day: string; // "MON", "TUE" etc.
  startHour: number; // grid row start index (0 = 7AM)
  endHour: number;   // grid row end index (exclusive)
  variant: "available" | "unavailable"; // blue vs amber
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

// Pre-filled slot blocks matching the screenshot (blue = available, amber = unavailable/pending)
const INITIAL_BLOCKS: TimeSlotBlock[] = [
  { day: "MON", startHour: 1, endHour: 3, variant: "available" }, // 8AM - 9AM
  { day: "TUE", startHour: 3, endHour: 5, variant: "available" }, // 10AM - 11AM
  { day: "WED", startHour: 3, endHour: 7, variant: "available" }, // 10AM - 1PM
  { day: "FRI", startHour: 2, endHour: 5, variant: "unavailable" }, // 9AM - 12AM
];

// Static task list items matching the mockup right panel
const TASKS = [
  { id: 1, title: "Test Results for Mark Robinson", sub: "Mark's blood test results for cholesterol..." },
  { id: 2, title: "Test Results for Mark Robinson", sub: "Mark's blood test results for cholesterol..." },
  { id: 3, title: "Test Results for Mark Robinson", sub: "Mark's blood test results for cholesterol..." },
  { id: 4, title: "Test Results for Mark Robinson", sub: "Mark's blood test results for cholesterol..." },
];

export default function TimeSlotView() {
  const [activeRange, setActiveRange] = useState<"Day" | "Week">("Week");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<number[]>([]);

  const toggleTask = (id: number) => {
    setCheckedTasks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const completedCount = checkedTasks.length;
  const progressPct = Math.round((completedCount / TASKS.length) * 100);

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

        <button
          className="flex items-center gap-1.5 px-4 py-1.5 border border-[#EBEEF5] bg-white rounded-full text-xs font-semibold text-[#676E76] hover:bg-slate-50 transition-all"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Today
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Two-column layout: calendar + task panel ─────────────────────── */}
      <div className="flex gap-6 items-start w-full">
        {/* Left: calendar grid */}
        <div className="flex-1 min-w-0">

          {/* Calendar nav header */}
          <div className="flex items-center justify-between mb-5">
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

              {/* Header */}
              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                <div className="bg-[#F9FAFC] border-b border-r border-[#EBEEF5] py-3 px-1 flex items-center justify-center text-[9px] font-bold text-[#9EA5AD]"
                  style={{ fontFamily: "Outfit, sans-serif" }}>
                  GMT-5
                </div>
                {DAYS_SLOT.map((day, idx) => {
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

              {/* Main Body */}
              <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr) 56px" }}>
                
                {/* Time label Left */}
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
                      className="flex flex-col border-r border-[#EBEEF5]"
                    >
                      {/* 8 Hour Rows */}
                      {HOURS_SLOT.map((hour, hourIdx) => {
                        const block = INITIAL_BLOCKS.find(
                          (b) => b.day === day.label && hourIdx >= b.startHour && hourIdx < b.endHour
                        );

                        let cellBg = "bg-white";
                        if (block) {
                          cellBg = block.variant === "available" ? "bg-[#BAC7FF]" : "bg-[#FFE3B9]";
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
                    </div>
                  );
                })}

                {/* Time label Right */}
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

                {/* Info box (No Border) */}
                <div className="bg-[#FFF0F0] rounded-[14px] p-4 mb-4">
                  <p className="text-[#24292E] text-[12px] leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Send your updated availability for admin approval. You'll be able to receive appointments in these slots once approved.
                  </p>
                </div>

                {/* Faint Horizontal Divider Line */}
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
                    onClick={() => setShowApprovalDialog(false)}
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
        <div className="w-[280px] shrink-0 bg-white border border-[#EBEEF5] rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
          {/* Tasks header */}
          <div className="flex items-center justify-between">
            <span
              className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {TASKS.length} Tasks
            </span>
            <button
              className="text-[#5476FC] hover:text-[#4065FB] text-xs font-semibold transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              View All Tasks
            </button>
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
            {TASKS.map((task) => {
              const isChecked = checkedTasks.includes(task.id);
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
                      {task.sub}
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
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
