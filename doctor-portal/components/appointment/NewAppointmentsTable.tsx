"use client";

import React from "react";
import { Patient } from "@/app/appointments/types";

interface NewAppointmentsTableProps {
  appointments: Patient[];
  selectedPatientId: string | undefined;
  onSelectPatient: (patient: Patient) => void;
  onConsult: (patient: Patient) => void;
}

export default function NewAppointmentsTable({
  appointments,
  selectedPatientId,
  onSelectPatient,
  onConsult,
}: NewAppointmentsTableProps) {
  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        borderRadius: "12px",
        opacity: 1,
      }}
      className="flex flex-col bg-white shadow-sm border border-[#EBEEF5] font-outfit"
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
        {appointments.map((patient, index) => {
          const isSelected = selectedPatientId === patient.id;
          // Alternate background colors as in Figma (Row 2, 4, etc. have #F5F6FA bg)
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
                <div className="flex items-center gap-2">
                  {patient.status === "Waiting" ? (
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4A308] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F4A308]"></span>
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

                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  {isSelected ? (
                    <button
                      onClick={() => onConsult(patient)}
                      style={{
                        width: "145px",
                        height: "32px",
                        paddingTop: "6px",
                        paddingBottom: "6px",
                        paddingLeft: "13px",
                        paddingRight: "13px",
                        gap: "8px",
                        borderRadius: "12px",
                        opacity: 1,
                      }}
                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-sm text-white font-medium text-[12px] flex items-center justify-center transition-all duration-150 shrink-0 select-none border border-transparent"
                    >
                      View Pre-Visit Form
                    </button>
                  ) : (
                    <button
                      onClick={() => onConsult(patient)}
                      style={{
                        width: "145px",
                        height: "32px",
                        paddingTop: "6px",
                        paddingBottom: "6px",
                        paddingLeft: "13px",
                        paddingRight: "13px",
                        gap: "8px",
                        borderRadius: "12px",
                        opacity: 1,
                      }}
                      className="bg-white hover:bg-gray-50 border border-[#EBEEF5] text-[#24292E] font-medium text-[12px] flex items-center justify-center transition-all duration-150 shadow-sm hover:shadow shrink-0 select-none"
                    >
                      Consult Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
}
