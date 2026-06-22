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

interface VaccineForm {
  name: string;
  manufacturer: string;
  vaccineType: string;
  category: string;
  description: string;
  recommendedFor: string;
  ageRange: string;
  targetGroups: string;
  doseSchedule: string;
  howAdministered: string;
  sideEffects: string;
  patientInstructions: string;
  price: string;
  originalPrice: string;
  doses_required: string;
  age_group: string;
}

const emptyForm = (): VaccineForm => ({
  name: "",
  manufacturer: "",
  vaccineType: "",
  category: "",
  description: "",
  recommendedFor: "",
  ageRange: "",
  targetGroups: "",
  doseSchedule: "",
  howAdministered: "",
  sideEffects: "",
  patientInstructions: "",
  price: "",
  originalPrice: "",
  doses_required: "1",
  age_group: "",
});

const VACCINE_TYPES = ["Routine", "Travel", "Adult", "Core", "COVID-19", "Pediatric", "Seasonal", "Other"];
const CATEGORIES = ["Preventive", "Booster", "Emergency", "Lifestyle", "Other"];

export default function AddVaccinePage() {
  const router = useRouter();
  const [form, setForm] = useState<VaccineForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const setField = (field: keyof VaccineForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) { setError("Vaccine name and price are required."); return; }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim() || null,
        vaccineType: form.vaccineType.trim() || null,
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        recommendedFor: form.recommendedFor.trim() || null,
        ageRange: form.ageRange.trim() || null,
        targetGroups: form.targetGroups ? form.targetGroups.split(",").map(s => s.trim()).filter(Boolean) : [],
        doseSchedule: form.doseSchedule.trim() || null,
        howAdministered: form.howAdministered.trim() || null,
        sideEffects: form.sideEffects.trim() || null,
        patientInstructions: form.patientInstructions.trim() || null,
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        doses_required: parseInt(form.doses_required) || 1,
        age_group: form.age_group.trim() || null,
      };

      const res = await adminFetch("/api/admin/vaccines", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error: ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/vaccination"), 1200);
    } catch (err: any) {
      setError(err.message ?? "Failed to add vaccine. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="w-full pb-16 font-sans animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 transition shadow-sm border border-slate-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Add New Vaccine</h1>
            <p className="text-[13px] text-slate-500 font-medium mt-0.5">Fill in the details that will appear in the patient app</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-[13px] font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Vaccine added successfully! Redirecting…
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-[13px] font-medium flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

            {/* LEFT — Main form */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* Basic Info */}
              <Section title="Basic Information">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Vaccine Name *" className="col-span-2">
                    <input required value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. COVID-19 Vaccine" className={inputCls} />
                  </Field>
                  <Field label="Manufacturer">
                    <input value={form.manufacturer} onChange={e => setField("manufacturer", e.target.value)} placeholder="e.g. Pfizer-BioNTech" className={inputCls} />
                  </Field>
                  <Field label="Vaccine Type">
                    <select value={form.vaccineType} onChange={e => setField("vaccineType", e.target.value)} className={inputCls}>
                      <option value="">Select type…</option>
                      {VACCINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Category">
                    <select value={form.category} onChange={e => setField("category", e.target.value)} className={inputCls}>
                      <option value="">Select category…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Age Group / Label">
                    <input value={form.age_group} onChange={e => setField("age_group", e.target.value)} placeholder="e.g. Adults 18+" className={inputCls} />
                  </Field>
                  <Field label="Age Range">
                    <input value={form.ageRange} onChange={e => setField("ageRange", e.target.value)} placeholder="e.g. 18–65" className={inputCls} />
                  </Field>
                  <Field label="Target Groups (comma-separated)">
                    <input value={form.targetGroups} onChange={e => setField("targetGroups", e.target.value)} placeholder="e.g. Adults, Seniors, Pregnant Women" className={inputCls} />
                  </Field>
                  <Field label="Doses Required">
                    <input type="number" min={1} value={form.doses_required} onChange={e => setField("doses_required", e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </Section>

              {/* Pricing */}
              <Section title="Pricing">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price (AED) *">
                    <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setField("price", e.target.value)} placeholder="350.00" className={inputCls} />
                  </Field>
                  <Field label="Original Price (AED)">
                    <input type="number" step="0.01" min="0" value={form.originalPrice} onChange={e => setField("originalPrice", e.target.value)} placeholder="420.00" className={inputCls} />
                  </Field>
                </div>
              </Section>

              {/* Patient App Content */}
              <Section title="Patient App Content">
                <div className="flex flex-col gap-4">
                  <Field label="About the Vaccine">
                    <textarea rows={3} value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Brief description shown on vaccine details screen…" className={textareaCls} />
                  </Field>
                  <Field label="Recommended For">
                    <textarea rows={2} value={form.recommendedFor} onChange={e => setField("recommendedFor", e.target.value)} placeholder="Who should get this vaccine…" className={textareaCls} />
                  </Field>
                  <Field label="Dose Schedule">
                    <textarea rows={2} value={form.doseSchedule} onChange={e => setField("doseSchedule", e.target.value)} placeholder="e.g. Two-dose series, 3–4 weeks apart, then annual booster…" className={textareaCls} />
                  </Field>
                  <Field label="How is it Administered?">
                    <textarea rows={2} value={form.howAdministered} onChange={e => setField("howAdministered", e.target.value)} placeholder="e.g. Intramuscular injection in the upper arm…" className={textareaCls} />
                  </Field>
                  <Field label="Possible Side Effects">
                    <textarea rows={2} value={form.sideEffects} onChange={e => setField("sideEffects", e.target.value)} placeholder="e.g. Mild soreness, low-grade fever, fatigue…" className={textareaCls} />
                  </Field>
                  <Field label="Patient Instructions">
                    <textarea rows={2} value={form.patientInstructions} onChange={e => setField("patientInstructions", e.target.value)} placeholder="e.g. Stay 15–30 minutes for observation after vaccination…" className={textareaCls} />
                  </Field>
                </div>
              </Section>
            </div>

            {/* RIGHT — Preview & Submit */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6 sticky top-6">
                <h3 className="text-[15px] font-semibold text-slate-800 mb-5">Preview</h3>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18 2 4 4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m17 7 3-3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 4 4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 19-3 3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14 4 6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-800">{form.name || "Vaccine Name"}</p>
                    <p className="text-[11px] text-slate-500">{form.manufacturer || "Manufacturer"}</p>
                  </div>
                </div>

                {form.vaccineType && (
                  <span className="inline-block px-2.5 py-1 bg-[#FFECE0] text-[#885433] text-[10px] font-semibold rounded-full mb-4">{form.vaccineType}</span>
                )}

                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-[20px] font-semibold text-slate-800">
                    {form.price ? `AED ${parseFloat(form.price).toFixed(2)}` : "AED —"}
                  </span>
                  {form.originalPrice && (
                    <span className="text-[13px] text-slate-400 line-through">AED {parseFloat(form.originalPrice).toFixed(2)}</span>
                  )}
                </div>

                <div className="space-y-3 text-[12px] text-slate-600 border-t border-slate-50 pt-4">
                  {form.ageRange && <PreviewRow label="Age Range" value={form.ageRange} />}
                  {form.doses_required && <PreviewRow label="Doses" value={form.doses_required} />}
                  {form.targetGroups && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Target Groups</p>
                      <div className="flex flex-wrap gap-1">
                        {form.targetGroups.split(",").filter(Boolean).map((g, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#EEF2FF] text-[#6A8BFF] text-[10px] font-semibold rounded-full">{g.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || success}
                  className="mt-6 w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] disabled:opacity-60 text-white rounded-[1rem] text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
                >
                  {submitting ? "Adding Vaccine…" : success ? "Added!" : "Add Vaccine"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mt-3 w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[1rem] text-[13px] font-semibold transition duration-200"
                >
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
      <h2 className="text-[16px] font-semibold text-slate-800 mb-5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">{label}</label>
      {children}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-semibold text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-700">{value}</span>
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-[#F8FAFC] text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition";
const textareaCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-[#F8FAFC] text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition resize-none";
