"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

// ─────────────────────────────────────────────────────────────────────────
// UI SHELL ONLY — every number/row below is static mock data. No payment
// endpoints exist yet; wiring this up to real earnings/withdrawal/fee data
// is a follow-up pass. Branch names are the one thing fetched for real
// (GET /api/clinics/branches), since that's harmless, already-existing
// read-only data and makes the branch dropdown non-fake.
// ─────────────────────────────────────────────────────────────────────────

interface BranchOption { id: string; name: string; status: string; }

const HISTORY_FILTERS = ["All", "Dr's share", "Appointments", "Diagnostics/Commissions", "Canceled"] as const;
type HistoryFilter = typeof HISTORY_FILTERS[number];

const MOCK_HISTORY = [
  { id: "1", name: "Arlene McCoy", age: 32, email: "yelena@example.com", diagnosis: "Cough", note: "I've had a fever for three d...", date: "1 Feb, 2020, 11:40 PM", earning: 110.0 },
  { id: "2", name: "Cameron Williamson", age: 32, email: "yelena@example.com", diagnosis: "Asthma", note: "I've had a fever for three...", date: "22 Oct, 2020, 11:40 PM", earning: 110.0 },
  { id: "3", name: "Courtney Henry", age: 32, email: "yelena@example.com", diagnosis: "Cough", note: "I've had a fever for three d...", date: "8 Sep, 2020, 11:40 PM", earning: 110.0 },
  { id: "4", name: "Bessie Cooper", age: 32, email: "yelena@example.com", diagnosis: "Fever", note: "I've had a fever for three da...", date: "22 Oct, 2020, 11:40 PM", earning: 110.0 },
];

const DIAGNOSIS_COLORS: Record<string, string> = {
  Cough: "bg-[#E2EAFE] text-[#213159]",
  Asthma: "bg-[#FDEFE2] text-[#7A3E12]",
  Fever: "bg-[#FCE4E4] text-[#7A1212]",
};

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold text-xs shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatCard({ label, amount, pct, ofLabel }: { label: string; amount: string; pct: number; ofLabel: string }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all flex-1">
      <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">{label}</span>
      <span className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]">{amount}</span>
      <span className="text-xs font-normal tracking-[-0.24px]">
        <span className="text-[#179353] font-medium mr-1">{pct}%</span>
        <span className="text-[#707070]">{ofLabel}</span>
      </span>
    </div>
  );
}

function QuickFilterPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      {["All", "Today", "This Week", "This month"].map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={value === f ? "text-[#24292E] font-semibold" : "text-[#9EA5AD] hover:text-[#676E76]"}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

export default function ClinicPaymentPage() {
  const [activeTab, setActiveTab] = useState<"overall" | "branches">("overall");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [rangeFilter, setRangeFilter] = useState("All");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("All");

  const [showEditFee, setShowEditFee] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [editingFeeLabel, setEditingFeeLabel] = useState("General Consultation fee");

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, []);

  const selectedBranchName = branches.find((b) => b.id === selectedBranchId)?.name ?? null;

  const openEditFee = (label: string) => {
    setEditingFeeLabel(label);
    setShowEditFee(true);
  };

  return (
    <div className="px-8 py-8 w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
      <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px] mb-6">
        Payments
      </h1>

      {/* Tabs + quick range filter */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overall")}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "overall" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Overall
          </button>
          <button
            onClick={() => setActiveTab("branches")}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "branches" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Branches
          </button>
        </div>
        <QuickFilterPills value={rangeFilter} onChange={setRangeFilter} />
      </div>

      {activeTab === "branches" && (
        <div className="relative mb-6 w-fit">
          <button
            onClick={() => setShowBranchDropdown((v) => !v)}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold tracking-wide bg-[#5476FC] text-white flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
          >
            {selectedBranchName ?? "Select Branch"}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          </button>
          {showBranchDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
              <div className="absolute left-0 top-11 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-56 z-20">
                {branches.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">No active branches</div>
                ) : (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setSelectedBranchId(b.id); setShowBranchDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedBranchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {b.name}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Consultation fee */}
      {activeTab === "overall" ? (
        <div className="mb-8">
          <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Emirate wise Consultation fee</h2>
          <div className="flex flex-wrap gap-4">
            {["Emirate 1", "Emirate 2", "Emirate 3"].map((label) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                <span className="text-[13px] font-medium text-[#24292E]">{label}: 200.00</span>
                <button onClick={() => openEditFee(label)} className="text-[#5476FC] text-[12px] font-semibold hover:underline">
                  Edit
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#9EA5AD] mt-2">
            Per-emirate fees apply to single-location clinics. Once branches are set up, each branch manages its own fee under the Branches tab.
          </p>
        </div>
      ) : (
        <div className="mb-8 bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
          <span className="text-[14px] font-medium text-[#24292E]">General Consultation fee: 200.00</span>
          <button
            onClick={() => openEditFee("General Consultation fee")}
            className="px-5 py-2 bg-[#5476FC] text-white text-[12px] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            Edit Fees
          </button>
        </div>
      )}

      {/* Earnings */}
      <div className="mb-8">
        <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Earnings</h2>
        <div className="flex flex-col sm:flex-row gap-5">
          <StatCard label="Your Total Earnings" amount="AED 6,000.00" pct={60} ofLabel="Total Earnings AED 10,000.00" />
          <StatCard label="Your Total Insurance Earnings" amount="AED 60,000.00" pct={60} ofLabel="Total Earnings AED 100,000.00" />
        </div>
      </div>

      {/* Linked Bank Accounts */}
      <div className="mb-8">
        <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Linked Bank Accounts</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-[#F25252] text-[13px] font-semibold block mb-1">HDFC BANK</span>
            <span className="text-[#676E76] text-[12px]">ACCOUNT: 26873425346 · Lorem ipsum</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Change
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="px-5 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-[#383F45] text-[15px] font-medium">History</h2>
          <QuickFilterPills value={rangeFilter} onChange={setRangeFilter} />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-5">
          {HISTORY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setHistoryFilter(f)}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${historyFilter === f ? "bg-[#2E344E] text-white" : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEEF5] shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_2fr_1.2fr_1fr] gap-4 px-6 py-3 border-b border-[#EBEEF5] text-[11px] font-semibold text-[#9EA5AD] uppercase tracking-wide">
            <span>Name</span>
            <span>Diagnosis</span>
            <span>Date and Time</span>
            <span className="text-right">Earnings</span>
          </div>
          {MOCK_HISTORY.map((row) => (
            <div key={row.id} className="grid grid-cols-[2fr_2fr_1.2fr_1fr] gap-4 px-6 py-4 border-b border-[#EBEEF5] last:border-0 items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={row.name} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-[#24292E] truncate">{row.name}, {row.age} y/o</span>
                  <span className="text-[11px] text-[#9EA5AD] truncate">{row.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium shrink-0 ${DIAGNOSIS_COLORS[row.diagnosis] ?? "bg-[#F1F3F7] text-[#676E76]"}`}>
                  {row.diagnosis}
                </span>
                <span className="text-[11px] text-[#9EA5AD] truncate">{row.note}</span>
              </div>
              <span className="text-[12px] text-[#676E76]">{row.date}</span>
              <span className="text-[13px] font-semibold text-[#24292E] text-right">AED {row.earning.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit Consultation Fee modal ─────────────────────────────────── */}
      {showEditFee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
          <div className="bg-[#F7F9FC] rounded-[24px] w-[420px] p-8 shadow-2xl border border-[#EBEEF5] relative">
            <button onClick={() => setShowEditFee(false)} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Edit Consultation Fee</h2>
            <p className="text-[13px] font-semibold text-[#24292E] mb-5">{editingFeeLabel} — Current fee: 200.00</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">New Fees</label>
                <input type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Verify with OTP</label>
                <input type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
              </div>
            </div>

            <div className="mt-5 text-[11px] text-[#9EA5AD] leading-relaxed">
              <p className="font-semibold text-[#676E76] mb-1">Guide for setting a fee</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>To increase the fee again, you&apos;ll need to wait a few weeks/months.</li>
                <li>To reduce the fee, you&apos;ll need to wait a few days.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowEditFee(false)}
              className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Send for Approval
            </button>
          </div>
        </div>
      )}

      {/* ── Withdraw Amount modal ────────────────────────────────────────── */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
          <div className="bg-[#F7F9FC] rounded-[24px] w-[420px] p-8 shadow-2xl border border-[#EBEEF5] relative">
            <button onClick={() => setShowWithdraw(false)} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-1 text-center">Withdraw Amount</h2>
            <p className="text-[13px] text-[#676E76] text-center mb-6">Balance in wallet: <span className="font-semibold text-[#24292E]">AED 2,400.00</span></p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Type Amount to Withdraw</label>
                <input type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Receiver Account Details</label>
                <div className="border border-[#EBEEF5] rounded-xl px-4 py-3 bg-white flex items-center justify-between">
                  <div>
                    <span className="text-[#F25252] text-[12px] font-semibold block">HDFC BANK</span>
                    <span className="text-[#676E76] text-[11px]">ACCOUNT: 26873425346 · Lorem ipsum</span>
                  </div>
                  <button className="px-3 py-1.5 bg-black text-white text-[11px] font-semibold rounded-lg hover:bg-gray-800 transition-colors shrink-0">
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 text-[11px] text-[#9EA5AD] leading-relaxed">
              <p className="font-semibold text-[#676E76] mb-1">Guide for withdrawing the amount</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Withdrawals are processed within 2–3 business days.</li>
              </ul>
            </div>

            <button
              onClick={() => { setShowWithdraw(false); setShowOtp(true); }}
              className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm OTP modal ───────────────────────────────────────────── */}
      {showOtp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
          <div className="bg-[#F7F9FC] rounded-[24px] w-[380px] p-8 shadow-2xl border border-[#EBEEF5] relative text-center">
            <button onClick={() => setShowOtp(false)} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Confirm OTP</h2>
            <div className="text-left mb-6">
              <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Verify with OTP</label>
              <input type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
            </div>
            <button
              onClick={() => setShowOtp(false)}
              className="w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
