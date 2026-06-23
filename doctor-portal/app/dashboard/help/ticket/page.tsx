"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import ProtectedRoute from "@/components/ProtectedRoute";

interface TicketComment {
  id: string;
  authorRole: "admin" | "doctor" | "patient";
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  patientId: string;
  subject: string;
  description: string;
  category: string;
  status: "Open" | "In Progress" | "Closed";
  adminReply?: string | null;
  comments?: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  } catch { return iso; }
}

function TicketContent() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("id");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (!ticketId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const res = await apiFetch(`/api/support/${ticketId}`);
        if (res.ok) {
          setTicket(await res.json());
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !newComment.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await apiFetch(`/api/support/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newComment.trim() }),
      });
      if (res.ok) {
        setTicket(await res.json());
        setNewComment("");
      }
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-[#9EA5AD] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Loading ticket...</span>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <span className="text-[#24292E] font-semibold text-base" style={{ fontFamily: "Outfit, sans-serif" }}>Ticket not found</span>
        <Link href="/dashboard/help" className="text-[#5476FC] text-sm font-semibold hover:underline" style={{ fontFamily: "Outfit, sans-serif" }}>
          Back to Help & Support
        </Link>
      </div>
    );
  }

  const updates: Array<{ id: string; sender: "support" | "doctor"; message: string; dateTime: string; sortKey: string }> = [];
  if (ticket.adminReply) {
    updates.push({
      id: "admin-reply",
      sender: "support",
      message: ticket.adminReply,
      dateTime: formatDate(ticket.updatedAt),
      sortKey: ticket.updatedAt,
    });
  }
  for (const c of ticket.comments ?? []) {
    updates.push({
      id: c.id,
      sender: c.authorRole === "admin" ? "support" : "doctor",
      message: c.message,
      dateTime: formatDate(c.createdAt),
      sortKey: c.createdAt,
    });
  }
  updates.sort((a, b) => new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime());

  return (
    <div className="px-10 pb-12 select-none flex flex-col gap-8">

      {/* Header navigation bar */}
      <div className="flex items-center gap-4 mt-2">
        <Link
          href="/dashboard/help"
          title="Back to Help & Support"
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#EBEEF5] flex items-center justify-center text-[#5476FC] hover:bg-slate-50 hover:shadow-md transition-all shrink-0"
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 9L1 5l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <h1
          className="text-[#24292E] font-medium text-[22px] tracking-[-0.44px]"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {ticket.subject}
        </h1>

        <span className={`ml-2 px-3 py-1 rounded-full text-[10px] font-medium tracking-wider ${
          ticket.status === "Open"
            ? "bg-[#FFF0F0] text-[#E05252]"
            : ticket.status === "In Progress"
            ? "bg-[#FFF8E7] text-[#D97706]"
            : "bg-[#E2FBE9] text-[#0E9F6E]"
        }`} style={{ fontFamily: "Outfit, sans-serif" }}>
          {ticket.status}
        </span>
      </div>

      {/* Two column ticket details layout */}
      <div className="flex gap-8 items-start w-full">

        {/* LEFT COLUMN: Main details and updates */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Created on Card */}
          <div className="bg-white border border-[#EBEEF5] rounded-[16px] p-5 w-[220px] flex flex-col gap-1 shadow-sm">
            <span
              className="text-[#9EA5AD] text-[10px] font-medium uppercase tracking-wider"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Created on
            </span>
            <span
              className="text-[#24292E] text-[18px] font-semibold tracking-tight"
              style={{ fontFamily: "Marcellus, serif" }}
            >
              {formatDate(ticket.createdAt)}
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
                className="text-[#5476FC] text-xs font-medium capitalize"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {ticket.category.replace(/_/g, " ")}
              </span>
              <p
                className="text-[#676E76] text-xs leading-relaxed font-medium"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {ticket.description}
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

              {updates.length === 0 ? (
                <p className="text-[#9EA5AD] text-xs text-center py-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                  No updates yet. Our support team will respond shortly.
                </p>
              ) : (
                <div className="flex flex-col gap-6 w-full">
                  {updates.map((update) => {
                    const isDoctor = update.sender === "doctor";
                    return (
                      <div key={update.id} className={`flex gap-4 items-start w-full ${isDoctor ? "flex-row-reverse" : ""}`}>
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 shadow-sm ${
                          isDoctor ? "border-[#E0E7FF] bg-[#E0E7FF] text-[#182A6F]" : "border-[#EBF2FC] bg-[#EBF2FC] text-[#5476FC]"
                        }`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        <div className={`flex flex-col gap-1 flex-1 ${isDoctor ? "items-end" : "items-start"}`}>
                          <div className={`bg-white border border-[#EBEEF5] rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] max-w-[85%]`}>
                            <p className="text-[10px] font-bold mb-1" style={{ fontFamily: "Outfit, sans-serif", color: isDoctor ? "#182A6F" : "#5476FC" }}>
                              {isDoctor ? "You" : "Wellness Central Support"}
                            </p>
                            <p
                              className="text-[#24292E] text-xs font-semibold leading-relaxed"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {update.message}
                            </p>
                          </div>
                          <span
                            className="text-[#9EA5AD] text-[10px] px-1"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {update.dateTime}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Comment Input Row */}
              <form onSubmit={handleAddComment} className="flex gap-4 items-center w-full mt-2 border-t border-[#EBEEF5] pt-5">
                <div className="w-9 h-9 rounded-full border border-[#EEF2FF] bg-[#EEF2FF]/40 flex items-center justify-center text-[#5476FC] shrink-0">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={ticket.status === "Closed" ? "This ticket is closed" : "Add a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={postingComment || ticket.status === "Closed"}
                    className="w-full bg-white border border-[#5879FC]/20 rounded-[14px] px-5 py-3 text-xs text-[#24292E] placeholder-[#9EA5AD] outline-none shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || postingComment || ticket.status === "Closed"}
                  className="shrink-0 px-4 py-3 rounded-[14px] bg-[#5476FC] hover:bg-[#4466ec] text-white text-xs font-bold transition-colors disabled:opacity-50"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {postingComment ? "Sending..." : "Send"}
                </button>
              </form>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Ticket Summary Sidecard */}
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
              className={`px-3 py-1 text-[9px] font-medium rounded-full uppercase tracking-wider ${
                ticket.status === "Open"
                  ? "bg-[#FFF0F0] text-[#E05252]"
                  : ticket.status === "In Progress"
                  ? "bg-[#FFF8E7] text-[#D97706]"
                  : "bg-[#E2FBE9] text-[#0E9F6E]"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {ticket.status}
            </span>
          </div>

          {/* Ticket details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#9EA5AD] text-[9px] font-medium uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Ticket ID
              </span>
              <span className="text-[#24292E] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                #{ticket.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#9EA5AD] text-[9px] font-medium uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Category
              </span>
              <span className="text-[#24292E] text-xs font-semibold capitalize" style={{ fontFamily: "Outfit, sans-serif" }}>
                {ticket.category.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#9EA5AD] text-[9px] font-medium uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Last Updated
              </span>
              <span className="text-[#24292E] text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                {formatDate(ticket.updatedAt)}
              </span>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="flex flex-col w-full relative pl-6 gap-6 pt-2">
            <div className="absolute left-[7.5px] top-1.5 bottom-1.5 w-[2px] bg-[#EBEEF5]" />

            <div className="relative flex flex-col gap-0.5">
              <div className="absolute -left-[23px] top-1 w-[12px] h-[12px] rounded-full border-2 border-[#5476FC] bg-white" />
              <span className="text-[#24292E] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Ticket Submitted
              </span>
              <span className="text-[#9EA5AD] text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                {formatDate(ticket.createdAt)}
              </span>
            </div>

            {ticket.status !== "Open" && (
              <div className="relative flex flex-col gap-0.5">
                <div className="absolute -left-[23px] top-1 w-[12px] h-[12px] rounded-full border-2 border-[#5476FC] bg-[#5476FC]" />
                <span className="text-[#24292E] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  In Review
                </span>
                <span className="text-[#9EA5AD] text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {formatDate(ticket.updatedAt)}
                </span>
              </div>
            )}

            {ticket.adminReply && (
              <div className="relative flex flex-col gap-0.5">
                <div className="absolute -left-[23px] top-1 w-[12px] h-[12px] rounded-full border-2 border-[#0E9F6E] bg-[#0E9F6E]" />
                <span className="text-[#24292E] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Reply Received
                </span>
                <span className="text-[#9EA5AD] text-[10px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {formatDate(ticket.updatedAt)}
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

export default function TicketInformationPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <span className="text-[#9EA5AD] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>Loading...</span>
        </div>
      }>
        <TicketContent />
      </Suspense>
    </ProtectedRoute>
  );
}
