"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

interface NormalValue {
  title: string;
  value: string;
  description: string;
}

interface LabTestForm {
  name: string;
  category: string;
  price: string;
  turnaround_hours: string;
  requires_fasting: boolean;
  requires_doctor_approval: boolean;
  description: string;
  recommendedFor: string;
  ageRange: string;
  targetGroups: string;
  normalValues: NormalValue[];
  howItsDone: string;
  recommendedFrequency: string;
  patientInstructions: string;
}

const emptyTest = (): LabTestForm => ({
  name: "",
  category: "",
  price: "",
  turnaround_hours: "",
  requires_fasting: false,
  requires_doctor_approval: false,
  description: "",
  recommendedFor: "",
  ageRange: "",
  targetGroups: "",
  normalValues: [{ title: "Low", value: "", description: "" }],
  howItsDone: "",
  recommendedFrequency: "",
  patientInstructions: "",
});

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition";
const labelCls = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>{label} {required && <span className="text-red-400">*</span>}</label>
      {children}
    </div>
  );
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
      <span className="text-[#6A8BFF]">{children}</span>
    </span>
  );
}

export default function AddLabServicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activeTestTab, setActiveTestTab] = useState(0);

  const [form, setForm] = useState({
    name: "", email: "", contactNumber: "", location: "",
    director: "", manager: "", labLicense: "", healthAuthorityLicense: "",
    accreditationNumber: "", operatingHours: "", website: "",
    description: "", specializations: "",
  });

  const [tests, setTests] = useState<LabTestForm[]>([emptyTest()]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const updateTest = (idx: number, field: keyof LabTestForm, value: any) => {
    setTests(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const updateNormalValue = (testIdx: number, nvIdx: number, field: keyof NormalValue, value: string) => {
    setTests(prev => prev.map((t, i) => {
      if (i !== testIdx) return t;
      const nv = t.normalValues.map((n, j) => j === nvIdx ? { ...n, [field]: value } : n);
      return { ...t, normalValues: nv };
    }));
  };

  const addNormalValue = (testIdx: number) => {
    setTests(prev => prev.map((t, i) => i === testIdx
      ? { ...t, normalValues: [...t.normalValues, { title: "", value: "", description: "" }] }
      : t));
  };

  const removeNormalValue = (testIdx: number, nvIdx: number) => {
    setTests(prev => prev.map((t, i) => i === testIdx
      ? { ...t, normalValues: t.normalValues.filter((_, j) => j !== nvIdx) }
      : t));
  };

  const addTest = () => {
    setTests(prev => [...prev, emptyTest()]);
    setActiveTestTab(tests.length);
  };

  const removeTest = (idx: number) => {
    if (tests.length === 1) return;
    setTests(prev => prev.filter((_, i) => i !== idx));
    setActiveTestTab(Math.max(0, activeTestTab - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Step 1: Create the lab
      const labRes = await adminFetch("/api/admin/lab", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          specializations: form.specializations.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      if (!labRes.ok) {
        const err = await labRes.json();
        throw new Error(err.error ?? "Failed to create lab");
      }
      const { lab } = await labRes.json();

      // Step 2: Add each test
      for (const t of tests) {
        if (!t.name || !t.category || !t.price) continue;
        await adminFetch(`/api/admin/lab/${lab.id}/tests`, {
          method: "POST",
          body: JSON.stringify({
            ...t,
            price: parseFloat(t.price),
            turnaround_hours: t.turnaround_hours ? parseInt(t.turnaround_hours) : null,
            targetGroups: t.targetGroups.split(",").map(s => s.trim()).filter(Boolean),
          }),
        });
      }

      router.push("/dashboard/lab-service");
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const currentTest = tests[activeTestTab] ?? tests[0];

  return (
    <ProtectedRoute>
      <div className="w-full pb-16 font-sans animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight leading-tight">Add New Lab Service</h1>
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">Onboard a diagnostic lab and add its available tests</p>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-medium px-5 py-4 rounded-2xl">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* LEFT — Lab info + Tests */}
            <div className="xl:col-span-2 flex flex-col gap-6">

              {/* Basic Information */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <SectionIcon>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </SectionIcon>
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Lab Name" required><input className={inputCls} name="name" value={form.name} onChange={handleChange} required placeholder="e.g. LifeCare Diagnostics" /></Field>
                  <Field label="Email Address" required><input className={inputCls} type="email" name="email" value={form.email} onChange={handleChange} required placeholder="lab@example.com" /></Field>
                  <Field label="Contact Number" required><input className={inputCls} type="tel" name="contactNumber" value={form.contactNumber} onChange={handleChange} required placeholder="+971 4 000 0000" /></Field>
                  <Field label="Website"><input className={inputCls} type="url" name="website" value={form.website} onChange={handleChange} placeholder="https://lab.com" /></Field>
                  <div className="sm:col-span-2">
                    <Field label="Location / Address" required><input className={inputCls} name="location" value={form.location} onChange={handleChange} required placeholder="Street, City, Country" /></Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Specializations"><input className={inputCls} name="specializations" value={form.specializations} onChange={handleChange} placeholder="e.g. Blood Tests, MRI, Pathology (comma separated)" /></Field>
                  </div>
                  <Field label="Operating Hours"><input className={inputCls} name="operatingHours" value={form.operatingHours} onChange={handleChange} placeholder="Mon – Sat: 7:00 AM – 9:00 PM" /></Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea className={inputCls} name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description about the lab..." style={{ resize: "none" }} />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Management Details */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <SectionIcon>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </SectionIcon>
                  Management Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Lab Director" required><input className={inputCls} name="director" value={form.director} onChange={handleChange} required placeholder="Dr. Full Name" /></Field>
                  <Field label="Manager Name" required><input className={inputCls} name="manager" value={form.manager} onChange={handleChange} required placeholder="Full name" /></Field>
                </div>
              </div>

              {/* Lab Tests Section */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[16px] font-medium text-slate-800 tracking-tight flex items-center gap-2">
                    <SectionIcon>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </SectionIcon>
                    Lab Tests
                  </h2>
                  <button type="button" onClick={addTest}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#EEF2FF] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-semibold rounded-full transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Add Test
                  </button>
                </div>

                {/* Test Tabs */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  {tests.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <button type="button" onClick={() => setActiveTestTab(idx)}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${activeTestTab === idx ? "bg-[#1E293B] text-white" : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-100"}`}>
                        {t.name || `Test ${idx + 1}`}
                      </button>
                      {tests.length > 1 && (
                        <button type="button" onClick={() => removeTest(idx)}
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Test Form */}
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Test Name" required>
                      <input className={inputCls} value={currentTest.name} onChange={e => updateTest(activeTestTab, "name", e.target.value)} placeholder="e.g. Thyroid TSH - Serum" />
                    </Field>
                    <Field label="Category" required>
                      <input className={inputCls} value={currentTest.category} onChange={e => updateTest(activeTestTab, "category", e.target.value)} placeholder="e.g. Thyroid, Vitamin, Package" />
                    </Field>
                    <Field label="Price (AED)" required>
                      <input className={inputCls} type="number" min="0" step="0.01" value={currentTest.price} onChange={e => updateTest(activeTestTab, "price", e.target.value)} placeholder="350" />
                    </Field>
                    <Field label="Turnaround (hours)">
                      <input className={inputCls} type="number" min="1" value={currentTest.turnaround_hours} onChange={e => updateTest(activeTestTab, "turnaround_hours", e.target.value)} placeholder="24" />
                    </Field>
                    <Field label="Age Range">
                      <input className={inputCls} value={currentTest.ageRange} onChange={e => updateTest(activeTestTab, "ageRange", e.target.value)} placeholder="e.g. 8-64" />
                    </Field>
                    <Field label="Target Groups">
                      <input className={inputCls} value={currentTest.targetGroups} onChange={e => updateTest(activeTestTab, "targetGroups", e.target.value)} placeholder="e.g. Kids, Adults, Elderly (comma separated)" />
                    </Field>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 py-2">
                    <button type="button" onClick={() => updateTest(activeTestTab, "requires_fasting", !currentTest.requires_fasting)}
                      className="flex items-center gap-3 group">
                      <div className={`w-10 h-6 rounded-full transition-colors relative ${currentTest.requires_fasting ? "bg-[#6A8BFF]" : "bg-slate-200"}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentTest.requires_fasting ? "translate-x-5" : "translate-x-1"}`} />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-600">Requires Fasting</span>
                    </button>
                    <button type="button" onClick={() => updateTest(activeTestTab, "requires_doctor_approval", !currentTest.requires_doctor_approval)}
                      className="flex items-center gap-3 group">
                      <div className={`w-10 h-6 rounded-full transition-colors relative ${currentTest.requires_doctor_approval ? "bg-[#6A8BFF]" : "bg-slate-200"}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentTest.requires_doctor_approval ? "translate-x-5" : "translate-x-1"}`} />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-600">Requires Doctor Approval</span>
                    </button>
                  </div>

                  {/* Description */}
                  <Field label="About the Test">
                    <textarea className={inputCls} value={currentTest.description} onChange={e => updateTest(activeTestTab, "description", e.target.value)}
                      rows={3} placeholder="What does this test measure and why is it done?" style={{ resize: "none" }} />
                  </Field>

                  {/* Recommended For */}
                  <Field label="Recommended For">
                    <textarea className={inputCls} value={currentTest.recommendedFor} onChange={e => updateTest(activeTestTab, "recommendedFor", e.target.value)}
                      rows={2} placeholder="Who should take this test and why..." style={{ resize: "none" }} />
                  </Field>

                  {/* Normal Values */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className={labelCls}>Normal Value &amp; Interpretation</label>
                      <button type="button" onClick={() => addNormalValue(activeTestTab)}
                        className="text-[11px] font-semibold text-[#6A8BFF] hover:text-[#5a7ae6] flex items-center gap-1 transition">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Add Range
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {currentTest.normalValues.map((nv, nvIdx) => (
                        <div key={nvIdx} className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3 relative">
                          {currentTest.normalValues.length > 1 && (
                            <button type="button" onClick={() => removeNormalValue(activeTestTab, nvIdx)}
                              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <input className={inputCls} value={nv.title} onChange={e => updateNormalValue(activeTestTab, nvIdx, "title", e.target.value)} placeholder="e.g. Low Thyroid" />
                            <input className={inputCls} value={nv.value} onChange={e => updateNormalValue(activeTestTab, nvIdx, "value", e.target.value)} placeholder="e.g. < 0.4 mIU/L" />
                          </div>
                          <input className={inputCls} value={nv.description} onChange={e => updateNormalValue(activeTestTab, nvIdx, "description", e.target.value)} placeholder="Description of what this range indicates..." />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Procedure + Frequency + Instructions */}
                  <Field label="How Is the Test Done?">
                    <textarea className={inputCls} value={currentTest.howItsDone} onChange={e => updateTest(activeTestTab, "howItsDone", e.target.value)}
                      rows={2} placeholder="Describe the procedure..." style={{ resize: "none" }} />
                  </Field>
                  <Field label="Recommended Frequency">
                    <textarea className={inputCls} value={currentTest.recommendedFrequency} onChange={e => updateTest(activeTestTab, "recommendedFrequency", e.target.value)}
                      rows={2} placeholder="How often should this test be done?" style={{ resize: "none" }} />
                  </Field>
                  <Field label="Patient Instructions">
                    <textarea className={inputCls} value={currentTest.patientInstructions} onChange={e => updateTest(activeTestTab, "patientInstructions", e.target.value)}
                      rows={2} placeholder="Preparation instructions for the patient..." style={{ resize: "none" }} />
                  </Field>
                </div>
              </div>
            </div>

            {/* RIGHT — Licenses + Actions */}
            <div className="flex flex-col gap-6">
              {/* Licenses */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <SectionIcon>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </SectionIcon>
                  Licenses &amp; Accreditation
                </h2>
                <div className="flex flex-col gap-5">
                  <Field label="Lab License" required><input className={inputCls} name="labLicense" value={form.labLicense} onChange={handleChange} required placeholder="LL 0000 1111 2222" /></Field>
                  <Field label="Health Authority License" required><input className={inputCls} name="healthAuthorityLicense" value={form.healthAuthorityLicense} onChange={handleChange} required placeholder="HA 7777 6666 8900" /></Field>
                  <Field label="Accreditation Number" required><input className={inputCls} name="accreditationNumber" value={form.accreditationNumber} onChange={handleChange} required placeholder="AC 0011 2233 4455" /></Field>
                </div>
              </div>

              {/* Upload Documents */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <SectionIcon>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </SectionIcon>
                  Upload Documents
                </h2>
                <div className="flex flex-col gap-4">
                  {["Lab License Copy", "Health Authority License", "Accreditation Certificate"].map(doc => (
                    <div key={doc} className="border-2 border-dashed border-slate-100 rounded-xl p-4 flex items-center gap-3 hover:border-[#6A8BFF]/40 hover:bg-[#f8faff] transition cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-[#EEF2FF] flex items-center justify-center transition">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 truncate">{doc}</p>
                        <p className="text-[10px] text-slate-400 font-medium">PDF, JPG or PNG · Max 5MB</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Preview */}
              <div className="bg-[#f8faff] rounded-[2rem] border border-[#e0e7ff] p-6">
                <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider mb-4">Summary</p>
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold text-slate-800">{form.name || "Lab name not set"}</p>
                  {form.location && <p className="text-[12px] text-slate-500">{form.location}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-[#6A8BFF] bg-[#EEF2FF] px-3 py-1 rounded-full">
                      {tests.filter(t => t.name).length} test{tests.filter(t => t.name).length !== 1 ? "s" : ""} added
                    </span>
                    {tests.some(t => t.requires_doctor_approval) && (
                      <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Doctor approval required</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button type="submit" disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] disabled:opacity-60 text-white rounded-[1rem] text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding Lab Service...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>Add Lab Service</>
                  )}
                </button>
                <button type="button" onClick={() => router.back()}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[1rem] text-[13px] font-semibold transition duration-200">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
