"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface SupportTicket {
  id: number;
  name: string;
  email: string;
  category: "Technical Problems" | "Billing Inquiries";
  summary: string;
  dateTime: string;
  status: "Open" | "Closed";
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 1,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Technical Problems",
    summary: "I've had a fever for three days with chills...",
    dateTime: "1 Feb, 2020, 11:40 PM",
    status: "Open",
  },
  {
    id: 2,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Billing Inquiries",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 3,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Technical Problems",
    summary: "I've had a fever for three days with chills...",
    dateTime: "8 Sep, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 4,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Technical Problems",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 5,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Billing Inquiries",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 6,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Technical Problems",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 7,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Billing Inquiries",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 8,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Billing Inquiries",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 9,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Technical Problems",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
  {
    id: 10,
    name: "Ticket_Feb2020",
    email: "yelena@example.com",
    category: "Billing Inquiries",
    summary: "I've had a fever for three days with chills...",
    dateTime: "22 Oct, 2020, 11:40 PM",
    status: "Closed",
  },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [filter, setFilter] = useState<"All" | "Open" | "Closed">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal form states
  const [showRaiseIssue, setShowRaiseIssue] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Technical Problems");
  const [contactNumber, setContactNumber] = useState("");
  const [comments, setComments] = useState("");

  // Filter logic
  const filteredTickets = tickets.filter((ticket) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Open" && ticket.status === "Open") ||
      (filter === "Closed" && ticket.status === "Closed");
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateTicket = () => {
    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[now.getMonth()];
    
    const newTicket: SupportTicket = {
      id: Date.now(),
      name: `Ticket_${monthName}${now.getFullYear()}`,
      email: "yelena@example.com",
      category: selectedCategory as any,
      summary: comments || "Message from Pharmacy, prescription details pending",
      dateTime: `${now.getDate()} ${monthName}, ${now.getFullYear()}, ${now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`,
      status: "Open",
    };

    setTickets([newTicket, ...tickets]);
    
    // reset form
    setContactNumber("");
    setComments("");
    setSelectedCategory("Technical Problems");
    setShowRaiseIssue(false);
  };

  return (
    <ProtectedRoute>
      <div className="px-10 pb-12 select-none flex flex-col gap-8 relative">
        
        {/* Page title */}
        <div className="flex flex-col justify-center items-start mt-2">
          <h1
            className="text-[#24292E] font-medium text-[32px] tracking-[-0.64px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Help & Support
          </h1>
        </div>

        {/* Center Assist Banner & Search */}
        <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
          <h2
            className="text-[#24292E] font-normal text-[22px] tracking-[-0.44px]"
            style={{ fontFamily: "Marcellus, serif" }}
          >
            How can we assist you?
          </h2>
          <p
            className="text-[#9EA5AD] text-[12px] max-w-[620px] leading-relaxed font-medium"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            If you have any questions or need assistance, we're here to help. Explore the options below for quick solutions or reach out directly to our support team.
          </p>

          {/* Search Help Input */}
          <div className="relative w-full max-w-[480px] mt-2">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#9EA5AD]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12.2504 12.2504L9.71289 9.71289"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Need some help?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F6FA] text-[#24292E] placeholder-[#9EA5AD] text-xs rounded-full pl-12 pr-6 py-3.5 border border-transparent focus:border-[#EBEEF5] focus:bg-white outline-none transition-all text-center"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        </div>

        {/* Support History Controls */}
        <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
          <span
            className="text-[#24292E] font-semibold text-[15px] tracking-[-0.3px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Support History
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRaiseIssue(true)}
              className="px-6 py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] hover:shadow-[0_8px_20px_rgba(84,118,252,0.25)] text-white font-bold text-xs rounded-xl shadow-sm transition-all duration-200"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Raise an Issue
            </button>
            
            <Link
              href="/dashboard/help/faq"
              className="px-5 py-2.5 bg-white border border-[#EBEEF5] text-[#24292E] hover:bg-slate-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Frequently Asked Questions
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 6h9M7.5 2.5L11 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        {/* History Table Wrapper */}
        <div className="flex flex-col gap-5 w-full">
          
          {/* Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(["All", "Open", "Closed"] as const).map((opt) => {
                const isActive = filter === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={`px-5 py-2 rounded-full text-xs font-semibold tracking-[-0.24px] border transition-all duration-200 ${
                      isActive
                        ? "bg-[#24292E] text-white border-transparent shadow-sm"
                        : "bg-white text-[#676E76] border-[#EBEEF5] hover:bg-gray-50"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              className="text-[#9EA5AD] hover:text-[#24292E] text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Today
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* List Table Card */}
          <div className="bg-white border border-[#EBEEF5] rounded-[24px] px-6 py-4 shadow-sm flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-[#9EA5AD] uppercase tracking-wider">
                  <th className="py-4 font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Name</th>
                  <th className="py-4 font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Summary</th>
                  <th className="py-4 font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>Date and Time</th>
                  <th className="py-4 font-bold text-right" style={{ fontFamily: "Outfit, sans-serif" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push("/dashboard/help/ticket")}
                    className="hover:bg-[#F9FAFC]/50 transition-colors cursor-pointer"
                  >
                    {/* Name Column */}
                    <td className="py-[22px] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-[#EEF2FF] bg-[#EEF2FF]/40 flex items-center justify-center text-[#5476FC] shrink-0">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="2" />
                          <path d="M10 6.5h.01M10 9.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] font-bold text-[#24292E]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {ticket.name}
                        </span>
                        <span className="text-[10px] text-[#9EA5AD]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {ticket.email}
                        </span>
                      </div>
                    </td>

                    {/* Summary Column */}
                    <td className="py-[22px]">
                      <div className="flex items-center gap-2 max-w-[320px]">
                        <span className="px-2.5 py-1 bg-[#EEF2FF] text-[#5476FC] text-[9.5px] font-bold rounded-[6px] shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {ticket.category}
                        </span>
                        <span className="text-xs text-[#9EA5AD] truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {ticket.summary}
                        </span>
                      </div>
                    </td>

                    {/* Date Column */}
                    <td className="py-[22px] text-xs text-[#676E76] font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {ticket.dateTime}
                    </td>

                    {/* Status Column */}
                    <td className="py-[22px] text-right">
                      <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[-0.2px] ${
                        ticket.status === "Open"
                          ? "bg-[#FFF0F0] text-[#E05252]"
                          : "bg-[#E2FBE9] text-[#0E9F6E]"
                      }`} style={{ fontFamily: "Outfit, sans-serif" }}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#9EA5AD] text-xs font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                      No support tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {/* Left Chevron */}
            <button className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#9EA5AD] hover:text-[#5879FC] hover:border-[#5879FC] transition-all">
              <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                <path d="M4 8L1 4.5L4 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Page buttons */}
            {([1, 2, 3, 4, 5, 6, 7] as const).map((pg) => {
              const isSelected = currentPage === pg;
              return (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#5879FC] text-white shadow-sm"
                      : "text-[#9EA5AD] hover:text-[#5879FC]"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {pg}
                </button>
              );
            })}

            {/* Right Chevron */}
            <button className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#9EA5AD] hover:text-[#5879FC] hover:border-[#5879FC] transition-all">
              <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                <path d="M1 8L4 4.5L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

        </div>

      </div>

      {/* ── Raise an Issue Center Modal ────────────────────────────────────── */}
      {showRaiseIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-[0_12px_50px_rgba(0,0,0,0.15)] w-full max-w-[500px] mx-4 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header (Centered Marcellus Title) */}
            <div className="relative flex items-center justify-center min-h-[36px] border-b border-[#EBEEF5]/40 pb-2">
              <h3
                className="text-[#24292E] font-normal text-[22px] tracking-[-0.44px] text-center"
                style={{ fontFamily: "Marcellus, serif" }}
              >
                Raise an Issue
              </h3>
              <button
                onClick={() => setShowRaiseIssue(false)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[#F5F6FA] flex items-center justify-center text-[#9EA5AD] hover:text-[#383F45] transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1.5 10.5l9-9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Choose category list */}
            <div className="flex flex-col gap-2.5">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Choose a category
              </span>
              <div className="flex flex-col gap-3">
                {["Technical Problems", "Billing Inquiries", "Service-Related", "Others"].map((cat) => {
                  const isChecked = selectedCategory === cat;
                  return (
                    <label key={cat} className="flex items-center gap-3.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="category"
                        checked={isChecked}
                        onChange={() => setSelectedCategory(cat)}
                        className="hidden"
                      />
                      <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-all ${
                        isChecked
                          ? "border-[#5476FC] bg-[#5476FC] text-white"
                          : "border-[#BAC7FF] bg-white group-hover:border-[#5476FC]"
                      }`}>
                        {isChecked && (
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4.5l2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-[#24292E] text-sm font-normal select-none"
                        style={{ fontFamily: "Marcellus, serif" }}
                      >
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Contact number
              </span>
              <input
                type="text"
                placeholder="Contact Number*"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] px-4 py-3.5 text-[13px] text-[#24292E] placeholder-[#9EA5AD] outline-none focus:border-[#5476FC] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Add Comments */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Add Comments
              </span>
              <textarea
                placeholder="Comments here.."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] p-4 text-[13px] text-[#24292E] placeholder-[#9EA5AD] min-h-[100px] outline-none focus:border-[#5476FC] transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Attach file */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Attach screenshot/ file
              </span>
              <div className="flex items-center justify-between p-3.5 bg-[#F9FAFC] border border-[#EBEEF5] rounded-[16px] cursor-pointer hover:bg-slate-50 transition-colors">
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
                    Attach file
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowRaiseIssue(false)}
                className="flex-1 py-3 rounded-[14px] bg-[#EEF2FF] text-[#243D7F] hover:bg-[#E4EAFF] font-bold text-[13px] tracking-[-0.26px] transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="flex-1 py-3 rounded-[14px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] text-white font-bold text-[13px] tracking-[-0.26px] transition-all duration-200"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Create Ticket
              </button>
            </div>

          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
