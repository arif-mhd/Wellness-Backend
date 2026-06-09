"use client";

import React from "react";

export interface TaskItem {
  id: number;
  type: string;
  email: string;
  summary: string;
  time: string;
  priority: "High" | "Normal";
  status: "Pending" | "Completed" | "Missed";
  details: string;
  patientName: string;
  patientAge: number;
  patientAvatar: string;
  patientBio: string;
}

interface TaskDetailsCardProps {
  task: TaskItem | null;
  onToggleComplete?: (taskId: number) => void;
}

export default function TaskDetailsCard({ task, onToggleComplete }: TaskDetailsCardProps) {
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#F5F6FA] border border-[#EBEEF5] rounded-[24px] text-center min-h-[580px] shadow-sm select-none">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9EA5AD"
          strokeWidth="1.5"
          className="mb-4 animate-pulse"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="text-[#24292E] font-medium text-base mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
          No Task Selected
        </h3>
        <p className="text-[#676E76] text-xs max-w-[240px]">
          Select any task from the list on the left to see complete details and patient information.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#F5F6FA] border border-[#EBEEF5] rounded-[24px] p-6 shadow-sm min-h-[580px] justify-between">
      <div className="flex flex-col gap-5">
        {/* Header with Priority Badge */}
        <div className="flex justify-between items-center w-full">
          <h3 className="text-[#24292E] font-medium text-[20px] tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Task Details
          </h3>
          {task.priority === "High" && (
            <span
              className="bg-[#F25252] text-white text-[11px] font-bold px-3 py-1 rounded-full select-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              High Priority
            </span>
          )}
        </div>

        {/* Task Title */}
        <div className="flex flex-col gap-1">
          <span className="text-[#9EA5AD] text-[12px] font-medium uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            Task
          </span>
          <span className="text-[#383F45] font-normal text-base tracking-[-0.32px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {task.type} for Patient
          </span>
        </div>

        {/* Details Text */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[#9EA5AD] text-[12px] font-medium uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            Details
          </span>
          <p className="text-[#676E76] text-xs leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {task.details}
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-[#EBEEF5]" />

        {/* Patient Profile Card Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img
              src={task.patientAvatar}
              alt={task.patientName}
              className="w-12 h-12 rounded-full object-cover border border-[#EBEEF5]"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col">
              <span className="text-[#24292E] font-medium text-[15px] tracking-[-0.3px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                {task.patientName}
              </span>
              <span className="text-[#676E76] font-normal text-xs mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                {task.patientAge} Year Old
              </span>
            </div>
          </div>

          <p className="text-[#676E76] text-xs leading-[1.6]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {task.patientBio}
          </p>
        </div>
      </div>

      {/* Action Buttons: View/Download & Complete Task */}
      <div className="flex flex-col gap-2 mt-6">
        <button
          className="w-full py-3 rounded-[12px] bg-[#E8EEFF] text-[#5476FC] hover:bg-[#5476FC] hover:text-white font-bold text-[14px] tracking-[-0.28px] transition-all duration-200 flex items-center justify-center gap-2 border border-transparent shadow-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          View/ Download Report
        </button>

        <button
          onClick={() => onToggleComplete?.(task.id)}
          className={`w-full py-3 rounded-[12px] font-bold text-[14px] tracking-[-0.28px] transition-all duration-200 ${
            task.status === "Completed"
              ? "bg-[#E2F8EB] text-[#179353] border border-transparent"
              : "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-[0_8px_20px_rgba(84,118,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB] text-white"
          }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {task.status === "Completed" ? "Completed" : "Complete Task"}
        </button>
      </div>
    </div>
  );
}
