"use client";

import { useState } from "react";

interface AccordionItem {
  id: string;
  title: string;
}

export default function IntakePlan() {
  // Visit type selection states
  const [selectedVisitType, setSelectedVisitType] = useState("General concerns");
  const visitTypes = [
    "Annual exam",
    "General concerns",
    "New symptom",
    "Increase in symptom",
    "Scheduled follow-up",
    "Increase in symptom",
  ];

  // Accompanied by selection
  const [selectedAccompanied, setSelectedAccompanied] = useState<string[]>(["No one"]);
  const accompaniedOptions = [
    "No one",
    "Family Member",
    "Mother",
    "Father",
    "Spouse",
    "Significant other",
    "Medical personnel",
  ];

  // Source of history selection
  const [selectedSource, setSelectedSource] = useState<string[]>(["Family Member"]);
  const sourceOptions = [
    "No one",
    "Family Member",
    "Mother",
    "Father",
    "Spouse",
    "Significant other",
    "Medical personnel",
  ];

  // Referral source selection
  const [selectedReferral, setSelectedReferral] = useState<string[]>(["ED"]);
  const referralOptions = ["Self", "Provider", "ED", "Health plan", "Family member", "Friend"];

  // History Limitation selection
  const [selectedLimitation, setSelectedLimitation] = useState<string[]>(["None"]);
  const limitationOptions = [
    "None",
    "Clinical condition",
    "Hearing Impaired",
    "Language barrier",
    "Family/Guardian not available",
  ];

  // Collapsible Accordions state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    visit_info: true, // open by default
  });

  const sections: AccordionItem[] = [
    { id: "hpi", title: "History of Present Illness" },
    { id: "ros", title: "Review System" },
    { id: "health_status", title: "Health Status" },
    { id: "histories", title: "Histories" },
    { id: "pe", title: "Physical Examination" },
    { id: "mdm", title: "Medical Decision Making" },
    { id: "procedure", title: "Procedure" },
    { id: "impression", title: "Impression and Plan" },
    { id: "services", title: "Professional Services" },
  ];

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleMultiSelect = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Static Intake Plan Header Box */}
      <div className="w-full bg-white rounded-xl border border-[#EBEEF5] px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-slate-800 text-[13px] font-bold">
        Intake plan
      </div>

      {/* ── Visit Information Accordion (with blue border if open) ───────────────── */}
      <div
        className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-300 border ${
          openSections["visit_info"] ? "border-[#5476FC] ring-1 ring-[#5476FC]/10" : "border-[#EBEEF5]"
        }`}
      >
        <button
          onClick={() => toggleSection("visit_info")}
          className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 text-[13px] bg-white border-b border-[#EBEEF5] hover:bg-[#F8FAFC] transition-colors"
        >
          <span>Visit Information</span>
        </button>

        {openSections["visit_info"] && (
          <div className="p-5 flex flex-col gap-5 bg-white">
            {/* Visit Type */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Visit type</span>
              <div className="flex flex-wrap gap-2">
                {visitTypes.map((type, idx) => {
                  const active = selectedVisitType === type;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedVisitType(type)}
                      className={`h-7 px-4 rounded-full text-xs font-semibold tracking-wide transition-all border-none ${
                        active
                          ? "bg-[#5476FC] text-white shadow-sm"
                          : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add New Input */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Add New</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Increase in symptom"
                  className="flex-1 h-9 px-4 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
                />
                <button
                  onClick={() => alert("Search cancelled")}
                  className="h-9 px-4 rounded-lg bg-[#E8F1FF] text-[#5476FC] text-xs font-bold hover:bg-[#D4E4FF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => alert("Value saved")}
                  className="h-9 px-5 rounded-lg bg-[#5476FC] text-white text-xs font-bold shadow-[0_2px_8px_rgba(84,118,252,0.2)] hover:bg-[#3B5BFC] transition-all"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Accompanied By */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Accompanied by</span>
              <div className="flex flex-wrap gap-2">
                {accompaniedOptions.map((opt) => {
                  const active = selectedAccompanied.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleToggleMultiSelect(opt, selectedAccompanied, setSelectedAccompanied)}
                      className={`h-7 px-4 rounded-full text-xs font-semibold transition-all border-none ${
                        active
                          ? "bg-[#5476FC] text-white shadow-sm"
                          : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source of History */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Source of history</span>
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map((opt) => {
                  const active = selectedSource.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleToggleMultiSelect(opt, selectedSource, setSelectedSource)}
                      className={`h-7 px-4 rounded-full text-xs font-semibold transition-all border-none ${
                        active
                          ? "bg-[#5476FC] text-white shadow-sm"
                          : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Referral Source */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">Referral source</span>
              <div className="flex flex-wrap gap-2">
                {referralOptions.map((opt) => {
                  const active = selectedReferral.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleToggleMultiSelect(opt, selectedReferral, setSelectedReferral)}
                      className={`h-7 px-4 rounded-full text-xs font-semibold transition-all border-none ${
                        active
                          ? "bg-[#5476FC] text-white shadow-sm"
                          : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* History Limitation */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[#676E76] text-[11px] font-bold uppercase tracking-wider">History Limitation</span>
              <div className="flex flex-wrap gap-2">
                {limitationOptions.map((opt) => {
                  const active = selectedLimitation.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleToggleMultiSelect(opt, selectedLimitation, setSelectedLimitation)}
                      className={`h-7 px-4 rounded-full text-xs font-semibold transition-all border-none ${
                        active
                          ? "bg-[#5476FC] text-white shadow-sm"
                          : "bg-[#E8F1FF] text-[#5476FC] hover:bg-[#D4E4FF]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Remaining Minimalist White Accordion Bars (No Chevrons) ──────────────── */}
      <div className="flex flex-col gap-2.5 w-full">
        {sections.map((sec) => {
          const isOpen = openSections[sec.id] || false;
          return (
            <div
              key={sec.id}
              className="bg-white rounded-xl border border-[#EBEEF5] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300"
            >
              <button
                onClick={() => toggleSection(sec.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-slate-800 text-[13px] bg-white hover:bg-[#F8FAFC] transition-colors"
              >
                <span>{sec.title}</span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 text-[#676E76] text-xs leading-relaxed border-t border-[#EBEEF5] bg-white">
                  <textarea
                    placeholder={`Enter clinical notes for ${sec.title.toLowerCase()}...`}
                    rows={3}
                    className="w-full p-3 rounded-lg bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all resize-none"
                  />
                  <div className="flex justify-end gap-2.5 mt-3">
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[#383F45] text-[11px] font-semibold"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => alert(`Saved notes for ${sec.title}`)}
                      className="px-3.5 py-1.5 rounded-md bg-[#5476FC] hover:bg-[#3B5BFC] text-white text-[11px] font-semibold"
                    >
                      Apply Notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
