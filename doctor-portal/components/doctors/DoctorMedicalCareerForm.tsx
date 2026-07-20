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
  "w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors bg-white placeholder-[#A7AAB4]";

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
    <div className="w-full bg-white rounded-3xl shadow-sm border border-[#E4E8F0] p-8 md:p-12 font-outfit animate-fade-in select-none">
      <h2 className="text-[20px] font-bold text-[#24292E] mb-8">Medical / Career Information</h2>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* License */}
        <div className="flex flex-col gap-1.5 w-full md:w-2/3">
          <label className="text-[12px] font-semibold text-[#24292E]">Licence Number</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => { setLicenseNumber(e.target.value); setLicenseVerified(false); }}
              className={inputCls}
            />
            {licenseVerified ? (
              <div className="h-11 px-8 rounded-xl bg-white border border-[#5476FC] text-[#5476FC] text-[12px] font-bold tracking-widest flex items-center shadow-sm">
                VERIFIED
              </div>
            ) : (
              <button
                type="button"
                onClick={handleVerifyLicense}
                className="shrink-0 h-11 px-8 rounded-xl bg-[#24292E] text-white text-[12px] font-bold tracking-widest hover:bg-black transition-colors shadow-sm"
              >
                VERIFY
              </button>
            )}
          </div>
        </div>

        {/* Specializations */}
        <div className="flex flex-col gap-3 w-full md:w-2/3">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-[#24292E]">Specialisations</label>
            <button type="button" onClick={addSpecialization} className="flex items-center gap-1.5 text-xs font-semibold text-[#5476FC] hover:text-[#24292E] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Specialization
            </button>
          </div>
          <div className="space-y-3">
            {specializations.map((spec, idx) => (
              <div key={spec.id} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder={`Specialisation ${idx + 1}`}
                  value={spec.name}
                  onChange={(e) => updateSpecializationName(spec.id, e.target.value)}
                  className={`${inputCls} flex-1`}
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
                  className="shrink-0 h-11 px-5 rounded-xl bg-white border border-[#E4E8F0] text-[#24292E] text-[10px] font-bold tracking-widest hover:bg-gray-50 transition-colors shadow-sm max-w-[150px] truncate"
                >
                  {spec.certFile ? spec.certFile.name : "UPLOAD CERTIFICATE"}
                </button>
                {specializations.length > 1 && (
                  <button type="button" onClick={() => removeSpecialization(spec.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove specialization">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Consultation Rates */}
        <div className="flex flex-col gap-3 w-full md:w-2/3">
          <div className="flex justify-between items-center">
            <label className="text-[12px] font-semibold text-[#24292E]">Consultation Rates</label>
            <button type="button" onClick={addRateRow} className="flex items-center gap-1.5 text-xs font-semibold text-[#5476FC] hover:text-[#24292E] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Category
            </button>
          </div>
          <div className="space-y-3">
            {rates.map((row) => (
              <div key={row.id} className="flex gap-3 items-center">
                <input type="text" placeholder="Category" value={row.category} onChange={(e) => updateRateRow(row.id, "category", e.target.value)} className={`${inputCls} flex-1`} />
                <input type="text" placeholder="Add Price" value={row.price} onChange={(e) => updateRateRow(row.id, "price", e.target.value)} className={`${inputCls} flex-1`} />
                {rates.length > 1 && (
                  <button type="button" onClick={() => removeRateRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove category">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grid for Payment & Resume */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Payment Settings</label>
            <select value={paymentSettings} onChange={(e) => setPaymentSettings(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
              <option value="">Cash / Insurance</option>
              <option value="Cash Only">Cash Only</option>
              <option value="Insurance Only">Insurance Only</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Upload Resume</label>
            <div
              onClick={() => resumeInputRef.current?.click()}
              className="flex h-11 border border-[#D6DEFF] rounded-xl px-4 items-center justify-between text-[13px] text-[#A7AAB4] cursor-pointer hover:border-[#5476FC] transition-colors bg-white shadow-sm"
            >
              <input type="file" ref={resumeInputRef} onChange={handleResumeChange} accept=".pdf, image/jpeg, image/png, image/jpg" className="hidden" />
              <span className="truncate flex-1 text-left">
                {resumeFile?.name || "Choose file..."}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#A7AAB4]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-[12px] font-semibold text-[#24292E]">Write Bio</label>
          <textarea
            placeholder="Type your bio here..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full border border-[#D6DEFF] rounded-xl p-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors resize-none bg-white placeholder-[#A7AAB4]"
          />
        </div>

        {/* Profile photo */}
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-[12px] font-semibold text-[#24292E]">Profile photo</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <input type="file" ref={profilePicRef} onChange={handleProfilePicChange} accept="image/jpeg, image/png, image/jpg" className="hidden" />
            <button
              type="button"
              onClick={() => profilePicRef.current?.click()}
              className="w-24 h-24 rounded-2xl bg-[#F3F6FF] border border-[#D6DEFF] border-dashed flex items-center justify-center cursor-pointer hover:border-[#5476FC] transition-colors group shrink-0 overflow-hidden relative"
            >
              {profilePicPreview ? (
                <img src={profilePicPreview || undefined} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#24292E] text-white flex items-center justify-center group-hover:bg-[#5476FC] transition-colors shadow-sm">
                  <span className="text-[18px] font-medium mt-[-2px]">+</span>
                </div>
              )}
            </button>
            <p className="text-[11px] text-[#676E76] leading-relaxed">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been
              the industry's standard dummy text ever since the 1500s.
            </p>
          </div>
        </div>

        <div className="flex justify-between mt-12 pt-4 border-t border-[#E4E8F0]">
          <button type="button" onClick={onGoBack} className="px-10 py-3.5 rounded-xl bg-white border border-[#E4E8F0] text-[#676E76] text-[13px] font-bold tracking-widest hover:bg-gray-50 transition-colors shadow-sm">
            BACK
          </button>
          <button type="submit" className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-bold tracking-widest hover:shadow-md transition-all">
            CONTINUE
          </button>
        </div>
      </form>
    </div>
  );
}
