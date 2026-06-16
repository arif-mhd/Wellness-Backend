"use client";

export interface VisitInfoData {
  visitType: string;
  accompaniedBy: string[];
  sourceOfHistory: string[];
  referralSource: string[];
  historyLimitation: string[];
}

export interface EmrSections {
  visitInformation: VisitInfoData;
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
  visitInformation: {
    visitType: "",
    accompaniedBy: [],
    sourceOfHistory: [],
    referralSource: [],
    historyLimitation: [],
  },
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

const TEXT_SECTIONS: { key: keyof EmrSections; title: string }[] = [
  { key: "historyOfPresentIllness", title: "History of Present Illness" },
  { key: "reviewSystem", title: "Review System" },
  { key: "healthStatus", title: "Health Status" },
  { key: "histories", title: "Histories" },
  { key: "physicalExamination", title: "Physical Examination" },
  { key: "medicalDecisionMaking", title: "Medical Decision Making" },
  { key: "procedure", title: "Procedure" },
  { key: "impressionAndPlan", title: "Impression and Plan" },
  { key: "professionalServices", title: "Professional Services" },
];

const VISIT_TYPES = ["Annual exam", "General concerns", "New symptom", "Increase in symptom", "Scheduled follow-up"];
const ACCOMPANIED_OPTIONS = ["No one", "Family Member", "Mother", "Father", "Spouse", "Significant other", "Medical personnel"];
const SOURCE_OPTIONS = ACCOMPANIED_OPTIONS;
const REFERRAL_OPTIONS = ["Self", "Provider", "ED", "Health plan", "Family member", "Friend"];
const LIMITATION_OPTIONS = ["None", "Clinical condition", "Hearing Impaired", "Language barrier", "Family/Guardian not available"];

interface IntakePlanProps {
  sections: EmrSections;
  onChange: (sections: EmrSections) => void;
  openSection: string | null;
  onToggleSection: (key: string) => void;
}

function MultiSelectChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`h-7 px-4 rounded-full text-xs font-semibold transition-all border-none ${
              active ? "bg-[#5476FC] text-white shadow-sm" : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function IntakePlan({ sections, onChange, openSection, onToggleSection }: IntakePlanProps) {
  const visit = sections.visitInformation;

  const updateVisit = (patch: Partial<VisitInfoData>) => {
    onChange({ ...sections, visitInformation: { ...visit, ...patch } });
  };

  const toggleMulti = (field: keyof VisitInfoData, opt: string) => {
    const current = visit[field] as string[];
    const next = current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt];
    updateVisit({ [field]: next } as Partial<VisitInfoData>);
  };

  const updateText = (key: keyof EmrSections, value: string) => {
    onChange({ ...sections, [key]: value });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="w-full bg-white rounded-xl border border-[#EBEEF5] px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-slate-800 text-[13px] font-bold">
        Intake plan
      </div>

      {/* Visit Information */}
      <div
        className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-300 border ${
          openSection === "visitInformation" ? "border-[#5476FC] ring-1 ring-[#5476FC]/10" : "border-[#EBEEF5]"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggleSection("visitInformation")}
          className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 text-[13px] bg-white border-b border-[#EBEEF5] hover:bg-[#F8FAFC] transition-colors"
        >
          <span>Visit Information</span>
        </button>

        {openSection === "visitInformation" && (
          <div className="p-5 flex flex-col gap-5 bg-white">
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Visit type</span>
              <div className="flex flex-wrap gap-2">
                {VISIT_TYPES.map((type) => {
                  const active = visit.visitType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateVisit({ visitType: type })}
                      className={`h-7 px-4 rounded-full text-xs font-semibold tracking-wide transition-all border-none ${
                        active ? "bg-[#5476FC] text-white shadow-sm" : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={!VISIT_TYPES.includes(visit.visitType) ? visit.visitType : ""}
                onChange={(e) => updateVisit({ visitType: e.target.value })}
                placeholder="Other visit type…"
                className="flex-1 h-9 px-4 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Accompanied by</span>
              <MultiSelectChips options={ACCOMPANIED_OPTIONS} selected={visit.accompaniedBy} onToggle={(o) => toggleMulti("accompaniedBy", o)} />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Source of history</span>
              <MultiSelectChips options={SOURCE_OPTIONS} selected={visit.sourceOfHistory} onToggle={(o) => toggleMulti("sourceOfHistory", o)} />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Referral source</span>
              <MultiSelectChips options={REFERRAL_OPTIONS} selected={visit.referralSource} onToggle={(o) => toggleMulti("referralSource", o)} />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">History Limitation</span>
              <MultiSelectChips options={LIMITATION_OPTIONS} selected={visit.historyLimitation} onToggle={(o) => toggleMulti("historyLimitation", o)} />
            </div>
          </div>
        )}
      </div>

      {/* Remaining free-text sections */}
      <div className="flex flex-col gap-2.5 w-full">
        {TEXT_SECTIONS.map(({ key, title }) => {
          const isOpen = openSection === key;
          const value = sections[key] as string;
          return (
            <div key={key} className="bg-white rounded-xl border border-[#EBEEF5] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300">
              <button
                type="button"
                onClick={() => onToggleSection(key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-800 text-[13px] bg-white hover:bg-[#F8FAFC] transition-colors"
              >
                <span>{title}</span>
                {value.trim() && <span className="w-1.5 h-1.5 rounded-full bg-[#5476FC]" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 text-[#676E76] text-xs leading-relaxed border-t border-[#EBEEF5] bg-white">
                  <textarea
                    value={value}
                    onChange={(e) => updateText(key, e.target.value)}
                    placeholder={`Enter clinical notes for ${title.toLowerCase()}...`}
                    rows={3}
                    className="w-full p-3 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all resize-none"
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
