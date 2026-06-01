"use client";

import { useState } from "react";
import Image from "next/image";
import labReportIcon from "@/assets/images/lab_report_icon.png";

interface LabTest {
  id: number;
  name: string;
  notes: string;
}

export default function AddLabs() {
  const [labs, setLabs] = useState<LabTest[]>([
    {
      id: 1,
      name: "Complete Blood Count (CBC) Report",
      notes: "Perform test in the morning, fasting for 8 hours prior.",
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("Perform test in the morning, fasting for 8 hours prior.");

  const handleDelete = (id: number) => {
    setLabs(labs.filter((lab) => lab.id !== id));
  };

  const handleAdd = () => {
    if (!labName.trim()) {
      alert("Please enter a lab test name.");
      return;
    }

    const newLab: LabTest = {
      id: Date.now(),
      name: labName.trim(),
      notes: notes.trim() || "Follow lab technician instructions",
    };

    setLabs([...labs, newLab]);
    setLabName("");
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-bold tracking-tight">Add/ Recommend Labs</span>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          title="Add lab test"
          className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#5476FC] flex items-center justify-center hover:bg-[#5476FC] hover:text-white transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Add Form (Collapsible) */}
      {showAddForm && (
        <div className="p-4 rounded-xl bg-white border border-[#EBEEF5] flex flex-col gap-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#676E76] uppercase">Lab Test Name</span>
            <input
              type="text"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Complete Blood Count (CBC)"
              className="h-8 px-3 rounded bg-[#F5F6FA] border border-[#EBEEF5] text-xs outline-none focus:ring-1 focus:ring-[#5476FC] font-semibold text-[#383F45] focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#676E76] uppercase">Special Instructions</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 px-3 rounded bg-[#F5F6FA] border border-[#EBEEF5] text-xs outline-none focus:ring-1 focus:ring-[#5476FC] font-semibold text-[#383F45] focus:bg-white transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="h-7 px-3 text-[10px] font-bold bg-[#EBEEF5] text-[#383F45] rounded-md hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="h-7 px-4 text-[10px] font-bold bg-[#5476FC] text-white rounded-md hover:bg-[#3B5BFC]"
            >
              Add Card
            </button>
          </div>
        </div>
      )}

      {/* Labs Cards List */}
      <div className="flex flex-col gap-3 w-full">
        {labs.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 py-8 border border-dashed border-[#EBEEF5] rounded-xl bg-white w-full">
            No recommended labs yet.
          </div>
        ) : (
          labs.map((lab) => (
            <div
              key={lab.id}
              className="flex items-start justify-between px-4 py-3.5 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#EBEEF5] hover:border-[#8AA0FF]/40 transition-all duration-300 gap-3 w-full min-w-0"
            >
              {/* Lab Report Icon */}
              <Image
                src={labReportIcon}
                alt="Lab Report Icon"
                className="w-8 h-8 object-contain shrink-0"
              />

              {/* Lab labels */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <span className="text-[#383F45] text-[13px] font-bold truncate">
                  {lab.name}
                </span>
                <p className="text-[#838B95] text-[11px] leading-relaxed font-semibold">
                  {lab.notes}
                </p>
              </div>

              {/* Delete Icon */}
              <button
                onClick={() => handleDelete(lab.id)}
                title="Remove lab recommendation"
                className="p-1 rounded-lg text-[#E84949] opacity-80 hover:opacity-100 hover:bg-red-50 transition-all shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
