"use client";

import { useState, useRef } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";
import { useBranding, useIdentityFields } from "@/components/BrandingContext";
import { apiFetch } from "@/lib/apiFetch";

interface ExtractedLicense {
  isLicenseDocument: boolean;
  licenseNumber: string | null;
  secondaryLicense: string | null;
  clinicName: string | null;
  address: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
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
  initialPaymentSettings?: string;
  initialBio?: string;
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
  initialPaymentSettings = "", initialBio = "",
}: ClinicCompanyInfoFormProps) {
  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber);
  const [licenseVerified, setLicenseVerified] = useState(false);
  // "DOH License" is a UAE regulator; India's equivalent is the Clinical
  // Establishment License. Both come from the country's clinic identity fields.
  const clinicIdentityFields = useIdentityFields("clinic");
  const licenseLabel = clinicIdentityFields.find((f) => /licen[cs]e/i.test(f.key))?.label ?? "DOH Lic";
  const [dohLicense, setDohLicense] = useState(initialDohLicense);
  const [dohVerified, setDohVerified] = useState(false);

  const [address, setAddress] = useState(initialAddress);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [addressVerified, setAddressVerified] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState(initialPaymentSettings);
  const [bio, setBio] = useState(initialBio);
  const [clinicImage, setClinicImage] = useState<File | null>(null);
  const [clinicImagePreview, setClinicImagePreview] = useState<string | null>(null);

  const [formError, setFormError] = useState("");

  // License document → auto-read and prefill License Number / regulator
  // license / Address. The clinic can still edit every field afterwards.
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseReading, setLicenseReading] = useState(false);
  const [licenseReadError, setLicenseReadError] = useState("");
  const [licenseExtracted, setLicenseExtracted] = useState<ExtractedLicense | null>(null);
  const [autoFilled, setAutoFilled] = useState<string[]>([]);

  const addressProofRef = useRef<HTMLInputElement>(null);
  const clinicImageRef = useRef<HTMLInputElement>(null);
  const licenseFileRef = useRef<HTMLInputElement>(null);

  const handleLicenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setLicenseReadError("License file must be under 10 MB."); return; }

    setLicenseFile(file);
    setLicenseReadError("");
    setLicenseExtracted(null);
    setAutoFilled([]);
    setLicenseReading(true);

    try {
      const form = new FormData();
      form.append("license", file);
      form.append("secondaryLabel", licenseLabel);
      const res = await apiFetch("/api/clinics/extract-license", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't read the license. Please fill in the details manually.");

      const extracted = data as ExtractedLicense;
      if (!extracted.isLicenseDocument) {
        setLicenseReadError("This doesn't look like a clinic license. Please check the file or fill in the details manually.");
        return;
      }

      const filled: string[] = [];
      if (extracted.licenseNumber) { setLicenseNumber(extracted.licenseNumber); setLicenseVerified(false); filled.push("License Number"); }
      if (extracted.secondaryLicense) { setDohLicense(extracted.secondaryLicense); setDohVerified(false); filled.push(licenseLabel); }
      if (extracted.address) { setAddress(extracted.address); setAddressVerified(false); filled.push("Address"); }

      setLicenseExtracted(extracted);
      setAutoFilled(filled);
      if (filled.length === 0) {
        setLicenseReadError("We couldn't find the license details in this file. Please fill them in manually.");
      }
    } catch (err: any) {
      setLicenseReadError(err?.message || "Couldn't read the license. Please fill in the details manually.");
    } finally {
      setLicenseReading(false);
    }
  };

  const licenseExpired = !!licenseExtracted?.expiryDate
    && !isNaN(Date.parse(licenseExtracted.expiryDate))
    && new Date(licenseExtracted.expiryDate) < new Date();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (onBranchNameChange && !branchName?.trim()) { setFormError("Branch Name is required."); return; }
    if (!licenseNumber.trim()) { setFormError("License Number is required."); return; }
    if (!dohLicense.trim()) { setFormError(`${licenseLabel} is required.`); return; }
    if (!address.trim()) { setFormError("Address is required."); return; }

    setFormError("");
    onSubmit({
      branchName: onBranchNameChange ? branchName : undefined,
      licenseNumber,
      dohLicense,
      address,
      addressProofFile,
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

        {/* License upload — auto-reads the details below */}
        <div className="space-y-2">
          <div className="text-[0.68rem] text-gray-400 font-light ml-1">Upload License</div>
          <div
            onClick={() => !licenseReading && licenseFileRef.current?.click()}
            className={`border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 rounded-2xl px-5 py-4 flex items-center gap-3 transition-colors ${licenseReading ? "cursor-wait opacity-80" : "cursor-pointer hover:bg-[#EBEEFF]"}`}
          >
            <input type="file" ref={licenseFileRef} onChange={handleLicenseFileChange} accept=".pdf, image/jpeg, image/png, image/jpg, image/webp" className="hidden" />
            {licenseReading ? (
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-5 h-5 text-[#5476FC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#5476FC] truncate">
                {licenseReading ? "Reading license…" : licenseFile ? licenseFile.name : "Upload clinic license"}
              </span>
              <span className="text-[0.68rem] text-gray-400 font-light">
                PDF, JPG or PNG — we&apos;ll fill in the license details for you.
              </span>
            </div>
          </div>
          {licenseReadError && (
            <p className="text-xs text-amber-600 ml-1">{licenseReadError}</p>
          )}
          {autoFilled.length > 0 && (
            <p className="text-xs text-emerald-600 ml-1">
              Auto-filled {autoFilled.join(", ")} from your license. Please review before continuing.
            </p>
          )}
          {licenseExtracted && (licenseExtracted.clinicName || licenseExtracted.issuingAuthority || licenseExtracted.expiryDate) && (
            <div className="text-[0.72rem] text-gray-500 ml-1 space-y-0.5">
              {licenseExtracted.clinicName && <div>Facility: <span className="text-gray-700">{licenseExtracted.clinicName}</span></div>}
              {licenseExtracted.issuingAuthority && <div>Issued by: <span className="text-gray-700">{licenseExtracted.issuingAuthority}</span></div>}
              {licenseExtracted.expiryDate && (
                <div>
                  Valid until: <span className={licenseExpired ? "text-red-600 font-semibold" : "text-gray-700"}>{licenseExtracted.expiryDate}</span>
                  {licenseExpired && <span className="text-red-600"> — this license appears to be expired</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">License Number*</div>
            <VerifyField placeholder="License Number" value={licenseNumber} onChange={setLicenseNumber} verified={licenseVerified} onVerify={() => handleVerify(setLicenseVerified, licenseNumber, "License Number")} />
          </div>
          <div>
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">{licenseLabel}*</div>
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
