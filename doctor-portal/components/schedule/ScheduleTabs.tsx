"use client";

import React, { useState } from "react";

interface ScheduleTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeView: "list" | "calendar";
  setActiveView: (view: "list" | "calendar") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showViewToggle?: boolean;
}

export default function ScheduleTabs({
  activeTab,
  setActiveTab,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  showViewToggle = true,
}: ScheduleTabsProps) {
  const [showSearch, setShowSearch] = useState(false);
  const tabs = ["Scheduled Appointments", "Time slot", "Schedule Absences"];

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 select-none mb-6">
      {/* Left Tabs & Search bar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-[-0.24px] border transition-all duration-200 ${
                isActive
                  ? "bg-[#24292E] text-white border-transparent shadow-sm"
                  : "bg-white text-[#676E76] border-[#EBEEF5] hover:bg-gray-50 hover:text-[#24292E]"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {tab}
            </button>
          );
        })}

        {/* Search Toggle Icon */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2.5 rounded-full border transition-all ${
              showSearch || searchQuery
                ? "bg-[#F5F6FA] border-[#EBEEF5] text-[#24292E]"
                : "bg-white border-[#EBEEF5] text-[#676E76] hover:bg-gray-50"
            }`}
            title="Search appointments"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.2504 12.2504L9.71289 9.71289"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showSearch && (
            <input
              type="text"
              placeholder="Search by name, symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F5F6FA] border border-[#EBEEF5] text-[#24292E] placeholder-[#9EA5AD] text-xs rounded-full px-4 py-2 outline-none w-44 focus:w-56 transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
              autoFocus
            />
          )}
        </div>
      </div>

      {/* Right Toggles (List vs Calendar format) — hidden on Time slot tab */}
      {showViewToggle && (
        <div className="flex items-center gap-3">
          {/* List View Toggle */}
          <button
            onClick={() => setActiveView("list")}
            className={`p-1.5 transition-all duration-200 ${
              activeView === "list"
                ? "text-[#383F45]"
                : "text-[#9EA5AD] hover:text-[#383F45]"
            }`}
            title="List format"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 5h10.5M7 10h10.5M7 15h10.5M2.5 5h2M2.5 10h2M2.5 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Calendar View Toggle */}
          <button
            onClick={() => setActiveView("calendar")}
            className={`p-1.5 transition-all duration-200 ${
              activeView === "calendar"
                ? "text-[#383F45]"
                : "text-[#9EA5AD] hover:text-[#383F45]"
            }`}
            title="Calendar format"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 1.5v3M14 1.5v3M2.5 7.5h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="13.5" cy="13.5" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
