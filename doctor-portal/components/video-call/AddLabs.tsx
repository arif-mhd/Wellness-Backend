"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import labReportIcon from "@/assets/images/lab_report_icon.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface LabRecommendation {
  id: string;
  name: string;
  notes: string;
  testId?: string;
  labName?: string;
  /** Set by the backend when the EMR is saved/loaded — used to track per-doctor contributions */
  contributorDoctorId?: string;
  contributorName?: string;
}

interface CatalogueTest {
  id: string;
  name: string;
  category?: string;
  labName?: string;
}

interface AddLabsProps {
  labs: LabRecommendation[];
  onChange: (labs: LabRecommendation[]) => void;
  /** The identity of the currently authenticated doctor — used to restrict delete to own entries */
  currentDoctorId?: string;
}

let cachedTests: CatalogueTest[] | null = null;

export default function AddLabs({ labs, onChange, currentDoctorId }: AddLabsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [labName, setLabName] = useState("");
  const [selectedTest, setSelectedTest] = useState<CatalogueTest | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [notes, setNotes] = useState("");

  const [allTests, setAllTests] = useState<CatalogueTest[]>(cachedTests ?? []);
  const [loadingTests, setLoadingTests] = useState(!cachedTests);
  const [showResults, setShowResults] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (cachedTests || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/lab/tests`);
        if (res.ok) {
          const data = await res.json();
          const tests = data.map((t: any) => ({ id: t.id, name: t.name, category: t.category, labName: t.labName }));
          cachedTests = tests;
          setAllTests(tests);
        }
      } catch {
        // ignore
      } finally {
        setLoadingTests(false);
      }
    })();
  }, []);

  const filteredTests = labName.trim()
    ? allTests.filter((t) => t.name.toLowerCase().includes(labName.trim().toLowerCase())).slice(0, 8)
    : [];

  const resetForm = () => {
    setLabName("");
    setSelectedTest(null);
    setCustomMode(false);
    setNotes("");
    setShowResults(false);
  };

  const handleDelete = (id: string) => {
    onChange(labs.filter((lab) => lab.id !== id));
  };

  const handlePickTest = (t: CatalogueTest) => {
    setSelectedTest(t);
    setLabName(t.name);
    setShowResults(false);
  };

  const handleAdd = () => {
    if (!labName.trim()) return;

    const newLab: LabRecommendation = {
      id: `${Date.now()}`,
      name: labName.trim(),
      notes: notes.trim() || "Follow lab technician instructions",
      testId: selectedTest?.id,
      labName: selectedTest?.labName,
    };

    onChange([...labs, newLab]);
    resetForm();
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-bold tracking-tight">Add/ Recommend Labs</span>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          title="Add lab test"
          className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#5476FC] flex items-center justify-center hover:bg-[#5476FC] hover:text-white transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 rounded-xl bg-white border border-[#EBEEF5] flex flex-col gap-3 shadow-sm relative">
          <div className="flex flex-col gap-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#676E76] uppercase">Lab Test Name</span>
              <button
                type="button"
                onClick={() => { setCustomMode((v) => !v); setSelectedTest(null); setLabName(""); }}
                className="text-[10px] font-bold text-[#5476FC] hover:underline normal-case"
              >
                {customMode ? "Search catalogue instead" : "Can't find it? Add custom"}
              </button>
            </div>
            <input
              type="text"
              value={labName}
              onChange={(e) => { setLabName(e.target.value); setSelectedTest(null); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder={customMode ? "Custom lab test name" : "e.g. Complete Blood Count (CBC)"}
              className="h-8 px-3 rounded bg-[#F5F6FA] border border-[#EBEEF5] text-xs outline-none focus:ring-1 focus:ring-[#5476FC] font-semibold text-[#383F45] focus:bg-white transition-all"
            />
            {selectedTest?.labName && (
              <p className="text-[10px] text-[#5476FC] font-semibold">{selectedTest.labName}</p>
            )}

            {!customMode && showResults && labName.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EBEEF5] rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto">
                {loadingTests ? (
                  <div className="px-4 py-3 text-[11px] text-slate-400">Loading…</div>
                ) : filteredTests.length === 0 ? (
                  <div className="px-4 py-3 text-[11px] text-slate-400">
                    No matches.{" "}
                    <button type="button" onClick={() => setCustomMode(true)} className="text-[#5476FC] font-semibold hover:underline">
                      Add as custom test
                    </button>
                  </div>
                ) : (
                  filteredTests.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePickTest(t)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#F5F6FA] transition-colors border-b border-[#F5F6FA] last:border-0"
                    >
                      <p className="text-[12px] font-bold text-[#383F45]">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.labName ?? t.category ?? ""}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#676E76] uppercase">Special Instructions</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fasting for 8 hours prior"
              className="h-8 px-3 rounded bg-[#F5F6FA] border border-[#EBEEF5] text-xs outline-none focus:ring-1 focus:ring-[#5476FC] font-semibold text-[#383F45] focus:bg-white transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowAddForm(false); resetForm(); }}
              className="h-7 px-3 text-[10px] font-bold bg-[#EBEEF5] text-[#383F45] rounded-md hover:bg-slate-200"
            >
              Cancel
            </button>
            <button onClick={handleAdd} className="h-7 px-4 text-[10px] font-bold bg-[#5476FC] text-white rounded-md hover:bg-[#3B5BFC]">
              Add Card
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        {labs.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 py-8 border border-dashed border-[#EBEEF5] rounded-xl bg-white w-full">
            No recommended labs yet.
          </div>
        ) : (
          labs.map((lab) => {
            const isOwn =
              !currentDoctorId ||
              !lab.contributorDoctorId ||
              lab.contributorDoctorId === currentDoctorId;

            return (
              <div
                key={lab.id}
                className={`flex items-start justify-between px-4 py-3.5 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border transition-all duration-300 gap-3 w-full min-w-0 ${
                  isOwn
                    ? "border-[#EBEEF5] hover:border-[#8AA0FF]/40"
                    : "border-[#E8F1FF] bg-blue-50/30"
                }`}
              >
                <Image src={labReportIcon} alt="Lab Report Icon" className="w-8 h-8 object-contain shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <span className="text-[#383F45] text-[13px] font-bold truncate">{lab.name}</span>
                  <p className="text-[#838B95] text-[11px] leading-relaxed font-semibold">{lab.notes}</p>
                  {lab.contributorName && !isOwn && (
                    <span className="text-[10px] text-[#5476FC] font-semibold italic">
                      Added by Dr. {lab.contributorName}
                    </span>
                  )}
                </div>
                {isOwn && (
                  <button
                    onClick={() => handleDelete(lab.id)}
                    title="Remove lab recommendation"
                    className="p-1 rounded-lg text-[#E84949] opacity-80 hover:opacity-100 hover:bg-red-50 transition-all shrink-0"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
