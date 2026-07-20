"use client";

import { useState, useRef } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface SpecializationRow {
  id: string;
  name: string;
  certFile: File | null;
}

interface RateRow {
  id: string;
  category: string;
  price: string;
}

interface DoctorMedicalCareerFormProps {
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

const inputCls =
  "w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-3.5 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit";

export default function DoctorMedicalCareerForm({ onSubmit, onGoBack }: DoctorMedicalCareerFormProps) {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [specializations, setSpecializations] = useState<SpecializationRow[]>([{ id: "1", name: "", certFile: null }]);
  const [rates, setRates] = useState<RateRow[]>([{ id: "1", category: "Category 1", price: "" }]);
  const [paymentSettings, setPaymentSettings] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);
  const specFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleVerifyLicense = () => {
    if (!licenseNumber.trim()) { setFormError("Enter the License Number first."); return; }
    setFormError("");
    setLicenseVerified(true);
  };

  const addSpecialization = () => setSpecializations((rows) => [...rows, { id: Date.now().toString(), name: "", certFile: null }]);
  const removeSpecialization = (id: string) => setSpecializations((rows) => rows.filter((r) => r.id !== id));
  const updateSpecializationName = (id: string, name: string) =>
    setSpecializations((rows) => rows.map((r) => (r.id === id ? { ...r, name } : r)));
  const updateSpecializationFile = (id: string, file: File | null) =>
    setSpecializations((rows) => rows.map((r) => (r.id === id ? { ...r, certFile: file } : r)));

  const addRateRow = () => setRates((rows) => [...rows, { id: Date.now().toString(), category: `Category ${rows.length + 1}`, price: "" }]);
  const removeRateRow = (id: string) => setRates((rows) => rows.filter((r) => r.id !== id));
  const updateRateRow = (id: string, field: keyof Omit<RateRow, "id">, val: string) =>
    setRates((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { setFormError("Resume file must be under 5 MB."); return; }
      setResumeFile(file);
      setFormError("");
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!licenseNumber.trim()) { setFormError("License Number is required."); return; }
    const filledSpecs = specializations.filter((s) => s.name.trim());
    if (filledSpecs.length === 0) { setFormError("Add at least one specialization."); return; }

    setFormError("");
    onSubmit({
      licenseNumber,
      specializations: filledSpecs,
      consultationRates: rates.filter((r) => r.category.trim() && r.price.trim()).map(({ id, ...rest }) => rest),
      paymentSettings,
      resumeFile,
      bio,
      profilePic,
      specialty: filledSpecs[0]?.name ?? null,
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Medical / Career Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Their professional credentials and consultation setup.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* License */}
        <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-5 py-3.5 border border-transparent">
          <input
            type="text"
            placeholder="License Number*"
            value={licenseNumber}
            onChange={(e) => { setLicenseNumber(e.target.value); setLicenseVerified(false); }}
            className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit pr-20"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 select-none">
            {licenseVerified ? (
              <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5476FC]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                VERIFIED
              </span>
            ) : (
              <button type="button" onClick={handleVerifyLicense} className="text-[0.72rem] font-semibold text-[#5476FC] hover:text-[#3B59E3] tracking-wider transition-colors">
                VERIFY
              </button>
            )}
          </div>
        </div>

        {/* Specializations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-gray-700">Specializations*</h4>
            <button type="button" onClick={addSpecialization} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Specialization
            </button>
          </div>
          <div className="space-y-3">
            {specializations.map((spec, idx) => (
              <div key={spec.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  placeholder={`Specialization ${idx + 1}`}
                  value={spec.name}
                  onChange={(e) => updateSpecializationName(spec.id, e.target.value)}
                  className={`${inputCls} lg:col-span-7`}
                />
                <input
                  type="file"
                  ref={(el) => { specFileRefs.current[spec.id] = el; }}
                  onChange={(e) => updateSpecializationFile(spec.id, e.target.files?.[0] ?? null)}
                  accept=".pdf, image/jpeg, image/png, image/jpg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => specFileRefs.current[spec.id]?.click()}
                  className="lg:col-span-4 bg-[#1E293B] hover:bg-[#0f172a] text-white text-xs font-semibold px-4 py-3.5 rounded-xl transition-colors truncate"
                >
                  {spec.certFile ? spec.certFile.name : "Upload Certificate"}
                </button>
                {specializations.length > 1 && (
                  <button type="button" onClick={() => removeSpecialization(spec.id)} className="lg:col-span-1 text-gray-300 hover:text-red-400 transition-colors justify-self-center" aria-label="Remove specialization">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Consultation Rates */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-700">Consultation Rates</h4>
            <button type="button" onClick={addRateRow} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Category
            </button>
          </div>
          <div className="space-y-3">
            {rates.map((row) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input type="text" placeholder="Category" value={row.category} onChange={(e) => updateRateRow(row.id, "category", e.target.value)} className={inputCls} />
                <div className="flex items-center gap-2">
                  <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-4 py-3.5 border border-transparent">
                    <span className="text-[0.72rem] font-bold text-slate-400 select-none mr-2">AED</span>
                    <input type="text" placeholder="Add Price" value={row.price} onChange={(e) => updateRateRow(row.id, "price", e.target.value)} className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit" />
                  </div>
                  {rates.length > 1 && (
                    <button type="button" onClick={() => removeRateRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove category">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment settings */}
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-700">Payment Settings</h4>
          <input type="text" placeholder="e.g. Cash, Card, Insurance" value={paymentSettings} onChange={(e) => setPaymentSettings(e.target.value)} className={inputCls} />
        </div>

        {/* Resume */}
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-700">Upload Resume</h4>
          <div
            onClick={() => resumeInputRef.current?.click()}
            className="border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors"
          >
            <input type="file" ref={resumeInputRef} onChange={handleResumeChange} accept=".pdf, image/jpeg, image/png, image/jpg" className="hidden" />
            <svg className="w-6 h-6 text-[#5476FC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-semibold text-[#5476FC] truncate">
              {resumeFile ? resumeFile.name : "Upload Resume (PDF, JPEG, PNG — max 5 MB)"}
            </span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-700">Bio</h4>
          <textarea
            placeholder="Type your bio here"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit resize-none"
          />
        </div>

        {/* Profile photo */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7F8FC] border border-transparent select-none">
          <input type="file" ref={profilePicRef} onChange={handleProfilePicChange} accept="image/jpeg, image/png, image/jpg" className="hidden" />
          <button
            type="button"
            onClick={() => profilePicRef.current?.click()}
            className="w-14 h-14 rounded-full bg-[#E5ECFF] hover:bg-[#D5E1FF] text-[#5476FC] flex items-center justify-center flex-shrink-0 transition-colors duration-150 outline-none relative overflow-hidden"
          >
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">Profile Photo</span>
            <span className="text-[0.68rem] text-gray-400 font-light mt-0.5 leading-snug">
              A clear photo helps patients recognize their doctor.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-center">
          <button type="button" onClick={onGoBack} className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none text-center">
            Go Back
          </button>
          <DoctorLoginButton type="submit" label="Continue" className="w-full py-4 text-center justify-center flex" />
        </div>
      </form>
    </div>
  );
}
