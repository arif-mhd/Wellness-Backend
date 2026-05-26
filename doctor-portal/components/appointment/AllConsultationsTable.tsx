"use client";

import React, { useState } from "react";
import { Patient } from "@/app/appointments/types";

interface AllConsultationsTableProps {
  consultations: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onConsult: (patient: Patient) => void;
}

export default function AllConsultationsTable({
  consultations,
  selectedPatientId,
  onSelectPatient,
  onConsult,
}: AllConsultationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Calculate pagination details
  const totalPages = Math.ceil(consultations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = consultations.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        borderRadius: "12px",
        opacity: 1,
      }}
      className="flex flex-col bg-white shadow-sm border border-[#EBEEF5] font-outfit mt-4"
    >
      <div
        style={{
          width: "100%",
          gap: "16px",
          opacity: 1,
        }}
        className="flex flex-col"
      >
      {/* Table Header */}
      <div className="hidden md:flex items-center justify-between px-3 py-2 border-b border-[#EBEEF5] text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px] select-none">
        <div className="w-[30%]">Name</div>
        <div className="w-[35%]">Diagnosis</div>
        <div className="w-[35%] text-right md:text-left md:pl-8">Date and Time</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2 mt-2">
        {paginatedItems.map((patient, index) => {
          const isSelected = selectedPatientId === patient.id;
          // Alternate background colors (Row 2, 4, etc. have #F5F6FA bg)
          const isAlternate = index % 2 === 1;
          
          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-[8px] cursor-pointer transition-all duration-200 border border-transparent ${
                isSelected
                  ? "bg-[#E0E7FF]/40 border-[#8AA0FF]/50"
                  : isAlternate
                  ? "bg-[#F5F6FA] hover:bg-gray-100/70"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {/* Name Column */}
              <div className="flex items-center gap-3 w-full md:w-[30%]">
                <img
                  src={patient.avatar}
                  alt={patient.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#EBEEF5]/70 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                  }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[#24292E] font-medium text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                    {patient.name}, {patient.age} y/o
                  </span>
                  <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                    {patient.email}
                  </span>
                </div>
              </div>

              {/* Diagnosis Column */}
              <div className="flex items-center gap-3 w-full md:w-[35%] mt-2 md:mt-0">
                <div className="flex-shrink-0 bg-[#E2EAFE] text-[#213159] font-light text-[12px] leading-none px-2.5 py-1.5 rounded-full select-none">
                  {patient.diagnosis}
                </div>
                <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] truncate flex-1">
                  {patient.description}
                </p>
              </div>

              {/* Date and Time / Action Column */}
              <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-[35%] mt-2 md:mt-0 md:pl-8">
                <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] truncate">
                  {patient.dateTime}
                </span>

                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    disabled
                    className="px-3.5 py-1.5 bg-white border border-[#EBEEF5] text-[#9EA5AD] font-medium text-[13px] rounded-[12px] cursor-not-allowed select-none"
                  >
                    Consult Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between mt-6 px-6 py-2.5 bg-[#F5F8FF]/80 rounded-full border border-[#EBEEF5]/40 select-none w-full min-h-[46px]">
        {/* Prev Arrow */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center justify-center p-1 rounded-full transition-all duration-150 ${
            currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100/80 text-[#24292E]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#C4C9D6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center justify-center gap-6">
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-outfit text-[12px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#7C95FF] text-white shadow-sm font-semibold"
                    : "text-[#7A7D8A] hover:text-[#24292E] hover:bg-gray-100/60"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Arrow */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center justify-center p-1 rounded-full transition-all duration-150 ${
            currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100/80 text-[#24292E]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="#C4C9D6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  );
}
