"use client";

// ── EmrNoteEditor ──────────────────────────────────────────────────────────────
// Compact "Write note / Add to EMR here" card used by the in-call EMR tab.
// It edits exactly the same data as IntakePlan (EmrSections + VisitInfo, same
// "## Label" serialization for multi-field sections) so the save format and
// every read-only display elsewhere stay unchanged — only the layout differs:
// section chips + a formatting toolbar above a borderless note area.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmrSections,
  VisitInfo,
  PreVisitFormData,
  TABS,
  TabKey,
  SubField,
  parseSubFields,
  serializeSubFields,
  VisitInformationTab,
  PreVisitFormTab,
  hasPreVisitContent,
  hasVisitInfoContent,
} from "./IntakePlan";

interface EmrNoteEditorProps {
  sections: EmrSections;
  onChange: (sections: EmrSections) => void;
  activeSection: string | null;
  onSelectSection: (key: string) => void;
  visitInfo: VisitInfo;
  onVisitInfoChange: (v: VisitInfo) => void;
  onScheduleFollowUp?: () => void;
  preVisitData?: PreVisitFormData | null;
}

// Plain-text markers, so notes stay plain strings in the saved EMR.
const FORMATS = {
  bold: { open: "**", close: "**" },
  italic: { open: "_", close: "_" },
  underline: { open: "__", close: "__" },
  strike: { open: "~~", close: "~~" },
  code: { open: "`", close: "`" },
} as const;
type FormatKey = keyof typeof FORMATS;

function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/__([\s\S]*?)__/g, "$1")
    .replace(/~~([\s\S]*?)~~/g, "$1")
    .replace(/`([\s\S]*?)`/g, "$1")
    .replace(/(^|\W)_([\s\S]+?)_(?=\W|$)/g, "$1$2");
}

interface ActiveField {
  el: HTMLTextAreaElement;
  apply: (value: string) => void;
}

const NOTE_CLASS =
  "w-full bg-transparent text-[12px] text-[#383F45] placeholder-[#9EA5AD] outline-none resize-none leading-relaxed";

export default function EmrNoteEditor({
  sections,
  onChange,
  activeSection,
  onSelectSection,
  visitInfo,
  onVisitInfoChange,
  onScheduleFollowUp,
  preVisitData,
}: EmrNoteEditorProps) {
  const activeTab = (activeSection ?? "reasonForVisit") as TabKey;
  const activeDef = TABS.find((t) => t.key === activeTab);
  const activeField = useRef<ActiveField | null>(null);

  // Arrow-button scrolling for the section chip row.
  const chipsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollState = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    updateScrollState();
    const el = chipsRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState]);
  const scrollChips = (dir: 1 | -1) => {
    const el = chipsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  };
  // Keep the selected chip in view (e.g. when "View pre-visit form" selects it).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('[data-active="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft) row.scrollTo({ left: left - 8, behavior: "smooth" });
    else if (left + chip.offsetWidth > row.scrollLeft + row.clientWidth)
      row.scrollTo({ left: left + chip.offsetWidth - row.clientWidth + 8, behavior: "smooth" });
  }, [activeSection]);
  const isTextSection = activeTab !== "visitInformation" && activeTab !== "preVisitForm";

  const updateSection = (key: keyof EmrSections, value: string) => onChange({ ...sections, [key]: value });

  const trackFocus = (apply: (v: string) => void) => (e: React.FocusEvent<HTMLTextAreaElement>) => {
    activeField.current = { el: e.currentTarget, apply };
  };

  const applyFormat = (fmt: FormatKey | "clear") => {
    const field = activeField.current;
    if (!field || !document.body.contains(field.el)) return;
    const { el, apply } = field;
    const { selectionStart: s, selectionEnd: e, value } = el;
    let next: string;
    let selStart: number;
    let selEnd: number;
    if (fmt === "clear") {
      if (s === e) {
        next = stripFormatting(value);
        selStart = selEnd = next.length;
      } else {
        const cleaned = stripFormatting(value.slice(s, e));
        next = value.slice(0, s) + cleaned + value.slice(e);
        selStart = s;
        selEnd = s + cleaned.length;
      }
    } else {
      const { open, close } = FORMATS[fmt];
      next = value.slice(0, s) + open + value.slice(s, e) + close + value.slice(e);
      selStart = s + open.length;
      selEnd = e + open.length;
    }
    apply(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const hasContent = (key: TabKey) =>
    key === "visitInformation"
      ? hasVisitInfoContent(visitInfo)
      : key === "preVisitForm"
      ? hasPreVisitContent(preVisitData ?? null)
      : !!sections[key as keyof EmrSections]?.trim();

  const renderSubFields = (key: keyof EmrSections, subFields: SubField[]) => {
    const values = parseSubFields(sections[key] ?? "", subFields);
    return (
      <div className="flex flex-col divide-y divide-[#F0F2F7]">
        {subFields.map((f) => {
          const apply = (text: string) => updateSection(key, serializeSubFields({ ...values, [f.label]: text }, subFields));
          return (
            <div key={f.label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#676E76]">{f.label}:</span>
                {f.label === "Follow-up" && onScheduleFollowUp && (
                  <button
                    type="button"
                    onClick={onScheduleFollowUp}
                    className="h-7 px-3 rounded-full bg-[#E8EDFF] text-[#3D5AFE] hover:bg-[#DCE3FF] text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Schedule Follow-up
                  </button>
                )}
              </div>
              <textarea
                value={values[f.label] ?? ""}
                onChange={(e) => apply(e.target.value)}
                onFocus={trackFocus(apply)}
                placeholder={f.placeholder}
                rows={f.rows ?? 2}
                className={NOTE_CLASS}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const toolbarBtn = (key: FormatKey | "clear", title: string, icon: React.ReactNode) => (
    <button
      key={key}
      type="button"
      title={title}
      disabled={!isTextSection}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => applyFormat(key)}
      className="w-6 h-6 rounded flex items-center justify-center text-[#383F45] hover:bg-[#F0F2F7] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold text-[#24292E]">Write note /Add to EMR here</span>

      {/* Section chips — scrolled with arrow buttons, native scrollbar hidden */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Scroll left"
          onClick={() => scrollChips(-1)}
          disabled={!canScrollLeft}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#EBEEF5] text-[#383F45] flex items-center justify-center hover:bg-[#F0F2F7] disabled:opacity-30 disabled:cursor-default disabled:hover:bg-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      <div
        ref={chipsRef}
        onScroll={updateScrollState}
        className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              data-active={isActive}
              onClick={() => onSelectSection(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-[10.5px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-[#2B3247] text-white"
                  : "bg-white text-[#676E76] hover:text-[#24292E] border border-[#EBEEF5]"
              }`}
            >
              {tab.title}
              {hasContent(tab.key) && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#8AA0FF]" : "bg-[#5476FC]"}`} />
              )}
            </button>
          );
        })}
      </div>
        <button
          type="button"
          title="Scroll right"
          onClick={() => scrollChips(1)}
          disabled={!canScrollRight}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#EBEEF5] text-[#383F45] flex items-center justify-center hover:bg-[#F0F2F7] disabled:opacity-30 disabled:cursor-default disabled:hover:bg-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Editor card */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#F0F2F7]">
          {toolbarBtn("bold", "Bold", <span className="text-[12px] font-bold">B</span>)}
          {toolbarBtn("italic", "Italic", <span className="text-[12px] italic font-serif">I</span>)}
          {toolbarBtn("underline", "Underline", <span className="text-[12px] underline">U</span>)}
          {toolbarBtn("strike", "Strikethrough", <span className="text-[12px] line-through">S</span>)}
          {toolbarBtn("code", "Code", (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          ))}
          {toolbarBtn("clear", "Clear formatting", (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H9L4 15a2 2 0 0 1 0-2.8L13.2 3a2 2 0 0 1 2.8 0l4.6 4.6a2 2 0 0 1 0 2.8L12 19" /><line x1="9" y1="9" x2="16" y2="16" /></svg>
          ))}
          <span className="ml-auto text-[10px] font-medium text-[#9EA5AD] truncate">{activeDef?.title}</span>
        </div>

        <div className="px-4 py-3 min-h-[110px]">
          {activeTab === "visitInformation" ? (
            <VisitInformationTab visitInfo={visitInfo} onChange={onVisitInfoChange} />
          ) : activeTab === "preVisitForm" ? (
            <PreVisitFormTab data={preVisitData ?? null} />
          ) : activeDef?.subFields ? (
            renderSubFields(activeTab as keyof EmrSections, activeDef.subFields)
          ) : activeDef ? (
            (() => {
              const key = activeTab as keyof EmrSections;
              const apply = (v: string) => updateSection(key, v);
              return (
                <textarea
                  value={sections[key] ?? ""}
                  onChange={(e) => apply(e.target.value)}
                  onFocus={trackFocus(apply)}
                  placeholder={key === "reasonForVisit" ? "Subjective:" : activeDef.placeholder}
                  rows={activeDef.rows ?? 4}
                  className={NOTE_CLASS}
                />
              );
            })()
          ) : null}
        </div>
      </div>
    </div>
  );
}
