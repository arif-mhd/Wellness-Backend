"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch, API_URL } from "@/lib/apiFetch";
import Session from "supertokens-web-js/recipe/session";

// ─────────────────────────────────────────────────────────────────────────
// Clinics / Doctors payment page — fully wired to real data. Fee changes go
// through OTP verification + admin approval (POST /fee-change-request);
// withdrawals are recorded with OTP verification but never call a real
// payment rail (POST /withdrawal-request) — same "real bookkeeping over a
// mocked settlement step" pattern every other payment flow in this app uses.
// ─────────────────────────────────────────────────────────────────────────

interface BranchOption { id: string; name: string; status: string; }
interface RateRow { category: string; price: string; }
interface BankAccount { bankName: string; accountNumber: string; accountHolderName: string | null; }
interface PaymentSummary {
  totalEarnings: number;
  cashEarnings: number;
  insuranceEarnings: number;
  totalWithdrawn: number;
  balance: number;
  consultationRates: RateRow[];
  bankAccount: BankAccount | null;
  doctorSharePercent: number;
}
interface DoctorRow { id: string; fullName: string; specialty?: string | null; avatarUrl?: string | null; fees?: string | null; earnings: number; }
interface DoctorSummary { id: string; fullName: string; avatarUrl?: string | null; fees?: string | null; totalEarnings: number; cashEarnings: number; insuranceEarnings: number; }
interface HistoryRow {
  id: string; patientName: string; patientAge: number | null; patientEmail: string;
  diagnosis: string; date: string; earning: number; status: string; doctorId: string;
  paymentMethod: "cash" | "insurance" | "pay_at_clinic"; paymentStatus?: string;
}

const HISTORY_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dr-share", label: "Dr's share" },
  { key: "appointments", label: "Appointments" },
  { key: "diagnostics-commissions", label: "Diagnostics/Commissions" },
  { key: "cancelled", label: "Canceled" },
];

const DIAGNOSIS_COLORS: Record<string, string> = {
  Cough: "bg-[#E2EAFE] text-[#213159]",
  Asthma: "bg-[#FDEFE2] text-[#7A3E12]",
  Fever: "bg-[#FCE4E4] text-[#7A1212]",
};

function fmtMoney(n: number): string {
  return `AED ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getClinicEmail(): Promise<string> {
  try {
    const r = await apiFetch("/api/clinics/me");
    const d = await r.json();
    return d.clinic?.email ?? "";
  } catch { return ""; }
}

async function sendOtp(email: string, purpose: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await Session.getAccessToken();
    const res = await fetch(`${API_URL}/api/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ email, purpose }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error === "TOO_SOON" ? `Please wait ${data.retryAfter ?? 60}s before requesting another code.` : "Failed to send code." };
    return { ok: true };
  } catch { return { ok: false, error: "Network error." }; }
}

async function verifyOtp(email: string, code: string, purpose: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await Session.getAccessToken();
    const res = await fetch(`${API_URL}/api/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify({ email, code, purpose }),
    });
    const data = await res.json();
    if (!data.verified) {
      const msg =
        data.reason === "INVALID_CODE" ? `Incorrect code.${data.attemptsLeft ? ` ${data.attemptsLeft} attempt(s) remaining.` : ""}` :
        data.reason === "EXPIRED" ? "Code expired. Please request a new one." :
        data.reason === "TOO_MANY_ATTEMPTS" ? "Too many attempts. Please request a new code." :
        "Verification failed.";
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch { return { ok: false, error: "Network error." }; }
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold text-xs shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatCard({ label, amount, sub }: { label: string; amount: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all flex-1">
      <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">{label}</span>
      <span className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]">{amount}</span>
      <span className="text-xs font-normal tracking-[-0.24px] text-[#9EA5AD]">{sub}</span>
    </div>
  );
}

function QuickFilterPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      {["All", "Today", "This Week", "This month"].map((f) => (
        <button key={f} onClick={() => onChange(f)} className={value === f ? "text-[#24292E] font-semibold" : "text-[#9EA5AD] hover:text-[#676E76]"}>
          {f}
        </button>
      ))}
    </div>
  );
}

function within(date: string, range: string): boolean {
  if (range === "All") return true;
  const d = new Date(date);
  const now = new Date();
  if (range === "Today") return d.toDateString() === now.toDateString();
  if (range === "This Week") { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); return d >= start; }
  if (range === "This month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

// ─── History list (shared between Clinics tab and a selected doctor) ──────
function HistoryList({ branchId, doctorId }: { branchId: string | null; doctorId?: string | null }) {
  const [filter, setFilter] = useState("all");
  const [range, setRange] = useState("All");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category", filter);
      if (branchId) params.set("branchId", branchId);
      if (doctorId) params.set("doctorId", doctorId);
      const r = await apiFetch(`/api/clinics/payments/history?${params.toString()}`);
      const d = await r.json();
      setRows(Array.isArray(d.history) ? d.history : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [filter, branchId, doctorId]);

  const handleMarkPaid = useCallback(async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await apiFetch(`/api/appointments/${id}/mark-paid`, { method: "PATCH" });
      if (res.ok) await fetchHistory();
    } catch { /* best-effort */ }
    finally { setMarkingPaidId(null); }
  }, [fetchHistory]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const visible = useMemo(() => rows.filter((r) => within(r.date, range)), [rows, range]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-[#383F45] text-[15px] font-medium">History</h2>
        <QuickFilterPills value={range} onChange={setRange} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-5">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${filter === f.key ? "bg-[#2E344E] text-white" : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEEF5] shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_2fr_1.2fr_1fr] gap-4 px-6 py-3 border-b border-[#EBEEF5] text-[11px] font-semibold text-[#9EA5AD] uppercase tracking-wide">
          <span>Name</span>
          <span>Diagnosis</span>
          <span>Date and Time</span>
          <span className="text-right">Earnings</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[#9EA5AD]">Loading…</div>
        ) : filter === "diagnostics-commissions" ? (
          <div className="py-16 text-center text-[13px] text-[#9EA5AD] px-6">
            Diagnostics &amp; lab-referral commissions aren&apos;t tracked yet — nothing to show here.
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#9EA5AD]">No records found.</div>
        ) : (
          visible.map((row) => (
            <div key={row.id} className="flex flex-col md:grid md:grid-cols-[2fr_2fr_1.2fr_1fr] gap-2 md:gap-4 px-6 py-4 border-b border-[#EBEEF5] last:border-0 md:items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={row.patientName} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-[#24292E] truncate">{row.patientName}{row.patientAge != null ? `, ${row.patientAge} y/o` : ""}</span>
                  <span className="text-[11px] text-[#9EA5AD] truncate">{row.patientEmail}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium shrink-0 ${DIAGNOSIS_COLORS[row.diagnosis] ?? "bg-[#F1F3F7] text-[#676E76]"}`}>
                  {row.diagnosis}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                  row.paymentMethod === "insurance" ? "bg-[#E9F6EE] text-[#179353]" :
                  row.paymentMethod === "pay_at_clinic" ? "bg-[#FFF7ED] text-[#C2761D]" :
                  "bg-[#F1F3F7] text-[#676E76]"
                }`}>
                  {row.paymentMethod === "insurance" ? "Insurance" : row.paymentMethod === "pay_at_clinic" ? "Pay at Clinic" : "Cash"}
                </span>
                {row.paymentMethod === "pay_at_clinic" && row.paymentStatus !== "paid" && (
                  <button
                    onClick={() => handleMarkPaid(row.id)}
                    disabled={markingPaidId === row.id}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 bg-[#5476FC] text-white hover:bg-[#4065FB] disabled:opacity-50 transition-colors"
                  >
                    {markingPaidId === row.id ? "Marking…" : "Mark Paid"}
                  </button>
                )}
                {row.status === "cancelled" && <span className="text-[10.5px] text-[#F25252] font-medium shrink-0">Cancelled</span>}
              </div>
              <span className="text-[12px] text-[#676E76]">{row.date ? new Date(row.date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
              <span className="text-[13px] font-semibold text-[#24292E] md:text-right">{fmtMoney(row.earning)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Edit Fee modal (clinic rate or doctor fee, both go through approval) ──
type FeeStep = "input" | "otp" | "success";

function EditFeeModal({
  label, currentValue, email, onSubmit, onClose,
}: {
  label: string; currentValue: string; email: string;
  onSubmit: (newValue: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<FeeStep>("input");
  const [newValue, setNewValue] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!newValue.trim()) { setError("Enter a new fee amount."); return; }
    setBusy(true); setError("");
    const res = await sendOtp(email, "clinic_fee_change");
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Failed to send code."); return; }
    setStep("otp");
  };

  const handleVerifyAndSubmit = async () => {
    if (otp.trim().length < 6) { setError("Enter the full 6-digit code."); return; }
    setBusy(true); setError("");
    const v = await verifyOtp(email, otp.trim(), "clinic_fee_change");
    if (!v.ok) { setBusy(false); setError(v.error ?? "Verification failed."); return; }
    const r = await onSubmit(newValue.trim());
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Failed to submit request."); return; }
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F7F9FC] rounded-[24px] w-full max-w-[420px] p-8 shadow-2xl border border-[#EBEEF5] relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        {step === "input" && (
          <>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Edit Consultation Fee</h2>
            <p className="text-[13px] font-semibold text-[#24292E] mb-5">{label} — Current fee: {currentValue || "—"}</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">New Fees</label>
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
            <div className="mt-5 text-[11px] text-[#9EA5AD] leading-relaxed">
              <p className="font-semibold text-[#676E76] mb-1">Guide for setting a fee</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Fee changes are sent for admin approval and only apply once approved.</li>
                <li>To increase the fee again, you&apos;ll need to wait a few weeks/months.</li>
                <li>To reduce the fee, you&apos;ll need to wait a few days.</li>
              </ul>
            </div>
            <button onClick={handleSendOtp} disabled={busy} className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
              {busy ? "Sending…" : "Send Verification Code"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Verify with OTP</h2>
            <p className="text-[13px] text-[#676E76] mb-5">We&apos;ve sent a 6-digit code to <span className="font-semibold text-[#24292E]">{email}</span>.</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} type="text" inputMode="numeric" placeholder="6-digit code" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm tracking-[4px] text-center" />
            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
            <button onClick={handleVerifyAndSubmit} disabled={busy} className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
              {busy ? "Submitting…" : "Send for Approval"}
            </button>
          </>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <h2 className="text-[18px] font-medium text-[#24292E] mb-2">Request Submitted</h2>
            <p className="text-[13px] text-[#676E76] mb-6">Your fee change is pending admin approval. You&apos;ll be notified once it&apos;s reviewed.</p>
            <button onClick={onClose} className="w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bank Account modal (no OTP — plain "Change" flow) ─────────────────────
function BankAccountModal({ current, onSubmit, onClose }: { current: BankAccount | null; onSubmit: (b: BankAccount) => Promise<{ ok: boolean; error?: string }>; onClose: () => void; }) {
  const [bankName, setBankName] = useState(current?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(current?.accountNumber ?? "");
  const [accountHolderName, setAccountHolderName] = useState(current?.accountHolderName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!bankName.trim() || !accountNumber.trim()) { setError("Bank name and account number are required."); return; }
    setBusy(true); setError("");
    const r = await onSubmit({ bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolderName: accountHolderName.trim() || null });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Failed to save."); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F7F9FC] rounded-[24px] w-full max-w-[420px] p-8 shadow-2xl border border-[#EBEEF5] relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Bank Account Details</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Bank Name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Account Number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Account Holder Name</label>
            <input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} type="text" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
          </div>
        </div>
        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        <button onClick={handleSave} disabled={busy} className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Doctor Share modal (no OTP — same permission gate as fees) ────────────
function DoctorShareModal({ current, onSubmit, onClose }: { current: number; onSubmit: (pct: number) => Promise<{ ok: boolean; error?: string }>; onClose: () => void; }) {
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) { setError("Enter a percentage between 0 and 100."); return; }
    setBusy(true); setError("");
    const r = await onSubmit(n);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Failed to save."); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F7F9FC] rounded-[24px] w-full max-w-[380px] p-8 shadow-2xl border border-[#EBEEF5] relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <h2 className="text-[18px] font-medium text-[#24292E] mb-2">Doctor&apos;s Share of Earnings</h2>
        <p className="text-[12px] text-[#676E76] mb-5">The percentage of each consultation fee paid out to the treating doctor.</p>
        <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))} type="text" inputMode="decimal" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        <button onClick={handleSave} disabled={busy} className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Withdraw modal (amount → OTP → real withdrawal-request record) ────────
type WithdrawStep = "input" | "otp" | "success";

function WithdrawModal({
  balance, bankAccount, email, onSubmit, onChangeBankAccount, onClose,
}: {
  balance: number; bankAccount: BankAccount | null; email: string;
  onSubmit: (amount: number) => Promise<{ ok: boolean; error?: string }>;
  onChangeBankAccount: () => void; onClose: () => void;
}) {
  const [step, setStep] = useState<WithdrawStep>("input");
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    const n = Number(amount);
    if (!n || n <= 0) { setError("Enter a valid amount."); return; }
    if (n > balance) { setError("Amount exceeds available balance."); return; }
    if (!bankAccount) { setError("Add a bank account before withdrawing."); return; }
    setBusy(true); setError("");
    const res = await sendOtp(email, "clinic_withdrawal");
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Failed to send code."); return; }
    setStep("otp");
  };

  const handleVerifyAndSubmit = async () => {
    if (otp.trim().length < 6) { setError("Enter the full 6-digit code."); return; }
    setBusy(true); setError("");
    const v = await verifyOtp(email, otp.trim(), "clinic_withdrawal");
    if (!v.ok) { setBusy(false); setError(v.error ?? "Verification failed."); return; }
    const r = await onSubmit(Number(amount));
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Withdrawal failed."); return; }
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#24292E]/40 backdrop-blur-sm p-4">
      <div className="bg-[#F7F9FC] rounded-[24px] w-full max-w-[420px] p-8 shadow-2xl border border-[#EBEEF5] relative text-left">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#676E76] hover:text-black transition-colors" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        {step === "input" && (
          <>
            <h2 className="text-[18px] font-medium text-[#24292E] mb-1 text-center">Withdraw Amount</h2>
            <p className="text-[13px] text-[#676E76] text-center mb-6">Balance in wallet: <span className="font-semibold text-[#24292E]">{fmtMoney(balance)}</span></p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Type Amount to Withdraw</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} type="text" inputMode="decimal" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Receiver Account Details</label>
                {bankAccount ? (
                  <div className="border border-[#EBEEF5] rounded-xl px-4 py-3 bg-white flex items-center justify-between">
                    <div>
                      <span className="text-[#F25252] text-[12px] font-semibold block">{bankAccount.bankName.toUpperCase()}</span>
                      <span className="text-[#676E76] text-[11px]">ACCOUNT: {bankAccount.accountNumber}{bankAccount.accountHolderName ? ` · ${bankAccount.accountHolderName}` : ""}</span>
                    </div>
                    <button onClick={onChangeBankAccount} className="px-3 py-1.5 bg-black text-white text-[11px] font-semibold rounded-lg hover:bg-gray-800 transition-colors shrink-0">Change</button>
                  </div>
                ) : (
                  <button onClick={onChangeBankAccount} className="w-full border border-dashed border-[#EBEEF5] rounded-xl px-4 py-3 bg-white text-[12px] text-[#5476FC] font-semibold hover:bg-slate-50 transition-colors">
                    + Add Bank Account
                  </button>
                )}
              </div>
            </div>
            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
            <div className="mt-5 text-[11px] text-[#9EA5AD] leading-relaxed">
              <p className="font-semibold text-[#676E76] mb-1">Guide for withdrawing the amount</p>
              <ul className="list-disc list-inside space-y-0.5"><li>Withdrawals are processed within 2–3 business days.</li></ul>
            </div>
            <button onClick={handleSendOtp} disabled={busy} className="mt-6 w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
              {busy ? "Sending…" : "Send Verification Code"}
            </button>
          </>
        )}

        {step === "otp" && (
          <div className="text-center">
            <h2 className="text-[18px] font-medium text-[#24292E] mb-6">Confirm OTP</h2>
            <div className="text-left mb-6">
              <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Verify with OTP</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} type="text" inputMode="numeric" placeholder="6-digit code" className="w-full h-[46px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm tracking-[4px] text-center" />
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleVerifyAndSubmit} disabled={busy} className="w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
              {busy ? "Withdrawing…" : "Withdraw"}
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <h2 className="text-[18px] font-medium text-[#24292E] mb-2">Withdrawal Requested</h2>
            <p className="text-[13px] text-[#676E76] mb-6">{fmtMoney(Number(amount))} will be processed within 2–3 business days.</p>
            <button onClick={onClose} className="w-full py-3 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function ClinicPaymentPage() {
  const [activeTab, setActiveTab] = useState<"clinics" | "doctors">("clinics");
  const [email, setEmail] = useState("");
  const [hasBranches, setHasBranches] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorSummary, setDoctorSummary] = useState<DoctorSummary | null>(null);

  const [editingFee, setEditingFee] = useState<{ targetType: "clinic" | "doctor"; label: string; currentValue: string } | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [showDoctorShare, setShowDoctorShare] = useState(false);

  useEffect(() => { getClinicEmail().then(setEmail); }, []);

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : [];
        setBranches(list);
        setHasBranches(list.length > 0);
      })
      .catch(() => setBranches([]));
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError("");
    try {
      const params = selectedBranchId ? `?branchId=${selectedBranchId}` : "";
      const r = await apiFetch(`/api/clinics/payments/summary${params}`);
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        setSummaryError(r.status === 403 ? "Not authorized to view payments." : b.error ?? "Failed to load payment summary.");
        return;
      }
      setSummary(await r.json());
    } catch { setSummaryError("Could not reach the server."); }
    finally { setSummaryLoading(false); }
  }, [selectedBranchId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fetchDoctors = useCallback(async () => {
    try {
      const params = selectedBranchId ? `?branchId=${selectedBranchId}` : "";
      const r = await apiFetch(`/api/clinics/payments/doctors${params}`);
      const d = await r.json();
      setDoctors(Array.isArray(d.doctors) ? d.doctors : []);
    } catch { setDoctors([]); }
  }, [selectedBranchId]);

  useEffect(() => { if (activeTab === "doctors") fetchDoctors(); }, [activeTab, fetchDoctors]);

  const fetchDoctorSummary = useCallback(async (id: string) => {
    try {
      const r = await apiFetch(`/api/clinics/payments/doctors/${id}/summary`);
      if (!r.ok) { setDoctorSummary(null); return; }
      setDoctorSummary(await r.json());
    } catch { setDoctorSummary(null); }
  }, []);

  useEffect(() => { if (selectedDoctorId) fetchDoctorSummary(selectedDoctorId); else setDoctorSummary(null); }, [selectedDoctorId, fetchDoctorSummary]);

  const selectedBranchName = selectedBranchId ? branches.find((b) => b.id === selectedBranchId)?.name ?? null : "Overall";
  const isAggregateView = hasBranches && !selectedBranchId;

  // Every mutation below resolves scope server-side with allowAggregate:false
  // (resolveClinicScope), which requires a branchId for a multi-branch org
  // owner with no branch of their own selected — the same branchId the GET
  // calls above already thread through. Without this, submitting from a
  // multi-branch clinic 400s with "branchId is required."
  const branchQuery = selectedBranchId ? `?branchId=${selectedBranchId}` : "";

  const submitClinicFee = async (category: string, newValue: string): Promise<{ ok: boolean; error?: string }> => {
    if (!summary) return { ok: false, error: "No fee data loaded." };
    const newRates = summary.consultationRates.map((r) => (r.category === category ? { ...r, price: newValue } : r));
    try {
      const r = await apiFetch(`/api/clinics/payments/fee-change-request${branchQuery}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "clinic", newRates }),
      });
      const d = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: d.error };
    } catch { return { ok: false, error: "Network error." }; }
  };

  const submitDoctorFee = async (doctorId: string, newValue: string): Promise<{ ok: boolean; error?: string }> => {
    // No branchId here on purpose — a doctor's fee is scoped to that
    // doctor's own clinicId server-side, not to whichever branch happens to
    // be selected on the Clinics tab (the two are unrelated).
    try {
      const r = await apiFetch("/api/clinics/payments/fee-change-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "doctor", targetId: doctorId, newRates: newValue }),
      });
      const d = await r.json();
      return r.ok ? { ok: true } : { ok: false, error: d.error };
    } catch { return { ok: false, error: "Network error." }; }
  };

  const submitWithdrawal = async (amount: number): Promise<{ ok: boolean; error?: string }> => {
    try {
      const r = await apiFetch(`/api/clinics/payments/withdrawal-request${branchQuery}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      if (r.ok) { fetchSummary(); return { ok: true }; }
      return { ok: false, error: d.error };
    } catch { return { ok: false, error: "Network error." }; }
  };

  const submitBankAccount = async (bank: BankAccount): Promise<{ ok: boolean; error?: string }> => {
    try {
      const r = await apiFetch(`/api/clinics/payments/bank-account${branchQuery}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bank),
      });
      const d = await r.json();
      if (r.ok) { fetchSummary(); return { ok: true }; }
      return { ok: false, error: d.error };
    } catch { return { ok: false, error: "Network error." }; }
  };

  const submitDoctorShare = async (pct: number): Promise<{ ok: boolean; error?: string }> => {
    try {
      const r = await apiFetch(`/api/clinics/payments/doctor-share${branchQuery}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorSharePercent: pct }),
      });
      const d = await r.json();
      if (r.ok) { fetchSummary(); return { ok: true }; }
      return { ok: false, error: d.error };
    } catch { return { ok: false, error: "Network error." }; }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;

  return (
    <div className="px-4 md:px-8 py-8 w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
      <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px] mb-6">Payments</h1>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("clinics")} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "clinics" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>
            Clinics
          </button>
          <button onClick={() => setActiveTab("doctors")} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "doctors" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>
            Doctors
          </button>
        </div>
      </div>

      {summaryError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{summaryError}</div>
      )}

      {activeTab === "clinics" ? (
        <>
          {hasBranches && (
            <div className="relative mb-6 w-fit">
              <button onClick={() => setShowBranchDropdown((v) => !v)} className="px-5 py-2 rounded-xl text-[13px] font-semibold tracking-wide bg-[#5476FC] text-white flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                {selectedBranchName}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
              </button>
              {showBranchDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                  <div className="absolute left-0 top-11 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-56 z-20">
                    <button onClick={() => { setSelectedBranchId(null); setShowBranchDropdown(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${!selectedBranchId ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}>
                      Overall
                    </button>
                    {branches.map((b) => (
                      <button key={b.id} onClick={() => { setSelectedBranchId(b.id); setShowBranchDropdown(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedBranchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Consultation fees */}
          <div className="mb-8">
            <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Consultation Fees</h2>
            {isAggregateView ? (
              <p className="text-[12px] text-[#9EA5AD]">Select a specific branch above to view or edit its consultation fees.</p>
            ) : summaryLoading ? (
              <p className="text-[12px] text-[#9EA5AD]">Loading…</p>
            ) : !summary || summary.consultationRates.length === 0 ? (
              <p className="text-[12px] text-[#9EA5AD]">No consultation fees configured yet. Add them from your <a href="/clinic/profile" className="text-[#5476FC] font-semibold hover:underline">Company Info profile</a>.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {summary.consultationRates.map((rate) => (
                  <div key={rate.category} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                    <span className="text-[13px] font-medium text-[#24292E]">{rate.category}: {rate.price}</span>
                    <button onClick={() => setEditingFee({ targetType: "clinic", label: rate.category, currentValue: rate.price })} className="text-[#5476FC] text-[12px] font-semibold hover:underline">
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Earnings */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[#383F45] text-[15px] font-medium">Earnings</h2>
              {!isAggregateView && summary && (
                <button onClick={() => setShowDoctorShare(true)} className="text-[#5476FC] text-[12px] font-semibold hover:underline">
                  Doctor&apos;s Share: {summary.doctorSharePercent}% · Change
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-5">
              <StatCard label="Total Earnings" amount={summaryLoading ? "…" : fmtMoney(summary?.totalEarnings ?? 0)} sub="From completed appointments" />
              <StatCard label="Available Balance" amount={summaryLoading ? "…" : fmtMoney(summary?.balance ?? 0)} sub={`${fmtMoney(summary?.totalWithdrawn ?? 0)} withdrawn to date`} />
            </div>
          </div>

          {/* Earnings by payment method */}
          <div className="mb-8">
            <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Earnings by Payment Method</h2>
            <div className="flex flex-col sm:flex-row gap-5">
              <StatCard label="Cash Earnings" amount={summaryLoading ? "…" : fmtMoney(summary?.cashEarnings ?? 0)} sub="Paid directly by patients" />
              <StatCard label="Insurance Earnings" amount={summaryLoading ? "…" : fmtMoney(summary?.insuranceEarnings ?? 0)} sub="Billed through accepted insurance" />
            </div>
          </div>

          {/* Bank account */}
          {!isAggregateView && (
            <div className="mb-8">
              <h2 className="text-[#383F45] text-[15px] font-medium mb-3">Linked Bank Account</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between flex-wrap gap-4">
                {summary?.bankAccount ? (
                  <div>
                    <span className="text-[#F25252] text-[13px] font-semibold block mb-1">{summary.bankAccount.bankName.toUpperCase()}</span>
                    <span className="text-[#676E76] text-[12px]">ACCOUNT: {summary.bankAccount.accountNumber}{summary.bankAccount.accountHolderName ? ` · ${summary.bankAccount.accountHolderName}` : ""}</span>
                  </div>
                ) : (
                  <span className="text-[13px] text-[#9EA5AD]">No bank account linked yet.</span>
                )}
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowBankAccount(true)} className="px-4 py-2 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    {summary?.bankAccount ? "Change" : "Add"}
                  </button>
                  <button onClick={() => setShowWithdraw(true)} className="px-5 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all">
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          )}

          <HistoryList branchId={selectedBranchId} />
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Doctor roster */}
          <div className={`${selectedDoctor ? "lg:col-span-4" : "lg:col-span-12"} bg-white rounded-2xl border border-[#EBEEF5] shadow-sm overflow-hidden`}>
            {doctors.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-[#9EA5AD]">No doctors found.</div>
            ) : (
              doctors.map((d) => (
                <button key={d.id} onClick={() => setSelectedDoctorId(d.id)} className={`w-full flex items-center justify-between gap-3 px-6 py-4 border-b border-[#EBEEF5] last:border-0 hover:bg-gray-50 transition-colors text-left ${selectedDoctorId === d.id ? "bg-blue-50/50" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={d.fullName} url={d.avatarUrl} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#24292E] truncate">{d.fullName}</p>
                      {d.specialty && <p className="text-[11px] text-[#9EA5AD] truncate">{d.specialty}</p>}
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-[#24292E] shrink-0">{fmtMoney(d.earnings)}</span>
                </button>
              ))
            )}
          </div>

          {/* Doctor detail */}
          {selectedDoctor && (
            <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between flex-wrap gap-4">
                <span className="text-[14px] font-medium text-[#24292E]">General Consultation fee: {doctorSummary?.fees ?? "—"}</span>
                <button onClick={() => setEditingFee({ targetType: "doctor", label: `${selectedDoctor.fullName} — General Consultation fee`, currentValue: doctorSummary?.fees ?? "" })} className="px-5 py-2 bg-[#5476FC] text-white text-[12px] font-semibold rounded-xl shadow-sm hover:shadow-md transition-all">
                  Edit Fees
                </button>
              </div>

              <StatCard label={`${selectedDoctor.fullName}'s Total Earnings`} amount={fmtMoney(doctorSummary?.totalEarnings ?? selectedDoctor.earnings)} sub="From completed appointments" />

              <div className="flex flex-col sm:flex-row gap-5">
                <StatCard label="Cash Earnings" amount={fmtMoney(doctorSummary?.cashEarnings ?? 0)} sub="Paid directly by patients" />
                <StatCard label="Insurance Earnings" amount={fmtMoney(doctorSummary?.insuranceEarnings ?? 0)} sub="Billed through accepted insurance" />
              </div>

              <HistoryList branchId={selectedBranchId} doctorId={selectedDoctor.id} />
            </div>
          )}
        </div>
      )}

      {editingFee && (
        <EditFeeModal
          label={editingFee.label}
          currentValue={editingFee.currentValue}
          email={email}
          onClose={() => setEditingFee(null)}
          onSubmit={(newValue) => editingFee.targetType === "clinic" ? submitClinicFee(editingFee.label, newValue) : submitDoctorFee(selectedDoctor!.id, newValue)}
        />
      )}

      {showWithdraw && summary && (
        <WithdrawModal
          balance={summary.balance}
          bankAccount={summary.bankAccount}
          email={email}
          onSubmit={submitWithdrawal}
          onChangeBankAccount={() => { setShowWithdraw(false); setShowBankAccount(true); }}
          onClose={() => setShowWithdraw(false)}
        />
      )}

      {showBankAccount && (
        <BankAccountModal current={summary?.bankAccount ?? null} onSubmit={submitBankAccount} onClose={() => setShowBankAccount(false)} />
      )}

      {showDoctorShare && summary && (
        <DoctorShareModal current={summary.doctorSharePercent} onSubmit={submitDoctorShare} onClose={() => setShowDoctorShare(false)} />
      )}
    </div>
  );
}
