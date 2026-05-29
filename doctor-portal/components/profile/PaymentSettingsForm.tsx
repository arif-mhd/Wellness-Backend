"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface PaymentSettingsFormProps {
  initialBankData?: {
    holderName: string;
    bankName: string;
    accountNumber: string;
    branch: string;
    ifsc: string;
    swift: string;
    accountType: string;
    iban: string;
  };
  onSubmit: (data: any) => void;
  onGoBack: () => void;
}

export default function PaymentSettingsForm({
  initialBankData,
  onSubmit,
  onGoBack,
}: PaymentSettingsFormProps) {
  const [holderName, setHolderName] = useState(initialBankData?.holderName || "");
  const [bankName, setBankName] = useState(initialBankData?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(initialBankData?.accountNumber || "");
  const [branch, setBranch] = useState(initialBankData?.branch || "");
  const [ifsc, setIfsc] = useState(initialBankData?.ifsc || "");
  const [swift, setSwift] = useState(initialBankData?.swift || "");
  const [accountType, setAccountType] = useState(initialBankData?.accountType || "");
  const [iban, setIban] = useState(initialBankData?.iban || "");

  const [formError, setFormError] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Required fields check
    if (!holderName.trim()) {
      setFormError("Account Holder Name is required.");
      return;
    }
    if (!bankName.trim()) {
      setFormError("Bank Name is required.");
      return;
    }
    if (!accountNumber.trim()) {
      setFormError("Account Number is required.");
      return;
    }
    if (!branch.trim()) {
      setFormError("Bank Branch is required.");
      return;
    }
    if (!ifsc.trim()) {
      setFormError("IFSC code is required.");
      return;
    }
    if (!swift.trim()) {
      setFormError("SWIFT code is required.");
      return;
    }
    if (!accountType) {
      setFormError("Account Type is required.");
      return;
    }

    setFormError("");
    onSubmit({
      holderName,
      bankName,
      accountNumber,
      branch,
      ifsc,
      swift,
      accountType,
      iban,
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Payment Settings
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Configure your bank account details
        </p>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BANK INPUT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Account Holder Name */}
          <div>
            <input
              type="text"
              placeholder="Account Holder's Name*"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Bank Name */}
          <div>
            <input
              type="text"
              placeholder="Bank Name*"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Account Number */}
          <div>
            <input
              type="text"
              placeholder="Account Number*"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Bank Branch */}
          <div>
            <input
              type="text"
              placeholder="Bank Branch*"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* IFSC */}
          <div>
            <input
              type="text"
              placeholder="IFSC*"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* SWIFT */}
          <div>
            <input
              type="text"
              placeholder="SWIFT*"
              value={swift}
              onChange={(e) => setSwift(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Custom Account Type Selector */}
          <div className="relative">
            <div
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer relative flex items-center min-h-[52px]"
            >
              <span className={accountType ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {accountType || "Account Type*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showTypeDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showTypeDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTypeDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                  {["Savings", "Current"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setAccountType(option);
                        setShowTypeDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        accountType === option
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-[#7A88B8] hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* IBAN */}
          <div>
            <input
              type="text"
              placeholder="IBAN"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
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

          {/* Complete Profile button */}
          <DoctorLoginButton
            type="submit"
            label="Complete Profile"
            className="w-full py-4 text-center justify-center flex"
          />

        </div>

      </form>
    </div>
  );
}
