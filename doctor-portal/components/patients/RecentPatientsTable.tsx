"use client";

import React from "react";
import { Patient } from "@/app/patients/mockData";

interface RecentPatientsTableProps {
  patients: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onCompleteTask: (patient: Patient) => void;
  onMessageClick: (patient: Patient) => void;
}

export default function RecentPatientsTable({
  patients,
  selectedPatientId,
  onSelectPatient,
  onCompleteTask,
  onMessageClick,
}: RecentPatientsTableProps) {
  return (
    <div className="w-full bg-white rounded-[12px] shadow-sm border border-[#EBEEF5] font-outfit">
      <div className="flex flex-col gap-2 p-8">
        {/* Table Header */}
        <div className="flex items-center justify-between px-2 py-2 select-none border-b border-gray-100 pb-4">
          <div className="flex-shrink-0 w-[200px] text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
            Name
          </div>
          <div className="flex-1 min-w-0 text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px] px-2">
            Diagnosis
          </div>
          <div className="flex-shrink-0 w-[293px] text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
            Last Appointment
          </div>
        </div>

        {/* Rows */}
        {patients.map((patient, index) => {
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

              {/* Last Appointment + Actions Column */}
              <div
                className="flex-shrink-0 w-[293px] flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] truncate">
                  {patient.dateTime}
                </span>

                <div className="flex items-center gap-2">
                  {/* Message Icon Button */}
                  <button
                    onClick={() => onMessageClick(patient)}
                    className="w-8 h-8 rounded-full bg-[#ECF2FC] flex items-center justify-center text-[#24292E] hover:bg-[#D5E3FC] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 7.66669C14.0023 8.5466 13.7967 9.41461 13.4 10.2C12.9296 11.1412 12.2065 11.9328 11.3116 12.4862C10.4168 13.0396 9.3855 13.3329 8.33333 13.3334C7.45342 13.3356 6.58541 13.1301 5.8 12.7334L2 14L3.26667 10.2C2.86995 9.41461 2.66437 8.5466 2.66667 7.66669C2.66707 6.61452 2.96041 5.58325 3.51381 4.68839C4.06722 3.79352 4.85884 3.0704 5.8 2.60002C6.58541 2.20331 7.45342 1.99772 8.33333 2.00002H8.66667C10.0562 2.07668 11.3687 2.66319 12.3528 3.64726C13.3368 4.63132 13.9233 5.94379 14 7.33335V7.66669Z" stroke="#24292E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Complete Task Button */}
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
    </div>
  );
}
