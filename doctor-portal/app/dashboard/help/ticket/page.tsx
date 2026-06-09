"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

interface UpdateComment {
  id: number;
  sender: "support" | "doctor";
  avatar: string;
  name: string;
  email?: string;
  message: string;
  dateTime: string;
}

export default function TicketInformationPage() {
  const [newComment, setNewComment] = useState("");
  const [updates, setUpdates] = useState<UpdateComment[]>([
    {
      id: 1,
      sender: "support",
      avatar: "support-gear",
      name: "Wellness Central Support",
      message:
        "Thank you for bringing this issue to our attention. We have investigated the problem you encountered while updating your consultation fee and identified a technical error that caused the verification failure. Our technical team has now resolved the issue. You should be able to update your consultation fee and verify it with the OTP successfully. Please try again and let us know if the issue persists. We apologize for the inconvenience caused and appreciate your patience. If you need any further assistance, feel free to reach out.",
      dateTime: "1 Feb, 2020, 11:40 PM",
    },
  ]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[now.getMonth()];
    
    const formattedDate = `${now.getDate()} ${monthName}, ${now.getFullYear()}, ${now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

    const comment: UpdateComment = {
      id: Date.now(),
      sender: "doctor",
      avatar: "/doctor-avatar.png",
      name: "Dr. Yelena",
      message: newComment,
      dateTime: formattedDate,
    };

    setUpdates([...updates, comment]);
    setNewComment("");
  };

  return (
    <ProtectedRoute>
      <div className="px-10 pb-12 select-none flex flex-col gap-8">
        
        {/* Header navigation bar */}
        <div className="flex items-center gap-4 mt-2">
          <Link
            href="/dashboard/help"
            title="Back to Help & Support"
            className="w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#EBEEF5] flex items-center justify-center text-[#5476FC] hover:bg-slate-50 hover:shadow-md transition-all shrink-0"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M5 9L1 5l4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          
          <h1
            className="text-[#24292E] font-medium text-[22px] tracking-[-0.44px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Ticket_Feb2020
          </h1>
        </div>

        {/* Two column ticket details layout */}
        <div className="flex gap-8 items-start w-full">
          
          {/* LEFT COLUMN: Main details and updates */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Created on Card */}
            <div className="bg-white border border-[#EBEEF5] rounded-[16px] p-5 w-[220px] flex flex-col gap-1 shadow-sm">
              <span
                className="text-[#9EA5AD] text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Created on
              </span>
              <span
                className="text-[#24292E] text-[18px] font-semibold tracking-tight"
                style={{ fontFamily: "Marcellus, serif" }}
              >
                1 Feb, 2020
              </span>
            </div>

            {/* Description card */}
            <div className="flex flex-col gap-2.5">
              <span
                className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Description
              </span>
              <div className="bg-white border border-[#EBEEF5] rounded-[16px] p-6 flex flex-col gap-2 shadow-sm">
                <span
                  className="text-[#5476FC] text-xs font-bold"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Technical Problems
                </span>
                <p
                  className="text-[#676E76] text-xs leading-relaxed font-medium"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  I am facing an issue while trying to update my consultation fee on the platform. After entering the new fee and attempting to verify it with the OTP, the system shows an error message saying &quot;verification failure.&quot; I have tried multiple times, but the issue persists. Please assist in resolving this problem as soon as possible.
                </p>
              </div>
            </div>

            {/* Updates Log card */}
            <div className="flex flex-col gap-2.5">
              <span
                className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Updates
              </span>
              <div className="bg-[#F9FAFC] border border-[#EBEEF5] rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
                
                {/* Comments List */}
                <div className="flex flex-col gap-6 w-full">
                  {updates.map((update) => (
                    <div key={update.id} className="flex gap-4 items-start w-full">
                      {/* Avatar */}
                      {update.avatar === "support-gear" ? (
                        <div className="w-9 h-9 rounded-full border border-[#EBF2FC] bg-[#EBF2FC] flex items-center justify-center text-[#5476FC] shrink-0 shadow-sm">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                          <img src={update.avatar} alt={update.name} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Bubble Details */}
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="bg-white border border-[#EBEEF5] rounded-[16px] p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                          <p
                            className="text-[#24292E] text-xs font-semibold leading-relaxed"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {update.message}
                          </p>
                        </div>
                        <span
                          className="text-[#9EA5AD] text-[10px] pl-1"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {update.dateTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment Input Row */}
                <form onSubmit={handleAddComment} className="flex gap-4 items-center w-full mt-2 border-t border-[#EBEEF5] pt-5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <img src="/doctor-avatar.png" alt="Doctor Avatar" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Add comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-white border border-[#5879FC]/40 focus:border-[#5879FC] rounded-[14px] px-5 py-3 text-xs text-[#24292E] placeholder-[#9EA5AD] outline-none shadow-sm transition-all"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </form>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Ticket Summary Sidecard Timeline */}
          <div className="w-[340px] shrink-0 bg-white border border-[#EBEEF5] rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            {/* Title Summary row */}
            <div className="flex items-center justify-between w-full">
              <h2
                className="text-[#24292E] font-normal text-[20px] tracking-[-0.4px]"
                style={{ fontFamily: "Marcellus, serif" }}
              >
                Summary
              </h2>
              <span
                className="px-3 py-1 bg-[#FFF0F0] text-[#E05252] text-[9px] font-bold rounded-full uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                High Priority
              </span>
            </div>

            {/* Vertical Timeline */}
            <div className="flex flex-col w-full relative pl-6 gap-6">
              {/* Vertical timeline divider path */}
              <div className="absolute left-[7.5px] top-1.5 bottom-1.5 w-[2px] bg-[#EBEEF5]" />

              {/* Event 1: Ticket Submitted */}
              <div className="relative flex flex-col gap-0.5">
                {/* Timeline node */}
                <div className="absolute -left-[23px] top-1 w-[12px] h-[12px] rounded-full border-2 border-[#5476FC] bg-white" />
                <span
                  className="text-[#24292E] text-xs font-semibold tracking-[-0.24px]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Ticket Submitted
                </span>
                <span
                  className="text-[#9EA5AD] text-[10px]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  1 Feb, 2020, 11:40 PM
                </span>
              </div>

              {/* Event 2: Ticket Assigned */}
              <div className="relative flex flex-col gap-2">
                {/* Timeline node */}
                <div className="absolute -left-[23px] top-1 w-[12px] h-[12px] rounded-full border-2 border-[#5476FC] bg-white" />
                
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-[#24292E] text-xs font-semibold tracking-[-0.24px]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Ticket Assigned
                  </span>
                  <span
                    className="text-[#9EA5AD] text-[10px]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    1 Feb, 2020, 11:40 PM
                  </span>
                </div>

                <p
                  className="text-[#9EA5AD] text-[10px] leading-relaxed"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  The ticket is assigned to a relevant support agent or department based on the type of issue.
                </p>

                {/* Assigned Agent detail row */}
                <div className="flex items-center gap-2.5 p-2 bg-[#F9FAFC] border border-[#EBEEF5]/60 rounded-xl mt-1">
                  <div className="w-8 h-8 rounded-full border border-[#EEF2FF] bg-[#EEF2FF]/40 flex items-center justify-center text-[#5476FC] shrink-0 shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M10 6.5h.01M10 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[#24292E] text-[11px] font-bold"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      John Doe
                    </span>
                    <span
                      className="text-[#9EA5AD] text-[9.5px]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      mail@example.com
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </ProtectedRoute>
  );
}
