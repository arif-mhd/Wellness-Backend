"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Patient } from "@/app/appointments/types";

interface AppointmentDetailsCardProps {
  patient: Patient | null;
  onClose: () => void;
  onConsult: (patient: Patient) => void;
  onViewProfile?: (patient: Patient) => void;
  onViewPreVisitForm?: (patient: Patient) => void;
  onSendReminder?: (patient: Patient) => void;
  activeTab?: "All" | "Upcoming" | "Past";
}

export default function AppointmentDetailsCard({
  patient,
  onClose,
  onConsult,
  onViewProfile,
  onViewPreVisitForm,
  onSendReminder,
  activeTab,
}: AppointmentDetailsCardProps) {
  const router = useRouter();
  if (!patient) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "372px",
          gap: "20px",
          opacity: 1,
        }}
        className="flex flex-col items-center justify-center p-8 bg-[#F5F6FA] border border-[#EBEEF5] rounded-[12px] text-center font-outfit min-h-[646px]"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9EA5AD"
          strokeWidth="1.5"
          className="mb-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="text-[#24292E] font-medium text-base mb-1">No Appointment Selected</h3>
        <p className="text-[#676E76] text-xs">
          Select any patient from the tables on the left to view their complete appointment details.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "372px",
        gap: "20px",
        opacity: 1,
      }}
      className="flex flex-col items-start p-6 border border-[#EBEEF5] bg-[#F5F6FA] rounded-[12px] font-outfit shadow-sm transition-all duration-300 justify-between min-h-[646px]"
    >
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h3 className="text-[#24292E] font-medium text-[20px] tracking-[-0.4px]">
          Appointment Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200/50 rounded-full transition-all duration-200 text-[#596066] flex items-center justify-center"
          title="Close details"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9 10.1627L3.40265 15.7603C3.24983 15.9129 3.05776 15.9911 2.82642 15.9948C2.59526 15.9983 2.39969 15.9201 2.23971 15.7603C2.0799 15.6003 2 15.4065 2 15.1788C2 14.9512 2.0799 14.7573 2.23971 14.5974L7.83733 9L2.23971 3.40265C2.08707 3.24983 2.00892 3.05776 2.00524 2.82642C2.00175 2.59526 2.0799 2.39969 2.23971 2.23971C2.39969 2.0799 2.59352 2 2.82118 2C3.04884 2 3.24266 2.0799 3.40265 2.23971L9 7.83733L14.5974 2.23971C14.7502 2.08707 14.9422 2.00892 15.1736 2.00524C15.4047 2.00175 15.6003 2.0799 15.7603 2.23971C15.9201 2.39969 16 2.59352 16 2.82118C16 3.04884 15.9201 3.24266 15.7603 3.40265L10.1627 9L15.7603 14.5974C15.9129 14.7502 15.9911 14.9422 15.9948 15.1736C15.9983 15.4047 15.9201 15.6003 15.7603 15.7603C15.6003 15.9201 15.4065 16 15.1788 16C14.9512 16 14.7573 15.9201 14.5974 15.7603L9 10.1627Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* Patient Basic Info Card */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-4 bg-white p-4 rounded-[12px] shadow-sm">
          <img
            src={patient.avatar}
            alt={patient.name}
            className="w-11 h-11 rounded-full object-cover border border-[#EBEEF5]"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
            }}
          />
          <div className="flex flex-col items-start">
            <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
              {patient.name}
            </span>
            <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px] mt-0.5">
              {patient.age} Year Old
            </span>
            {patient.accountOwnerName && (
              <span className="text-[#5476FC] text-[11px] leading-[1.4] mt-0.5">
                For: {patient.profileRelationship ?? "Family Member"} of {patient.accountOwnerName}
              </span>
            )}
          </div>
        </div>

        {/* Patient Bio */}
        <div className="text-[#676E76] text-[12px] leading-[1.4] select-text bg-white/40 p-3 rounded-[8px] border border-[#EBEEF5]/40 line-clamp-4 hover:line-clamp-none transition-all duration-300">
          {patient.bio}
        </div>

        {/* View Profile Button */}
        <button
          onClick={() => onViewProfile && onViewProfile(patient)}
          className="flex w-full justify-center items-center py-2.5 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-semibold text-[13px] transition-all duration-200"
        >
          View Profile
        </button>
      </div>

      {/* Separator */}
      <div className="w-full h-[1px] bg-[#EBEEF5]"></div>

      {/* Visit Details Section */}
      <div className="flex flex-col gap-4 w-full">
        {/* Reason for Visit */}
        <div className="flex flex-col gap-1 p-4 rounded-[12px] bg-white shadow-sm border border-[#EBEEF5]/30">
          <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
            Reason for visit
          </span>
          <p className="text-[#676E76] text-[12px] leading-[1.4]">
            {patient.description}
          </p>
        </div>

        {/* Pre-visit Form or medicines advised (completed/past appointments) */}
        {patient.status === "Completed" || activeTab === "Past" ? (
          <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-white shadow-sm border border-[#EBEEF5]/30">
            <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
              Medicines Advised
            </span>
            {patient.medicines && patient.medicines.length > 0 ? (
              <ul className="text-[#676E76] text-[12px] leading-[1.5] select-text list-disc pl-4">
                {patient.medicines.map((med, i) => (
                  <li key={i}>{med.name}{med.dosage ? ` — ${med.dosage}` : ""}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[#9EA5AD] text-[12px] leading-[1.4]">
                No medicines were prescribed for this consultation.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-white shadow-sm border border-[#EBEEF5]/30">
            <div className="text-[12px] leading-[1.5] tracking-[-0.24px]">
              <span className="text-[#24292E] font-medium">Pre-visit Form </span>
              <span className="text-[#24292E] font-light">(Last Edited: </span>
              <span className="text-[#5476FC] font-light">
                {patient.preVisitFormDate ?? "17 Oct, 2020, 11:40 PM"}
              </span>
              <span className="text-[#24292E] font-light">)</span>
            </div>
            <p className="text-[#676E76] text-[12px] leading-[1.4]">
              Review the patient's pre-visit form to understand their medical history and reason for the appointment.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full mt-2">
        {patient.status === "Completed" || activeTab === "Past" ? (
          <>
            {/* Send Reminder */}
            <button
              onClick={() => onSendReminder?.(patient)}
              className="flex w-full justify-center items-center py-3 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-md hover:from-[#758FFF] hover:to-[#4065FB] text-white font-semibold text-[14px] transition-all duration-200"
            >
              Send Reminder
            </button>

            {/* View Summary */}
            <button
              onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&mode=summary&appointmentId=${patient.id}`)}
              className="flex w-full justify-center items-center py-3 rounded-[12px] bg-white border border-[#EBEEF5] hover:bg-[#F5F6FA] text-[#24292E] font-semibold text-[14px] transition-all duration-200 shadow-sm"
            >
              View Summary
            </button>
          </>
        ) : (
          <>
            {/* Chat Button */}
            <button
              onClick={() => router.push(`/dashboard/messages${patient.patientUserId ? `?patientId=${patient.patientUserId}` : ""}`)}
              className="flex w-full justify-center items-center gap-2 py-3 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-semibold text-[14px] transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15.75 8.62502C15.7526 9.61492 15.5213 10.5914 15.075 11.475C14.5458 12.5338 13.7323 13.4244 12.7256 14.047C11.7189 14.6696 10.5587 14.9996 9.375 15C8.3851 15.0026 7.40859 14.7713 6.525 14.325L2.25 15.75L3.675 11.475C3.2287 10.5914 2.99742 9.61492 3 8.62502C3.00046 7.44134 3.33046 6.28116 3.95304 5.27443C4.57562 4.26771 5.46619 3.4542 6.525 2.92502C7.40859 2.47872 8.3851 2.24744 9.375 2.25002H9.75C11.3133 2.33627 12.7898 2.99609 13.8969 4.10317C15.0039 5.21024 15.6638 6.68676 15.75 8.25002V8.62502Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Chat with Patient</span>
            </button>

            {/* View Pre-visit Form Button */}
            <button
              onClick={() => (onViewPreVisitForm ?? onConsult)(patient)}
              className="flex w-full justify-center items-center py-3 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-md hover:from-[#758FFF] hover:to-[#4065FB] text-white font-semibold text-[13px] transition-all duration-200"
            >
              View Pre-Visit Form
            </button>
          </>
        )}
      </div>
    </div>
  );
}
