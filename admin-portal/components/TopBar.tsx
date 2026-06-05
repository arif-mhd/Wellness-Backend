"use client";

import { useState, useRef, useEffect } from "react";

export default function TopBar() {
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<"Unread" | "All">("Unread");
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-8 shrink-0 z-40 w-full relative">
      {/* Left: Stacked Wellness Central Logo */}
      <div className="flex items-center gap-4">
        <WellnessCentralLogo />
      </div>

      {/* Middle: Pill Search Input */}
      <div className="flex-1 max-w-lg mx-auto relative">
        <svg
          className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
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
        


        {/* Notification Bell Wrapper */}
        <div className="relative" ref={notificationsRef}>
          <button
            id="topbar-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center transition-all active:scale-95 shadow-sm ${
              showNotifications ? "text-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
          </button>

          {/* Notifications Dropdown & Overlay */}
          {showNotifications && (
            <>
              {/* Dark Overlay Background */}
              <div 
                className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200" 
                aria-hidden="true" 
              />
              
              {/* Dropdown Panel */}
              <div className="absolute top-full mt-3 right-0 w-[380px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 p-6 animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-black text-slate-800">Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-6 border-b border-slate-100 mb-4 px-1">
                <button 
                  onClick={() => setActiveTab("Unread")}
                  className={`pb-3 text-[13px] font-bold transition-colors relative ${activeTab === "Unread" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Unread
                  {activeTab === "Unread" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6A8BFF] rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("All")}
                  className={`pb-3 text-[13px] font-bold transition-colors relative ${activeTab === "All" ? "text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  All
                  {activeTab === "All" && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6A8BFF] rounded-t-full" />}
                </button>
              </div>

              {/* List */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                
                {/* Item 1 */}
                <div className="p-4 rounded-[1.25rem] bg-white border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100">
                        <img src="/doctor-avatar.png" alt="Albert Flores" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">Message from <span className="font-bold text-slate-800">Albert Flores</span></p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mt-1">1hr</span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium">I've had a fever for three days with chills, body aches, and fatigue.</p>
                </div>

                {/* Item 2 */}
                <div className="p-4 rounded-[1.25rem] bg-white border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100">
                        <img src="/doctor-avatar.png" alt="System" className="w-full h-full object-cover" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[12px] font-medium text-slate-500">New Ticket created <span className="text-[#6A8BFF] font-bold">#Ticket 11112</span></p>
                        <p className="text-[11px] text-slate-500 mt-1">Priority <span className="text-rose-500 font-bold">High</span></p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mt-1">1hr</span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium truncate">I am experiencing a technical issue when...</p>
                </div>

                {/* Item 3 */}
                <div className="p-4 rounded-[1.25rem] bg-white border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100">
                        <img src="/doctor-avatar.png" alt="Task" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">Task to complete <span className="text-[#6A8BFF] font-bold">#Task 2334</span></p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mt-1">1hr</span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium line-clamp-2">I've had a fever for three days with chills, body aches, and fatigue.</p>
                </div>

                {/* Item 4 */}
                <div className="p-4 rounded-[1.25rem] bg-white border border-slate-50 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center bg-blue-50 text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-[12px] font-medium text-slate-500">Message from <span className="font-bold text-slate-800">Courtney Henry</span></p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mt-1">1hr</span>
                  </div>
                  <p className="text-[12px] text-slate-500 leading-relaxed font-medium line-clamp-2">I've had a fever for three days with chills, body aches, and fatigue.</p>
                </div>

              </div>
            </div>
            </>
          )}
        </div>

        {/* Message / Chat Bubble */}
        <button
          id="topbar-messages"
          className="w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm relative transition-all active:scale-95"
          aria-label="Messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Badge */}
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
      <div>
        We<DoubleBar />ness
      </div>
      <div>
        Centr<SingleBar />al
      </div>
    </div>
  );
}
