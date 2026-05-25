"use client";

import { useState } from "react";

export default function TopBar() {
  const [search, setSearch] = useState("");

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-8 shrink-0 z-20 w-full">
      {/* Left: Stacked Wellness Central Logo */}
      <div className="flex items-center gap-4">
        <WellnessCentralLogo />
      </div>

      {/* Middle: Pill Search Input */}
      <div className="flex-1 max-w-lg mx-auto relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="topbar-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Anything with AI"
          className="w-full pl-12 pr-5 py-2.5 text-sm bg-[#eef2f7] border-none rounded-full placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-700 font-medium transition-all"
        />
      </div>

      {/* Right: Action Buttons and Notification icons */}
      <div className="flex items-center gap-3">
        <button className="bg-[#f43f5e] hover:bg-[#e11d48] text-white px-5 py-2.5 rounded-full text-[12px] font-bold flex items-center gap-2 transition shadow-md shadow-rose-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          SOS Records
        </button>

        <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white px-5 py-2.5 rounded-[1.25rem] text-[12px] font-bold flex items-center gap-2 transition shadow-md shadow-blue-200 mr-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Waiting Room (12)
        </button>

        {/* Notification Bell */}
        <button
          id="topbar-notifications"
          className="w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm relative transition-all active:scale-95"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Message / Chat Bubble */}
        <button
          id="topbar-messages"
          className="w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm relative transition-all active:scale-95"
          aria-label="Messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

// ── Stacked Logo component ───────────────────────────────────────────────────
function WellnessCentralLogo() {
  const DoubleBar = () => (
    <span className="inline-flex gap-[1.5px] items-end mx-[0.5px] h-[18px] translate-y-[1px]">
      <span className="w-[2.5px] h-[16px] rounded-full bg-[#3276D2]" />
      <span className="w-[2.5px] h-[16px] rounded-full bg-[#3276D2]" />
    </span>
  );

  const SingleBar = () => (
    <span className="inline-flex items-end mx-[0.5px] h-[18px] translate-y-[1px]">
      <span className="w-[2.5px] h-[16px] rounded-full bg-[#3276D2]" />
    </span>
  );

  return (
    <div className="font-sans font-black text-slate-800 leading-[1.05] select-none text-[20px] tracking-tight">
      <div>We<DoubleBar />ness</div>
      <div>Centr<SingleBar />al</div>
    </div>
  );
}
