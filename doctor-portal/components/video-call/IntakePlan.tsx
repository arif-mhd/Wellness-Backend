"use client";

// ── ConsultationNotes (replaces the old IntakePlan / EMR intake form) ──────────
// Sections mirror the patient-details Consultation view so that what the doctor
// fills during a call is exactly what appears on the patient record later.
//
// Sections:
//   • Reason for Visit          – why the patient booked the appointment
//   • History of Present Illness – pre-fillable from past appointments' HPI or
//                                  entered fresh by the doctor
//   • Subjective                 – patient-reported symptoms / history (SOAP-S)
//   • Objective                  – examination findings / vitals (SOAP-O)
//   • Assessment                 – diagnosis / differential (SOAP-A)
//   • Plan                       – treatment plan / follow-up (SOAP-P)

import { useState } from "react";

export interface EmrSections {
  reasonForVisit: string;
  historyOfPresentIllness: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export const EMPTY_EMR_SECTIONS: EmrSections = {
  reasonForVisit: "",
  historyOfPresentIllness: "",
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

// ── Section definitions ────────────────────────────────────────────────────────

interface SectionDef {
  key: keyof EmrSections;
  title: string;
  color: string;          // diamond / accent colour
  placeholder: string;
  rows: number;
}

const SECTIONS: SectionDef[] = [
  {
    key: "reasonForVisit",
    title: "Reason for Visit",
    color: "#5476FC",
    placeholder: "Why is the patient consulting today? (e.g. Persistent headache for 3 days…)",
    rows: 2,
  },
  {
    key: "historyOfPresentIllness",
    title: "History of Present Illness",
    color: "#8AA0FF",
    placeholder: "Describe onset, duration, character, aggravating / relieving factors…",
    rows: 4,
  },
  {
    key: "subjective",
    title: "Subjective",
    color: "#8AA0FF",
    placeholder: "Patient-reported symptoms, complaints, and history…",
    rows: 3,
  },
  {
    key: "objective",
    title: "Objective",
    color: "#3CB3DA",
    placeholder: "Vital signs, physical examination findings, test results…",
    rows: 4,
  },
  {
    key: "assessment",
    title: "Assessment",
    color: "#8AA0FF",
    placeholder: "Diagnosis or differential diagnoses…",
    rows: 3,
  },
  {
    key: "plan",
    title: "Plan",
    color: "#3CB3DA",
    placeholder: "Treatment plan, prescriptions, referrals, follow-up…",
    rows: 3,
  },
];

// ── Small icons ────────────────────────────────────────────────────────────────

function DiamondIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
      <path d="M12 18.2885L5.71149 12L12 5.71155L18.2885 12L12 18.2885Z" fill={color} />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ConsultationNotesProps {
  sections: EmrSections;
  onChange: (sections: EmrSections) => void;
  /** Key of the currently expanded section (or null) */
  openSection: string | null;
  onToggleSection: (key: string) => void;
  /** Optional patient profile to show at the top of the panel */
  patientProfile?: {
    fullName?: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    height?: string;
    weight?: string;
    chronicDiseases?: string[];
    allergies?: any[];
  } | null;
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  return new Date().getFullYear() - birth.getFullYear();
}

function fmtAllergies(allergies?: any[]): string {
  if (!allergies || allergies.length === 0) return "None";
  return allergies
    .map((a) =>
      typeof a === "string"
        ? a
        : `${a.category ?? ""}: ${Array.isArray(a.selected) ? a.selected.join(", ") : a.selected ?? ""}`.trim()
    )
    .join("; ");
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntakePlan({
  sections,
  onChange,
  openSection,
  onToggleSection,
  patientProfile,
}: ConsultationNotesProps) {
  const updateSection = (key: keyof EmrSections, value: string) => {
    onChange({ ...sections, [key]: value });
  };

  const age = calcAge(patientProfile?.dateOfBirth);

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="w-full bg-white rounded-xl border border-[#EBEEF5] px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-slate-800 text-[13px] font-bold">
        Consultation Notes
      </div>

      {/* ── Patient snapshot strip ─────────────────────────────────────────── */}
      {patientProfile && (
        <div className="w-full bg-gradient-to-r from-[#EEF2FF] to-[#F5F8FF] rounded-xl border border-[#DDEAFE] px-5 py-3.5 flex flex-col gap-2.5">
          {/* Name + age */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#5476FC] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {(patientProfile.fullName ?? "P").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292e] text-[13px] font-bold truncate">
                {patientProfile.fullName ?? "Patient"}
                {age !== null && (
                  <span className="text-[#5476FC] font-semibold ml-1.5">· {age} y/o</span>
                )}
              </span>
              {patientProfile.gender && (
                <span className="text-[#676E76] text-[10px] font-medium capitalize">
                  {patientProfile.gender}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Blood Group", value: patientProfile.bloodGroup || "—" },
              { label: "Height", value: patientProfile.height ? `${patientProfile.height} cm` : "—" },
              { label: "Weight", value: patientProfile.weight ? `${patientProfile.weight} kg` : "—" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="text-[9px] text-[#676E76] uppercase font-bold tracking-wide">{s.label}</span>
                <span className="text-[11px] text-[#24292e] font-semibold">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Chronic conditions + allergies */}
          {(patientProfile.chronicDiseases?.length || patientProfile.allergies?.length) ? (
            <div className="flex flex-col gap-1 pt-1 border-t border-[#DDEAFE]">
              {patientProfile.chronicDiseases && patientProfile.chronicDiseases.length > 0 && (
                <div className="flex gap-1.5 items-start">
                  <span className="text-[9px] text-[#676E76] uppercase font-bold tracking-wide flex-shrink-0 mt-0.5">
                    Conditions:
                  </span>
                  <span className="text-[10px] text-[#24292e] font-medium leading-relaxed">
                    {patientProfile.chronicDiseases.join(", ")}
                  </span>
                </div>
              )}
              {patientProfile.allergies && patientProfile.allergies.length > 0 && (
                <div className="flex gap-1.5 items-start">
                  <span className="text-[9px] text-[#676E76] uppercase font-bold tracking-wide flex-shrink-0 mt-0.5">
                    Allergies:
                  </span>
                  <span className="text-[10px] text-[#E84949] font-semibold leading-relaxed">
                    {fmtAllergies(patientProfile.allergies)}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── SOAP + HPI accordion sections ──────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 w-full">
        {SECTIONS.map((sec) => {
          const isOpen = openSection === sec.key;
          const value = sections[sec.key];
          const hasContent = value.trim().length > 0;

          return (
            <div
              key={sec.key}
              className={`bg-white rounded-xl border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 ${
                isOpen
                  ? "border-[#5476FC] ring-1 ring-[#5476FC]/10"
                  : "border-[#EBEEF5]"
              }`}
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() => onToggleSection(sec.key)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-white hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <DiamondIcon color={isOpen ? sec.color : "#CBD5E1"} />
                  <span className="font-bold text-slate-800 text-[13px]">{sec.title}</span>
                  {hasContent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5476FC] flex-shrink-0" />
                  )}
                </div>
                <ChevronIcon open={isOpen} />
              </button>

              {/* Textarea body */}
              {isOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-[#EBEEF5] bg-white">
                  {/* HPI: show a hint if it was pre-filled */}
                  {sec.key === "historyOfPresentIllness" && hasContent && (
                    <p className="text-[10px] text-[#5476FC] font-semibold mb-2 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                      Pre-filled from past visit — edit as needed
                    </p>
                  )}
                  <textarea
                    value={value}
                    onChange={(e) => updateSection(sec.key, e.target.value)}
                    placeholder={sec.placeholder}
                    rows={sec.rows}
                    className="w-full p-3 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#9EA5AD] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
