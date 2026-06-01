"use client";

import React, { useState } from "react";
import { Patient } from "@/app/patients/mockData";

interface PatientDetailsCardProps {
  patient: Patient | undefined;
  onClose?: () => void;
  onViewProfile?: (patient: Patient) => void;
}

export default function PatientDetailsCard({
  patient,
  onClose,
  onViewProfile,
}: PatientDetailsCardProps) {
  const [reminderMessage, setReminderMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);

  if (!patient) {
    return (
      <div className="w-full bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col items-center justify-center text-center min-h-[500px] font-outfit select-none">
        <svg className="w-12 h-12 text-[#9EA5AD] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-[#676E76] font-medium text-[16px]">Select a patient to view their profile details</p>
      </div>
    );
  }

  const handleSendReminder = () => {
    if (!reminderMessage.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      setReminderMessage("");
      setTimeout(() => setSendSuccess(false), 3000);
    }, 1000);
  };

  // Determine which consultation is active in state or default to first
  const activeConsultId = selectedConsultationId || (patient.pastConsultations[0]?.id || null);

  return (
    <div className="w-full bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col gap-6 font-outfit shadow-sm relative">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-2">
        <h3 className="text-[#24292E] font-medium text-[20px] leading-[1.5] tracking-[-0.4px]">
          Patient Details
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white hover:bg-gray-100 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 10.1627L3.40265 15.7603C3.24983 15.9129 3.05776 15.9911 2.82642 15.9948C2.59526 15.9983 2.39969 15.9201 2.23971 15.7603C2.0799 15.6003 2 15.4065 2 15.1788C2 14.9512 2.0799 14.7573 2.23971 14.5974L7.83733 9L2.23971 3.40265C2.08707 3.24983 2.00892 3.05776 2.00524 2.82642C2.00175 2.59526 2.0799 2.39969 2.23971 2.23971C2.39969 2.0799 2.59352 2 2.82118 2C3.04884 2 3.24266 2.0799 3.40265 2.23971L9 7.83733L14.5974 2.23971C14.7502 2.08707 14.9422 2.00892 15.1736 2.00524C15.4047 2.00175 15.6003 2.0799 15.7603 2.23971C15.9201 2.39969 16 2.59352 16 2.82118C16 3.04884 15.9201 3.24266 15.7603 3.40265L10.1627 9L15.7603 14.5974C15.9129 14.7502 15.9911 14.9422 15.9948 15.1736C15.9983 15.4047 15.9201 15.6003 15.7603 15.7603C15.6003 15.9201 15.4065 16 15.1788 16C14.9512 16 14.7573 15.9201 14.5974 15.7603L9 10.1627Z" fill="#596066"/>
            </svg>
          </button>
        )}
      </div>

      {/* Patient Short Profile */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <img
            src={patient.avatar}
            alt={patient.name}
            className="w-11 h-11 rounded-full object-cover shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://api.builder.io/api/v1/image/assets/TEMP/75256e943440be4cb0a85199610fc72cb903d28c?width=72";
            }}
          />
          <div className="flex flex-col">
            <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
              {patient.name}
            </span>
            <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
              {patient.age} Year Old
            </span>
          </div>
        </div>

        {/* Bio Text */}
        <p className="text-[#676E76] text-[12px] leading-[1.33] tracking-normal max-h-[72px] overflow-y-auto">
          {patient.bio}
        </p>

        {/* View Profile Button */}
        <button
          onClick={() => onViewProfile?.(patient)}
          className="w-full flex items-center justify-center py-2.5 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DAFF] text-[#182A6F] font-medium text-[13px] leading-5 transition-colors duration-150 select-none shadow-sm"
        >
          View Profile
        </button>
      </div>

      <div className="h-[1px] bg-[#EBEEF5]" />

      {/* Past Consultations List */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[#24292E] font-medium text-[14px] leading-tight select-none mb-1">
          Recent Consultations
        </h4>
        <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
          {patient.pastConsultations.map((consult) => {
            const isActive = consult.id === activeConsultId;
            return (
              <div
                key={consult.id}
                onClick={() => setSelectedConsultationId(consult.id)}
                className={`flex justify-between items-center px-4 py-3 rounded-[12px] cursor-pointer transition-all duration-150 ${
                  isActive 
                    ? "bg-[#EDF0FF] border border-[#8AA0FF]/20" 
                    : "bg-white/60 hover:bg-white border border-transparent shadow-sm"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[#24292E] text-[14px] leading-[1.5] tracking-[-0.28px] truncate font-normal">
                    {consult.id}
                  </span>
                  <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px]">
                    {consult.date}
                  </span>
                </div>
                <span className="bg-[#E2EAFE] text-[#213159] font-light text-[12px] leading-none px-2.5 py-[5px] rounded-full select-none">
                  {consult.diagnosis}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-[1px] bg-[#EBEEF5]" />

      {/* Follow-Up Reminder */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 select-none">
          <span className="text-[#24292E] text-[12px] leading-[1.5] tracking-[-0.24px] font-normal">
            Follow-Up Reminder
          </span>
          <span className="text-[#676E76] text-[12px] leading-[1.33]">
            Send a personalized reminder to the patient about their next consultation.
          </span>
        </div>

        {/* Text Area */}
        <textarea
          value={reminderMessage}
          onChange={(e) => setReminderMessage(e.target.value)}
          placeholder="Type a message.."
          className="w-full h-[132px] p-4 bg-white border border-[#EBEEF5] focus:border-[#8AA0FF] focus:ring-1 focus:ring-[#8AA0FF] rounded-[12px] text-[14px] leading-normal text-[#24292E] placeholder-[#9EA5AD] resize-none outline-none transition-all shadow-inner"
        />

        {/* Send Button */}
        <button
          onClick={handleSendReminder}
          disabled={isSending || !reminderMessage.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-medium text-[14px] leading-5 transition-all select-none shadow-sm ${
            !reminderMessage.trim()
              ? "bg-[#E0E7FF]/50 text-[#182A6F]/40 cursor-not-allowed"
              : "bg-[#E0E7FF] hover:bg-[#D0DAFF] text-[#182A6F]"
          }`}
        >
          {isSending ? (
            <span className="inline-block w-4 h-4 border-2 border-[#182A6F] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.75 8.62502C15.7526 9.61492 15.5213 10.5914 15.075 11.475C14.5458 12.5338 13.7323 13.4244 12.7256 14.047C11.7189 14.6696 10.5587 14.9996 9.375 15C8.3851 15.0026 7.40859 14.7713 6.525 14.325L2.25 15.75L3.675 11.475C3.2287 10.5914 2.99742 9.61492 3 8.62502C3.00046 7.44134 3.33046 6.28116 3.95304 5.27443C4.57562 4.26771 5.46619 3.4542 6.525 2.92502C7.40859 2.47872 8.3851 2.24744 9.375 2.25002H9.75C11.3133 2.33627 12.7898 2.99609 13.8969 4.10317C15.0039 5.21024 15.6638 6.68676 15.75 8.25002V8.62502Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span>Send Follow-Up Reminder</span>
        </button>

        {/* Success toast inside card */}
        {sendSuccess && (
          <div className="absolute top-4 left-4 right-4 bg-green-50 border border-green-200 text-green-800 text-[13px] px-4 py-3 rounded-lg flex items-center gap-2 animate-pulse select-none shadow-sm">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Reminder sent successfully to {patient.name}!</span>
          </div>
        )}
      </div>

    </div>
  );
}
