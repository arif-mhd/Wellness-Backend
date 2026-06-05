"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

import { mockPatients } from "@/lib/mockData";

// Common detail row component
const DetailRow = ({ label, value, valueClass = "text-slate-800 font-bold", labelClass = "text-slate-400 font-bold" }: { label: string, value: React.ReactNode, valueClass?: string, labelClass?: string }) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value}</span>
  </div>
);

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"about" | "consultations" | "diagnostics" | "surgeries" | "medications" | "vaccinations" | "allergies" | "more">("about");

  const patientId = Number(id);
  const patient = mockPatients.find((p) => p.id === patientId) || mockPatients[0];

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/patients")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1e293b] tracking-tight">Patient Profile</h1>
        </div>

        {/* Main Content Container */}
        <div className="space-y-7">
          
          {/* Header Card */}
          <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-[84px] h-[84px] rounded-full overflow-hidden border-[3px] border-slate-50 shadow-sm shrink-0 bg-slate-100">
                  <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-[19px] font-black text-slate-800 tracking-tight">{patient.name}</h2>
                  <p className="text-[12px] font-medium text-slate-500 mt-1">
                    {patient.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition">
                  Edit
                </button>
                <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition">
                  Deactivate Patient Profile
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[12px] text-slate-600 font-medium leading-[1.8]">{patient.bio}</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {["About", "Consultations", "Diagnostics", "Surgeries", "Medications", "Vaccinations", "Allergies", "more"].map((tab) => {
              const tabKey = tab.toLowerCase() as any;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                    activeTab === tabKey
                      ? 'bg-[#1E293B] text-white shadow-slate-300'
                      : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="min-h-[400px]">
            
            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Personal Details */}
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                  <h3 className="text-[14px] font-black text-slate-800 mb-6">Personal Details</h3>
                  <div className="space-y-4 max-w-sm">
                    <DetailRow 
                      label="Emirates ID" 
                      value={
                        <div className="flex items-center gap-1.5">
                          {patient.emiratesId}
                          <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </div>
                      } 
                    />
                    <DetailRow label="Contact Number" value={patient.phone} />
                    <DetailRow label="Email ID" value={<a href={`mailto:${patient.email}`} className="text-[#6A8BFF] hover:underline">{patient.email}</a>} valueClass="font-bold" />
                    <DetailRow label="Gender" value={patient.gender} />
                  </div>
                </div>

                {/* Other Details */}
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                  <div className="space-y-4 max-w-sm mt-10">
                    <DetailRow label="Date of Birth" value={patient.dob} />
                    <DetailRow label="Height (in cm)" value={patient.height} />
                    <DetailRow label="Weight (in kg)" value={patient.weight} />
                    <DetailRow label="Address" value={patient.address} />
                    <DetailRow label="Postal Code" value={patient.postalCode} />
                  </div>
                </div>

              </div>
            )}

            {/* CONSULTATIONS TAB */}
            {activeTab === "consultations" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Left side: List of Consultations */}
                <div className="xl:col-span-4 bg-white rounded-[2rem] p-5 shadow-sm border border-slate-50 self-start">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <span className="text-[12px] font-bold text-slate-800">Recent</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Active Item */}
                    <div className="bg-[#E5EDFF] rounded-[1rem] p-4 flex items-center justify-between cursor-pointer">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_01022020</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" /></svg>
                    </div>
                    {/* Inactive Items */}
                    <div className="rounded-[1rem] p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_03022019</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" /></svg>
                    </div>
                    <div className="rounded-[1rem] p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_26062019</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" /></svg>
                    </div>
                    <div className="rounded-[1rem] p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_26062019</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" /></svg>
                    </div>
                    <div className="rounded-[1rem] p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_26062019</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* Right side: Consultation Details */}
                <div className="xl:col-span-8 bg-transparent">
                  <h3 className="text-[16px] font-black text-slate-800 mb-6 px-1">Consultation Details</h3>
                  
                  {/* Reason for visit */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold text-slate-800 mb-3 px-1">Reason for visit</h4>
                    <div className="bg-white border border-slate-100 rounded-[1rem] p-5 shadow-sm flex items-center gap-4">
                      <span className="bg-[#e4edff] text-[#6A8BFF] text-[11px] font-bold px-4 py-1.5 rounded-full">Fever</span>
                      <p className="text-[12px] font-medium text-slate-600">I've had a fever for three days with chills, body aches, and fatigue.</p>
                    </div>
                  </div>

                  {/* EMR */}
                  <div className="mb-8">
                    <h4 className="text-[12px] font-bold text-slate-800 mb-3 px-1">EMR</h4>
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-7 shadow-sm space-y-6">
                      <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
                      </p>
                      
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-[#6A8BFF] rotate-45" />
                          <span className="text-[12px] font-bold text-slate-800">Subjective</span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1">
                          Patient reports persistent headaches and fatigue over the past two weeks. States the headaches are moderate in intensity and occur daily. Patient also mentions feeling more fatigued than usual, especially in the afternoons. Denies any recent changes in medication or significant stressors.
                        </p>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-[#6A8BFF] rotate-45" />
                          <span className="text-[12px] font-bold text-slate-800">Objective</span>
                        </div>
                        <div className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1 space-y-3">
                          <p>
                            Vital Signs:<br/>
                            - Blood Pressure: 150/90 mmHg<br/>
                            - Heart Rate: 80 bpm<br/>
                            - Temperature: 98.6°F (37°C)
                          </p>
                          <p>
                            Physical Exam:<br/>
                            - General: Alert and in no acute distress.<br/>
                            - Neurological: No focal deficits; cranial nerves II-XII intact.<br/>
                            - Cardiovascular: Regular rate and rhythm, no murmurs.<br/>
                            - Respiratory: Clear to auscultation bilaterally.<br/>
                            - Abdominal: Soft, non-tender, no masses.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-[#6A8BFF] rotate-45" />
                          <span className="text-[12px] font-bold text-slate-800">Assessment</span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1">
                          Hypertension (uncontrolled): Likely contributing to headaches.<br/>
                          Fatigue: Could be related to hypertension and sleep quality; further evaluation needed.
                        </p>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-[#6A8BFF] rotate-45" />
                          <span className="text-[12px] font-bold text-slate-800">Plan</span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1">
                          Increase Amlodipine to 10mg daily to better control blood pressure.<br/>
                          Schedule a follow-up appointment in 4 weeks to monitor blood pressure and assess headache frequency.<br/>
                          Order blood tests: Complete Blood Count (CBC) and Basic Metabolic Panel (BMP) to evaluate for underlying causes of fatigue. Recommend lifestyle modifications: Reduce caffeine intake, increase hydration, and maintain a regular sleep schedule.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Medicines */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h4 className="text-[12px] font-bold text-slate-800">Medicines</h4>
                      <button className="bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] text-[11px] font-bold px-5 py-2.5 rounded-[0.8rem] flex items-center gap-2 transition active:scale-95">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Prescription
                      </button>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm space-y-6">
                      
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">Paracetamol 500 mg</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-1">Notes: Take with food every morning</p>
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 text-right shrink-0">
                          <span className="text-[#6A8BFF] mr-1">1x</span> After Breakfast <span className="text-[#6A8BFF] ml-1">(3 days)</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-0 border-0">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">Ibuprofen 200 mg</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-1">Notes: Take with food every morning</p>
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 text-right shrink-0">
                          <span className="text-[#6A8BFF] mr-1">1x</span> After Breakfast <span className="text-[#6A8BFF] ml-1">(3 days)</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Lab Tests */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold text-slate-800 mb-4 px-1">Lab Tests</h4>
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm space-y-6">
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">CBC</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Notes: Take before food in the morning</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-bold">
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            View
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Report
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">BMP</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Notes: Take before food in the morning</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-bold">
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            View
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Report
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
