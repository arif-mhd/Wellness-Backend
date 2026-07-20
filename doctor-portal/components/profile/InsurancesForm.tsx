"use client";

import { useState, useRef } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface InsuranceRow {
  id: string;
  insurance: string;
  network: string;
  discounts: string;
}

interface InsurancesFormProps {
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

const inputCls =
  "w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-3.5 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit";

export default function InsurancesForm({ onSubmit, onGoBack }: InsurancesFormProps) {
  const [insurances, setInsurances] = useState<InsuranceRow[]>([
    { id: "1", insurance: "", network: "", discounts: "" },
  ]);
  const [spcContractFile, setSpcContractFile] = useState<File | null>(null);
  const [spcVerified, setSpcVerified] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addInsurance = () => {
    setInsurances((rows) => [...rows, { id: Date.now().toString(), insurance: "", network: "", discounts: "" }]);
  };

  const removeInsurance = (id: string) => {
    setInsurances((rows) => rows.filter((r) => r.id !== id));
  };

  const updateInsurance = (id: string, field: keyof Omit<InsuranceRow, "id">, val: string) => {
    setInsurances((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormError("SPC contract file must be under 5 MB.");
        return;
      }
      setSpcContractFile(file);
      setSpcVerified(false);
      setFormError("");
    }
  };

  const handleVerifySpc = () => {
    if (!spcContractFile) {
      setFormError("Attach the SPC contract before verifying.");
      return;
    }
    setFormError("");
    setSpcVerified(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filled = insurances.filter((r) => r.insurance.trim() || r.network.trim() || r.discounts.trim());
    setFormError("");
    onSubmit({
      insurances: filled.map(({ id, ...rest }) => rest),
      spcContractFile,
      spcVerified,
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Insurances
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          List the insurance providers this clinic accepts.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-5">
          {insurances.map((row) => (
            <div key={row.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4">
                <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Insurance</div>
                <input type="text" placeholder="Insurance name" value={row.insurance} onChange={(e) => updateInsurance(row.id, "insurance", e.target.value)} className={inputCls} />
              </div>
              <div className="lg:col-span-4">
                <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Network</div>
                <input type="text" placeholder="Network" value={row.network} onChange={(e) => updateInsurance(row.id, "network", e.target.value)} className={inputCls} />
              </div>
              <div className="lg:col-span-3">
                <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Discounts</div>
                <input type="text" placeholder="Discounts" value={row.discounts} onChange={(e) => updateInsurance(row.id, "discounts", e.target.value)} className={inputCls} />
              </div>
              <div className="lg:col-span-1 flex items-end justify-center h-full pb-1">
                {insurances.length > 1 && (
                  <button type="button" onClick={() => removeInsurance(row.id)} className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Remove insurance">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addInsurance}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Insurance
          </button>
        </div>

        {/* SPC Contract attach */}
        <div className="space-y-2">
          <h4 className="text-base font-semibold text-gray-700">SPC Contract</h4>
          <div className="flex items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF]/50 hover:bg-[#EBEEFF] rounded-2xl px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf, image/jpeg, image/png, image/jpg" className="hidden" />
              <svg className="w-6 h-6 text-[#5476FC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-semibold text-[#5476FC] truncate">
                {spcContractFile ? spcContractFile.name : "Add proof"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleVerifySpc}
              className="shrink-0 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-xs font-semibold px-6 py-4 rounded-xl transition-opacity hover:opacity-95"
            >
              {spcVerified ? "VERIFIED" : "VERIFY"}
            </button>
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
