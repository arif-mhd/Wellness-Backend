"use client";

import Pagination from "@/components/Pagination";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const OTP_LENGTH   = 6;
const COUNTDOWN_SECS  = 600;
const RESEND_COOLDOWN = 60;

type SettingsTab =
  | "Admin Profile Settings"
  | "General Settings"
  | "Platform Fee Management"
  | "Notification Preferences"
  | "Payments"
  | "Appointment Settings"
  | "Insurance Providers"
  | "Maintenance and Updates"
  | "Security Settings"
  | "Privacy Policy and Terms";

const navigationItems: { label: SettingsTab; icon?: React.ReactNode }[] = [
  {
    label: "Admin Profile Settings",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
  },
  {
    label: "General Settings",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
    ),
  },
  {
    label: "Platform Fee Management",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
    ),
  },
  {
    label: "Notification Preferences",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
    ),
  },
  {
    label: "Payments",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" /></svg>
    ),
  },
  {
    label: "Appointment Settings",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
    ),
  },
  {
    label: "Insurance Providers",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
    ),
  },
  {
    label: "Maintenance and Updates",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 9.36l-7.1 7.1a2.12 2.12 0 0 1-3-3l7.1-7.1a6 6 0 0 1 9.36-7.94l-3.77 3.77z" /></svg>
    ),
  },
  {
    label: "Security Settings",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
  },
  {
    label: "Privacy Policy and Terms",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
  },
];

// ── Admin 2FA Modal ──────────────────────────────────────────────────────────
type ModalStep = "confirm" | "otp" | "success";

function AdminTwoFAModal({ adminEmail, onClose, onSuccess }: {
  adminEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]         = useState<ModalStep>("confirm");
  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECS);
  const [sending, setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]       = useState("");
  const [mounted, setMounted]   = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (step !== "otp" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, timeLeft]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const sendOtp = async (isResend = false) => {
    setSending(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/otp/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: adminEmail, purpose: "enable_2fa" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "TOO_SOON" ? `Wait ${data.retryAfter ?? 60}s before resending.` : "Failed to send code.");
        return;
      }
      setStep("otp");
      if (isResend) { setOtp(Array(OTP_LENGTH).fill("")); setTimeLeft(COUNTDOWN_SECS); otpRefs.current[0]?.focus(); }
    } catch { setError("Network error. Please try again."); }
    finally { setSending(false); }
  };

  const handleOtpChange = (el: HTMLInputElement, idx: number) => {
    const val = el.value;
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && otp[idx] === "" && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError("Please enter the full 6-digit code."); return; }
    setVerifying(true); setError("");
    try {
      const verRes  = await fetch(`${API_URL}/api/otp/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ email: adminEmail, code }),
      });
      const verData = await verRes.json();
      if (!verData.verified) {
        switch (verData.reason) {
          case "INVALID_CODE": setError(verData.attemptsLeft > 0 ? `Incorrect code. ${verData.attemptsLeft} attempt${verData.attemptsLeft === 1 ? "" : "s"} remaining.` : "Too many attempts."); break;
          case "EXPIRED": setError("Code expired. Request a new one."); break;
          case "TOO_MANY_ATTEMPTS": setError("Too many attempts. Request a new code."); break;
          default: setError("Verification failed. Please try again.");
        }
        return;
      }
      const enRes = await fetch(`${API_URL}/api/admin/dashboard/2fa/enable`, { method: "POST", credentials: "include" });
      if (!enRes.ok) { setError("Failed to enable 2FA."); return; }
      setStep("success");
    } catch { setError("Network error. Please try again."); }
    finally { setVerifying(false); }
  };

  const canResend = timeLeft <= COUNTDOWN_SECS - RESEND_COOLDOWN;
  if (!mounted) return null;

  const closeBtn = (
    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 10.163L3.403 15.76C3.25 15.913 3.058 15.991 2.826 15.995C2.595 15.998 2.4 15.92 2.24 15.76C2.08 15.6 2 15.407 2 15.179C2 14.951 2.08 14.757 2.24 14.597L7.837 9L2.24 3.403C2.087 3.25 2.009 3.058 2.005 2.826C2.002 2.595 2.08 2.4 2.24 2.24C2.4 2.08 2.594 2 2.821 2C3.049 2 3.243 2.08 3.403 2.24L9 7.837L14.597 2.24C14.75 2.087 14.942 2.009 15.174 2.005C15.405 2.002 15.6 2.08 15.76 2.24C15.92 2.4 16 2.59352 16 2.821C16 3.049 15.92 3.243 15.76 3.403L10.163 9L15.76 14.597C15.913 14.75 15.991 14.942 15.995 15.174C15.998 15.405 15.92 15.6 15.76 15.76C15.6 15.92 15.407 16 15.179 16C14.951 16 14.757 15.92 14.597 15.76L9 10.163Z" fill="#94a3b8"/></svg>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {step === "confirm" && (
        <div className="w-[560px] bg-white rounded-[2rem] p-8 flex flex-col gap-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#4F83FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-[17px] font-semibold text-slate-800">Enable Two-Factor Authentication</h3>
            </div>
            {closeBtn}
          </div>
          <p className="text-[12px] text-slate-400 font-medium leading-relaxed">A 6-digit code will be sent to your email each time you log in.</p>
          <div className="h-14 bg-[#f8fafc] rounded-[1.25rem] px-5 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 font-medium">Code will be sent to</span>
            <span className="text-[13px] font-semibold text-slate-800">{adminEmail}</span>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button onClick={() => sendOtp(false)} disabled={sending} className="flex-1 h-11 rounded-xl bg-[#4F83FD] hover:bg-[#3d70e6] text-white text-sm font-semibold shadow-md shadow-blue-100 transition-all disabled:opacity-60">{sending ? "Sending…" : "Send Code"}</button>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="w-[560px] bg-white rounded-[2rem] p-8 flex flex-col gap-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setStep("confirm"); setOtp(Array(OTP_LENGTH).fill("")); setError(""); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h3 className="text-[17px] font-semibold text-slate-800">Enter Verification Code</h3>
            </div>
            {closeBtn}
          </div>
          <p className="text-[12px] text-slate-400 font-medium leading-relaxed">Enter the 6-digit code sent to <span className="text-[#4F83FD] font-semibold">{adminEmail}</span>.</p>
          <div className="flex gap-2">
            {otp.map((digit, idx) => (
              <input key={idx} ref={(el) => { otpRefs.current[idx] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleOtpChange(e.target, idx)} onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`w-full h-14 rounded-xl text-center text-xl font-bold outline-none transition-all
                  ${digit ? "bg-blue-50 border-2 border-[#4F83FD] text-[#4F83FD]" : "bg-[#f8fafc] border-2 border-transparent text-slate-800"}
                  ${error ? "border-red-300 bg-red-50" : ""} focus:ring-2 focus:ring-[#4F83FD]/20 focus:border-[#4F83FD]`}
              />
            ))}
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">{timeLeft > 0 ? `Expires in ${fmt(timeLeft)}` : "Code expired"}</span>
            <button onClick={() => sendOtp(true)} disabled={!canResend || sending} className={`font-semibold transition-colors ${canResend && !sending ? "text-[#4F83FD] hover:underline" : "text-slate-300 cursor-not-allowed"}`}>{sending ? "Sending…" : "Resend"}</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors">Cancel</button>
            <button onClick={handleVerify} disabled={verifying} className="flex-1 h-11 rounded-xl bg-[#4F83FD] hover:bg-[#3d70e6] text-white text-sm font-semibold shadow-md shadow-blue-100 transition-all disabled:opacity-60">{verifying ? "Verifying…" : "Verify & Enable"}</button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="w-[560px] bg-white rounded-[2rem] p-8 flex flex-col items-center gap-5 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-[#4F83FD] flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-slate-800 mb-2">2FA Enabled Successfully</h3>
            <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-[380px]">From now on, a verification code will be sent to <span className="text-[#4F83FD] font-semibold">{adminEmail}</span> each time you log in.</p>
          </div>
          <button onClick={() => { onSuccess(); onClose(); }} className="px-8 h-11 rounded-xl bg-[#4F83FD] hover:bg-[#3d70e6] text-white text-sm font-semibold shadow-md shadow-blue-100 transition-all">Done</button>
        </div>
      )}
    </div>,
    document.body
  );
}

const mockInsurances = [
  { id: "001", name: "Daman", date: "15 May 2020, 00:12:12", status: "Active" },
  { id: "002", name: "Takaful Emarat", date: "15 May 2020, 00:12:12", status: "Disabled" },
  { id: "003", name: "Orient Insurance", date: "15 May 2020, 00:12:12", status: "Disabled" },
  { id: "004", name: "Abu Dhabi National Insur...", date: "15 May 2020, 00:12:12", status: "Disabled" },
  { id: "005", name: "Oman Insurance Company", date: "15 May 2020, 00:12:12", status: "Disabled" },
  { id: "006", name: "Dubai Insurance Company", date: "15 May 2020, 00:12:12", status: "Disabled" },
  { id: "007", name: "Noor Takaful", date: "15 May 2020, 00:12:12", status: "Disabled" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("General Settings");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // ── 2FA State ─────────────────────────────────────────────────────────────
  const [show2FA, setShow2FA]           = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [adminEmail, setAdminEmail]     = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(true);
  const [disabling, setDisabling]       = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [statusRes, meRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/dashboard/2fa/status`, { credentials: "include" }),
          fetch(`${API_URL}/api/auth/me`, { credentials: "include" }),
        ]);
        if (statusRes.ok) { const s = await statusRes.json(); setIs2FAEnabled(s.twoFactorEnabled === true); }
        if (meRes.ok) { const m = await meRes.json(); setAdminEmail(m.profile?.email ?? m.email ?? ""); }
      } catch { /* silently ignore */ }
      finally { setTwoFaLoading(false); }
    })();
  }, []);

  const handleDisable2FA = async () => {
    setDisabling(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/2fa/disable`, { method: "POST", credentials: "include" });
      if (res.ok) setIs2FAEnabled(false);
    } catch { /* silently ignore */ }
    finally { setDisabling(false); }
  };

  // Dynamic States for Forms
  const [timeZone, setTimeZone] = useState("Gulf Standard Time (GST) - UTC +4:00");
  const [currency, setCurrency] = useState("United Arab Emirates Dirham (AED)");
  const [language, setLanguage] = useState("English (UK)");

  const [withdrawalInterval, setWithdrawalInterval] = useState(30);
  const [primaryBankId, setPrimaryBankId] = useState("bank1");

  const [maxBookings, setMaxBookings] = useState(20);
  const [duration, setDuration] = useState(30);
  const [cancellationHours, setCancellationHours] = useState(1);
  const [reminderLead, setReminderLead] = useState(15);
  const [submissionDeadline, setSubmissionDeadline] = useState(15);

  const [scheduledDowntime, setScheduledDowntime] = useState("2025-07-10T00:00");
  const [backupFreq, setBackupFreq] = useState("Daily");

  const [pwdExpiration, setPwdExpiration] = useState("30 Days");
  const [reminderPeriod, setReminderPeriod] = useState("5 Days");

  const [insuranceData, setInsuranceData] = useState(mockInsurances);
  const [hoveredInsurance, setHoveredInsurance] = useState<string | null>(null);

  const [selectedFeeCategory, setSelectedFeeCategory] = useState<string | null>(null);
  const [expandedSpecialization, setExpandedSpecialization] = useState<string | null>("Nephrology");
  const [feeData, setFeeData] = useState([
    { id: "Nephrology", title: "Nephrology", date: "December 7, 2021", insurance: "10", cash: "10", effectiveDate: "2025-07-10", notes: "The new fee structure will take effect from July 10" },
    { id: "Cardiology", title: "Cardiology", date: "November 22, 2021", insurance: "10", cash: "10", effectiveDate: "", notes: "" },
    { id: "Anesthesiology", title: "Anesthesiology", date: "October 16, 2022", insurance: "20", cash: "20", effectiveDate: "", notes: "" },
    { id: "Oncology", title: "Oncology", date: "June 8, 2022", insurance: "10", cash: "10", effectiveDate: "", notes: "" },
    { id: "Physical Medicine", title: "Physical Medicine and Rehabilitation", date: "April 19, 2022", insurance: "20", cash: "20", effectiveDate: "", notes: "" },
    { id: "Hematology", title: "Hematology", date: "September 30, 2021", insurance: "5", cash: "5", effectiveDate: "", notes: "" },
    { id: "Sports Medicine", title: "Sports Medicine", date: "February 28, 2022", insurance: "20", cash: "20", effectiveDate: "", notes: "" },
    { id: "Surgery", title: "Surgery", date: "January 5, 2022", insurance: "20", cash: "20", effectiveDate: "", notes: "" },
    { id: "Geriatrics", title: "Geriatrics", date: "March 1, 2023", insurance: "10", cash: "10", effectiveDate: "", notes: "" },
    { id: "Ophthalmology", title: "Ophthalmology", date: "August 13, 2021", insurance: "10", cash: "10", effectiveDate: "", notes: "" },
  ]);

  const updateFeeData = (id: string, field: string, value: string) => {
    setFeeData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    alert(`File "${e.dataTransfer.files[0]?.name}" attached!`);
  };

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300 grid grid-cols-12 gap-8">
        
        {/* Left Navigation Panel */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
            <h1 className="text-[17px] font-medium text-slate-800 mb-1">System Configurations</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-6">
              Manage system settings, preferences, and configurations to optimize the platform's functionality and user experience.
            </p>

            <nav className="flex flex-col gap-1">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setActiveTab(item.label);
                      setSelectedFeeCategory(null);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[12px] font-medium transition-all ${
                      isActive
                        ? "text-[#6A8BFF] bg-blue-50/50"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <span className={isActive ? "text-[#6A8BFF]" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          
          {activeTab === "General Settings" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">General Settings</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-1">Time Zone</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Select your preferred timezone for scheduling and notifications.</p>
                  
                  <div className="relative">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Current Time Zone</label>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20"
                    >
                      <option>Gulf Standard Time (GST) - UTC +4:00</option>
                      <option>Greenwich Mean Time (GMT) - UTC +0:00</option>
                      <option>Eastern Standard Time (EST) - UTC -5:00</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-1">Primary Currency</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Choose the currency in which transactions will be processed.</p>
                  
                  <div className="relative">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20"
                    >
                      <option>United Arab Emirates Dirham (AED)</option>
                      <option>United States Dollar (USD)</option>
                      <option>Euro (EUR)</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-1">Default Language</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Select the system language.</p>
                  
                  <div className="relative">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20"
                    >
                      <option>English (UK)</option>
                      <option>English (US)</option>
                      <option>Arabic (AR)</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Platform Fee Management" && !selectedFeeCategory && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Platform Fee Management</h2>
              
              <div className="space-y-6">
                {[
                  { title: "Consultation Fee Management", desc: "Adjust the percentage fees for consultations, applicable to both insurance and cash payments, to streamline your billing process. This percentage will be deducted from the consultation fee set by the doctor as the platform's fee." },
                  { title: "Laboratory Fee", desc: "Adjust the percentage fees for consultations, applicable to both insurance and cash payments, to streamline your billing process. This percentage will be deducted from the consultation fee set by the doctor as the platform's fee." },
                  { title: "Pharmacy Fee", desc: "Adjust the percentage fees for consultations, applicable to both insurance and cash payments, to streamline your billing process. This percentage will be deducted from the consultation fee set by the doctor as the platform's fee." }
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                    <p className="text-[12px] font-medium text-slate-800 mb-2">{item.title}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-6 leading-relaxed max-w-[90%]">{item.desc}</p>
                    <button 
                      onClick={() => setSelectedFeeCategory(item.title)}
                      className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm"
                    >
                      Edit Fees
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Platform Fee Management" && selectedFeeCategory && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 mb-6 cursor-pointer hover:opacity-80 transition" onClick={() => setSelectedFeeCategory(null)}>
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                <h2 className="text-[15px] font-medium text-[#1e293b]">Specialization and Fee Management</h2>
              </div>

              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                <p className="text-[12px] font-medium text-slate-800 mb-2">Specialization and Fee Management</p>
                <p className="text-[11px] text-slate-400 font-medium mb-8 leading-relaxed max-w-[90%]">Adjust the percentage fees for consultations, applicable to both insurance and cash payments, to streamline your billing process. This percentage will be deducted from the consultation fee set by the doctor as the platform's fee.</p>

                <div className="grid grid-cols-12 mb-4 px-4 text-[12px] font-medium text-slate-800">
                  <div className="col-span-6">Category</div>
                  <div className="col-span-3 text-center">Insurance(%)</div>
                  <div className="col-span-3 text-center">Cash(%)</div>
                </div>

                <div className="flex flex-col gap-2">
                  {feeData.map(item => {
                    const isExpanded = expandedSpecialization === item.id;
                    return (
                      <div key={item.id} className={`rounded-[1.25rem] transition-all overflow-hidden ${isExpanded ? "bg-[#eef2ff] p-5 border border-blue-100" : "hover:bg-slate-50 cursor-pointer p-4"}`}>
                        <div 
                          className="grid grid-cols-12 items-center"
                          onClick={() => !isExpanded && setExpandedSpecialization(item.id)}
                        >
                          <div className="col-span-6 flex flex-col gap-1">
                            <span className="text-[13px] font-medium text-slate-800">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Last updated {item.date}</span>
                          </div>
                          
                          {isExpanded ? (
                            <>
                              <div className="col-span-3 px-2">
                                <input 
                                  type="text" 
                                  value={item.insurance}
                                  onChange={(e) => updateFeeData(item.id, "insurance", e.target.value)}
                                  className="w-full bg-white rounded-lg h-10 px-4 text-[13px] font-medium text-slate-800 text-center outline-none border-none shadow-sm focus:ring-2 focus:ring-[#6A8BFF]/20"
                                />
                              </div>
                              <div className="col-span-3 px-2">
                                <input 
                                  type="text" 
                                  value={item.cash}
                                  onChange={(e) => updateFeeData(item.id, "cash", e.target.value)}
                                  className="w-full bg-white rounded-lg h-10 px-4 text-[13px] font-medium text-slate-800 text-center outline-none border-none shadow-sm focus:ring-2 focus:ring-[#6A8BFF]/20"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-3 text-center text-[12px] font-medium text-[#6A8BFF]">
                                {item.insurance}
                              </div>
                              <div className="col-span-3 text-center text-[12px] font-medium text-[#6A8BFF]">
                                {item.cash}
                              </div>
                            </>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-5 grid grid-cols-12 gap-4 animate-in slide-in-from-top-2">
                            <div className="col-span-4 relative">
                              <label className="absolute top-2 left-4 text-[10px] font-medium text-slate-400 pointer-events-none">Effective Date</label>
                              <input 
                                type="date"
                                value={item.effectiveDate}
                                onChange={(e) => updateFeeData(item.id, "effectiveDate", e.target.value)}
                                className="w-full bg-white rounded-xl h-[56px] pl-4 pt-4 text-[13px] font-medium text-slate-800 outline-none border-none shadow-sm"
                              />
                            </div>
                            <div className="col-span-8 relative">
                              <label className="absolute top-2 left-4 text-[10px] font-medium text-slate-400 pointer-events-none">Notes</label>
                              <input 
                                type="text"
                                value={item.notes}
                                onChange={(e) => updateFeeData(item.id, "notes", e.target.value)}
                                placeholder="Add notes here..."
                                className="w-full bg-white rounded-xl h-[56px] pl-4 pt-4 text-[13px] font-medium text-slate-800 outline-none border-none shadow-sm placeholder:text-slate-300"
                              />
                            </div>
                            <div className="col-span-12 mt-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedSpecialization(null); }}
                                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-medium px-7 py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-95"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Payments" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Payments</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Set Withdrawal Frequency</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Control how often doctors can request withdrawals. They will only be able to withdraw once during the specified period.</p>
                  
                  <div className="max-w-xs relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Withdrawal Interval</label>
                      <input 
                        type="number" 
                        value={withdrawalInterval}
                        onChange={(e) => setWithdrawalInterval(Number(e.target.value))}
                        className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Bank Account Management</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-8 leading-relaxed max-w-[85%]">Here you can view and manage your linked bank accounts for receiving payments. You can also add new accounts, set your primary account for withdrawals, or remove any accounts no longer in use.</p>
                  
                  <p className="text-[11px] font-medium text-slate-600 mb-4">Set primary account</p>

                  <div className="space-y-6">
                    {/* Bank 1 */}
                    <div className="flex items-start gap-4">
                      <div 
                        onClick={() => setPrimaryBankId("bank1")}
                        className={`mt-1 flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer relative shrink-0 transition-colors ${primaryBankId === "bank1" ? "border-[#6A8BFF]" : "border-slate-300 hover:border-[#6A8BFF]"}`}
                      >
                        {primaryBankId === "bank1" && <div className="w-2.5 h-2.5 rounded-full bg-[#6A8BFF] animate-in zoom-in" />}
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-1.5 shadow-sm bg-white">
                           <div className="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center rotate-45">
                             <div className="w-3 h-3 bg-blue-600 rotate-45" />
                           </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[13px] font-medium text-slate-800">ABC BANK *******2345</p>
                          <p className="text-[10px] text-slate-400 font-medium">Primary Account</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-1">Account number: xxxxx xxxxx 2345</p>
                          <button className="text-red-500 hover:text-red-600 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bank 2 */}
                    <div className="flex items-start gap-4">
                      <div 
                        onClick={() => setPrimaryBankId("bank2")}
                        className={`mt-1 flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer shrink-0 transition-colors ${primaryBankId === "bank2" ? "border-[#6A8BFF]" : "border-slate-300 hover:border-[#6A8BFF]"}`}
                      >
                         {primaryBankId === "bank2" && <div className="w-2.5 h-2.5 rounded-full bg-[#6A8BFF] animate-in zoom-in" />}
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-1.5 shadow-sm bg-black">
                           <div className="w-full h-full flex items-center justify-center text-emerald-400">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                           </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[13px] font-medium text-slate-800">XYZ BANK *******2345</p>
                          <p className="text-[10px] text-slate-400 font-medium">Primary Account</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-1">Account number: xxxxx xxxxx 2345</p>
                          <button className="text-red-500 hover:text-red-600 mt-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm mt-2">
                      Add another account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Appointment Settings" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Appointment Settings</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-6">Max Bookings Per Day</p>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium mb-3">Set the maximum number of bookings allowed each day.</p>
                      <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5">
                        <div className="flex flex-col w-full">
                          <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Max Bookings</label>
                          <input 
                            type="number"
                            value={maxBookings}
                            onChange={(e) => setMaxBookings(Number(e.target.value))}
                            className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium mb-3">Set the maximum duration of each consultation</p>
                      <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5">
                        <div className="flex flex-col w-full">
                          <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Duration (in Minutes)</label>
                          <input 
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Cancellation Policy</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-5">Define how many hours before an appointment can be canceled without penalty.</p>
                  <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5 max-w-md">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Hour(s)</label>
                      <input 
                        type="number"
                        value={cancellationHours}
                        onChange={(e) => setCancellationHours(Number(e.target.value))}
                        className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Reminder Lead Time</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-5">Set how much time before the appointment a reminder should be sent.</p>
                  <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5 max-w-md">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Lead Time (in mins)</label>
                      <input 
                        type="number"
                        value={reminderLead}
                        onChange={(e) => setReminderLead(Number(e.target.value))}
                        className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Pre-Visit Form Submission Deadline</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-5 max-w-[90%] leading-relaxed">Define the time limit for patients to submit their pre-visit forms before their scheduled appointment. Ensuring timely submissions helps doctors prepare effectively for consultations.</p>
                  <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5 max-w-md">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Submission Deadline (in mins)</label>
                      <input 
                        type="number"
                        value={submissionDeadline}
                        onChange={(e) => setSubmissionDeadline(Number(e.target.value))}
                        className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Maintenance and Updates" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Maintenance and Updates</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Scheduled Downtime</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Set the date and time for system maintenance.</p>
                  
                  <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center justify-between px-5 max-w-md">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400 pointer-events-none">Scheduled Downtime</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledDowntime}
                        onChange={(e) => setScheduledDowntime(e.target.value)}
                        className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full" 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-1">Backup Frequency</p>
                  <p className="text-[11px] text-slate-600 font-medium mb-6">Last backup: <span className="text-[#6A8BFF]">10 July, 2025 00:00:00</span></p>
                  
                  <div className="flex flex-col gap-4">
                    {["Daily", "Weekly", "Monthly"].map((freq) => (
                      <label key={freq} onClick={() => setBackupFreq(freq)} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center transition-colors ${backupFreq === freq ? "border-[#6A8BFF]" : "border-slate-200 group-hover:border-slate-300"}`}>
                          {backupFreq === freq && <div className="w-2.5 h-2.5 rounded-full bg-[#6A8BFF] animate-in zoom-in" />}
                        </div>
                        <span className="text-[12px] font-medium text-slate-800">{freq}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Security Settings" && (
            <div className="animate-in fade-in duration-200">
              {show2FA && adminEmail && (
                <AdminTwoFAModal
                  adminEmail={adminEmail}
                  onClose={() => setShow2FA(false)}
                  onSuccess={() => setIs2FAEnabled(true)}
                />
              )}
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Security Settings</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Password Expiration Policy</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Select how often users are required to change their passwords.</p>
                  
                  <div className="relative mb-6">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Number of Days</label>
                    <select
                      value={pwdExpiration}
                      onChange={(e) => setPwdExpiration(e.target.value)}
                      className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20"
                    >
                      <option>30 Days</option>
                      <option>60 Days</option>
                      <option>90 Days</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>

                  <p className="text-[12px] font-medium text-slate-800 mb-2">Reminder Period</p>
                  <div className="relative">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Number of Days</label>
                    <select
                      value={reminderPeriod}
                      onChange={(e) => setReminderPeriod(e.target.value)}
                      className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20"
                    >
                      <option>5 Days</option>
                      <option>10 Days</option>
                      <option>15 Days</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* ── Two-Factor Authentication Card ── */}
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6 leading-relaxed max-w-[90%]">
                    Add an extra layer of security to your admin account. When enabled, a verification code will be sent to your registered email every time you log in — in addition to your password.
                  </p>

                  {twoFaLoading ? (
                    <div className="w-5 h-5 border-2 border-[#4F83FD] border-t-transparent rounded-full animate-spin" />
                  ) : is2FAEnabled ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-[#4F83FD] text-[12px] font-semibold rounded-xl">
                        <span className="w-2 h-2 rounded-full bg-[#4F83FD] animate-pulse" />
                        2FA Enabled
                      </div>
                      <button
                        onClick={handleDisable2FA}
                        disabled={disabling}
                        className="text-red-500 text-[12px] font-semibold hover:underline disabled:opacity-50"
                      >
                        {disabling ? "Disabling…" : "Disable 2FA"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShow2FA(true)}
                      disabled={!adminEmail}
                      className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4F83FD] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Privacy Policy and Terms" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Privacy Policy and Terms</h2>
              
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Privacy Policy</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed max-w-[95%]">Please upload an HTML file containing the privacy policy. This file will allow for advanced formatting, including headers, links, and styling, ensuring a professional and readable document for users. The uploaded privacy policy will be displayed on the platform.</p>
                  <p className="text-[11px] text-slate-600 font-medium mb-6">Last updated: <span className="text-[#6A8BFF]">10 July, 2025 00:00:00</span></p>

                  <div 
                    className="w-full border border-dashed border-[#6A8BFF]/40 bg-blue-50/20 hover:bg-blue-50/40 transition-colors rounded-[1rem] p-10 flex flex-col items-center justify-center cursor-pointer mb-5"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <svg className="w-5 h-5 text-[#6A8BFF] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-[13px] font-medium text-[#6A8BFF] mb-1">Drop your HTML here</p>
                    <p className="text-[11px] text-[#6A8BFF]/70 font-medium">Accepted Formats: HTML</p>
                    <p className="text-[11px] text-[#6A8BFF]/70 font-medium">File Size Limit: Maximum file size: 5 MB</p>
                  </div>
                  
                  <button className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm">
                    Preview Now
                  </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Terms and Conditions</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed max-w-[95%]">Please upload an HTML file containing the privacy policy. This file will allow for advanced formatting, including headers, links, and styling, ensuring a professional and readable document for users. The uploaded privacy policy will be displayed on the platform.</p>
                  <p className="text-[11px] text-slate-600 font-medium mb-6">Last updated: <span className="text-[#6A8BFF]">10 July, 2025 00:00:00</span></p>

                  <div 
                    className="w-full border border-dashed border-[#6A8BFF]/40 bg-blue-50/20 hover:bg-blue-50/40 transition-colors rounded-[1rem] p-10 flex flex-col items-center justify-center cursor-pointer mb-5"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <svg className="w-5 h-5 text-[#6A8BFF] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-[13px] font-medium text-[#6A8BFF] mb-1">Drop your HTML here</p>
                    <p className="text-[11px] text-[#6A8BFF]/70 font-medium">Accepted Formats: HTML</p>
                    <p className="text-[11px] text-[#6A8BFF]/70 font-medium">File Size Limit: Maximum file size: 5 MB</p>
                  </div>
                  
                  <button className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm">
                    Preview Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Insurance Providers" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Insurance providers</h2>
              
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8 min-h-[600px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                      Status
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button className="text-slate-400 hover:text-slate-700 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-700">
                          <th className="pb-4 pt-1 font-medium pl-2 w-[15%]">Provider ID</th>
                          <th className="pb-4 pt-1 font-medium w-[30%]">Provider name</th>
                          <th className="pb-4 pt-1 font-medium w-[30%]">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">
                              Last updated 
                              <div className="flex flex-col items-center gap-[0.5px] opacity-70 shrink-0">
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
                              </div>
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-medium w-[25%]">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">
                              Status 
                              <div className="flex flex-col items-center gap-[0.5px] opacity-70 shrink-0">
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {insuranceData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((provider) => (
                          <tr
                            key={provider.id}
                            onMouseEnter={() => setHoveredInsurance(provider.id)}
                            onMouseLeave={() => setHoveredInsurance(null)}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors h-[72px]"
                          >
                            <td className="py-2 pl-2 text-[13px] text-slate-500 font-medium">
                              {provider.id}
                            </td>
                            <td className="py-2 text-[13px] font-medium text-slate-800">
                              {provider.name}
                            </td>
                            <td className="py-2 text-[13px] text-slate-500 font-medium">
                              {provider.date}
                            </td>
                            <td className="py-2 pr-2 relative">
                              <div className="flex items-center justify-between min-w-[120px] pr-2">
                                <span className={`text-[12px] font-medium ${provider.status === "Active" ? "text-emerald-500" : "text-rose-500"}`}>
                                  {provider.status}
                                </span>
                                {hoveredInsurance === provider.id && (
                                  provider.status === "Active" ? (
                                    <button 
                                      onClick={() => setInsuranceData(prev => prev.map(p => p.id === provider.id ? { ...p, status: "Disabled" } : p))}
                                      className="px-5 py-1.5 rounded-full border border-rose-500 text-rose-500 text-[11px] font-medium hover:bg-rose-50 transition-colors bg-white shadow-sm ml-4"
                                    >
                                      Disable
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => setInsuranceData(prev => prev.map(p => p.id === provider.id ? { ...p, status: "Active" } : p))}
                                      className="px-5 py-1.5 rounded-full border border-[#1e293b] text-[#1e293b] text-[11px] font-medium hover:bg-slate-50 transition-colors bg-white shadow-sm ml-4"
                                    >
                                      Enable
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {insuranceData.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(insuranceData.length / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
            </div>
          )}

          {/* Placeholder for remaining tabs */}
          {![
            "General Settings",
            "Platform Fee Management",
            "Payments",
            "Appointment Settings",
            "Maintenance and Updates",
            "Security Settings",
            "Privacy Policy and Terms",
            "Insurance Providers"
          ].includes(activeTab) && (
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px] animate-in fade-in">
              <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <h2 className="text-[15px] font-medium text-slate-800 mb-2">{activeTab}</h2>
              <p className="text-[12px] text-slate-400 font-medium">This configuration page is currently under construction.</p>
            </div>
          )}

          {/* Bottom Action Bar (not shown on Insurance Providers) */}
          {activeTab !== "Insurance Providers" && (
            <div className="flex items-center gap-4 mt-8 animate-in fade-in duration-300">
              <button className="flex-1 max-w-xs bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#1e293b] text-[13px] font-medium py-4 rounded-[1rem] transition-colors active:scale-[0.98]">
                Cancel
              </button>
              <button className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium py-4 rounded-[1rem] shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-[0.98]">
                Save Changes
              </button>
            </div>
          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}
