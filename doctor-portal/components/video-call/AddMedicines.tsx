"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import medicineIcon from "@/assets/images/medicine_icon_png.png";

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  frequency: string;
  instructions: string;
}

export default function AddMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      id: 1,
      name: "Paracetamol",
      dosage: "500 mg",
      timing: "After food",
      frequency: "Three times Daily",
      instructions: "Take with food every morning",
    },
    {
      id: 2,
      name: "Ibuprofen",
      dosage: "200 mg",
      timing: "After food",
      frequency: "Twice Daily",
      instructions: "Take with food every morning",
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("2");
  const [timing, setTiming] = useState("Before food");
  const [frequency, setFrequency] = useState("Twice Daily");
  const [instructions, setInstructions] = useState("");
  
  // Client-side portal mounting flag
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleDelete = (id: number) => {
    setMedicines(medicines.filter((med) => med.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      alert("Please enter a medicine name.");
      return;
    }

    const newMed: Medicine = {
      id: Date.now(),
      name: medName.trim(),
      dosage: dosage.trim() || "1",
      timing,
      frequency,
      instructions: instructions.trim() || "Take as directed",
    };

    setMedicines([...medicines, newMed]);
    setMedName("");
    setInstructions("");
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-bold tracking-tight">Add Medicines</span>
        <button
          onClick={() => setShowAddForm(true)}
          title="Add prescription"
          className="w-8 h-8 rounded-full bg-[#E8F1FF] text-[#5476FC] flex items-center justify-center hover:bg-[#5476FC] hover:text-white transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Render the portal attached directly to document.body */}
      {showAddForm && mounted && createPortal(
        <div className="fixed inset-0 w-screen h-screen z-[999999] flex justify-end items-start p-6 pointer-events-none font-outfit">
          {/* Semi-transparent dark blur backdrop */}
          <div 
            className="fixed inset-0 w-screen h-screen bg-slate-900/40 backdrop-blur-xs pointer-events-auto transition-opacity duration-300"
            onClick={() => setShowAddForm(false)}
          />

          {/* Floating Modal Drawer aligned to the right top side */}
          <div className="bg-white w-full max-w-[400px] rounded-3xl p-7 shadow-2xl relative border border-slate-100 flex flex-col gap-5 pointer-events-auto transition-all duration-300 max-h-[85vh] overflow-y-auto mt-16 md:mt-20 animate-[slideIn_0.3s_ease-out]">
            
            {/* Style block for inline keyframes */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes slideIn {
                from {
                  transform: translateX(30px);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
            `}} />

            {/* Close Button */}
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors"
              title="Close popup"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Title */}
            <h3 className="text-[#24292E] text-center font-marcellus font-medium text-[20px] select-none tracking-tight pt-1">
              Add Medicines
            </h3>

            {/* Form */}
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              
              {/* Medicine Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#676E76]">
                  Medicine
                </label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="Search here.."
                  required
                  className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
                />
              </div>

              {/* Timing */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#676E76]">
                  Timing
                </label>
                <div className="relative">
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full h-11 px-4 pr-10 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
                  >
                    <option value="Before food">Before food</option>
                    <option value="After food">After food</option>
                    <option value="With food">With food</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#676E76]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#676E76]">
                  Frequency
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full h-11 px-4 pr-10 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
                  >
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Once Daily">Once Daily</option>
                    <option value="Three times Daily">Three times Daily</option>
                    <option value="Four times Daily">Four times Daily</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#676E76]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Dosage */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#676E76]">
                  Dosage
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="2"
                  className="w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] outline-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all"
                />
              </div>

              {/* Instructions */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#676E76]">
                  Instructions
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Add Instructions.."
                  rows={3}
                  className="w-full p-4 rounded-xl bg-[#F5F6FA] border border-[#EBEEF5] text-xs font-semibold text-[#383F45] placeholder-[#838B95] outline-none resize-none focus:ring-1 focus:ring-[#5476FC] focus:bg-white transition-all animate-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full md:w-auto mx-auto mt-2 h-11 px-8 rounded-xl bg-[#5476FC] text-white text-xs font-bold shadow-[0_2.5px_8px_rgba(84,118,252,0.25)] hover:bg-[#3B5BFC] hover:shadow-[0_4px_12px_rgba(84,118,252,0.35)] active:scale-95 transition-all text-center"
              >
                Add Medicine
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Medicines Cards List */}
      <div className="flex flex-col gap-3 w-full">
        {medicines.length === 0 ? (
          <div className="text-center text-xs font-medium text-slate-400 py-8 border border-dashed border-[#EBEEF5] rounded-xl bg-white w-full">
            No medicines added yet.
          </div>
        ) : (
          medicines.map((med) => (
            <div
              key={med.id}
              className="flex items-start justify-between px-4 py-3.5 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#EBEEF5] hover:border-[#8AA0FF]/40 transition-all duration-300 gap-3 w-full min-w-0"
            >
              {/* Medicine PNG Icon */}
              <Image
                src={medicineIcon}
                alt="Medicine Icon"
                className="w-8 h-8 object-contain shrink-0"
              />

              {/* Medicine labels */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <span className="text-[#383F45] text-[13px] font-bold truncate">
                  {med.name} {med.dosage}
                </span>
                <span className="text-[#5476FC] text-[11px] font-bold">
                  {med.timing} <span className="text-[#5476FC] font-medium ml-0.5">({med.frequency})</span>
                </span>
                <p className="text-[#838B95] text-[11px] leading-relaxed font-semibold">
                  Notes: {med.instructions}
                </p>
              </div>

              {/* Delete Icon */}
              <button
                onClick={() => handleDelete(med.id)}
                title="Remove prescription"
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
