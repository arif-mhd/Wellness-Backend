"use client";

import { useState, useEffect } from "react";

const BANKS = [
  {
    id: "abc",
    name: "ABC BANK *******2345",
    label: "Primary Account",
    account: "Account number: xxxxx xxxxx 2345",
    logo: "https://api.builder.io/api/v1/image/assets/TEMP/fed1a238a975bbbf86c5944d566774f67d7af750?width=86",
  },
  {
    id: "xyz",
    name: "XYZ BANK *******2345",
    label: "Primary Account",
    account: "Account number: xxxxx xxxxx 2345",
    logo: "https://api.builder.io/api/v1/image/assets/TEMP/a1b3700ba95f8783e5f6d44212454c2d0fe2e636?width=86",
  },
];

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
      <path d="M10 3.5V10.5C10 10.776 9.776 11 9.5 11H2.5C2.224 11 2 10.776 2 10.5V3.5H1V2.5H11V3.5H10ZM3 3.5V10H9V3.5H3ZM3.5 1H8.5V2H3.5V1ZM5.5 5H6.5V8.5H5.5V5Z" fill="#E84949" />
    </svg>
  );
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-[#5476FC] bg-white" : "border-[#D1D5EB] bg-white"}`}>
      {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#5476FC]" />}
    </span>
  );
}

export default function PaymentsPage() {
  const [primaryBank, setPrimaryBank] = useState("abc");
  const [banks, setBanks] = useState(BANKS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("doctor_onboarding_profile");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.payment?.bankName && parsed?.payment?.accountNumber) {
            const last4Digits = parsed.payment.accountNumber.slice(-4) || "2345";
            const onboardingBank = {
              id: "onboarding",
              name: `${parsed.payment.bankName.toUpperCase()} *******${last4Digits}`,
              label: "Primary Account",
              account: `Account number: xxxxx xxxxx ${last4Digits}`,
              logo: "https://api.builder.io/api/v1/image/assets/TEMP/fed1a238a975bbbf86c5944d566774f67d7af750?width=86",
            };
            setBanks([onboardingBank, ...BANKS]);
            setPrimaryBank("onboarding");
          }
        } catch (e) {
          console.error("Failed to parse onboarding payment data:", e);
        }
      }
    }
  }, []);

  function removeBank(id: string) {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    if (primaryBank === id && banks.length > 1) {
      const remaining = banks.filter((b) => b.id !== id);
      if (remaining.length) setPrimaryBank(remaining[0].id);
    }
  }

  return (
    <div className="flex flex-col gap-6 font-outfit select-none">
      {/* ── Earnings Summary Section ─────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#383F45] font-medium text-[20px] tracking-[-0.4px]">
            Earnings Summary
          </h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 bg-[#E8EEFF]/80 text-[#182A6F] text-[12px] font-bold rounded-[12px] hover:bg-[#D5E1FF] transition-all">
              View Transaction History
            </button>
            <button className="px-4 py-2.5 bg-[#E8EEFF]/80 text-[#182A6F] text-[12px] font-bold rounded-[12px] hover:bg-[#D5E1FF] transition-all">
              Withdraw Now
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="flex gap-6">
          {[
            { label: "Earnings this month", value: "AED 6,000.00" },
            { label: "Total Earnings",      value: "AED 60,000.00" },
            { label: "Withdrawn",           value: "AED 60,000.00" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#EBEEF5] rounded-[12px] p-6 flex flex-col gap-2 flex-1 shadow-sm">
              <span className="text-[#676E76] text-[13px] font-normal">{label}</span>
              <span className="text-[#24292E] text-[24px] font-bold tracking-tight mt-1 leading-none">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment Methods Section ───────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#383F45] font-medium text-[20px] tracking-[-0.4px]">
            Payment Methods
          </h2>
          <button className="px-4 py-2.5 bg-[#E8EEFF]/80 text-[#182A6F] text-[12px] font-bold rounded-[12px] hover:bg-[#D5E1FF] transition-all">
            Add another account
          </button>
        </div>

        {/* Bank account management card */}
        <div className="bg-white border border-[#EBEEF5] rounded-[12px] p-6 flex flex-col gap-5 shadow-sm">
          <div>
            <h3 className="text-[#24292E] text-[16px] font-medium tracking-[-0.32px] mb-2">
              Bank Account Management
            </h3>
            <p className="text-[#676E76] text-[13px] leading-[1.6] font-normal">
              Here you can view and manage your linked bank accounts for receiving payments. You can also add new accounts, set your primary account for withdrawals, or remove any accounts no longer in use.
            </p>
          </div>

          <div>
            <p className="text-[#676E76] text-[12px] font-medium tracking-[-0.24px] mb-3">
              Set primary account
            </p>

            <div className="flex flex-col gap-4">
              {banks.map((bank) => {
                const selected = primaryBank === bank.id;
                return (
                  <div key={bank.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50/50 transition-colors">
                    {/* Radio selection area */}
                    <div className="pt-1.5 cursor-pointer" onClick={() => setPrimaryBank(bank.id)}>
                      <RadioCircle selected={selected} />
                    </div>

                    {/* Bank logo */}
                    <div className="w-[43px] h-[38px] flex items-center justify-center bg-white border border-[#EBEEF5] rounded-[8px] p-1.5 shrink-0 shadow-sm mt-0.5">
                      <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain" />
                    </div>

                    {/* Bank details + Delete Button */}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[#24292E] text-[14px] font-medium leading-tight">{bank.name}</span>
                      <span className="text-[#9EA5AD] text-[12px] font-normal mt-1">{bank.label}</span>
                      <span className="text-[#676E76] text-[12px] font-normal mt-0.5">{bank.account}</span>
                      
                      {/* Trash delete link directly underneath */}
                      <button
                        onClick={() => removeBank(bank.id)}
                        title="Remove account"
                        className="mt-2.5 flex items-center justify-center p-1.5 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-6 mt-2 w-full">
        <button 
          type="button"
          className="flex-1 py-3.5 rounded-[12px] bg-[#E8EEFF] hover:bg-[#DBE5FF] text-[#182A6F] text-[14px] font-bold tracking-tight transition-all duration-200"
        >
          Cancel
        </button>
        <button 
          type="button"
          className="flex-1 py-3.5 rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:shadow-md text-white text-[14px] font-bold tracking-tight transition-all duration-200"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
