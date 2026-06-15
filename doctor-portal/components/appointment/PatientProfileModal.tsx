"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Patient } from "@/app/appointments/types";

interface PatientProfileModalProps {
  patient: Patient;
  onClose: () => void;
  mode?: string | null;
  initialTab?: ProfileTab;
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

const MOCK_LAB_REPORTS = [
  {
    name: "Complete Blood Count (CBC) Report",
    status: "Pending",
    description: "A common blood test that evaluates several components of blood, providing important information about a person's overall health and helping to diagnose various conditions."
  },
  {
    name: "Basic Metabolic Panel (BMP)",
    status: "Available",
    description: "A blood test that measures various substances in the blood to assess a person's metabolic state and overall health."
  }
];

interface LabReportRow {
  item: string;
  values: { [date: string]: string };
  isAbnormal?: boolean;
}

const CHEMISTRY_DATA: LabReportRow[] = [
  { item: "Sodium Lvl", values: { "13/05/2024": "140 mmol/L", "14/05/2024": "140 mmol/L", "15/05/2024": "140 mmol/L", "16/05/2024": "140 mmol/L" } },
  { item: "Potassium Lvl", values: { "13/05/2024": "3.4 mmol/L", "14/05/2024": "3.4 mmol/L", "15/05/2024": "3.4 mmol/L", "16/05/2024": "3.4 mmol/L" } },
  { item: "Chloride Lvl", values: { "13/05/2024": "102 mmol/L", "14/05/2024": "102 mmol/L", "15/05/2024": "102 mmol/L", "16/05/2024": "102 mmol/L" } },
  { item: "CO2", values: { "13/05/2024": "28 mmol/L", "14/05/2024": "28 mmol/L", "15/05/2024": "28 mmol/L", "16/05/2024": "28 mmol/L" } },
  { item: "Creatinine Lvl", values: { "13/05/2024": "41 micromol/l", "14/05/2024": "41 micromol/l", "15/05/2024": "41 micromol/l", "16/05/2024": "41 micromol/l" }, isAbnormal: true },
  { item: "Urea Lvl", values: { "13/05/2024": "6.30 mmol/L", "14/05/2024": "6.30 mmol/L", "15/05/2024": "6.30 mmol/L", "16/05/2024": "6.30 mmol/L" } },
  { item: "Magnesium Lvl", values: { "13/05/2024": "", "14/05/2024": "", "15/05/2024": "", "16/05/2024": "" } },
  { item: "Procalcitonin", values: { "13/05/2024": "0.11 ng/ ml", "14/05/2024": "0.11 ng/ ml", "15/05/2024": "0.11 ng/ ml", "16/05/2024": "0.11 ng/ ml" } },
];

const CBC_DATA: LabReportRow[] = [
  { item: "WBC", values: { "13/05/2024": "7.6x10/L", "14/05/2024": "", "15/05/2024": "7.6x10/L", "16/05/2024": "" } },
  { item: "RBC", values: { "13/05/2024": "*3.46x10", "14/05/2024": "", "15/05/2024": "*3.46x10", "16/05/2024": "" } },
  { item: "Hgb", values: { "13/05/2024": "106 g/L", "14/05/2024": "", "15/05/2024": "106 g/L", "16/05/2024": "" } },
  { item: "Hct", values: { "13/05/2024": "0.33 L/L", "14/05/2024": "", "15/05/2024": "0.33 L/L", "16/05/2024": "" } },
  { item: "MCH", values: { "13/05/2024": "94.2 fl", "14/05/2024": "", "15/05/2024": "94.2 fl", "16/05/2024": "" } },
  { item: "MCHC", values: { "13/05/2024": "30.6 pg", "14/05/2024": "", "15/05/2024": "30.6 pg", "16/05/2024": "" } },
  { item: "Platelet", values: { "13/05/2024": "157.9/L", "14/05/2024": "", "15/05/2024": "157.9/L", "16/05/2024": "" } },
  { item: "RDW-CV", values: { "13/05/2024": "17.5%", "14/05/2024": "", "15/05/2024": "17.5%", "16/05/2024": "" }, isAbnormal: true },
];

const LAB_DATES = ["13/05/2024", "14/05/2024", "15/05/2024", "16/05/2024"];

const CheckboxIcon = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button onClick={onChange} className="focus:outline-none flex items-center justify-center p-1 hover:bg-gray-100 rounded transition-colors" type="button">
    {checked ? (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" fill="#5476FC" stroke="#5476FC" strokeWidth="1.5" />
        <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="#1D2433" strokeOpacity="0.8" strokeWidth="1.5" />
      </svg>
    )}
  </button>
);

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

export default function PatientProfileModal({ patient, onClose, mode, initialTab }: PatientProfileModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    initialTab || (mode === "lab-reports" ? "Labs" : "Consultations")
  );
  const [selectedConsultation, setSelectedConsultation] = useState(MOCK_CONSULTATIONS[0]);
  const [prescribedMedicines, setPrescribedMedicines] = useState([
    { name: "Paracetamol 500 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
    { name: "Ibuprofen 200 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
    { name: "Diclofenac 50 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
    { name: "Tramadol 50 mg", dose: "1x After Breakfast", duration: "3 days", notes: "Take with food every morning" },
  ]);
  const [labsViewMode, setLabsViewMode] = useState<"cards" | "table">(
    mode === "lab-reports" ? "table" : "cards"
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleAddMedicine = () => {
    const name = prompt("Enter medicine name (e.g. Aspirin 100 mg):");
    if (!name) return;
    const dose = prompt("Enter dose (e.g. 1x After Breakfast):", "1x After Breakfast");
    const duration = prompt("Enter duration (e.g. 5 days):", "5 days");
    const notes = prompt("Enter notes (e.g. Take with water):", "Take with water");

    setPrescribedMedicines([
      ...prescribedMedicines,
      {
        name,
        dose: dose || "1x After Breakfast",
        duration: duration || "3 days",
        notes: notes || "Take with food every morning"
      }
    ]);
  };

  const handleDeleteMedicine = (name: string) => {
    setPrescribedMedicines(prescribedMedicines.filter((m) => m.name !== name));
  };

  return (
    <div className="w-full min-h-full flex flex-col font-outfit bg-[#F7F9FC] overflow-auto animate-fade-in">

      {/* Page header area */}
      {mode === "lab-reports" ? (
        <div className="flex items-center gap-2 px-8 pt-8 pb-4">
          <button
            onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&mode=summary&tab=Labs`)}
            className="flex items-center gap-2 text-[#5476FC] hover:text-[#4065FB] transition-colors focus:outline-none"
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#5476FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-outfit text-[16px] font-medium leading-6">Consultation Summary</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-8 pt-8 pb-4">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
            aria-label="Go back"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
            {mode === "summary" ? "Consultation Summary" : "Patient Details"}
          </h1>
        </div>
      )}

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
              { label: "Gender", value: patient.gender || "N/A" },
              { label: "Date of Birth", value: patient.dob ? (isNaN(new Date(patient.dob).getTime()) ? patient.dob : new Date(patient.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })) : "N/A" },
              { label: "Blood Group", value: patient.bloodGroup || "N/A" },
              { label: "Height (cm)", value: patient.height || "N/A" },
              { label: "Weight (kg)", value: patient.weight || "N/A" },
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
              onClick={() => {
                if (mode === "lab-reports" && tab !== "Labs") {
                  router.push(`/appointments/patient-details?id=${patient.id}&mode=summary&tab=${tab}`);
                } else {
                  setActiveTab(tab);
                }
              }}
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
              <div className="flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto min-h-0 flex-1">

                {/* Sub-column 1: Summary, Medicines, Labs */}
                <div className="flex-1 flex flex-col gap-6 bg-white rounded-[12px] p-6 border border-white">
                  {/* Reason for visit */}
                  <div className="flex flex-col gap-2">
                    <div className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                      Reason for visit
                    </div>
                    <div className="bg-[#F5F6FA] rounded-[12px] px-4 py-4 flex items-center gap-2">
                      <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[12px] font-light leading-[1] tracking-[-0.24px] flex-shrink-0">
                        {EMR_DETAIL.reasonForVisit}
                      </span>
                      <span className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] line-clamp-2">
                        {EMR_DETAIL.reasonDescription}
                      </span>
                    </div>
                  </div>

                  {/* EMR Summary */}
                  <div className="flex flex-col gap-2">
                    <div className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                      EMR
                    </div>
                    <div className="bg-[#F5F6FA] rounded-[12px] px-4 py-4">
                      <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px]">
                        {EMR_DETAIL.emrSummary}
                      </p>
                    </div>
                  </div>

                  {/* Medicines */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">Medicines</span>
                      <button className="flex items-center gap-2 px-[13px] py-[6px] bg-[#E0E7FF] rounded-[12px] text-[#182A6F] text-[13px] font-medium leading-5">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M9 11.8414L5.79806 8.63944L6.58856 7.82606L8.4375 9.675V3.375H9.5625V9.675L11.4114 7.82606L12.2019 8.63944L9 11.8414ZM4.73081 14.625C4.35194 14.625 4.03125 14.4938 3.76875 14.2313C3.50625 13.9688 3.375 13.6481 3.375 13.2692V11.2356H4.5V13.2692C4.5 13.3269 4.52406 13.3798 4.57219 13.4278C4.62019 13.4759 4.67306 13.5 4.73081 13.5H13.2692C13.3269 13.5 13.3798 13.4759 13.4278 13.4278C13.4759 13.3798 13.5 13.2692V11.2356H14.625V13.2692C14.625 13.6481 14.4938 13.9688 14.2313 14.2313C13.9688 14.4938 13.6481 14.625 13.2692 14.625H4.73081Z" fill="#182A6E"/>
                        </svg>
                        Download Prescription
                      </button>
                    </div>
                    <div className="bg-[#F5F6FA] rounded-[12px] px-4 py-4 flex flex-col gap-4">
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
                    <div className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                      Lab Tests
                    </div>
                    <div className="bg-[#F5F6FA] rounded-[12px] px-4 py-4 flex flex-col gap-4">
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
                                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 11.8414L5.79806 8.63944L6.58856 7.82606L8.4375 9.675V3.375H9.5625V9.675L11.4114 7.82606L12.2019 8.63944L9 11.8414ZM4.73081 14.625C4.35194 14.625 4.03125 14.4938 3.76875 14.2313C3.50625 13.9688 3.375 13.6481 3.375 13.2692V11.2356H4.5V13.2692C4.5 13.3269 4.52406 13.3798 4.57219 13.4278C4.62019 13.4759 4.67306 13.5 4.73081 13.5H13.2692C13.3269 13.5 13.3798 13.4759 13.4278 13.4278C13.4759 13.3798 13.5 13.2692V13.2692H14.625V13.2692C14.625 13.6481 14.4938 13.9688 14.2313 14.2313C13.9688 14.4938 13.6481 14.625 13.2692 14.625H4.73081Z" fill="#182A6E"/></svg>
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

                {/* Sub-column 2: SOAP details */}
                <div className="flex-1 flex flex-col gap-6 bg-white rounded-[12px] p-6 border border-white">
                  {[
                    { label: "Subjective", color: "#8AA0FF", text: EMR_DETAIL.subjective },
                    { label: "Objective", color: "#3CB3DA", text: EMR_DETAIL.objective },
                    { label: "Assessment", color: "#8AA0FF", text: EMR_DETAIL.assessment },
                    { label: "Plan", color: "#3CB3DA", text: EMR_DETAIL.plan },
                  ].map((section, i) => (
                    <React.Fragment key={section.label}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <DiamondIcon color={section.color} />
                          <span className="flex-1 text-[#24292E] text-[14px] font-medium leading-[1.2] tracking-[-0.28px]">
                            {section.label}
                          </span>
                        </div>
                        <p className="text-[#676E76] text-[12px] leading-[1.6] whitespace-pre-line">
                          {section.text}
                        </p>
                      </div>
                      {i < 3 && <div className="w-full h-px bg-[#EBEEF5]" />}
                    </React.Fragment>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Medications tab content */}
        {activeTab === "Medications" && (
          <div className="flex flex-col md:flex-row gap-8 items-start w-full animate-fade-in">
            {/* Left: Medicines Prescribed */}
            <div className="flex-1 bg-white rounded-[12px] p-8 flex flex-col gap-5 border border-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                  Medicines Prescribed
                </span>
                <button
                  onClick={handleAddMedicine}
                  className="flex items-center justify-center px-[13px] py-[6px] bg-[#E0E7FF] hover:bg-[#D0DBFF] rounded-[12px] text-[#182A6F] font-semibold text-[13px] transition-all"
                >
                  Add Medicine
                </button>
              </div>

              {prescribedMedicines.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm">No medicines prescribed.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {prescribedMedicines.map((med, i) => (
                    <React.Fragment key={med.name + i}>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GradientPillIcon />
                            <span className="text-[#24292E] text-[14px] font-medium leading-[1.5] tracking-[-0.28px]">
                              {med.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteMedicine(med.name)}
                            className="text-[#E84949] hover:bg-red-50 p-1.5 rounded-full transition-colors flex-shrink-0"
                            aria-label={`Delete ${med.name}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3.5V10.5C10 10.7761 9.77615 11 9.5 11H2.5C2.22386 11 2 10.7761 2 10.5V3.5H1V2.5H11V3.5H10ZM3 3.5V10H9V3.5H3ZM3.5 1H8.5V2H3.5V1ZM5.5 5H6.5V8.5H5.5V5Z" fill="currentColor"/>
                            </svg>
                          </button>
                        </div>
                        <p className="text-[12px] leading-[16px] font-normal pl-[48px]">
                          <span className="text-[#5476FC] font-semibold">{med.dose.split(" ")[0]}</span>
                          <span className="text-[#676E76]"> {med.dose.split(" ").slice(1).join(" ")}</span>
                          <span className="text-[#5476FC] font-semibold"> ({med.duration.includes("day") ? med.duration : `${med.duration} days`})</span>
                        </p>
                        <p className="text-[#676E76] text-[12px] leading-[16px] pl-[48px]">
                          Notes: {med.notes}
                        </p>
                      </div>
                      {i < prescribedMedicines.length - 1 && <div className="w-full h-px bg-[#EBEEF5] my-2" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Consultation Details */}
            <div className="flex-1 bg-white rounded-[12px] p-8 flex flex-col gap-6 border border-white shadow-sm">
              <div className="border-b border-gray-100 pb-4">
                <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                  Consultation Details
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {/* Reason for visit */}
                <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5]/40">
                  <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
                    Reason for visit
                  </span>
                  <p className="text-[#676E76] text-[12px] leading-[1.4]">
                    {patient.description || "I’ve had a fever for three days with chills, body aches, and fatigue."}
                  </p>
                </div>

                {/* Pre-visit Form */}
                <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5]/40">
                  <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
                    Pre-vist Form
                  </span>
                  <p className="text-[#676E76] text-[12px] leading-[1.4] mb-2">
                    Review the patient's pre-visit form to understand their medical history and reason for the appointment.
                  </p>
                  <button
                    onClick={() => router.push(`/appointments/previsit-form?id=${patient.id}&from=patientdetails`)}
                    className="flex items-center gap-2 text-[#182A6F] hover:text-[#2E48A0] font-semibold text-[13px] transition-colors self-start"
                  >
                    <span>Read Pre-visit form</span>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Labs tab content */}
        {activeTab === "Labs" && (
          <div className="w-full animate-fade-in">
            {labsViewMode === "cards" ? (
              <div className="flex flex-col md:flex-row gap-8 items-start w-full">
                {/* Left: Reports */}
                <div className="flex-1 bg-white rounded-[12px] p-8 flex flex-col gap-5 border border-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                      Reports
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLabsViewMode("cards")}
                        className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] p-0.5 focus:outline-none"
                        title="Grid view"
                        type="button"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="white" strokeWidth="0.8" />
                          <rect x="1" y="7" width="4" height="4" rx="0.5" stroke="white" strokeWidth="0.8" />
                          <rect x="7" y="1" width="4" height="4" rx="0.5" stroke="white" strokeWidth="0.8" />
                          <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="white" strokeWidth="0.8" />
                        </svg>
                      </button>
                      <button
                        onClick={() => router.push(`/appointments/patient-details/lab-reports?id=${patient.id}`)}
                        className="flex items-center justify-center w-5 h-5 rounded border border-[#E2E2E2] bg-[#F4F4F4] p-0.5 focus:outline-none"
                        title="Table view"
                        type="button"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.4 0H9.6C10.1 0 10.5 0.4 10.5 0.9V11.1C10.5 11.6 10.1 12 9.6 12H2.4C1.9 12 1.5 11.6 1.5 11.1V0.9C1.5 0.4 1.9 0 2.4 0Z" stroke="#948F8F" strokeWidth="0.8" />
                          <path d="M3.5 3H8.5" stroke="#948F8F" strokeWidth="0.8" />
                          <path d="M3.5 6H8.5" stroke="#948F8F" strokeWidth="0.8" />
                          <path d="M3.5 9H6.5" stroke="#948F8F" strokeWidth="0.8" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {MOCK_LAB_REPORTS.map((report, i) => (
                      <React.Fragment key={report.name}>
                        <div className="flex flex-col gap-3">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <GradientPillIcon />
                              <span className="text-[#24292E] text-[14px] font-medium leading-[1.5] tracking-[-0.28px]">
                                {report.name}
                              </span>
                            </div>
                            {report.status === "Pending" ? (
                              <span className="px-[8px] py-[6px] rounded-[12px] bg-[#FF9500] text-white text-[12px] font-normal leading-[1] whitespace-nowrap">
                                Report Pending
                              </span>
                            ) : (
                              <span className="px-[8px] py-[6px] rounded-[12px] bg-[#1DA877] text-white text-[12px] font-normal leading-[1] whitespace-nowrap">
                                Report Available
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-[#676E76] text-[12px] leading-[1.5] tracking-[-0.24px] pl-[48px]">
                            {report.description}
                          </p>

                          {/* Actions for Available reports */}
                          {report.status === "Available" && (
                            <div className="flex items-center gap-4 pl-[48px] mt-1">
                              <button
                                onClick={() => router.push(`/appointments/patient-details/lab-reports?id=${patient.id}`)}
                                className="flex items-center justify-center px-[13px] py-[6px] bg-[#E0E7FF] hover:bg-[#D0DBFF] rounded-[12px] text-[#182A6F] font-semibold text-[13px] transition-all"
                                type="button"
                              >
                                View Report
                              </button>
                              <button
                                onClick={() => alert(`Downloading ${report.name}...`)}
                                className="text-[#24292E] hover:text-[#5476FC] font-semibold text-[13px] underline transition-colors"
                                type="button"
                              >
                                Download Report
                              </button>
                            </div>
                          )}
                        </div>
                        {i < MOCK_LAB_REPORTS.length - 1 && <div className="w-full h-px bg-[#EBEEF5] my-2" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Right: Consultation Details */}
                <div className="flex-1 bg-white rounded-[12px] p-8 flex flex-col gap-6 border border-white shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                      Consultation Details
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Reason for visit */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5]/40">
                      <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
                        Reason for visit
                      </span>
                      <p className="text-[#676E76] text-[12px] leading-[1.4]">
                        {patient.description || "I’ve had a fever for three days with chills, body aches, and fatigue."}
                      </p>
                    </div>

                    {/* Pre-visit Form */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-[12px] bg-[#F5F6FA] border border-[#EBEEF5]/40">
                      <span className="text-[#24292E] font-medium text-[12px] tracking-[-0.24px]">
                        Pre-vist Form
                      </span>
                      <p className="text-[#676E76] text-[12px] leading-[1.4] mb-2">
                        Review the patient's pre-visit form to understand their medical history and reason for the appointment.
                      </p>
                      <button
                        onClick={() => router.push(`/appointments/previsit-form?id=${patient.id}&from=patientdetails`)}
                        className="flex items-center gap-2 text-[#182A6F] hover:text-[#2E48A0] font-semibold text-[13px] transition-colors self-start"
                        type="button"
                      >
                        <span>Read Pre-visit form</span>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full bg-white rounded-[12px] p-8 flex flex-col gap-5 border border-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-[#24292E] font-medium text-[14px] leading-[1.2] tracking-[-0.28px]">
                    Reports
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&mode=summary&tab=Labs`)}
                      className="flex items-center justify-center w-5 h-5 rounded border border-[#E2E2E2] bg-[#F4F4F4] p-0.5 focus:outline-none"
                      title="Grid view"
                      type="button"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="#948F8F" strokeWidth="0.8" />
                        <rect x="1" y="7" width="4" height="4" rx="0.5" stroke="#948F8F" strokeWidth="0.8" />
                        <rect x="7" y="1" width="4" height="4" rx="0.5" stroke="#948F8F" strokeWidth="0.8" />
                        <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="#948F8F" strokeWidth="0.8" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setLabsViewMode("table")}
                      className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] p-0.5 focus:outline-none"
                      title="Table view"
                      type="button"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.4 0H9.6C10.1 0 10.5 0.4 10.5 0.9V11.1C10.5 11.6 10.1 12 9.6 12H2.4C1.9 12 1.5 11.6 1.5 11.1V0.9C1.5 0.4 1.9 0 2.4 0Z" stroke="white" strokeWidth="0.8" />
                        <path d="M3.5 3H8.5" stroke="white" strokeWidth="0.8" />
                        <path d="M3.5 6H8.5" stroke="white" strokeWidth="0.8" />
                        <path d="M3.5 9H6.5" stroke="white" strokeWidth="0.8" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* General Chemistry Section */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#F5F6FA] rounded-[8px] px-4 py-2 text-[#24292E] font-medium text-[14px] tracking-[-0.28px]">
                      General Chemistry
                    </div>
                    <div className="w-full overflow-x-auto rounded-[8px] border border-[#EBEEF5] shadow-sm">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-[#F1F3F9] h-10 border-b border-[#EBEEF5]">
                            <th className="w-12 px-3 text-center align-middle">
                              <CheckboxIcon
                                checked={CHEMISTRY_DATA.every(row => selectedRows.includes(`chem-${row.item}`))}
                                onChange={() => {
                                  const allChemIds = CHEMISTRY_DATA.map(row => `chem-${row.item}`);
                                  const areAllSelected = allChemIds.every(id => selectedRows.includes(id));
                                  if (areAllSelected) {
                                    setSelectedRows(prev => prev.filter(id => !allChemIds.includes(id)));
                                  } else {
                                    setSelectedRows(prev => [...new Set([...prev, ...allChemIds])]);
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 text-[#1D2433] font-semibold text-[14px] tracking-[0.28px] capitalize align-middle">
                              Items
                            </th>
                            {LAB_DATES.map((date) => (
                              <th key={date} className="px-4 text-[#24292E] font-medium text-[14px] tracking-[-0.28px] align-middle">
                                {date}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {CHEMISTRY_DATA.map((row, index) => {
                            const rowId = `chem-${row.item}`;
                            const isChecked = selectedRows.includes(rowId);
                            return (
                              <tr
                                key={row.item}
                                className={`h-10 border-b border-[#EBEEF5]/60 transition-colors hover:bg-blue-50/10 ${
                                  index % 2 === 0 ? "bg-white" : "bg-[#F8F9FC]"
                                }`}
                              >
                                <td className="w-12 px-3 text-center align-middle">
                                  <CheckboxIcon
                                    checked={isChecked}
                                    onChange={() =>
                                      setSelectedRows(prev =>
                                        prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-4 text-[#1D2433] font-normal text-[14px] align-middle">
                                  {row.item}
                                </td>
                                {LAB_DATES.map((date) => {
                                  const val = row.values[date];
                                  return (
                                    <td
                                      key={date}
                                      className={`px-4 text-[12px] font-normal leading-[1.5] tracking-[-0.24px] align-middle ${
                                        row.isAbnormal && val ? "text-[#E84949] font-medium" : "text-[#676E76]"
                                      }`}
                                    >
                                      {val}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Complete Blood Count Section */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-[#F5F6FA] rounded-[8px] px-4 py-2 text-[#24292E] font-medium text-[14px] tracking-[-0.28px]">
                      Complete Blood Count
                    </div>
                    <div className="w-full overflow-x-auto rounded-[8px] border border-[#EBEEF5] shadow-sm">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-[#F1F3F9] h-10 border-b border-[#EBEEF5]">
                            <th className="w-12 px-3 text-center align-middle">
                              <CheckboxIcon
                                checked={CBC_DATA.every(row => selectedRows.includes(`cbc-${row.item}`))}
                                onChange={() => {
                                  const allCbcIds = CBC_DATA.map(row => `cbc-${row.item}`);
                                  const areAllSelected = allCbcIds.every(id => selectedRows.includes(id));
                                  if (areAllSelected) {
                                    setSelectedRows(prev => prev.filter(id => !allCbcIds.includes(id)));
                                  } else {
                                    setSelectedRows(prev => [...new Set([...prev, ...allCbcIds])]);
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 text-[#1D2433] font-semibold text-[14px] tracking-[0.28px] capitalize align-middle">
                              Items
                            </th>
                            {LAB_DATES.map((date) => (
                              <th key={date} className="px-4 text-[#24292E] font-medium text-[14px] tracking-[-0.28px] align-middle">
                                {date}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {CBC_DATA.map((row, index) => {
                            const rowId = `cbc-${row.item}`;
                            const isChecked = selectedRows.includes(rowId);
                            return (
                              <tr
                                key={row.item}
                                className={`h-10 border-b border-[#EBEEF5]/60 transition-colors hover:bg-blue-50/10 ${
                                  index % 2 === 0 ? "bg-white" : "bg-[#F8F9FC]"
                                }`}
                              >
                                <td className="w-12 px-3 text-center align-middle">
                                  <CheckboxIcon
                                    checked={isChecked}
                                    onChange={() =>
                                      setSelectedRows(prev =>
                                        prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-4 text-[#1D2433] font-normal text-[14px] align-middle">
                                  {row.item}
                                </td>
                                {LAB_DATES.map((date) => {
                                  const val = row.values[date];
                                  return (
                                    <td
                                      key={date}
                                      className={`px-4 text-[12px] font-normal leading-[1.5] tracking-[-0.24px] align-middle ${
                                        row.isAbnormal && val ? "text-[#E84949] font-medium" : "text-[#676E76]"
                                      }`}
                                    >
                                      {val}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== "Consultations" && activeTab !== "Medications" && activeTab !== "Labs" && (
          <div className="flex items-center justify-center h-48 bg-white rounded-[12px] text-[#9EA5AD] text-[14px]">
            {activeTab} data will appear here.
          </div>
        )}

      </div>
    </div>
  );
}
