"use client";

import { useState, useRef } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface RateRow {
  id: string;
  category: string;
  price: string;
}

interface ClinicCompanyInfoFormProps {
  onSubmit: (data: any) => void;
  onGoBack: () => void;
  /** When provided, this form is one iteration of the multi-branch loop — a
   *  required "Branch Name" field is shown, and its value is included in
   *  the submitted data. Omitted entirely for the single-org path. */
  branchName?: string;
  onBranchNameChange?: (value: string) => void;
  /** Overrides the default "Clinic / Company Information" heading — used to
   *  show e.g. "Branch 2 of 3 — Company Information" during the loop. */
  heading?: string;
  /** Prefills fields already known from an earlier step (e.g. a branch's
   *  phase-1 add-request) so the clinic doesn't have to retype them. */
  initialLicenseNumber?: string;
  initialDohLicense?: string;
  initialAddress?: string;
}

const inputCls =
  "w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-3.5 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit";

function VerifyField({
  placeholder, value, onChange, verified, onVerify,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  verified: boolean;
  onVerify: () => void;
}) {
  return (
    <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-5 py-3.5 border border-transparent">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit pr-20"
      />
      <div className="absolute right-5 top-1/2 -translate-y-1/2 select-none">
        {verified ? (
          <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5476FC]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            VERIFIED
          </span>
        ) : (
          <button type="button" onClick={onVerify} className="text-[0.72rem] font-semibold text-[#5476FC] hover:text-[#3B59E3] tracking-wider transition-colors">
            VERIFY
          </button>
        )}
      </div>
    </div>
  );
}

export default function ClinicCompanyInfoForm({
  onSubmit, onGoBack, branchName, onBranchNameChange, heading,
  initialLicenseNumber = "", initialDohLicense = "", initialAddress = "",
}: ClinicCompanyInfoFormProps) {
  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [dohLicense, setDohLicense] = useState(initialDohLicense);
  const [dohVerified, setDohVerified] = useState(false);

  const [address, setAddress] = useState(initialAddress);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [addressVerified, setAddressVerified] = useState(false);

  const [rates, setRates] = useState<RateRow[]>([{ id: "1", category: "Category 1", price: "" }]);
  const [paymentSettings, setPaymentSettings] = useState("");
  const [bio, setBio] = useState("");
  const [clinicImage, setClinicImage] = useState<File | null>(null);
  const [clinicImagePreview, setClinicImagePreview] = useState<string | null>(null);

  const [formError, setFormError] = useState("");

  const addressProofRef = useRef<HTMLInputElement>(null);
  const clinicImageRef = useRef<HTMLInputElement>(null);

  const handleVerify = (setter: (v: boolean) => void, val: string, label: string) => {
    if (!val.trim()) { setFormError(`Enter the ${label} first.`); return; }
    setFormError("");
    setter(true);
  };

  const handleAddressProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { setFormError("Address proof must be under 5 MB."); return; }
      setAddressProofFile(file);
      setAddressVerified(false);
      setFormError("");
    }
  };

  const handleClinicImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setClinicImage(file);
      setClinicImagePreview(URL.createObjectURL(file));
    }
  };

  const addRateRow = () => {
    setRates((rows) => [...rows, { id: Date.now().toString(), category: `Category ${rows.length + 1}`, price: "" }]);
  };

  const updateRateRow = (id: string, field: keyof Omit<RateRow, "id">, val: string) => {
    setRates((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const removeRateRow = (id: string) => {
    setRates((rows) => rows.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (onBranchNameChange && !branchName?.trim()) { setFormError("Branch Name is required."); return; }
    if (!licenseNumber.trim()) { setFormError("License Number is required."); return; }
    if (!dohLicense.trim()) { setFormError("DOH License is required."); return; }
    if (!address.trim()) { setFormError("Address is required."); return; }

    setFormError("");
    onSubmit({
      branchName: onBranchNameChange ? branchName : undefined,
      licenseNumber,
      dohLicense,
      address,
      addressProofFile,
      consultationRates: rates.filter((r) => r.category.trim() && r.price.trim()).map(({ id, ...rest }) => rest),
      paymentSettings,
      bio,
      clinicImage,
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          {heading ?? "Clinic / Company Information"}
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Tell us about the clinic itself.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {onBranchNameChange && (
          <div>
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Branch Name*</div>
            <input
              type="text"
              placeholder="e.g. Downtown Branch"
              value={branchName ?? ""}
              onChange={(e) => onBranchNameChange(e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">License Number*</div>
            <VerifyField placeholder="License Number" value={licenseNumber} onChange={setLicenseNumber} verified={licenseVerified} onVerify={() => handleVerify(setLicenseVerified, licenseNumber, "License Number")} />
          </div>
          <div>
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">DOH Lic*</div>
            <VerifyField placeholder="DOH License" value={dohLicense} onChange={setDohLicense} verified={dohVerified} onVerify={() => handleVerify(setDohVerified, dohLicense, "DOH License")} />
          </div>
        </div>

        {/* Address + proof */}
        <div className="space-y-2">
          <div className="text-[0.68rem] text-gray-400 font-light ml-1">Address*</div>
          <textarea
            placeholder="Clinic address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit resize-none"
          />
          <div className="flex items-center gap-3">
            <div
              onClick={() => addressProofRef.current?.click()}
              className="flex-1 border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-colors"
            >
              <input type="file" ref={addressProofRef} onChange={handleAddressProofChange} accept=".pdf, image/jpeg, image/png, image/jpg" className="hidden" />
              <svg className="w-5 h-5 text-[#5476FC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-semibold text-[#5476FC] truncate">
                {addressProofFile ? addressProofFile.name : "Add proof"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleVerify(setAddressVerified, addressProofFile ? "1" : "", "address proof")}
              className="shrink-0 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-xs font-semibold px-6 py-3.5 rounded-xl transition-opacity hover:opacity-95"
            >
              {addressVerified ? "VERIFIED" : "VERIFY"}
            </button>
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
          <button type="button" disabled className="text-xs font-semibold text-gray-300 bg-gray-50 px-4 py-2 rounded-lg cursor-not-allowed">
            Add Wellness
          </button>
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

        {/* Clinic image / logo */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7F8FC] border border-transparent select-none">
          <input type="file" ref={clinicImageRef} onChange={handleClinicImageChange} accept="image/jpeg, image/png, image/jpg" className="hidden" />
          <button
            type="button"
            onClick={() => clinicImageRef.current?.click()}
            className="w-14 h-14 rounded-full bg-[#E5ECFF] hover:bg-[#D5E1FF] text-[#5476FC] flex items-center justify-center flex-shrink-0 transition-colors duration-150 outline-none relative overflow-hidden"
          >
            {clinicImagePreview ? (
              <img src={clinicImagePreview} alt="Clinic logo preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">Clinic&apos;s Image / Logo</span>
            <span className="text-[0.68rem] text-gray-400 font-light mt-0.5 leading-snug">
              Add an image or logo patients will recognize your clinic by.
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
