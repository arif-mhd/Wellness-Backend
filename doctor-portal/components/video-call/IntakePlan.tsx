"use client";

// ── ConsultationNotes (replaces the old IntakePlan / EMR intake form) ──────────
// Left-nav style intake form: each clinical category is its own tab, matching
// a standard EHR encounter note structure. "Visit Information" carries the
// structured tag-picker fields (visit type, accompanied by, etc.); every other
// tab is a free-text note. Reason for Visit lives inside "Intake plan".

import { useState } from "react";

export interface EmrSections {
  reasonForVisit: string;
  historyOfPresentIllness: string;
  reviewSystem: string;
  healthStatus: string;
  histories: string;
  physicalExamination: string;
  medicalDecisionMaking: string;
  procedure: string;
  impressionAndPlan: string;
  professionalServices: string;
}

export const EMPTY_EMR_SECTIONS: EmrSections = {
  reasonForVisit: "",
  historyOfPresentIllness: "",
  reviewSystem: "",
  healthStatus: "",
  histories: "",
  physicalExamination: "",
  medicalDecisionMaking: "",
  procedure: "",
  impressionAndPlan: "",
  professionalServices: "",
};

export interface VisitInfo {
  visitType: string;
  accompaniedBy: string;
  sourceOfHistory: string;
  referralSource: string;
  historyLimitation: string;
  customVisitTypes: string[];
}

export const EMPTY_VISIT_INFO: VisitInfo = {
  visitType: "",
  accompaniedBy: "",
  sourceOfHistory: "",
  referralSource: "",
  historyLimitation: "",
  customVisitTypes: [],
};

const VISIT_TYPE_OPTIONS = ["Annual exam", "General concerns", "New symptom", "Increase in symptom", "Scheduled follow-up"];
const PERSON_OPTIONS = ["No one", "Family Member", "Mother", "Father", "Spouse", "Significant other", "Medical personnel"];
const REFERRAL_SOURCE_OPTIONS = ["Self", "Provider", "ED", "Health plan", "Family member", "Friend"];
const HISTORY_LIMITATION_OPTIONS = ["None", "Clinical condition", "Hearing impaired", "Language barrier", "Family/Guardian not available"];

// ── Small icons ────────────────────────────────────────────────────────────────

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

// ── Visit Information tab content ──────────────────────────────────────────────

function TagPicker({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#EBEEF5] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-[#F8FAFC] hover:bg-[#F1F4F9] transition-colors"
      >
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {value && <span className="text-[11px] text-[#5476FC] font-medium">{value}</span>}
          <ChevronIcon open={open} />
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 flex flex-wrap gap-2 bg-white">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                value === opt
                  ? "bg-[#5476FC] text-white"
                  : "bg-[#F5F6FA] text-[#676E76] hover:bg-[#EBEEF5]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VisitInformationTab({
  visitInfo,
  onChange,
}: {
  visitInfo: VisitInfo;
  onChange: (v: VisitInfo) => void;
}) {
  const [visitTypeOpen, setVisitTypeOpen] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newType, setNewType] = useState("");

  const allVisitTypes = [...VISIT_TYPE_OPTIONS, ...visitInfo.customVisitTypes];

  const addCustomType = () => {
    const trimmed = newType.trim();
    if (!trimmed) return;
    onChange({
      ...visitInfo,
      visitType: trimmed,
      customVisitTypes: visitInfo.customVisitTypes.includes(trimmed)
        ? visitInfo.customVisitTypes
        : [...visitInfo.customVisitTypes, trimmed],
    });
    setNewType("");
    setAddingNew(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-slate-800 text-[14px] font-bold">Visit Information</span>

      <div className="border border-[#EBEEF5] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setVisitTypeOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left bg-[#F8FAFC] hover:bg-[#F1F4F9] transition-colors"
        >
          <span className="text-[13px] font-semibold text-slate-700">Visit type</span>
          <ChevronIcon open={visitTypeOpen} />
        </button>
        {visitTypeOpen && (
          <div className="px-4 py-3 flex flex-col gap-3 bg-white">
            <div className="flex flex-wrap gap-2">
              {allVisitTypes.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange({ ...visitInfo, visitType: opt })}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                    visitInfo.visitType === opt
                      ? "bg-[#5476FC] text-white"
                      : "bg-[#F5F6FA] text-[#676E76] hover:bg-[#EBEEF5]"
                  }`}
                >
                  {opt}
                </button>
              ))}
              {!addingNew && (
                <button
                  type="button"
                  onClick={() => setAddingNew(true)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-[#5476FC] border border-[#5476FC]/40 hover:bg-[#5476FC]/5 transition-colors"
                >
                  + Add New
                </button>
              )}
            </div>
            {addingNew && (
              <div className="flex items-center gap-2">
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomType(); }}
                  placeholder="Increase in symptom"
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-[11px] text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC]"
                />
                <button type="button" onClick={() => { setAddingNew(false); setNewType(""); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#676E76] hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={addCustomType}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#5476FC] hover:bg-[#4466ec] transition-colors">
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TagPicker label="Accompanied by" options={PERSON_OPTIONS} value={visitInfo.accompaniedBy} onSelect={(v) => onChange({ ...visitInfo, accompaniedBy: v })} />
      <TagPicker label="Source of history" options={PERSON_OPTIONS} value={visitInfo.sourceOfHistory} onSelect={(v) => onChange({ ...visitInfo, sourceOfHistory: v })} />
      <TagPicker label="Referral source" options={REFERRAL_SOURCE_OPTIONS} value={visitInfo.referralSource} onSelect={(v) => onChange({ ...visitInfo, referralSource: v })} />
      <TagPicker label="History Limitation" options={HISTORY_LIMITATION_OPTIONS} value={visitInfo.historyLimitation} onSelect={(v) => onChange({ ...visitInfo, historyLimitation: v })} />
    </div>
  );
}

// ── Left-nav tab definitions ────────────────────────────────────────────────────

type TabKey = "visitInformation" | keyof EmrSections;

interface TabDef {
  key: TabKey;
  title: string;
  placeholder?: string;
  rows?: number;
}

const TABS: TabDef[] = [
  {
    key: "reasonForVisit",
    title: "Intake plan",
    placeholder: "Why is the patient consulting today? (e.g. Persistent headache for 3 days…)",
    rows: 3,
  },
  { key: "visitInformation", title: "Visit Information" },
  {
    key: "historyOfPresentIllness",
    title: "History of Present Illness",
    placeholder: "Describe onset, duration, character, aggravating / relieving factors…",
    rows: 5,
  },
  {
    key: "reviewSystem",
    title: "Review System",
    placeholder: "Systematic review of symptoms by body system (cardiovascular, respiratory, GI, neuro, etc.)…",
    rows: 5,
  },
  {
    key: "healthStatus",
    title: "Health Status",
    placeholder: "Overall health summary — current conditions under control, recent changes, vaccination status…",
    rows: 4,
  },
  {
    key: "histories",
    title: "Histories",
    placeholder: "Past medical, surgical, family, and social history relevant to this visit…",
    rows: 5,
  },
  {
    key: "physicalExamination",
    title: "Physical Examination",
    placeholder: "Vital signs and examination findings by system (general, cardiovascular, respiratory, abdominal, neuro, etc.)…",
    rows: 6,
  },
  {
    key: "medicalDecisionMaking",
    title: "Medical Decision Making",
    placeholder: "Clinical reasoning — differential diagnoses considered, risk level, data reviewed…",
    rows: 5,
  },
  {
    key: "procedure",
    title: "Procedure",
    placeholder: "Any in-visit procedures performed, technique, and findings…",
    rows: 4,
  },
  {
    key: "impressionAndPlan",
    title: "Impression and Plan",
    placeholder: "Diagnosis/impression and the treatment plan — medications, referrals, follow-up timing…",
    rows: 5,
  },
  {
    key: "professionalServices",
    title: "Professional Services",
    placeholder: "Billable services rendered during this encounter (e.g. consultation level, procedures, screenings)…",
    rows: 3,
  },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface ConsultationNotesProps {
  sections: EmrSections;
  onChange: (sections: EmrSections) => void;
  /** Key of the currently open tab */
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
  visitInfo: VisitInfo;
  onVisitInfoChange: (v: VisitInfo) => void;
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

function hasVisitInfoContent(v: VisitInfo): boolean {
  return !!(v.visitType || v.accompaniedBy || v.sourceOfHistory || v.referralSource || v.historyLimitation);
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function IntakePlan({
  sections,
  onChange,
  openSection,
  onToggleSection,
  patientProfile,
  visitInfo,
  onVisitInfoChange,
}: ConsultationNotesProps) {
  const activeTab = openSection ?? "reasonForVisit";

  const updateSection = (key: keyof EmrSections, value: string) => {
    onChange({ ...sections, [key]: value });
  };

  const age = calcAge(patientProfile?.dateOfBirth);
  const activeTabDef = TABS.find((t) => t.key === activeTab);

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ── Patient snapshot strip ─────────────────────────────────────────── */}
      {patientProfile && (
        <div className="w-full bg-gradient-to-r from-[#EEF2FF] to-[#F5F8FF] rounded-xl border border-[#DDEAFE] px-5 py-3.5 flex flex-col gap-2.5">
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

      {/* ── Left-nav + content ─────────────────────────────────────────────── */}
      <div className="flex gap-4 w-full">
        {/* Left nav */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const hasContent = tab.key === "visitInformation"
              ? hasVisitInfoContent(visitInfo)
              : !!sections[tab.key as keyof EmrSections]?.trim();
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onToggleSection(tab.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#5476FC] text-white shadow-[0_2px_8px_rgba(84,118,252,0.25)]"
                    : "bg-white border border-[#EBEEF5] text-[#383F45] hover:bg-[#F8FAFC]"
                }`}
              >
                <span>{tab.title}</span>
                {hasContent && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5476FC] flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#5476FC]/30 ring-1 ring-[#5476FC]/10 px-5 py-5">
          {activeTab === "visitInformation" ? (
            <VisitInformationTab visitInfo={visitInfo} onChange={onVisitInfoChange} />
          ) : activeTabDef ? (
            <div className="flex flex-col gap-3">
              <span className="text-slate-800 text-[14px] font-bold">{activeTabDef.title}</span>
              {activeTab === "historyOfPresentIllness" && sections.historyOfPresentIllness.trim() && (
                <p className="text-[10px] text-[#5476FC] font-semibold flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  Pre-filled from past visit — edit as needed
                </p>
              )}
              <textarea
                value={sections[activeTab as keyof EmrSections] ?? ""}
                onChange={(e) => updateSection(activeTab as keyof EmrSections, e.target.value)}
                placeholder={activeTabDef.placeholder}
                rows={activeTabDef.rows ?? 5}
                className="w-full p-3 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#9EA5AD] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
