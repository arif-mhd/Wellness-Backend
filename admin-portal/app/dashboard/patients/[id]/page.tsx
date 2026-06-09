"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  bloodGroup?: string;
  avatarUrl?: string;
  address?: string;
  postalCode?: string;
  height?: string;
  weight?: string;
  bio?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  allergies?: string[];
  medications?: { name: string; dosage?: string; notes?: string }[];
  chronicDiseases?: string[];
}

type Tab = "about" | "consultations" | "diagnostics" | "surgeries" | "medications" | "vaccinations" | "allergies";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return `${Math.floor((Date.now() - d.getTime()) / 31557600000)} y/o`;
}

const DetailRow = ({
  label,
  value,
  valueClass = "text-slate-800 font-bold",
  labelClass = "text-slate-400 font-bold",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  labelClass?: string;
}) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value ?? "—"}</span>
  </div>
);

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPatient() {
      setLoading(true);
      setError("");
      try {
        const res = await adminFetch(`/api/admin/patients/${id}`);
        if (res.ok) {
          const d = await res.json();
          setPatient(d.patient);
        } else {
          setError("Patient not found.");
        }
      } catch {
        setError("Failed to load patient data.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [id]);

  if (loading) return (
    <ProtectedRoute>
      <div className="w-full flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6A8BFF]" />
      </div>
    </ProtectedRoute>
  );

  if (error || !patient) return (
    <ProtectedRoute>
      <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-red-500 font-semibold text-sm">{error || "Patient not found."}</p>
        <button onClick={() => router.push("/dashboard/patients")} className="text-[#6A8BFF] text-sm font-bold hover:underline">
          Back to Patients
        </button>
      </div>
    </ProtectedRoute>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "about", label: "About" },
    { key: "consultations", label: "Consultations" },
    { key: "diagnostics", label: "Diagnostics" },
    { key: "surgeries", label: "Surgeries" },
    { key: "medications", label: "Medications" },
    { key: "vaccinations", label: "Vaccinations" },
    { key: "allergies", label: "Allergies" },
  ];

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans animate-in fade-in duration-300">

        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/patients")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1e293b] tracking-tight">Patient Profile</h1>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              {patient.avatarUrl ? (
                <img src={patient.avatarUrl} alt={patient.fullName} className="w-[84px] h-[84px] rounded-full object-cover border-[3px] border-slate-50 shadow-sm shrink-0" />
              ) : (
                <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-black text-3xl shrink-0 border-[3px] border-slate-50 shadow-sm">
                  {patient.fullName[0].toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-[19px] font-black text-slate-800 tracking-tight">
                  {patient.fullName}
                  {age(patient.dateOfBirth) && (
                    <span className="text-[15px] font-semibold text-slate-400 ml-2">{age(patient.dateOfBirth)}</span>
                  )}
                </h2>
                <p className="text-[12px] font-medium text-slate-500 mt-1">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition active:scale-95">
                Edit
              </button>
              <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition active:scale-95">
                Deactivate Patient Profile
              </button>
            </div>
          </div>

          {patient.bio && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[12px] text-slate-600 font-medium leading-[1.8]">{patient.bio}</p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                activeTab === key
                  ? "bg-[#1E293B] text-white"
                  : "bg-white text-slate-500 border border-slate-100 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">

          {/* ABOUT */}
          {activeTab === "about" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Personal Details */}
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                <h3 className="text-[14px] font-black text-slate-800 mb-6">Personal Details</h3>
                <div className="space-y-4 max-w-sm">
                  {patient.emiratesId && (
                    <DetailRow
                      label="Emirates ID"
                      value={
                        <div className="flex items-center gap-1.5">
                          {patient.emiratesId}
                          <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      }
                    />
                  )}
                  <DetailRow label="Contact Number" value={patient.phone} />
                  <DetailRow
                    label="Email ID"
                    value={<a href={`mailto:${patient.email}`} className="text-[#6A8BFF] hover:underline">{patient.email}</a>}
                    valueClass="font-bold"
                  />
                  <DetailRow label="Gender" value={patient.gender} />
                  {patient.bloodGroup && <DetailRow label="Blood Group" value={patient.bloodGroup} />}
                </div>
              </div>

              {/* Other Details */}
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                <h3 className="text-[14px] font-black text-slate-800 mb-6">Other Details</h3>
                <div className="space-y-4 max-w-sm">
                  <DetailRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                  {patient.height && <DetailRow label="Height (cm)" value={patient.height} />}
                  {patient.weight && <DetailRow label="Weight (kg)" value={patient.weight} />}
                  {patient.address && <DetailRow label="Address" value={patient.address} />}
                  {patient.postalCode && <DetailRow label="Postal Code" value={patient.postalCode} />}
                  <DetailRow label="Registered" value={formatDate(patient.createdAt)} />
                </div>
              </div>
            </div>
          )}

          {/* CONSULTATIONS */}
          {activeTab === "consultations" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* List */}
              <div className="xl:col-span-4 bg-white rounded-[2rem] p-5 shadow-sm border border-slate-50 self-start">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-[12px] font-bold text-slate-800">Recent</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-[#E5EDFF] rounded-[1rem] p-4 flex items-center justify-between cursor-pointer">
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-800">Consultation_01022020</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {["03022019", "26062019", "26062019", "26062019"].map((d, i) => (
                    <div key={i} className="rounded-[1rem] p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">Consultation_{d}</h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-1">1 Feb, 2020, 11:40 PM</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="xl:col-span-8 bg-transparent">
                <h3 className="text-[16px] font-black text-slate-800 mb-6 px-1">Consultation Details</h3>

                {/* Reason for visit */}
                <div className="mb-6">
                  <h4 className="text-[12px] font-bold text-slate-800 mb-3 px-1">Reason for visit</h4>
                  <div className="bg-white border border-slate-100 rounded-[1rem] p-5 shadow-sm flex items-center gap-4">
                    <span className="bg-[#e4edff] text-[#6A8BFF] text-[11px] font-bold px-4 py-1.5 rounded-full shrink-0">Fever</span>
                    <p className="text-[12px] font-medium text-slate-600">I&apos;ve had a fever for three days with chills, body aches, and fatigue.</p>
                  </div>
                </div>

                {/* EMR */}
                <div className="mb-8">
                  <h4 className="text-[12px] font-bold text-slate-800 mb-3 px-1">EMR</h4>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-7 shadow-sm space-y-6">
                    <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                      Patient presents with persistent headaches and fatigue over the past two weeks.
                    </p>
                    {[
                      { title: "Subjective", text: "Patient reports persistent headaches and fatigue over the past two weeks. States the headaches are moderate in intensity and occur daily. Denies any recent changes in medication or significant stressors." },
                      { title: "Objective", text: "Blood Pressure: 150/90 mmHg · Heart Rate: 80 bpm · Temperature: 98.6°F. General: Alert and in no acute distress. Neurological: No focal deficits." },
                      { title: "Assessment", text: "Hypertension (uncontrolled): Likely contributing to headaches. Fatigue: Could be related to hypertension and sleep quality; further evaluation needed." },
                      { title: "Plan", text: "Increase Amlodipine to 10mg daily. Schedule follow-up in 4 weeks. Order CBC and BMP. Recommend lifestyle modifications." },
                    ].map(({ title, text }) => (
                      <div key={title} className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-[#6A8BFF] rotate-45 shrink-0" />
                          <span className="text-[12px] font-bold text-slate-800">{title}</span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medicines */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-[12px] font-bold text-slate-800">Medicines</h4>
                    <button className="bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] text-[11px] font-bold px-5 py-2.5 rounded-[0.8rem] flex items-center gap-2 transition active:scale-95">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Prescription
                    </button>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm space-y-6">
                    {[
                      { name: "Paracetamol 500 mg", note: "Take with food every morning" },
                      { name: "Ibuprofen 200 mg", note: "Take with food every morning" },
                    ].map(med => (
                      <div key={med.name} className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">{med.name}</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-1">Notes: {med.note}</p>
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 text-right shrink-0">
                          <span className="text-[#6A8BFF] mr-1">1x</span> After Breakfast <span className="text-[#6A8BFF] ml-1">(3 days)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lab Tests */}
                <div>
                  <h4 className="text-[12px] font-bold text-slate-800 mb-4 px-1">Lab Tests</h4>
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm space-y-6">
                    {["CBC", "BMP"].map((test, i) => (
                      <div key={test} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${i < 1 ? "pb-6 border-b border-slate-50" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="text-[13px] font-bold text-slate-800">{test}</h5>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Notes: Take before food in the morning</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5 text-[11px] font-bold">
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-800 hover:text-[#6A8BFF] transition">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEDICATIONS */}
          {activeTab === "medications" && (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[14px] font-black text-slate-800 mb-6">Current Medications</h3>
              {patient.medications && patient.medications.length > 0 ? (
                <div className="space-y-4">
                  {patient.medications.map((med, i) => (
                    <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">{i + 1}</div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{typeof med === "string" ? med : med.name}</p>
                        {typeof med !== "string" && med.dosage && <p className="text-[11px] text-slate-400 mt-0.5">Dosage: {med.dosage}</p>}
                        {typeof med !== "string" && med.notes && <p className="text-[11px] text-slate-500 mt-0.5">{med.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 font-semibold">No medications recorded.</p>
              )}
            </div>
          )}

          {/* ALLERGIES */}
          {activeTab === "allergies" && (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[14px] font-black text-slate-800 mb-6">Known Allergies</h3>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="bg-red-50 text-red-600 border border-red-100 text-[12px] font-bold px-4 py-2 rounded-full">{a}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 font-semibold">No allergies recorded.</p>
              )}
            </div>
          )}

          {/* PLACEHOLDER TABS */}
          {(activeTab === "diagnostics" || activeTab === "surgeries" || activeTab === "vaccinations") && (
            <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[14px] font-bold text-slate-400">No {activeTab} data available for this patient.</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
