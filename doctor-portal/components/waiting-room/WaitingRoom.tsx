"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_WAITING_PATIENTS, MOCK_PAST_CONSULTATIONS } from "./mockData";
import { WaitingPatient, PastConsultation } from "./types";
import ConsultationRoom from "./ConsultationRoom";
import { Patient } from "@/app/appointments/types";
import PatientProfileModal from "@/components/appointment/PatientProfileModal";
import PreVisitFormModal from "@/components/appointment/PreVisitFormModal";
import ConsultationModal from "@/components/appointment/ConsultationModal";

interface WaitingRoomProps {
  onClose: () => void;
}

export default function WaitingRoom({ onClose }: WaitingRoomProps) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState<WaitingPatient>(MOCK_WAITING_PATIENTS[0]);
  const [activeConsultation, setActiveConsultation] = useState<PastConsultation | null>(null);

  // Local modal states
  const [preVisitPatient, setPreVisitPatient] = useState<Patient | null>(null);
  const [consultationPatient, setConsultationPatient] = useState<Patient | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to map WaitingPatient to Patient type
  const mapToPatient = (wp: WaitingPatient): Patient => ({
    id: wp.id,
    name: wp.name,
    age: wp.age,
    email: wp.email,
    diagnosis: wp.reasonForVisit,
    description: wp.description,
    status: wp.status === "Connected" ? "Waiting" : "Waiting",
    dateTime: "Today",
    avatar: wp.avatar,
    bio: wp.description,
    preVisitForm: {
      chronicIllnesses: "None reported",
      currentMedications: "None",
      allergies: "None",
      primaryConcern: wp.reasonDescription,
      smokes: "No",
      drinks: "No"
    }
  });

  const onlinePatients = MOCK_WAITING_PATIENTS.slice(0, 3);
  const otherSlotPatients = MOCK_WAITING_PATIENTS.slice(3);

  if (activeConsultation) {
    return (
      <ConsultationRoom
        patient={selectedPatient}
        consultation={activeConsultation}
        onBack={() => setActiveConsultation(null)}
      />
    );
  }

  return (
    <div className="w-full min-h-full bg-[#F7F9FC] font-outfit select-none flex flex-col p-4 md:p-6 lg:p-8 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24292E] text-white px-4 py-3 rounded-[12px] flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/10 animate-slide-up text-sm font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]"></div>
          <span>{toastMessage}</span>
        </div>
      )}



      {/* Pre-Visit Form Modal */}
      {preVisitPatient && (
        <PreVisitFormModal
          patient={preVisitPatient}
          onClose={() => setPreVisitPatient(null)}
        />
      )}

      {/* Video Call Modal */}
      {consultationPatient && (
        <ConsultationModal
          patient={consultationPatient}
          onClose={() => {
            triggerToast(`Completed consultation with ${consultationPatient.name}`);
            setConsultationPatient(null);
          }}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Waiting Room
        </h1>
      </div>

      {/* Main Responsive Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full flex-1">

        {/* Left Column: Waiting Lists */}
        <div className="w-full lg:w-[324px] flex flex-col gap-6 shrink-0">

          {/* Section: Online Now */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] px-1">
              Online Now
            </h2>
            <div className="flex flex-col gap-3">
              {onlinePatients.map((patient) => {
                const isSelected = selectedPatient.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    className={`flex flex-col gap-4 p-4 rounded-[8px] border transition-all duration-200 ${isSelected
                        ? "bg-white border-[#5476FC] shadow-[0_4px_12px_rgba(84,118,252,0.08)]"
                        : "bg-white/50 hover:bg-white border-transparent"
                      }`}
                  >
                    {/* Top Row: Avatar & Status */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={patient.avatar}
                          alt={patient.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#24292E] font-medium text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                            {patient.name}, {patient.age} y/o
                          </span>
                          <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                            {patient.email}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22A181] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22A181]"></span>
                        </span>
                        <span className="text-[#22A181] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                          Connected
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Diagnosis Tag & Reason */}
                    <div className="flex items-center gap-2">
                      <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[12px] font-light leading-[1] tracking-[-0.24px] shrink-0">
                        {patient.reasonForVisit}
                      </span>
                      <span className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                        {patient.reasonDescription}
                      </span>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setActiveConsultation(MOCK_PAST_CONSULTATIONS[0]);
                        }}
                        className={`flex-1 py-1.5 rounded-[12px] font-medium text-[13px] leading-5 border transition-all duration-200 ${isSelected
                            ? "bg-[#2E344E] text-white border-transparent"
                            : "bg-white text-[#24292E] border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        EMR
                      </button>
                      <button
                        onClick={() => setConsultationPatient(mapToPatient(patient))}
                        className="flex-1 py-1.5 rounded-[12px] text-white font-medium text-[13px] leading-5 transition-all duration-200"
                        style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
                      >
                        Connect Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Other Slot Appointments */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] px-1">
              Other Appointments in This Slot
            </h2>
            <div className="flex flex-col gap-3">
              {otherSlotPatients.map((patient) => {
                const isSelected = selectedPatient.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    className={`flex flex-col gap-4 p-4 rounded-[8px] border transition-all duration-200 ${isSelected
                        ? "bg-white border-[#5476FC] shadow-[0_4px_12px_rgba(84,118,252,0.08)]"
                        : "bg-white/50 hover:bg-white border-transparent"
                      }`}
                  >
                    {/* Top Row: Avatar & Status */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={patient.avatar}
                          alt={patient.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[#24292E] font-medium text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                            {patient.name}, {patient.age} y/o
                          </span>
                          <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                            {patient.email}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="h-2 w-2 rounded-full bg-[#F4A308]"></span>
                        <span className="text-[#F4A308] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                          Waiting
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Diagnosis Tag & Reason */}
                    <div className="flex items-center gap-2">
                      <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[12px] font-light leading-[1] tracking-[-0.24px] shrink-0">
                        {patient.reasonForVisit}
                      </span>
                      <span className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                        {patient.reasonDescription}
                      </span>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setActiveConsultation(MOCK_PAST_CONSULTATIONS[0]);
                        }}
                        className={`flex-1 py-1.5 rounded-[12px] font-medium text-[13px] leading-5 border transition-all duration-200 ${isSelected
                            ? "bg-[#2E344E] text-white border-transparent"
                            : "bg-white text-[#24292E] border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        EMR
                      </button>
                      <button
                        onClick={() => setConsultationPatient(mapToPatient(patient))}
                        className="flex-1 py-1.5 rounded-[12px] text-white font-medium text-[13px] leading-5 transition-all duration-200"
                        style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
                      >
                        Connect Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column: Selected EMR History */}
        <div className="flex-1 min-w-0 bg-white rounded-[12px] border border-gray-100 p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
              EMR
            </span>
            <div className="flex items-center gap-1.5 text-[#707070] text-[12px] font-medium tracking-[-0.24px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="#707070" />
              </svg>
              <span>Recent</span>
            </div>
          </div>

          {/* List of Consultations */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {MOCK_PAST_CONSULTATIONS.map((c, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConsultation(c)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[12px] cursor-pointer transition-all duration-200 ${isFirst ? "bg-[#EDF0FF]" : "bg-transparent hover:bg-gray-50"
                    }`}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px]">
                      {c.title}
                    </span>
                    <span className="text-[#777F86] text-[14px] font-normal leading-[1.5] tracking-[-0.28px]">
                      {c.ref}
                    </span>

                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={c.doctorAvatar}
                        alt={c.doctor}
                        className="w-[21px] h-[21px] rounded-full object-cover shrink-0"
                      />
                      <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px] truncate">
                        {c.doctor}
                      </span>
                    </div>

                    <span className="text-[#9EA5AD] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] mt-1">
                      {c.date}
                    </span>
                  </div>

                  <div className="flex justify-end items-center shrink-0">
                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-all">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5.25 10.5L8.75 7L5.25 3.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Patient Details Card */}
        <div className="w-full lg:w-[372px] shrink-0 bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col gap-6">

          {/* Patient Details Header */}
          <div className="flex flex-col gap-1">
            <h3 className="text-[#24292E] font-medium text-[20px] leading-[1.5] tracking-[-0.4px]">
              Patient Details
            </h3>
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[12px] border border-white">
            <img
              src={selectedPatient.avatar}
              alt={selectedPatient.name}
              className="w-11 h-11 rounded-full object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] truncate">
                {selectedPatient.name}
              </span>
              <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                {selectedPatient.age} Year Old
              </span>
            </div>
          </div>

          {/* Patient Description bio snippet */}
          <p className="text-[#676E76] text-[12px] leading-[16px] tracking-[-0.24px] bg-white/40 p-4 rounded-[12px] border border-white whitespace-pre-wrap">
            {selectedPatient.description}
          </p>

          {/* View Profile Primary-Color-tint Button */}
          <button
            onClick={() => router.push("/appointments/patient-details?id=" + selectedPatient.id + "&from=waitingroom")}
            className="flex w-full justify-center items-center py-2.5 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-semibold text-[13px] transition-all duration-200"
          >
            View Profile
          </button>

          <div className="w-full h-px bg-[#EBEEF5]" />

          {/* Fields sections */}
          <div className="flex flex-col gap-3">
            {/* Reason for visit */}
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                Reason for visit
              </span>
              <p className="text-[#676E76] text-[12px] leading-[16px] line-clamp-2">
                {selectedPatient.reasonDescription}
              </p>
            </div>

            {/* EMR summary / <Some other field> */}
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                EMR Summary
              </span>
              <p className="text-[#676E76] text-[12px] leading-[16px] line-clamp-2">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s.
              </p>
            </div>

            {/* Pre-visit form review card */}
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                  Pre-visit Form
                </span>
                <p className="text-[#676E76] text-[12px] leading-[16px]">
                  Review the patient&apos;s pre-visit form to understand their medical history and reason for the appointment.
                </p>
              </div>

              <button
                onClick={() => setPreVisitPatient(mapToPatient(selectedPatient))}
                className="flex items-center gap-2 text-[#182A6F] font-semibold text-[13px] hover:text-[#5476FC] transition-colors"
              >
                <span>Read Pre-visit form</span>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
