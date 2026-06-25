"use client";

import React, { useState } from "react";
import { Patient } from "@/app/appointments/types";

interface AllConsultationsTableProps {
  consultations: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onConsult: (patient: Patient) => void;
  onViewPreVisitForm?: (patient: Patient) => void;
  activeTab: "All" | "Upcoming" | "Past";
  /** When true, completed appointments are faded (used in the "All" tab) */
  fadeCompleted?: boolean;
}

export default function AllConsultationsTable({
  consultations,
  selectedPatientId,
  onSelectPatient,
  onConsult,
  onViewPreVisitForm,
  activeTab,
  fadeCompleted = false,
}: AllConsultationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(consultations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = consultations.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full bg-white rounded-[12px] shadow-sm border border-[#EBEEF5] font-outfit mt-4">
      <div className="flex flex-col gap-2 p-8">

        {/* Table Header */}
        <div className="flex items-center justify-between px-2 py-2 select-none">
          {/* Name col */}
          <div className="flex-shrink-0 w-[200px] text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
            Name
          </div>
          {/* Diagnosis col */}
          <div className="flex-1 min-w-0 text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
            Diagnosis
          </div>
          {/* Date/Action col */}
          <div className="flex-shrink-0 w-[293px] text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
            {activeTab === "Past" ? (
              <div className="flex items-center justify-between w-full">
                <span>Date and Time</span>
                <span className="pr-4">Earnings</span>
              </div>
            ) : (
              "Date and Time"
            )}
          </div>
        </div>

        {/* Rows */}
        {consultations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[#9EA5AD] text-[13px]">No consultations found.</p>
          </div>
        )}
        {paginatedItems.map((patient, index) => {
          const isSelected = selectedPatientId === patient.id;
          const isAlternate = index % 2 === 1;
          const isCompleted = patient.status === "Completed";
          const shouldFade = fadeCompleted && isCompleted;

          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`flex items-center justify-between px-2 py-2 rounded-[8px] cursor-pointer transition-all duration-200 ${
                shouldFade
                  ? "opacity-40 grayscale-[30%]"
                  : ""
              } ${isSelected
                  ? "bg-[#EEF1FF]/60 border border-[#8AA0FF]/40"
                  : isAlternate
                    ? "bg-[#F5F6FA] border border-transparent hover:bg-[#F0F2F8]"
                    : "bg-white border border-transparent hover:bg-[#F9FAFB]"
                }`}
            >
              {/* Name Column — 200px */}
              <div className="flex-shrink-0 w-[200px] flex items-center gap-4">
                <img
                  src={patient.avatar}
                  alt={patient.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                  }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[#24292E] font-normal text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                    {patient.name}, {patient.age} y/o
                  </span>
                  <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                    {patient.email}
                  </span>
                  {patient.accountOwnerName && (
                    <span className="text-[#5476FC] text-[11px] leading-[1.4] truncate">
                      For: {patient.profileRelationship ?? "Family Member"} of {patient.accountOwnerName}
                    </span>
                  )}
                </div>
              </div>

              {/* Diagnosis Column — flexible */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2">
                <span className="flex-shrink-0 bg-[#E2EAFE] text-[#213159] font-light text-[12px] leading-none px-2.5 py-[5px] rounded-full select-none">
                  {patient.diagnosis}
                </span>
                <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] truncate flex-1 min-w-0">
                  {patient.description}
                </p>
              </div>

              {/* Date + Action/Earnings Column — 293px */}
              <div
                className="flex-shrink-0 w-[293px] flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {activeTab === "Past" ? (
                  <>
                    <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] truncate">
                      {patient.dateTime}
                    </span>
                    <span className="text-[#676E76] text-[12px] font-medium leading-[1.5] tracking-[-0.24px] pr-4 select-text">
                      {patient.earnings ?? "AED 110.00"}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Date/time or Waiting status */}
                    <div className="flex items-center gap-2 min-w-0">
                      {patient.status === "Waiting" ? (
                        <div className="flex items-center gap-2">
                          {/* Animated pulsing dot matching Figma F4A308 */}
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4A308] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F4A308]" />
                          </span>
                          <span className="text-[#F4A308] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                            Waiting
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] truncate">
                          {patient.dateTime}
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    {patient.status === "Completed" ? (
                      <button
                        disabled
                        className="flex-shrink-0 flex items-center justify-center px-[13px] py-[6px] rounded-[12px] bg-white border border-[#EBEEF5] text-[#9EA5AD] font-medium text-[13px] leading-5 cursor-not-allowed select-none"
                        style={{ minWidth: "100px" }}
                      >
                        Consult Now
                      </button>
                    ) : isSelected && patient.status !== "Waiting" ? (
                      <button
                        onClick={() => (onViewPreVisitForm ?? onConsult)(patient)}
                        className="flex-shrink-0 flex items-center justify-center px-[13px] py-[6px] rounded-[12px] text-white font-medium text-[13px] leading-5 select-none"
                        style={{
                          background:
                            "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)",
                          minWidth: "130px",
                        }}
                      >
                        View&nbsp;Pre-Visit Form
                      </button>
                    ) : (
                      <button
                        onClick={() => onConsult(patient)}
                        className="flex-shrink-0 flex items-center justify-center px-[13px] py-[6px] rounded-[12px] bg-white border border-[#EBEEF5] text-[#24292E] font-medium text-[13px] leading-5 hover:bg-[#F5F6FA] transition-colors duration-150 select-none shadow-sm"
                        style={{ minWidth: "100px" }}
                      >
                        Consult Now
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination Bar — matches Figma pill shape with #F7F9FF bg */}
        <div className="flex items-center justify-between mt-4 px-6 py-[13px] bg-[#F7F9FF] rounded-[26px] select-none">
          {/* Prev Arrow */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center justify-center transition-colors duration-150 ${currentPage === 1
                ? "opacity-40 cursor-not-allowed"
                : "hover:opacity-70"
              }`}
            aria-label="Previous page"
          >
            <svg width="8" height="16" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.645 1.42C7.757 1.553 7.847 1.711 7.908 1.884C7.969 2.058 8 2.244 8 2.431C8 2.619 7.969 2.805 7.908 2.978C7.847 3.151 7.757 3.309 7.645 3.441L2.931 9.001L7.645 14.561C7.872 14.829 8 15.192 8 15.571C8 15.950 7.872 16.314 7.645 16.582C7.418 16.850 7.110 17 6.788 17C6.467 17 6.159 16.850 5.932 16.582L0.355 10.004C0.243 9.872 0.153 9.714 0.092 9.541C0.031 9.368 0 9.182 0 8.994C0 8.807 0.031 8.621 0.092 8.447C0.153 8.274 0.243 8.116 0.355 7.984L5.932 1.407C6.393 0.862 7.171 0.862 7.645 1.421Z"
                fill="#A9A9A9"
                fillOpacity="0.73"
              />
            </svg>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-[26px]">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-outfit text-[14px] tracking-[-0.02em] transition-all duration-150 ${isActive
                      ? "bg-[#8AA0FF] text-white"
                      : "text-[#656565] hover:text-[#24292E]"
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
            className={`flex items-center justify-center transition-colors duration-150 ${currentPage === totalPages
                ? "opacity-40 cursor-not-allowed"
                : "hover:opacity-70"
              }`}
            aria-label="Next page"
          >
            <svg width="8" height="16" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0.355 1.42C0.243 1.553 0.153 1.711 0.092 1.884C0.031 2.058 0 2.244 0 2.431C0 2.619 0.031 2.805 0.092 2.978C0.153 3.151 0.243 3.309 0.355 3.441L5.069 9.001L0.355 14.561C0.128 14.829 0 15.192 0 15.571C0 15.950 0.128 16.314 0.355 16.582C0.582 16.850 0.890 17 1.212 17C1.533 17 1.841 16.850 2.068 16.582L7.645 10.004C7.757 9.872 7.847 9.714 7.908 9.541C7.969 9.368 8 9.182 8 8.994C8 8.807 7.969 8.621 7.908 8.447C7.847 8.274 7.757 8.116 7.645 7.984L2.068 1.407C1.607 0.862 0.829 0.862 0.355 1.421Z"
                fill="#A9A9A9"
                fillOpacity="0.73"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
