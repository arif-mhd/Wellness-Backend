"use client";

import React, { useState } from "react";
import { Patient } from "@/app/appointments/types";

interface PatientProfileModalProps {
  patient: Patient;
  onClose: () => void;
}

type ProfileTab = "Consultations" | "Medications" | "Labs" | "Radiology" | "Diagnostics" | "Vaccinations" | "Allergies" | "Surgeries";

const MOCK_CONSULTATIONS = [
  {
    id: "c1",
    title: "Consultation_01022020",
    ref: "DHA-2025-00123456",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "1 Feb, 2020, 11:40 PM",
  },
  {
    id: "c2",
    title: "Consultation_15052020",
    ref: "DHA-2025-00123457",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "15 May, 2020, 09:20 AM",
  },
  {
    id: "c3",
    title: "Consultation_22092020",
    ref: "DHA-2025-00123458",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "22 Sep, 2020, 03:30 PM",
  },
  {
    id: "c4",
    title: "Consultation_10122020",
    ref: "DHA-2025-00123459",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "10 Dec, 2020, 11:00 AM",
  },
  {
    id: "c5",
    title: "Consultation_03032021",
    ref: "DHA-2025-00123460",
    doctor: "Dr. Selima Khan",
    doctorAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/2355e046a3fdc8727311560c0e1cb05484370c15?width=42",
    date: "3 Mar, 2021, 02:15 PM",
  },
];

const EMR_DETAIL = {
  reasonForVisit: "Fever",
  reasonDescription: "I've had a fever for three days with chills, body aches, and fatigue.",
  emrSummary: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
  subjective: "Patient reports persistent headaches and fatigue over the past two weeks. States the headaches are moderate in intensity and occur daily. Patient also mentions feeling more fatigued than usual, especially in the afternoons. Denies any recent changes in medication or significant stressors.",
  objective: `Vital Signs:\n-Blood Pressure: 150/90 mmHg\n-Heart Rate: 80 bpm\n-Temperature: 98.6°F (37°C)\n\nPhysical Exam\n-General: Alert and in no acute distress.\n-Neurological: No focal deficits; cranial nerves II–XII intact.\n-Cardiovascular: Regular rate and rhythm, no murmurs.\n-Respiratory: Clear to auscultation bilaterally.\n-Abdominal: Soft, non-tender, no masses.`,
  assessment: `Hypertension (uncontrolled): Likely contributing to headaches.\nFatigue: Could be related to hypertension and sleep quality; further evaluation needed.`,
  plan: `Increase Amlodipine to 10mg daily to better control blood pressure.\nSchedule a follow-up appointment in 4 weeks to monitor blood pressure and assess headache frequency.\nOrder blood tests: Complete Blood Count (CBC) and Basic Metabolic Panel (BMP) to evaluate for underlying causes of fatigue. Recommend lifestyle modifications: Reduce caffeine intake, increase hydration, and maintain a regular sleep schedule.`,
  medicines: [
    { name: "Paracetamol 500 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
    { name: "Ibuprofen 200 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
  ],
  labTests: [
    { name: "CBC", notes: "Take before food in the morning" },
    { name: "BMP", notes: "Take before food in the morning" },
  ],
};

const TABS: ProfileTab[] = ["Consultations", "Medications", "Labs", "Radiology", "Diagnostics", "Vaccinations", "Allergies", "Surgeries"];

const DiamondIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
    <path d="M12 18.2885L5.71149 12L12 5.71155L18.2885 12L12 18.2885Z" fill={color} />
  </svg>
);

const GradientPillIcon = () => (
  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9.63124 8.00471L10.0156 7.62034C10.2781 7.35784 10.4094 7.01096 10.4094 6.66409C10.4094 6.31721 10.2781 5.97034 10.0156 5.70784C9.49061 5.18284 8.63749 5.18284 8.11249 5.70784L7.01561 6.80471L5.92811 7.90159C5.40311 8.42659 5.40311 9.27971 5.92811 9.80471C6.44374 10.3203 7.25936 10.3297 7.78436 9.84221" stroke="#FAFAFA" strokeWidth="0.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.46875 6.05476C8.80625 5.71726 9.34063 5.71726 9.67813 6.05476" stroke="#FAFAFA" strokeWidth="0.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.29062 8.12656L7.01562 6.80469" stroke="#FAFAFA" strokeWidth="0.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.06875 10.686C9.84022 10.686 10.4656 10.0606 10.4656 9.28909C10.4656 8.51761 9.84022 7.89221 9.06875 7.89221C8.29728 7.89221 7.67188 8.51761 7.67188 9.28909C7.67188 10.0606 8.29728 10.686 9.06875 10.686Z" stroke="#FAFAFA" strokeWidth="0.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.08435 10.2828L10.0625 8.30469" stroke="#FAFAFA" strokeWidth="0.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

export default function PatientProfileModal({ patient, onClose }: PatientProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("Consultations");
  const [selectedConsultation, setSelectedConsultation] = useState(MOCK_CONSULTATIONS[0]);

  return (
    <div className="w-full min-h-full flex flex-col font-outfit bg-[#F7F9FC] overflow-auto animate-fade-in">

      {/* Page header area */}
      <div className="flex items-center gap-3 px-8 pt-8 pb-4">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Patient Details
        </h1>
      </div>

      <div className="flex flex-col gap-6 px-8 pb-10 flex-1">

        {/* Patient header card */}
        <div className="w-full bg-white rounded-[12px] p-8 flex flex-col gap-5">
          {/* Top: avatar + name + stats */}
          <div className="flex items-center gap-6">
            <img
              src={patient.avatar}
              alt={patient.name}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72"; }}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
                {patient.name}, {patient.age} y/o
              </span>
              <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                {patient.email}
              </span>
            </div>
          </div>

          {/* Patient stats row */}
          <div className="flex items-start gap-5 flex-wrap">
            {[
              { label: "Gender", value: "Male" },
              { label: "Date of Birth", value: "22 Oct, 1972" },
              { label: "Blood Group", value: "O Positive" },
              { label: "Height (cm)", value: "172" },
              { label: "Weight (kg)", value: "85" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-2 flex-1 min-w-[100px]">
                <span className="text-[#676E76] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">{stat.label}</span>
                <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-4 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 rounded-full text-[14px] font-normal leading-[1.3] tracking-[-0.28px] transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#222530] hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Consultations tab content */}
        {activeTab === "Consultations" && (
          <div className="flex gap-8 items-start">

            {/* Left: Consultation list */}
            <div className="w-[360px] flex-shrink-0 bg-white rounded-[12px] p-8 flex flex-col gap-5">
              {/* List header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#707070] text-[12px] font-medium tracking-[-0.24px]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="#707070"/>
                  </svg>
                  <span>Recent</span>
                </div>
                <button
                  className="flex items-center justify-center px-[13px] py-[6px] rounded-[12px] text-white font-medium text-[13px] leading-5"
                  style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
                >
                  New Note
                </button>
              </div>

              {/* Consultation rows */}
              <div className="flex flex-col gap-2">
                {MOCK_CONSULTATIONS.map((c) => {
                  const isSelected = selectedConsultation.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConsultation(c)}
                      className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-[12px] text-left transition-all duration-200 ${
                        isSelected ? "bg-[#EDF0FF]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px] truncate">
                          {c.title}
                        </span>
                        <span className="text-[#777F86] text-[14px] font-normal leading-[1.5] tracking-[-0.28px] truncate">
                          {c.ref}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <img src={c.doctorAvatar} alt={c.doctor} className="w-[21px] h-[21px] rounded-full object-cover flex-shrink-0" />
                          <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px] truncate">
                            {c.doctor}
                          </span>
                        </div>
                        <span className="text-[#9EA5AD] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] mt-0.5">
                          {c.date}
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 rotate-[-90deg]">
                        <path d="M5.25 10.5L8.75 7L5.25 3.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Consultation Details */}
            <div className="flex-1 min-w-0 bg-[#EBEEF5] border border-white rounded-[12px] flex flex-col overflow-hidden">

              {/* Detail header */}
              <div className="flex items-center justify-between px-8 py-6 bg-white rounded-t-[12px]">
                <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                  Consultation Details
                </span>
                <button
                  className="flex items-center justify-center px-[13px] py-[6px] rounded-[12px] text-white font-medium text-[13px] leading-5"
                  style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
                >
                  Add Addendum
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex flex-col gap-4 p-4 overflow-y-auto">

                {/* Reason for visit */}
                <div className="flex flex-col gap-2">
                  <div className="px-2 text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                    Reason for visit
                  </div>
                  <div className="bg-white rounded-[12px] px-4 py-6 flex items-center gap-2">
                    <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[12px] font-light leading-[1] tracking-[-0.24px] flex-shrink-0">
                      {EMR_DETAIL.reasonForVisit}
                    </span>
                    <span className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] line-clamp-2">
                      {EMR_DETAIL.reasonDescription}
                    </span>
                  </div>
                </div>

                {/* EMR */}
                <div className="flex flex-col gap-2">
                  <div className="px-2 text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                    EMR
                  </div>
                  <div className="bg-white rounded-[12px] px-4 py-6 flex flex-col gap-4">
                    {/* Summary */}
                    <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] line-clamp-2">
                      {EMR_DETAIL.emrSummary}
                    </p>
                    <div className="w-full h-px bg-[#EBEEF5]" />

                    {/* SOAP notes */}
                    {[
                      { label: "Subjective", color: "#8AA0FF", text: EMR_DETAIL.subjective },
                      { label: "Objective", color: "#3CB3DA", text: EMR_DETAIL.objective },
                      { label: "Assessment", color: "#8AA0FF", text: EMR_DETAIL.assessment },
                      { label: "Plan", color: "#3CB3DA", text: EMR_DETAIL.plan },
                    ].map((section, i) => (
                      <React.Fragment key={section.label}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <DiamondIcon color={section.color} />
                            <span className="flex-1 text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                              {section.label}
                            </span>
                          </div>
                          <p className="text-[#676E76] text-[12px] leading-[16px] whitespace-pre-line">
                            {section.text}
                          </p>
                        </div>
                        {i < 3 && <div className="w-full h-px bg-[#EBEEF5]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Medicines */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">Medicines</span>
                    <button className="flex items-center gap-2 px-[13px] py-[6px] bg-[#E0E7FF] rounded-[12px] text-[#182A6F] text-[13px] font-medium leading-5">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 11.8414L5.79806 8.63944L6.58856 7.82606L8.4375 9.675V3.375H9.5625V9.675L11.4114 7.82606L12.2019 8.63944L9 11.8414ZM4.73081 14.625C4.35194 14.625 4.03125 14.4938 3.76875 14.2313C3.50625 13.9688 3.375 13.6481 3.375 13.2692V11.2356H4.5V13.2692C4.5 13.3269 4.52406 13.3798 4.57219 13.4278C4.62019 13.4759 4.67306 13.5 4.73081 13.5H13.2692C13.3269 13.5 13.3798 13.4759 13.4278 13.4278C13.4759 13.3798 13.5 13.3269 13.5 13.2692V11.2356H14.625V13.2692C14.625 13.6481 14.4938 13.9688 14.2313 14.2313C13.9688 14.4938 13.6481 14.625 13.2692 14.625H4.73081Z" fill="#182A6E"/>
                      </svg>
                      Download Prescription
                    </button>
                  </div>
                  <div className="bg-white rounded-[12px] px-4 py-6 flex flex-col gap-4">
                    {EMR_DETAIL.medicines.map((med, i) => (
                      <React.Fragment key={med.name}>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <GradientPillIcon />
                            <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                              {med.name}
                            </span>
                          </div>
                          <p className="text-[12px] leading-[16px]">
                            <span className="text-[#5476FC]">{med.dose.split(" ")[0]}</span>
                            <span className="text-[#676E76]"> {med.dose.split(" ").slice(1).join(" ")}</span>
                            <span className="text-[#5476FC]"> ({med.duration})</span>
                          </p>
                          <p className="text-[#676E76] text-[12px] leading-[16px]">Notes: {med.notes}</p>
                        </div>
                        {i < EMR_DETAIL.medicines.length - 1 && <div className="w-full h-px bg-[#EBEEF5]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Lab Tests */}
                <div className="flex flex-col gap-2">
                  <div className="px-2 text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                    Lab Tests
                  </div>
                  <div className="bg-white rounded-[12px] px-4 py-6 flex flex-col gap-4">
                    {EMR_DETAIL.labTests.map((lab, i) => (
                      <React.Fragment key={lab.name}>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}>
                                <span className="text-white text-[10px] font-bold">{lab.name[0]}</span>
                              </div>
                              <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                                {lab.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <button className="flex items-center gap-1 text-[#182A6F] text-[12px] font-medium leading-5">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12.0028 7.06066L5.54784 13.5156L4.48718 12.4549L10.9421 6H5.2528V4.5H13.5028V12.75H12.0028V7.06066Z" fill="#182A6E"/></svg>
                                View
                              </button>
                              <button className="flex items-center gap-1 text-[#182A6F] text-[12px] font-medium leading-5">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 11.8414L5.79806 8.63944L6.58856 7.82606L8.4375 9.675V3.375H9.5625V9.675L11.4114 7.82606L12.2019 8.63944L9 11.8414ZM4.73081 14.625C4.35194 14.625 4.03125 14.4938 3.76875 14.2313C3.50625 13.9688 3.375 13.6481 3.375 13.2692V11.2356H4.5V13.2692C4.5 13.3269 4.52406 13.3798 4.57219 13.4278C4.62019 13.4759 4.67306 13.5 4.73081 13.5H13.2692C13.3269 13.5 13.3798 13.4759 13.4278 13.4278C13.4759 13.3798 13.5 13.3269 13.5 13.2692V11.2356H14.625V13.2692C14.625 13.6481 14.4938 13.9688 14.2313 14.2313C13.9688 14.4938 13.6481 14.625 13.2692 14.625H4.73081Z" fill="#182A6E"/></svg>
                                Download Report
                              </button>
                            </div>
                          </div>
                          <p className="text-[#676E76] text-[12px] leading-[16px]">Notes: {lab.notes}</p>
                        </div>
                        {i < EMR_DETAIL.labTests.length - 1 && <div className="w-full h-px bg-[#EBEEF5]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== "Consultations" && (
          <div className="flex items-center justify-center h-48 bg-white rounded-[12px] text-[#9EA5AD] text-[14px]">
            {activeTab} data will appear here.
          </div>
        )}

      </div>
    </div>
  );
}
