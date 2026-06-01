"use client";

import React, { useState } from "react";
import { Patient } from "@/app/patients/mockData";

interface AllConsultationsTableProps {
  patients: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onCompleteTask: (patient: Patient) => void;
  onMessageClick: (patient: Patient) => void;
}

type SortField = "name" | "age" | "diagnosis" | "dateTime" | null;
type SortOrder = "asc" | "desc";

export default function AllConsultationsTable({
  patients,
  selectedPatientId,
  onSelectPatient,
  onCompleteTask,
  onMessageClick,
}: AllConsultationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
  const itemsPerPage = 5;

  const handleSort = (field: SortField) => {
    if (!field) return;
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Sort Patients
  const sortedPatients = [...patients].sort((a, b) => {
    if (!sortField) return 0;
    
    let valA = a[sortField === "dateTime" ? "dateTime" : sortField] || "";
    let valB = b[sortField === "dateTime" ? "dateTime" : sortField] || "";

    if (sortField === "age") {
      valA = a.age;
      valB = b.age;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Paginated Patients
  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full bg-white rounded-[12px] shadow-sm border border-[#EBEEF5] font-outfit">
      <div className="flex flex-col gap-2 p-8">
        
        {/* Sorting Headers Row */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 px-2 select-none">
          <div className="flex items-center gap-6 text-[#707070] text-[12px] font-medium leading-[1.5] tracking-[-0.24px]">
            {/* Name sort */}
            <button 
              onClick={() => handleSort("name")}
              className="flex items-center gap-1.5 hover:text-[#24292E] transition-colors"
            >
              <span>Name</span>
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${sortField === "name" && sortOrder === "desc" ? "rotate-180" : ""}`} 
                viewBox="0 0 14 14" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Age sort */}
            <button 
              onClick={() => handleSort("age")}
              className="flex items-center gap-1.5 hover:text-[#24292E] transition-colors"
            >
              <span>Age</span>
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${sortField === "age" && sortOrder === "desc" ? "rotate-180" : ""}`} 
                viewBox="0 0 14 14" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Diagnosis sort */}
            <button 
              onClick={() => handleSort("diagnosis")}
              className="flex items-center gap-1.5 hover:text-[#24292E] transition-colors"
            >
              <span>Diagnosis</span>
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${sortField === "diagnosis" && sortOrder === "desc" ? "rotate-180" : ""}`} 
                viewBox="0 0 14 14" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Date sort */}
            <button 
              onClick={() => handleSort("dateTime")}
              className="flex items-center gap-1.5 hover:text-[#24292E] transition-colors"
            >
              <span>Date</span>
              <svg 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${sortField === "dateTime" && sortOrder === "desc" ? "rotate-180" : ""}`} 
                viewBox="0 0 14 14" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="text-[#707070]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="#707070"/>
            </svg>
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-2 my-2 min-h-[300px]">
          {paginatedPatients.map((patient, index) => {
            const isSelected = selectedPatientId === patient.id;
            const isAlternate = index % 2 === 1;

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className={`flex items-center justify-between px-2 py-3 rounded-[8px] cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-[#EEF1FF]/60 border border-[#8AA0FF]/40"
                    : isAlternate
                      ? "bg-[#F5F6FA] border border-transparent hover:bg-[#F0F2F8]"
                      : "bg-white border border-transparent hover:bg-[#F9FAFB]"
                }`}
              >
                {/* Name Column */}
                <div className="flex-shrink-0 w-[200px] flex items-center gap-4">
                  <img
                    src={patient.avatar}
                    alt={patient.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://api.builder.io/api/v1/image/assets/TEMP/75256e943440be4cb0a85199610fc72cb903d28c?width=72";
                    }}
                  />
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-[#24292E] font-normal text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                      {patient.name}, {patient.age} y/o
                    </span>
                    <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                      {patient.email}
                    </span>
                  </div>
                </div>

                {/* Diagnosis Column */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2">
                  <span className="flex-shrink-0 bg-[#E2EAFE] text-[#213159] font-light text-[12px] leading-none px-2.5 py-[5px] rounded-full select-none">
                    {patient.diagnosis}
                  </span>
                  <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] truncate flex-1 min-w-0">
                    {patient.description}
                  </p>
                </div>

                {/* Date + Action Column */}
                <div
                  className="flex-shrink-0 w-[293px] flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] truncate">
                    {patient.dateTime}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onMessageClick(patient)}
                      className="w-8 h-8 rounded-full bg-[#ECF2FC] flex items-center justify-center text-[#24292E] hover:bg-[#D5E3FC] transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 7.66669C14.0023 8.5466 13.7967 9.41461 13.4 10.2C12.9296 11.1412 12.2065 11.9328 11.3116 12.4862C10.4168 13.0396 9.3855 13.3329 8.33333 13.3334C7.45342 13.3356 6.58541 13.1301 5.8 12.7334L2 14L3.26667 10.2C2.86995 9.41461 2.66437 8.5466 2.66667 7.66669C2.66707 6.61452 2.96041 5.58325 3.51381 4.68839C4.06722 3.79352 4.85884 3.0704 5.8 2.60002C6.58541 2.20331 7.45342 1.99772 8.33333 2.00002H8.66667C10.0562 2.07668 11.3687 2.66319 12.3528 3.64726C13.3368 4.63132 13.9233 5.94379 14 7.33335V7.66669Z" stroke="#24292E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {isSelected ? (
                      <button
                        onClick={() => onCompleteTask(patient)}
                        className="px-[13px] py-[6px] rounded-[12px] text-white font-medium text-[13px] leading-5 hover:opacity-90 transition-opacity select-none shadow-sm"
                        style={{
                          background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)",
                        }}
                      >
                        Complete Task
                      </button>
                    ) : (
                      <button
                        onClick={() => onCompleteTask(patient)}
                        className="px-[13px] py-[6px] rounded-[12px] bg-white border border-[#EBEEF5] text-[#24292E] font-medium text-[13px] leading-5 hover:bg-[#F5F6FA] transition-colors select-none shadow-sm"
                      >
                        Complete Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-[13px] bg-[#F7F9FF] rounded-[26px] mt-4 select-none font-outfit">
            {/* Left Chevron */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1 rounded-full ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-blue-100"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 16.58L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.58Z" fill="#A9A9A9"/>
              </svg>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-4">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isPageSelected = currentPage === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-medium transition-all ${
                      isPageSelected
                        ? "bg-[#8AA0FF] text-white"
                        : "text-[#656565] hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Right Chevron */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1 rounded-full ${currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-blue-100"}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.59 16.58L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.58Z" fill="#A9A9A9"/>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
