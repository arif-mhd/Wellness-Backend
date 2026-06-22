"use client";

import Pagination from "@/components/Pagination";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface FormItem {
  id: number;
  title: string;
  createdDate: string;
  modifiedDate: string;
  modifiedTime: string;
  description: string;
}

const mockForms: FormItem[] = [
  {
    id: 1,
    title: "Patient Prescription Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Dec 4, 2019",
    modifiedTime: "21:42",
    description: "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I..."
  },
  {
    id: 2,
    title: "Patient Registration Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Mar 20, 2019",
    modifiedTime: "23:14",
    description: "Standard registration form for capturing patient demographic and insurance details prior to their first visit."
  },
  {
    id: 3,
    title: "Doctor Consultation Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Dec 4, 2019",
    modifiedTime: "21:42",
    description: "Form used by doctors during consultations to record symptoms, diagnosis, and treatment plans."
  },
  {
    id: 4,
    title: "Medical History Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Dec 7, 2019",
    modifiedTime: "23:26",
    description: "Comprehensive medical history questionnaire covering past illnesses, surgeries, and family history."
  },
  {
    id: 5,
    title: "Appointment Scheduling Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Dec 7, 2019",
    modifiedTime: "23:26",
    description: "Form to schedule, reschedule, or cancel patient appointments across various departments."
  },
  {
    id: 6,
    title: "Follow-Up Consultation Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Dec 30, 2019",
    modifiedTime: "07:52",
    description: "Used to track patient progress and adjustments to treatment during follow-up visits."
  },
  {
    id: 7,
    title: "Patient Feedback Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Feb 2, 2019",
    modifiedTime: "19:28",
    description: "Survey form to collect patient feedback regarding their experience and satisfaction."
  },
  {
    id: 8,
    title: "Insurance Claim Form",
    createdDate: "Dec 4, 2019",
    modifiedDate: "Mar 20, 2019",
    modifiedTime: "23:14",
    description: "Standardized form used for submitting medical claims to insurance providers for reimbursement."
  }
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function ManageFormsPage() {
  const router = useRouter();
  const [selectedFormId, setSelectedFormId] = useState<number | null>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const selectedForm = mockForms.find((f) => f.id === selectedFormId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        
        {/* Full-width split grid — header lives inside left col */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          
          {/* LEFT COLUMN */}
          <div className={`${selectedForm ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
            
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Forms</h1>
              <button 
                onClick={() => router.push("/dashboard/forms/add")}
                className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[13px] font-bold px-6 py-3 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Form
              </button>
            </div>

            {/* Filter / Search Row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <button className="px-6 py-2.5 rounded-full text-[13px] font-bold bg-[#1E293B] text-white shadow-md transition-all">
                  All Forms
                </button>
                <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                  Today
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Text Filter Row */}
            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-4">
              <div className="flex items-center gap-8 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
              </div>
              <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Main Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-800 tracking-wider">
                      <th className="pb-4 pt-1 font-bold pl-2 w-[55%]">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                          Last Modified <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                      {mockForms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((form) => {
                      const isSelected = selectedFormId === form.id;
                      return (
                        <tr
                          key={form.id}
                          onClick={() => setSelectedFormId(form.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected 
                              ? "bg-[#f8fafd] rounded-[1.5rem]" 
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-4 px-3 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                              <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate mb-0.5">
                                {form.title}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400 truncate">
                                Created: {form.createdDate}
                              </p>
                            </div>
                          </td>
                          
                          <td className="py-4 text-[13px] text-slate-500 font-medium">
                            {form.modifiedDate} {form.modifiedTime}
                          </td>

                          <td className="py-4 pr-4 text-right">
                            {isSelected ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/forms/${form.id}`); }}
                                className="bg-[#6A8BFF] text-white text-[12px] font-bold px-6 py-2.5 rounded-full shadow-md shadow-blue-200/50 transition"
                              >
                                Edit Form
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/forms/${form.id}`); }}
                                className="text-[12px] font-bold text-slate-800 mr-4 hover:text-blue-500 transition-colors"
                              >
                                Edit Form
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="mt-6 border-t border-slate-50 pt-5">
                {mockForms.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(mockForms.length / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
            </div>

          </div>

          {/* Right Form Details panel */}
          {selectedForm && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-50">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Form Details</h2>
                <button
                  onClick={() => setSelectedFormId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header Card */}
              <div className="mt-8 mb-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="pt-1">
                  <h3 className="text-[15px] font-black text-slate-800 leading-snug">{selectedForm.title}</h3>
                  <p className="text-[12px] font-medium text-slate-500 mt-1">Created: {selectedForm.createdDate}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 px-1">
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
                  {selectedForm.description}
                </p>
              </div>

              {/* Details List inside grey card */}
              <div className="bg-[#f8fafd] rounded-[1.5rem] p-6 space-y-5 mb-8 border border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Created</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedForm.createdDate} 21:42</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Last Modified</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedForm.modifiedDate} {selectedForm.modifiedTime}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => router.push(`/dashboard/forms/${selectedForm.id}`)}
                className="w-full py-4 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98]"
              >
                Edit Form
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
