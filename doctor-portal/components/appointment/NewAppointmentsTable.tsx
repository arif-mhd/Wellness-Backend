"use client";

import React from "react";
import { Patient } from "@/app/appointments/types";

interface NewAppointmentsTableProps {
  appointments: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onConsult: (patient: Patient) => void;
  onViewPreVisitForm?: (patient: Patient) => void;
}

export default function NewAppointmentsTable({
  appointments,
  selectedPatientId,
  onSelectPatient,
  onConsult,
  onViewPreVisitForm,
}: NewAppointmentsTableProps) {
  return (
    <div className="w-full bg-white rounded-[12px] shadow-sm border border-[#EBEEF5] font-outfit">
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
            Date and Time
          </div>
        </div>

        {/* Rows */}
        {appointments.map((patient, index) => {
          const isSelected = selectedPatientId === patient.id;
          const isAlternate = index % 2 === 1;
          const isWaiting = patient.status === "Waiting";

          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`flex items-center justify-between px-2 py-2 rounded-[8px] cursor-pointer transition-all duration-200 ${
                isSelected
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

              {/* Date + Action Column — 293px */}
              <div
                className="flex-shrink-0 w-[293px] flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: status or date */}
                <div className="flex items-center gap-2 min-w-0">
                  {isWaiting ? (
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

                {/* Right: action button — gradient when selected, white otherwise */}
                {isSelected && !isWaiting ? (
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
