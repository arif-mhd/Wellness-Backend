"use client";

import React, { useState } from "react";

export interface ScheduleItem {
  id: number;
  patientName: string;
  patientAge: number;
  patientAvatar: string;
  email: string;
  symptomType: string;
  symptomDetails: string;
  dateTime: string;
  actionType: "Reschedule" | "Consult Now";
  patientBio: string;
}

interface ScheduleListViewProps {
  items: ScheduleItem[];
  selectedItemId: number | null;
  onSelectItem: (item: ScheduleItem) => void;
  onRescheduleClick?: (item: ScheduleItem) => void;
  onConsultClick?: (item: ScheduleItem) => void;
}

export default function ScheduleListView({
  items,
  selectedItemId,
  onSelectItem,
  onRescheduleClick,
  onConsultClick,
}: ScheduleListViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Dropdown filter list
  const filterDropdowns = ["Name", "Age", "Symptoms", "Date"];

  return (
    <div className="flex flex-col bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-sm min-h-[580px] justify-between select-none">
      <div className="flex flex-col gap-6">
        {/* Table Filter Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="flex flex-col gap-1.5">
            <span
              className="text-[#24292E] font-medium text-[16px] tracking-[-0.32px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Appointment and tasks
            </span>
            {/* Inline filters */}
            <div className="flex items-center gap-4 flex-wrap mt-1">
              {filterDropdowns.map((filter) => (
                <button
                  key={filter}
                  className="flex items-center gap-1 text-[#838B95] hover:text-[#24292E] font-semibold text-xs transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {filter}
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Today Filter and Slider settings */}
          <div className="flex items-center gap-3.5 self-end md:self-center">
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#EBEEF5] rounded-full text-xs font-semibold text-[#676E76] hover:bg-slate-50 transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Today
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Filter Slider Settings Icon */}
            <button className="p-2 border border-[#EBEEF5] rounded-full text-[#676E76] hover:bg-slate-50 transition-all">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.667 4h10.666M4.667 8h6.666M6.667 12h2.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table Column Header */}
        <div
          className="hidden md:grid grid-cols-[1.8fr_2.2fr_1.2fr_1fr] gap-4 pl-4 pr-4 py-2 text-[#9EA5AD] text-[12px] font-semibold uppercase tracking-wider border-b border-slate-50/50"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <span>Name</span>
          <span>Symptoms</span>
          <span>Date and Time</span>
          <span className="text-right"></span>
        </div>

        {/* Table Row List */}
        <div className="flex flex-col gap-2 min-h-[350px]">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5EB" strokeWidth="2" className="mb-3">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="text-[#676E76] text-sm">No scheduled appointments found.</span>
            </div>
          ) : (
            currentItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group grid grid-cols-1 md:grid-cols-[1.8fr_2.2fr_1.2fr_1fr] gap-4 items-center p-3 rounded-2xl cursor-pointer border border-transparent transition-all duration-300 bg-white hover:bg-[#ECEFFE]/80"
                >
                  {/* Name column */}
                  <div className="flex items-center gap-3">
                    <img
                      src={item.patientAvatar}
                      alt={item.patientName}
                      className="w-10 h-10 rounded-full object-cover border border-[#EBEEF5] shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className="text-[#24292E] font-medium text-[13px] tracking-[-0.26px] truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {item.patientName}, {item.patientAge} y/o
                      </span>
                      <span
                        className="text-[#9EA5AD] text-xs truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {item.email}
                      </span>
                    </div>
                  </div>

                  {/* Symptoms Column */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="bg-[#E8F1FF] text-[#5476FC] text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {item.symptomType}
                    </span>
                    <span
                      className="text-[#676E76] text-xs truncate font-medium"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {item.symptomDetails}
                    </span>
                  </div>

                  {/* Date and Time Column */}
                  <div
                    className="text-[#676E76] text-xs font-medium"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {item.dateTime}
                  </div>

                  {/* Action Column */}
                  <div className="flex items-center justify-end">
                    {item.actionType === "Consult Now" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConsultClick?.(item);
                        }}
                        className="text-[#5879FC] hover:text-[#4065FB] font-bold text-xs whitespace-nowrap transition-colors py-1.5 px-3"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Consult Now
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRescheduleClick?.(item);
                          onSelectItem(item);
                        }}
                        className={`whitespace-nowrap shrink-0 h-[32px] px-4 rounded-xl text-xs font-semibold tracking-[-0.24px] transition-all duration-300 ${
                          isSelected
                            ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB]"
                            : "bg-white text-[#24292E] border border-gray-200 group-hover:bg-gradient-to-b group-hover:from-[#8AA0FF] group-hover:to-[#5476FC] group-hover:text-white group-hover:border-transparent group-hover:shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB]"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Reschedule
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[#EBEEF5] w-full">
        {/* Prev Arrow */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] transition-colors ${
            currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-[#ECEFFE] hover:text-[#5879FC]"
          }`}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 9L1 5L5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isPageActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                isPageActive
                  ? "bg-[#5879FC] text-white shadow-[0_4px_10px_rgba(88,121,252,0.25)]"
                  : "bg-white text-[#676E76] border border-[#EBEEF5] hover:bg-gray-50 hover:text-[#24292E]"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {page}
            </button>
          );
        })}

        {/* Next Arrow */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`w-8 h-8 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#676E76] transition-colors ${
            currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-[#ECEFFE] hover:text-[#5879FC]"
          }`}
        >
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
