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

interface SubField {
  label: string;
  placeholder: string;
  rows?: number;
}

interface TabDef {
  key: TabKey;
  title: string;
  /** Single free-text tabs (legacy/simple) provide placeholder+rows directly. */
  placeholder?: string;
  rows?: number;
  /** Structured tabs are composed of multiple labeled sub-fields, serialized
   *  into the same single EmrSections string so the backend/save format and
   *  every read-only display elsewhere stay unchanged. */
  subFields?: SubField[];
}

const TABS: TabDef[] = [
  {
    key: "reasonForVisit",
    title: "Intake plan",
    placeholder: "Why is the patient consulting today? (e.g. Persistent headache for 3 days…)",
    rows: 4,
  },
  { key: "visitInformation", title: "Visit Information" },
  {
    key: "historyOfPresentIllness",
    title: "History of Present Illness",
    subFields: [
      { label: "Onset & Duration", placeholder: "When did it start, how has it progressed…" },
      { label: "Character & Severity", placeholder: "Quality, intensity, location, radiation…" },
      { label: "Aggravating / Relieving Factors", placeholder: "What makes it better or worse…" },
      { label: "Associated Symptoms", placeholder: "Any other symptoms accompanying the main complaint…" },
    ],
  },
  {
    key: "reviewSystem",
    title: "Review System",
    subFields: [
      { label: "Constitutional", placeholder: "Fever, weight change, fatigue, appetite…" },
      { label: "Cardiovascular / Respiratory", placeholder: "Chest pain, palpitations, shortness of breath, cough…" },
      { label: "Gastrointestinal", placeholder: "Nausea, vomiting, abdominal pain, bowel changes…" },
      { label: "Neurological / Musculoskeletal", placeholder: "Headache, dizziness, weakness, joint/muscle pain…" },
      { label: "Other Systems", placeholder: "Skin, ENT, genitourinary, psychiatric, etc…" },
    ],
  },
  {
    key: "healthStatus",
    title: "Health Status",
    subFields: [
      { label: "Current Conditions Status", placeholder: "Are existing chronic conditions controlled, stable, worsening…" },
      { label: "Recent Changes", placeholder: "Any recent changes in health, medications, lifestyle…" },
      { label: "Immunization Status", placeholder: "Vaccination history relevant to this visit…" },
    ],
  },
  {
    key: "histories",
    title: "Histories",
    subFields: [
      { label: "Past Medical History", placeholder: "Prior diagnoses, hospitalizations, chronic illnesses…" },
      { label: "Past Surgical History", placeholder: "Prior surgeries and dates…" },
      { label: "Family History", placeholder: "Relevant conditions in immediate family…" },
      { label: "Social History", placeholder: "Smoking, alcohol, occupation, living situation…" },
    ],
  },
  {
    key: "physicalExamination",
    title: "Physical Examination",
    subFields: [
      { label: "Vital Signs", placeholder: "BP, HR, Temp, RR, SpO2, weight, height…", rows: 2 },
      { label: "General Appearance", placeholder: "Alert, oriented, distress level…", rows: 2 },
      { label: "Cardiovascular", placeholder: "Heart sounds, rhythm, murmurs…", rows: 2 },
      { label: "Respiratory", placeholder: "Breath sounds, effort, auscultation findings…", rows: 2 },
      { label: "Abdominal", placeholder: "Tenderness, bowel sounds, masses…", rows: 2 },
      { label: "Neurological", placeholder: "Reflexes, motor/sensory findings, mental status…", rows: 2 },
    ],
  },
  {
    key: "medicalDecisionMaking",
    title: "Medical Decision Making",
    subFields: [
      { label: "Differential Diagnoses Considered", placeholder: "Conditions ruled in/out and why…" },
      { label: "Data Reviewed", placeholder: "Labs, imaging, prior records reviewed…" },
      { label: "Risk Level & Complexity", placeholder: "Risk of complications, comorbidities, complexity of management…" },
    ],
  },
  {
    key: "procedure",
    title: "Procedure",
    subFields: [
      { label: "Procedure Performed", placeholder: "Name of in-visit procedure, if any…" },
      { label: "Technique & Findings", placeholder: "How it was performed and what was found…" },
      { label: "Complications", placeholder: "Any complications encountered, or \"None\"…" },
    ],
  },
  {
    key: "impressionAndPlan",
    title: "Impression and Plan",
    subFields: [
      { label: "Clinical Impression / Diagnosis", placeholder: "Working diagnosis or impression…" },
      { label: "Treatment Plan", placeholder: "Medications, therapies, lifestyle advice…" },
      { label: "Referrals", placeholder: "Specialist referrals, if any…" },
      { label: "Follow-up", placeholder: "When and why the patient should follow up…" },
    ],
  },
  {
    key: "professionalServices",
    title: "Professional Services",
    subFields: [
      { label: "Services Rendered", placeholder: "Consultation level, procedures, screenings performed…" },
      { label: "Time Spent", placeholder: "Approximate consultation duration, if billed by time…", rows: 2 },
    ],
  },
];

// ── Serialize / parse multi-field tabs into a single EmrSections string ───────
// Format: "## Label\ntext\n\n## Label2\ntext2" — kept human-readable so the
// existing read-only displays (EhrPanel, PatientProfileModal, ConsultationRoom)
// continue to show something sensible even without re-parsing it.
function serializeSubFields(values: Record<string, string>, subFields: SubField[]): string {
  return subFields
    .map((f) => ({ f, v: (values[f.label] ?? "").trim() }))
    .filter(({ v }) => v.length > 0)
    .map(({ f, v }) => `## ${f.label}\n${v}`)
    .join("\n\n");
}

function parseSubFields(text: string, subFields: SubField[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const f of subFields) result[f.label] = "";
  if (!text) return result;

  const blocks = text.split(/\n(?=## )/);
  for (const block of blocks) {
    const match = block.match(/^## (.+)\n([\s\S]*)$/);
    if (match) {
      const [, label, body] = match;
      if (label.trim() in result) result[label.trim()] = body.trim();
    }
  }
  return result;
}

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
  onScheduleFollowUp?: () => void;
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

function SubFieldsTab({
  title,
  subFields,
  value,
  onChange,
  hint,
  onScheduleFollowUp,
}: {
  title: string;
  subFields: SubField[];
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  onScheduleFollowUp?: () => void;
}) {
  const values = parseSubFields(value, subFields);

  const updateField = (label: string, text: string) => {
    const next = { ...values, [label]: text };
    onChange(serializeSubFields(next, subFields));
  };

  return (
    <div className="flex flex-col gap-4">
      <span className="text-slate-800 text-[14px] font-bold">{title}</span>
      {hint && (
        <p className="text-[10px] text-[#5476FC] font-semibold flex items-center gap-1 -mt-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          {hint}
        </p>
      )}
      {subFields.map((f) => (
        <div key={f.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-700">{f.label}</span>
            {f.label === "Follow-up" && (
              <button
                type="button"
                onClick={onScheduleFollowUp}
                className="h-7 px-3 rounded-lg border border-[#5476FC] text-[#5476FC] bg-[#5476FC]/5 hover:bg-[#5476FC]/10 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Schedule Follow-up
              </button>
            )}
          </div>
          <textarea
            value={values[f.label] ?? ""}
            onChange={(e) => updateField(f.label, e.target.value)}
            placeholder={f.placeholder}
            rows={f.rows ?? 3}
            className="w-full p-3 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#9EA5AD] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all resize-none leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
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
  onScheduleFollowUp,
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
          ) : activeTabDef?.subFields ? (
            <SubFieldsTab
              title={activeTabDef.title}
              subFields={activeTabDef.subFields}
              value={sections[activeTab as keyof EmrSections] ?? ""}
              onChange={(v) => updateSection(activeTab as keyof EmrSections, v)}
              hint={activeTab === "historyOfPresentIllness" && sections.historyOfPresentIllness.trim() ? "Pre-filled from past visit — edit as needed" : undefined}
              onScheduleFollowUp={onScheduleFollowUp}
            />
          ) : activeTabDef ? (
            <div className="flex flex-col gap-3">
              <span className="text-slate-800 text-[14px] font-bold">{activeTabDef.title}</span>
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
