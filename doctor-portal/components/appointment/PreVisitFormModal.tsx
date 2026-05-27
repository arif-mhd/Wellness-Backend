"use client";

import React, { useState } from "react";
import { Patient } from "@/app/appointments/types";

interface PreVisitFormModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function PreVisitFormModal({ patient, onClose }: PreVisitFormModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const form = patient.preVisitForm;

  const fields = [
    { label: "Do you have any chronic illnesses?", value: form?.chronicIllnesses ?? "Not provided" },
    { label: "Current Medications", value: form?.currentMedications ?? "None" },
    { label: "Allergies", value: form?.allergies ?? "None known" },
    { label: "Primary Concern", value: form?.primaryConcern ?? patient.description },
    { label: "Do you smoke?", value: form?.smokes ?? "No" },
    { label: "Do you drink?", value: form?.drinks ?? "No" },
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-end bg-black/50 font-outfit"
      onClick={onClose}
    >
      {/* Modal panel — matches Figma: 371px wide, right-aligned, 32px from top */}
      <div
        className="relative w-[371px] max-h-[calc(100vh-64px)] overflow-y-auto mt-14 mr-8 bg-white rounded-[12px] border border-white shadow-2xl flex flex-col gap-6 p-8 animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col gap-2 w-full">
          {/* Title row */}
          <div className="flex items-center justify-between w-full">
            <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
              Pre-visit Form
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 10.1627L3.40265 15.7603C3.24983 15.9129 3.05776 15.9911 2.82642 15.9948C2.59526 15.9983 2.39969 15.9201 2.23971 15.7603C2.0799 15.6003 2 15.4065 2 15.1788C2 14.9512 2.0799 14.7573 2.23971 14.5974L7.83733 9L2.23971 3.40265C2.08707 3.24983 2.00892 3.05776 2.00524 2.82642C2.00175 2.59526 2.0799 2.39969 2.23971 2.23971C2.39969 2.0799 2.59352 2 2.82118 2C3.04884 2 3.24266 2.0799 3.40265 2.23971L9 7.83733L14.5974 2.23971C14.7502 2.08707 14.9422 2.00892 15.1736 2.00524C15.4047 2.00175 15.6003 2.0799 15.7603 2.23971C15.9201 2.39969 16 2.59352 16 2.82118C16 3.04884 15.9201 3.24266 15.7603 3.40265L10.1627 9L15.7603 14.5974C15.9129 14.7502 15.9911 14.9422 15.9948 15.1736C15.9983 15.4047 15.9201 15.6003 15.7603 15.7603C15.6003 15.9201 15.4065 16 15.1788 16C14.9512 16 14.7573 15.9201 14.5974 15.7603L9 10.1627Z"
                  fill="#596066"
                />
              </svg>
            </button>
          </div>

          {/* Patient info row */}
          <div className="flex items-center gap-6 py-4">
            <img
              src={patient.avatar}
              alt={patient.name}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
                {patient.name}
              </span>
              <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                {patient.age} Year Old
              </span>
            </div>
          </div>
        </div>

        {/* Form Q&A fields */}
        <div className="flex flex-col gap-0 w-full">
          {fields.map((field, i) => (
            <React.Fragment key={field.label}>
              <div className="flex flex-col gap-1 py-0">
                <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                  {field.label}
                </span>
                <p className="text-[#676E76] text-[12px] font-medium leading-[16px] whitespace-pre-line">
                  {field.value}
                </p>
              </div>
              {i < fields.length - 1 && (
                <div className="w-full h-px bg-[#EBEEF5] my-3" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Confirmation checkbox */}
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setConfirmed(!confirmed)}
            className={`w-[18px] h-[18px] rounded-[4px] border flex-shrink-0 flex items-center justify-center transition-all duration-150 ${
              confirmed
                ? "bg-[#5476FC] border-[#5476FC]"
                : "bg-[#E8F1FF] border-[#8AA0FF]"
            }`}
            aria-label="Confirm reading"
          >
            {confirmed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[#9EA5AD] text-[14px] font-normal leading-[18px] tracking-[0.2px]">
            I confirm that I have read and reviewed the pre-visit form.
          </span>
        </div>

        <div className="w-full h-px bg-[#EBEEF5]" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 flex items-center justify-center rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-medium text-[14px] leading-5 transition-colors duration-150"
        >
          Close
        </button>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
