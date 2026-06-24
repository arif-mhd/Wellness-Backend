"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface LicenseRow {
  id: string;
  authority: string;
  number: string;
  verified: boolean;
}

interface MedicalCareerFormProps {
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

const AUTHORITIES = [
  "Dubai Health Authority (DHA)",
  "Abu Dhabi Department of Health (DOH)",
  "Ministry of Health and Prevention (MOHAP)"
];

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Neurology",
  "Orthopedics",
  "Psychiatry"
];

const EMIRATES = [
  { key: "abuDhabi", label: "Abu Dhabi" },
  { key: "dubai", label: "Dubai" },
  { key: "sharjah", label: "Sharjah" },
  { key: "ajman", label: "Ajman" },
  { key: "ummAlQuwain", label: "Umm Al-Quwain" },
  { key: "rasAlKhaimah", label: "Ras Al Khaimah" },
  { key: "fujairah", label: "Fujairah" }
];

export default function MedicalCareerForm({
  onSubmit,
  onGoBack,
}: MedicalCareerFormProps) {
  // License state
  const [licenses, setLicenses] = useState<LicenseRow[]>([
    { id: "1", authority: "Dubai Health Authority (DHA)", number: "DHA-12345678", verified: true },
    { id: "2", authority: "", number: "", verified: false }
  ]);

  // Specialization state
  const [specialization, setSpecialization] = useState("");

  // Consultation Fees state
  const [fees, setFees] = useState<Record<string, string>>({
    abuDhabi: "",
    dubai: "",
    sharjah: "",
    ajman: "",
    ummAlQuwain: "",
    rasAlKhaimah: "",
    fujairah: ""
  });

  const [formError, setFormError] = useState("");

  // Dropdown Popover Visibility states
  const [activeLicenseDropdownId, setActiveLicenseDropdownId] = useState<string | null>(null);
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);

  // Dynamic Handlers
  const handleAddLicense = () => {
    setLicenses([
      ...licenses,
      {
        id: Date.now().toString(),
        authority: "",
        number: "",
        verified: false
      }
    ]);
  };

  const handleUpdateLicenseAuthority = (id: string, value: string) => {
    setLicenses(
      licenses.map((row) => (row.id === id ? { ...row, authority: value } : row))
    );
    setActiveLicenseDropdownId(null);
  };

  const handleUpdateLicenseNumber = (id: string, value: string) => {
    setLicenses(
      licenses.map((row) => (row.id === id ? { ...row, number: value } : row))
    );
  };

  const handleVerifyLicense = (id: string) => {
    setLicenses(
      licenses.map((row) => {
        if (row.id === id) {
          if (!row.authority || !row.number.trim()) {
            setFormError("Please select an Issuing Authority and input a License Number first.");
            return row;
          }
          setFormError("");
          return { ...row, verified: true };
        }
        return row;
      })
    );
  };

  const handleFeeChange = (key: string, value: string) => {
    if (value && isNaN(Number(value))) return; // numeric check
    setFees({ ...fees, [key]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification check for completed rows
    for (const lic of licenses) {
      if (!lic.authority || !lic.number.trim()) {
        setFormError("All added license rows must have Issuing Authority and License Number filled.");
        return;
      }
    }

    if (!specialization) {
      setFormError("Specialization field is required.");
      return;
    }

    // Verify at least one consultation fee is set
    const hasOneFee = Object.values(fees).some((val) => val.trim() !== "");
    if (!hasOneFee) {
      setFormError("Please set a consultation fee for at least one Emirate.");
      return;
    }

    setFormError("");
    onSubmit({
      licenses,
      specialization,
      fees
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Medical/ Career Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Please provide your medical or career information.
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* LICENSE INFO SECTION */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-base font-semibold text-gray-700 font-outfit">
              License Info
            </h4>
            <button
              type="button"
              onClick={handleAddLicense}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors outline-none cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add License</span>
            </button>
          </div>

          {/* DYNAMIC LICENSE ROWS */}
          <div className="space-y-4">
            {licenses.map((lic) => {
              const showRowDropdown = activeLicenseDropdownId === lic.id;
              
              return (
                <div key={lic.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  
                  {/* Issuing Authority Dropdown Selector */}
                  <div className="lg:col-span-6 relative">
                    <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Issuing Authority*</div>
                    <div
                      onClick={() => {
                        if (showRowDropdown) {
                          setActiveLicenseDropdownId(null);
                        } else {
                          setActiveLicenseDropdownId(lic.id);
                          setShowSpecDropdown(false);
                        }
                      }}
                      className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-3.5 text-sm transition font-outfit cursor-pointer relative flex items-center min-h-[48px]"
                    >
                      <span className={lic.authority ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                        {lic.authority || "Select Issuing Authority"}
                      </span>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showRowDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {showRowDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveLicenseDropdownId(null)} />
                        <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                          {AUTHORITIES.map((authOption) => (
                            <button
                              key={authOption}
                              type="button"
                              onClick={() => handleUpdateLicenseAuthority(lic.id, authOption)}
                              className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                                lic.authority === authOption
                                  ? "bg-indigo-50 text-[#5476FC]"
                                  : "text-[#7A88B8] hover:bg-indigo-50/60 hover:text-[#5476FC]"
                              }`}
                            >
                              {authOption}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* License Number Input with Inline VERIFIED / VERIFY */}
                  <div className="lg:col-span-6 relative">
                    <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">License Number*</div>
                    <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-5 py-3.5 border border-transparent">
                      <input
                        type="text"
                        placeholder="License Number"
                        value={lic.number}
                        onChange={(e) => handleUpdateLicenseNumber(lic.id, e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit pr-24"
                      />
                      
                      {/* Verify status inline absolute right alignment */}
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 select-none">
                        {lic.verified ? (
                          <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5476FC] tracking-wide select-none">
                            <svg className="w-4 h-4 text-[#5476FC]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>VERIFIED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyLicense(lic.id)}
                            className="text-[0.72rem] font-semibold text-[#5476FC] hover:text-[#3B59E3] tracking-wider cursor-pointer select-none transition-colors outline-none"
                          >
                            VERIFY
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* SPECIALIZATION SECTION */}
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-700 font-outfit">
            Specializationcc
          </h4>
          <div className="relative">
            <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Select Specialization*</div>
            <div
              onClick={() => {
                if (showSpecDropdown) {
                  setShowSpecDropdown(false);
                } else {
                  setShowSpecDropdown(true);
                  setActiveLicenseDropdownId(null);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-3.5 text-sm transition font-outfit cursor-pointer relative flex items-center min-h-[48px]"
            >
              <span className={specialization ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {specialization || "Select Specialization"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showSpecDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showSpecDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSpecDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                  {SPECIALIZATIONS.map((specOption) => (
                    <button
                      key={specOption}
                      type="button"
                      onClick={() => {
                        setSpecialization(specOption);
                        setShowSpecDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        specialization === specOption
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-[#7A88B8] hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {specOption}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* SET CONSULTATION FEES SECTION */}
        <div className="space-y-4">
          <h4 className="text-base font-semibold text-gray-700 font-outfit">
            Set Consultation Fees
          </h4>
          
          {/* Informational Warning Banner */}
          <div className="bg-[#F4F7FF] rounded-2xl p-5 border border-indigo-50/20 text-[#182A6F] text-[0.72rem] leading-relaxed font-light font-outfit">
            You are allowed to set different consultation fees for each emirate, as the license criteria have been verified and approved according to the provided license details.
          </div>

          {/* List of 7 Emirates and inputs */}
          <div className="space-y-3">
            {EMIRATES.map((em) => {
              const currentFee = fees[em.key] || "";
              
              return (
                <div key={em.key} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center py-1 select-none">
                  <span className="text-sm font-medium text-gray-700 font-outfit">
                    {em.label}
                  </span>
                  
                  {/* Input container with fixed AED prefix */}
                  <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-4 py-3.5 border border-transparent">
                    <span className="text-[0.72rem] font-bold text-slate-400 select-none mr-2 font-outfit">
                      AED
                    </span>
                    <input
                      type="text"
                      placeholder="Consultation Fee"
                      value={currentFee}
                      onChange={(e) => handleFeeChange(em.key, e.target.value)}
                      className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit"
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* BOTTOM ACTION BUTTONS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 items-center">
          
          {/* Go Back button */}
          <button
            type="button"
            onClick={onGoBack}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none text-center"
          >
            Go Back
          </button>

          {/* Continue button */}
          <DoctorLoginButton
            type="submit"
            label="Continue"
            className="w-full py-4 text-center justify-center flex"
          />

        </div>

      </form>
    </div>
  );
}
