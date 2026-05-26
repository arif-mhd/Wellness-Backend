"use client";

import { useState } from "react";

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
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M10 3.5V10.5C10 10.776 9.776 11 9.5 11H2.5C2.224 11 2 10.776 2 10.5V3.5H1V2.5H11V3.5H10ZM3 3.5V10H9V3.5H3ZM3.5 1H8.5V2H3.5V1ZM5.5 5H6.5V8.5H5.5V5Z" fill="#E84949" />
    </svg>
  );
}

export default function PaymentsPage() {
  const [primaryBank, setPrimaryBank] = useState("abc");
  const [banks, setBanks] = useState(BANKS);

  function removeBank(id: string) {
    setBanks((prev) => prev.filter((b) => b.id !== id));
    if (primaryBank === id && banks.length > 1) {
      const remaining = banks.filter((b) => b.id !== id);
      if (remaining.length) setPrimaryBank(remaining[0].id);
    }
  }

  return (
    <>
      {/* ── Earnings Summary ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[#24292E] text-base font-medium tracking-tight">Earnings Summary</h2>
        <div className="flex items-center gap-3">
          <button className="px-3.5 py-1.5 bg-[#E0E7FF] text-[#383F45] text-[13px] font-medium rounded-xl hover:bg-[#D0DAFF] transition-colors">
            View Transaction History
          </button>
          <button className="px-3.5 py-1.5 bg-[#E0E7FF] text-[#383F45] text-[13px] font-medium rounded-xl hover:bg-[#D0DAFF] transition-colors">
            Withdraw Now
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex gap-5">
        {[
          { label: "Earnings this month", value: "AED 6,000.00" },
          { label: "Total Earnings",      value: "AED 60,000.00" },
          { label: "Withdrawn",           value: "AED 60,000.00" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-6 flex flex-col gap-4 flex-1">
            <span className="text-[#676E76] text-xs">{label}</span>
            <span className="text-[#24292E] text-[22px] font-medium tracking-tight leading-none">{value}</span>
          </div>
        ))}
      </div>

      {/* ── Payment Methods ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[#24292E] text-base font-medium tracking-tight">Payment Methods</h2>
        <button className="px-3.5 py-1.5 bg-[#E0E7FF] text-[#383F45] text-[13px] font-medium rounded-xl hover:bg-[#D0DAFF] transition-colors">
          Add another account
        </button>
      </div>

      {/* Bank account management card */}
      <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
        <span className="text-[#24292E] text-xs font-normal">Bank Account Management</span>
        <p className="text-[#676E76] text-xs leading-relaxed">
          Here you can view and manage your linked bank accounts for receiving payments. You can also add new accounts, set your primary account for withdrawals, or remove any accounts no longer in use.
        </p>
        <p className="text-[#676E76] text-xs font-medium">Set primary account</p>

        <div className="flex flex-col gap-4">
          {banks.map((bank) => {
            const selected = primaryBank === bank.id;
            return (
              <div key={bank.id} className="flex items-center gap-3 px-2 py-1 rounded-xl">
                {/* Radio */}
                <button
                  onClick={() => setPrimaryBank(bank.id)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    border: `3px solid ${selected ? "#5476FC" : "#D1D5EB"}`,
                    background: "white",
                  }}
                >
                  {selected && <span className="w-3 h-3 rounded-full bg-[#5476FC] block" />}
                </button>

                {/* Bank logo */}
                <img src={bank.logo} alt={bank.name} className="w-[43px] h-[38px] object-contain shrink-0" />

                {/* Bank details */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-[#24292E] text-xs font-normal">{bank.name}</span>
                  <span className="text-[#676E76] text-[10px]">{bank.label}</span>
                  <span className="text-[#24292E] text-xs">{bank.account}</span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeBank(bank.id)}
                  title="Remove account"
                  className="shrink-0 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium hover:bg-[#D0DAFF] transition-colors">
          Cancel
        </button>
        <button className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium shadow-[0_4px_16px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_20px_rgba(84,118,252,0.35)] transition-all">
          Save Changes
        </button>
      </div>
    </>
  );
}
