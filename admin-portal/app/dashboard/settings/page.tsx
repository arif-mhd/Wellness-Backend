"use client";

import Pagination from "@/components/Pagination";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";
import { useAdminProfile } from "@/context/AdminProfileContext";

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

// ── Shared save-bar ────────────────────────────────────────────────────────────
function SaveBar({ onCancel, onSave, saving, saved }: { onCancel: () => void; onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-4 mt-8">
      <button onClick={onCancel} disabled={saving} className="flex-1 max-w-xs bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#1e293b] text-[13px] font-medium py-4 rounded-[1rem] transition-colors disabled:opacity-50">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium py-4 rounded-[1rem] shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
        {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saved ? "Saved ✓" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Notification toggle row ────────────────────────────────────────────────────
function NotifToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{desc}</p>
      </div>
      <button onClick={onChange}
        className={`relative w-[42px] h-[24px] rounded-full shrink-0 transition-all duration-200 ${checked ? "bg-[#6A8BFF]" : "bg-slate-200"}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? "left-[21px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}

const NOTIF_TOGGLES = [
  { key: "newDoctorRegistration",  label: "New Doctor Registrations", desc: "Receive alerts when new doctors submit registration applications" },
  { key: "sosAlerts",              label: "SOS Alerts", desc: "Get notified when a patient triggers an SOS emergency" },
  { key: "newPatientRegistration", label: "New Patient Registrations", desc: "Receive alerts when new patients join the platform" },
  { key: "appointmentAlerts",      label: "Appointment Alerts", desc: "Get notified on appointment bookings, cancellations and updates" },
  { key: "systemAlerts",           label: "System Alerts", desc: "Critical platform and infrastructure notifications" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { updateProfile } = useAdminProfile();

  const [activeTab, setActiveTab] = useState<SettingsTab>("General Settings");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // ── Loading / saving state ─────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ── Admin profile ──────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileTimezone, setProfileTimezone] = useState("Gulf Standard Time (GST) - UTC +4:00");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // originals for cancel
  const [origProfile, setOrigProfile] = useState({ name: "", phone: "", timezone: "Gulf Standard Time (GST) - UTC +4:00" });

  // ── 2FA State ─────────────────────────────────────────────────────────────
  const [show2FA, setShow2FA]           = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [adminEmail, setAdminEmail]     = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(true);
  const [disabling, setDisabling]       = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [statusRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/dashboard/2fa/status`, { credentials: "include" }),
          apiFetch("/api/admin/settings/profile"),
        ]);
        if (statusRes.ok) { const s = await statusRes.json(); setIs2FAEnabled(s.twoFactorEnabled === true); }
        if (profileRes.ok) { const p = await profileRes.json(); setAdminEmail(p.profile?.email ?? ""); }
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

  // ── General settings ───────────────────────────────────────────────────────
  const [timeZone, setTimeZone] = useState("Gulf Standard Time (GST) - UTC +4:00");
  const [currency, setCurrency] = useState("United Arab Emirates Dirham (AED)");
  const [language, setLanguage] = useState("English (UK)");
  const [origGeneral, setOrigGeneral] = useState({ timeZone: "Gulf Standard Time (GST) - UTC +4:00", currency: "United Arab Emirates Dirham (AED)", language: "English (UK)" });

  // ── Notification preferences ───────────────────────────────────────────────
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_TOGGLES.map(t => [t.key, true]))
  );
  const [origNotifToggles, setOrigNotifToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_TOGGLES.map(t => [t.key, true]))
  );

  // ── Appointment settings ───────────────────────────────────────────────────
  const [maxBookings, setMaxBookings] = useState(20);
  const [duration, setDuration] = useState(30);
  const [cancellationHours, setCancellationHours] = useState(1);
  const [reminderLead, setReminderLead] = useState(15);
  const [submissionDeadline, setSubmissionDeadline] = useState(15);
  const [origAppt, setOrigAppt] = useState({ maxBookings: 20, duration: 30, cancellationHours: 1, reminderLead: 15, submissionDeadline: 15 });

  // ── Maintenance ────────────────────────────────────────────────────────────
  const [scheduledDowntime, setScheduledDowntime] = useState("2025-07-10T00:00");
  const [backupFreq, setBackupFreq] = useState("Daily");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [origMaint, setOrigMaint] = useState({ scheduledDowntime: "2025-07-10T00:00", backupFreq: "Daily" });

  // ── Security ───────────────────────────────────────────────────────────────
  const [pwdExpiration, setPwdExpiration] = useState("30 Days");
  const [reminderPeriod, setReminderPeriod] = useState("5 Days");
  const [origSecurity, setOrigSecurity] = useState({ pwdExpiration: "30 Days", reminderPeriod: "5 Days" });

  // ── Privacy policy & terms ─────────────────────────────────────────────────
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [privacyPolicyUpdatedAt, setPrivacyPolicyUpdatedAt] = useState<string | null>(null);
  const [termsUpdatedAt, setTermsUpdatedAt] = useState<string | null>(null);
  const [policyUploading, setPolicyUploading] = useState(false);
  const [termsUploading, setTermsUploading] = useState(false);
  const privacyInputRef = useRef<HTMLInputElement>(null);
  const termsInputRef = useRef<HTMLInputElement>(null);

  // ── Platform fee management (UI only — not wired as per instructions) ──────
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

  // ── Payments (UI only — not wired as per instructions) ─────────────────────
  const [withdrawalInterval, setWithdrawalInterval] = useState(30);
  const [primaryBankId, setPrimaryBankId] = useState("bank1");

  // ── Insurance providers (UI only — not wired as per instructions) ──────────
  const [insuranceData, setInsuranceData] = useState(mockInsurances);
  const [hoveredInsurance, setHoveredInsurance] = useState<string | null>(null);

  // ── Load all data on mount ─────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, platformRes] = await Promise.all([
        apiFetch("/api/admin/settings/profile"),
        apiFetch("/api/admin/settings/platform"),
      ]);

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        const pName = profile.fullName ?? "";
        const pPhone = profile.phone ?? "";
        const pTz = profile.timezone ?? "Gulf Standard Time (GST) - UTC +4:00";
        const pEmail = profile.email ?? "";
        setProfileName(pName);
        setProfilePhone(pPhone);
        setProfileTimezone(pTz);
        setProfileEmail(pEmail);
        setProfileAvatarUrl(profile.avatarUrl ?? "");
        setOrigProfile({ name: pName, phone: pPhone, timezone: pTz });
      }

      if (platformRes.ok) {
        const { settings } = await platformRes.json();

        // General
        if (settings.general) {
          const g = settings.general;
          setTimeZone(g.timeZone ?? "Gulf Standard Time (GST) - UTC +4:00");
          setCurrency(g.currency ?? "United Arab Emirates Dirham (AED)");
          setLanguage(g.language ?? "English (UK)");
          setOrigGeneral({ timeZone: g.timeZone ?? "Gulf Standard Time (GST) - UTC +4:00", currency: g.currency ?? "United Arab Emirates Dirham (AED)", language: g.language ?? "English (UK)" });
        }

        // Notification preferences
        if (settings.notificationPreferences) {
          const merged = { ...Object.fromEntries(NOTIF_TOGGLES.map(t => [t.key, true])), ...settings.notificationPreferences };
          setNotifToggles(merged);
          setOrigNotifToggles({ ...merged });
        }

        // Appointment settings
        if (settings.appointment) {
          const a = settings.appointment;
          const vals = { maxBookings: a.maxBookings ?? 20, duration: a.duration ?? 30, cancellationHours: a.cancellationHours ?? 1, reminderLead: a.reminderLead ?? 15, submissionDeadline: a.submissionDeadline ?? 15 };
          setMaxBookings(vals.maxBookings);
          setDuration(vals.duration);
          setCancellationHours(vals.cancellationHours);
          setReminderLead(vals.reminderLead);
          setSubmissionDeadline(vals.submissionDeadline);
          setOrigAppt(vals);
        }

        // Maintenance
        if (settings.maintenance) {
          const m = settings.maintenance;
          const vals = { scheduledDowntime: m.scheduledDowntime ?? "2025-07-10T00:00", backupFreq: m.backupFreq ?? "Daily" };
          setScheduledDowntime(vals.scheduledDowntime);
          setBackupFreq(vals.backupFreq);
          setLastBackup(m.lastBackupAt ?? null);
          setOrigMaint(vals);
        }

        // Security
        if (settings.security) {
          const s = settings.security;
          const vals = { pwdExpiration: s.pwdExpiration ?? "30 Days", reminderPeriod: s.reminderPeriod ?? "5 Days" };
          setPwdExpiration(vals.pwdExpiration);
          setReminderPeriod(vals.reminderPeriod);
          setOrigSecurity(vals);
        }

        // Privacy policy & terms
        if (settings.privacyPolicyUrl) setPrivacyPolicyUrl(settings.privacyPolicyUrl);
        if (settings.termsUrl) setTermsUrl(settings.termsUrl);
        if (settings.privacyPolicyUpdatedAt) setPrivacyPolicyUpdatedAt(settings.privacyPolicyUpdatedAt);
        if (settings.termsUpdatedAt) setTermsUpdatedAt(settings.termsUpdatedAt);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  // ── Save functions per tab ─────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: profileName, phone: profilePhone, timezone: profileTimezone }),
      });
      if (!res.ok) throw new Error();
      setOrigProfile({ name: profileName, phone: profilePhone, timezone: profileTimezone });
      updateProfile({ name: profileName });
      flashSaved();
    } catch { setError("Failed to save profile."); }
    finally { setSaving(false); }
  };

  const saveGeneral = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ general: { timeZone, currency, language } }),
      });
      if (!res.ok) throw new Error();
      setOrigGeneral({ timeZone, currency, language });
      flashSaved();
    } catch { setError("Failed to save general settings."); }
    finally { setSaving(false); }
  };

  const saveNotifications = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPreferences: notifToggles }),
      });
      if (!res.ok) throw new Error();
      setOrigNotifToggles({ ...notifToggles });
      flashSaved();
    } catch { setError("Failed to save notification preferences."); }
    finally { setSaving(false); }
  };

  const saveAppointment = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment: { maxBookings, duration, cancellationHours, reminderLead, submissionDeadline } }),
      });
      if (!res.ok) throw new Error();
      setOrigAppt({ maxBookings, duration, cancellationHours, reminderLead, submissionDeadline });
      flashSaved();
    } catch { setError("Failed to save appointment settings."); }
    finally { setSaving(false); }
  };

  const saveMaintenance = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: { scheduledDowntime, backupFreq } }),
      });
      if (!res.ok) throw new Error();
      setOrigMaint({ scheduledDowntime, backupFreq });
      flashSaved();
    } catch { setError("Failed to save maintenance settings."); }
    finally { setSaving(false); }
  };

  const saveSecurity = async () => {
    setSaving(true); setError("");
    try {
      const res = await apiFetch("/api/admin/settings/platform", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ security: { pwdExpiration, reminderPeriod } }),
      });
      if (!res.ok) throw new Error();
      setOrigSecurity({ pwdExpiration, reminderPeriod });
      flashSaved();
    } catch { setError("Failed to save security settings."); }
    finally { setSaving(false); }
  };

  // ── Cancel functions per tab ───────────────────────────────────────────────
  const cancelByTab = () => {
    setError("");
    if (activeTab === "Admin Profile Settings") {
      setProfileName(origProfile.name); setProfilePhone(origProfile.phone); setProfileTimezone(origProfile.timezone);
    } else if (activeTab === "General Settings") {
      setTimeZone(origGeneral.timeZone); setCurrency(origGeneral.currency); setLanguage(origGeneral.language);
    } else if (activeTab === "Notification Preferences") {
      setNotifToggles({ ...origNotifToggles });
    } else if (activeTab === "Appointment Settings") {
      setMaxBookings(origAppt.maxBookings); setDuration(origAppt.duration); setCancellationHours(origAppt.cancellationHours);
      setReminderLead(origAppt.reminderLead); setSubmissionDeadline(origAppt.submissionDeadline);
    } else if (activeTab === "Maintenance and Updates") {
      setScheduledDowntime(origMaint.scheduledDowntime); setBackupFreq(origMaint.backupFreq);
    } else if (activeTab === "Security Settings") {
      setPwdExpiration(origSecurity.pwdExpiration); setReminderPeriod(origSecurity.reminderPeriod);
    }
  };

  const saveByTab = () => {
    if (activeTab === "Admin Profile Settings")   saveProfile();
    else if (activeTab === "General Settings")     saveGeneral();
    else if (activeTab === "Notification Preferences") saveNotifications();
    else if (activeTab === "Appointment Settings") saveAppointment();
    else if (activeTab === "Maintenance and Updates") saveMaintenance();
    else if (activeTab === "Security Settings")    saveSecurity();
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      // Reuse doctors upload endpoint for now (or add admin-specific later)
      const res = await apiFetch("/api/doctors/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.urls?.avatar) {
        await apiFetch("/api/admin/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: data.urls.avatar }),
        });
        setProfileAvatarUrl(data.urls.avatar);
        updateProfile({ avatarUrl: data.urls.avatar });
      }
    } catch { alert("Failed to upload avatar."); }
    finally { setAvatarUploading(false); if (avatarInputRef.current) avatarInputRef.current.value = ""; }
  };

  // ── Policy file upload ─────────────────────────────────────────────────────
  const handlePolicyUpload = async (field: "privacyPolicy" | "terms", file: File) => {
    if (field === "privacyPolicy") setPolicyUploading(true);
    else setTermsUploading(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const res = await apiFetch("/api/admin/settings/upload-policy", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? "Upload failed"); return; }
      const data = await res.json();
      if (field === "privacyPolicy") { setPrivacyPolicyUrl(data.urls.privacyPolicy ?? ""); setPrivacyPolicyUpdatedAt(new Date().toISOString()); }
      else { setTermsUrl(data.urls.terms ?? ""); setTermsUpdatedAt(new Date().toISOString()); }
    } catch { alert("Upload failed."); }
    finally {
      if (field === "privacyPolicy") { setPolicyUploading(false); if (privacyInputRef.current) privacyInputRef.current.value = ""; }
      else { setTermsUploading(false); if (termsInputRef.current) termsInputRef.current.value = ""; }
    }
  };

  const handleDropPolicy = (e: React.DragEvent, field: "privacyPolicy" | "terms") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePolicyUpload(field, file);
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null;

  const TABS_WITH_SAVE_BAR: SettingsTab[] = ["Admin Profile Settings", "General Settings", "Notification Preferences", "Appointment Settings", "Maintenance and Updates", "Security Settings"];

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center py-40">
          <div className="w-10 h-10 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300 grid grid-cols-12 gap-8">

        {/* Left Navigation Panel */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
            <h1 className="text-[17px] font-medium text-slate-800 mb-1">System Configurations</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-6">
              Manage system settings, preferences, and configurations to optimize the platform&apos;s functionality and user experience.
            </p>
            <nav className="flex flex-col gap-1">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => { setActiveTab(item.label); setSelectedFeeCategory(null); setError(""); setSaved(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[12px] font-medium transition-all ${isActive ? "text-[#6A8BFF] bg-blue-50/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                  >
                    <span className={isActive ? "text-[#6A8BFF]" : "text-slate-400"}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{error}</div>
          )}

          {/* ── Admin Profile Settings ──────────────────────────────────────── */}
          {activeTab === "Admin Profile Settings" && (
            <div className="animate-in fade-in duration-200 space-y-6">
              <h2 className="text-[15px] font-medium text-[#1e293b]">Admin Profile Settings</h2>

              {/* Avatar */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8 flex items-center gap-6">
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                <div className="relative group shrink-0">
                  {profileAvatarUrl ? (
                    <img src={profileAvatarUrl} alt="Admin avatar" className="w-20 h-20 rounded-full object-cover border-2 border-slate-100" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-2xl font-semibold">
                      {profileName?.[0]?.toUpperCase() ?? "A"}
                    </div>
                  )}
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>}
                  </button>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-slate-800">{profileName || "Admin"}</p>
                  <p className="text-[12px] text-slate-400 font-medium mt-0.5">{profileEmail || "Administrator"}</p>
                  <p className="text-[11px] text-[#6A8BFF] mt-2 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>Change photo</p>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8 space-y-5">
                <p className="text-[12px] font-medium text-slate-800">Personal Information</p>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1.5">Full Name</label>
                    <div className="bg-[#f8fafc] rounded-[1.25rem] h-[56px] px-5 flex items-center">
                      <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Admin name" className="bg-transparent text-[13px] font-medium text-slate-800 outline-none w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1.5">Phone Number</label>
                    <div className="bg-[#f8fafc] rounded-[1.25rem] h-[56px] px-5 flex items-center">
                      <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+971 50 000 0000" className="bg-transparent text-[13px] font-medium text-slate-800 outline-none w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1.5">Email (read-only)</label>
                    <div className="bg-[#f8fafc] rounded-[1.25rem] h-[56px] px-5 flex items-center opacity-60">
                      <input value={profileEmail} disabled className="bg-transparent text-[13px] font-medium text-slate-800 outline-none w-full cursor-not-allowed" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400 block mb-1.5">Timezone</label>
                    <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[56px] px-5 flex items-center">
                      <select value={profileTimezone} onChange={e => setProfileTimezone(e.target.value)} className="bg-transparent text-[13px] font-medium text-slate-800 outline-none appearance-none w-full cursor-pointer">
                        <option>Gulf Standard Time (GST) - UTC +4:00</option>
                        <option>Greenwich Mean Time (GMT) - UTC +0:00</option>
                        <option>Eastern Standard Time (EST) - UTC -5:00</option>
                      </select>
                      <svg className="absolute right-5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── General Settings ────────────────────────────────────────────── */}
          {activeTab === "General Settings" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">General Settings</h2>
              <div className="space-y-6">
                {[
                  { label: "Time Zone", desc: "Select your preferred timezone for scheduling and notifications.", inputLabel: "Current Time Zone", value: timeZone, onChange: setTimeZone, options: ["Gulf Standard Time (GST) - UTC +4:00", "Greenwich Mean Time (GMT) - UTC +0:00", "Eastern Standard Time (EST) - UTC -5:00"] },
                  { label: "Primary Currency", desc: "Choose the currency in which transactions will be processed.", inputLabel: "Currency", value: currency, onChange: setCurrency, options: ["United Arab Emirates Dirham (AED)", "United States Dollar (USD)", "Euro (EUR)"] },
                  { label: "Default Language", desc: "Select the system language.", inputLabel: "Language", value: language, onChange: setLanguage, options: ["English (UK)", "English (US)", "Arabic (AR)"] },
                ].map(({ label, desc, inputLabel, value, onChange, options }) => (
                  <div key={label} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                    <p className="text-[12px] font-medium text-slate-800 mb-1">{label}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-6">{desc}</p>
                    <div className="relative">
                      <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">{inputLabel}</label>
                      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20">
                        {options.map(o => <option key={o}>{o}</option>)}
                      </select>
                      <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Platform Fee Management ─────────────────────────────────────── */}
          {activeTab === "Platform Fee Management" && !selectedFeeCategory && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Platform Fee Management</h2>
              <div className="space-y-6">
                {["Consultation Fee Management", "Laboratory Fee", "Pharmacy Fee"].map((title) => (
                  <div key={title} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                    <p className="text-[12px] font-medium text-slate-800 mb-2">{title}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-6 leading-relaxed max-w-[90%]">Adjust the percentage fees for consultations, applicable to both insurance and cash payments. This percentage will be deducted from the consultation fee set by the doctor as the platform&apos;s fee.</p>
                    <button onClick={() => setSelectedFeeCategory(title)} className="bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm">Edit Fees</button>
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
                <p className="text-[11px] text-slate-400 font-medium mb-8 leading-relaxed max-w-[90%]">Adjust the percentage fees for consultations, applicable to both insurance and cash payments.</p>
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
                        <div className="grid grid-cols-12 items-center" onClick={() => !isExpanded && setExpandedSpecialization(item.id)}>
                          <div className="col-span-6 flex flex-col gap-1">
                            <span className="text-[13px] font-medium text-slate-800">{item.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Last updated {item.date}</span>
                          </div>
                          {isExpanded ? (
                            <>
                              <div className="col-span-3 px-2"><input type="text" value={item.insurance} onChange={e => updateFeeData(item.id, "insurance", e.target.value)} className="w-full bg-white rounded-lg h-10 px-4 text-[13px] font-medium text-slate-800 text-center outline-none border-none shadow-sm focus:ring-2 focus:ring-[#6A8BFF]/20" /></div>
                              <div className="col-span-3 px-2"><input type="text" value={item.cash} onChange={e => updateFeeData(item.id, "cash", e.target.value)} className="w-full bg-white rounded-lg h-10 px-4 text-[13px] font-medium text-slate-800 text-center outline-none border-none shadow-sm focus:ring-2 focus:ring-[#6A8BFF]/20" /></div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-3 text-center text-[12px] font-medium text-[#6A8BFF]">{item.insurance}</div>
                              <div className="col-span-3 text-center text-[12px] font-medium text-[#6A8BFF]">{item.cash}</div>
                            </>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-5 grid grid-cols-12 gap-4 animate-in slide-in-from-top-2">
                            <div className="col-span-4 relative">
                              <label className="absolute top-2 left-4 text-[10px] font-medium text-slate-400 pointer-events-none">Effective Date</label>
                              <input type="date" value={item.effectiveDate} onChange={e => updateFeeData(item.id, "effectiveDate", e.target.value)} className="w-full bg-white rounded-xl h-[56px] pl-4 pt-4 text-[13px] font-medium text-slate-800 outline-none border-none shadow-sm" />
                            </div>
                            <div className="col-span-8 relative">
                              <label className="absolute top-2 left-4 text-[10px] font-medium text-slate-400 pointer-events-none">Notes</label>
                              <input type="text" value={item.notes} onChange={e => updateFeeData(item.id, "notes", e.target.value)} placeholder="Add notes here..." className="w-full bg-white rounded-xl h-[56px] pl-4 pt-4 text-[13px] font-medium text-slate-800 outline-none border-none shadow-sm placeholder:text-slate-300" />
                            </div>
                            <div className="col-span-12 mt-2">
                              <button onClick={e => { e.stopPropagation(); setExpandedSpecialization(null); }} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-7 py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-95">Save Changes</button>
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

          {/* ── Notification Preferences ────────────────────────────────────── */}
          {activeTab === "Notification Preferences" && (
            <div className="animate-in fade-in duration-200 space-y-6">
              <h2 className="text-[15px] font-medium text-[#1e293b]">Notification Preferences</h2>
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                <p className="text-[12px] font-medium text-slate-800 mb-1">Platform Notifications</p>
                <p className="text-[11px] text-slate-400 font-medium mb-6 leading-relaxed">Control which events trigger admin notifications. These settings apply to all admin accounts on this platform.</p>
                <div className="flex flex-col">
                  {NOTIF_TOGGLES.map(({ key, label, desc }) => (
                    <NotifToggle
                      key={key}
                      label={label}
                      desc={desc}
                      checked={notifToggles[key] ?? true}
                      onChange={() => setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Payments ────────────────────────────────────────────────────── */}
          {activeTab === "Payments" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Payments</h2>
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Set Withdrawal Frequency</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Control how often doctors can request withdrawals.</p>
                  <div className="max-w-xs relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center px-5">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400">Withdrawal Interval</label>
                      <input type="number" value={withdrawalInterval} onChange={e => setWithdrawalInterval(Number(e.target.value))} className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-8">Bank Account Management</p>
                  <p className="text-[11px] font-medium text-slate-600 mb-4">Set primary account</p>
                  <div className="space-y-6">
                    {[{ id: "bank1", name: "ABC BANK *******2345" }, { id: "bank2", name: "XYZ BANK *******2345" }].map(bank => (
                      <div key={bank.id} className="flex items-center gap-4">
                        <div onClick={() => setPrimaryBankId(bank.id)} className={`flex items-center justify-center w-5 h-5 rounded-full border-2 cursor-pointer shrink-0 transition-colors ${primaryBankId === bank.id ? "border-[#6A8BFF]" : "border-slate-300"}`}>
                          {primaryBankId === bank.id && <div className="w-2.5 h-2.5 rounded-full bg-[#6A8BFF]" />}
                        </div>
                        <p className="text-[13px] font-medium text-slate-800">{bank.name}</p>
                      </div>
                    ))}
                    <button className="bg-[#eef2ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full">Add another account</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Appointment Settings ─────────────────────────────────────────── */}
          {activeTab === "Appointment Settings" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Appointment Settings</h2>
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-6">Max Bookings Per Day</p>
                  <div className="grid grid-cols-2 gap-8">
                    {[
                      { label: "Set the maximum number of bookings allowed each day.", inputLabel: "Max Bookings", value: maxBookings, onChange: setMaxBookings },
                      { label: "Set the maximum duration of each consultation", inputLabel: "Duration (in Minutes)", value: duration, onChange: setDuration },
                    ].map(({ label, inputLabel, value, onChange }) => (
                      <div key={inputLabel}>
                        <p className="text-[11px] text-slate-400 font-medium mb-3">{label}</p>
                        <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center px-5">
                          <div className="flex flex-col w-full">
                            <label className="text-[10px] font-medium text-slate-400">{inputLabel}</label>
                            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {[
                  { label: "Cancellation Policy", desc: "Define how many hours before an appointment can be canceled without penalty.", inputLabel: "Hour(s)", value: cancellationHours, onChange: setCancellationHours },
                  { label: "Reminder Lead Time", desc: "Set how much time before the appointment a reminder should be sent.", inputLabel: "Lead Time (in mins)", value: reminderLead, onChange: setReminderLead },
                  { label: "Pre-Visit Form Submission Deadline", desc: "Define the time limit for patients to submit their pre-visit forms before their scheduled appointment.", inputLabel: "Submission Deadline (in mins)", value: submissionDeadline, onChange: setSubmissionDeadline },
                ].map(({ label, desc, inputLabel, value, onChange }) => (
                  <div key={label} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                    <p className="text-[12px] font-medium text-slate-800 mb-2">{label}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-5 max-w-[90%] leading-relaxed">{desc}</p>
                    <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center px-5 max-w-md">
                      <div className="flex flex-col w-full">
                        <label className="text-[10px] font-medium text-slate-400">{inputLabel}</label>
                        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Insurance Providers ──────────────────────────────────────────── */}
          {activeTab === "Insurance Providers" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Insurance providers</h2>
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8 min-h-[600px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">Status <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
                    <button className="text-slate-400 hover:text-slate-700 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-700">
                          <th className="pb-4 pt-1 font-medium pl-2 w-[15%]">Provider ID</th>
                          <th className="pb-4 pt-1 font-medium w-[30%]">Provider name</th>
                          <th className="pb-4 pt-1 font-medium w-[30%]">Last updated</th>
                          <th className="pb-4 pt-1 font-medium w-[25%]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insuranceData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(provider => (
                          <tr key={provider.id} onMouseEnter={() => setHoveredInsurance(provider.id)} onMouseLeave={() => setHoveredInsurance(null)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors h-[72px]">
                            <td className="py-2 pl-2 text-[13px] text-slate-500 font-medium">{provider.id}</td>
                            <td className="py-2 text-[13px] font-medium text-slate-800">{provider.name}</td>
                            <td className="py-2 text-[13px] text-slate-500 font-medium">{provider.date}</td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center justify-between min-w-[120px] pr-2">
                                <span className={`text-[12px] font-medium ${provider.status === "Active" ? "text-emerald-500" : "text-rose-500"}`}>{provider.status}</span>
                                {hoveredInsurance === provider.id && (
                                  provider.status === "Active" ? (
                                    <button onClick={() => setInsuranceData(prev => prev.map(p => p.id === provider.id ? { ...p, status: "Disabled" } : p))} className="px-5 py-1.5 rounded-full border border-rose-500 text-rose-500 text-[11px] font-medium hover:bg-rose-50 transition-colors bg-white shadow-sm ml-4">Disable</button>
                                  ) : (
                                    <button onClick={() => setInsuranceData(prev => prev.map(p => p.id === provider.id ? { ...p, status: "Active" } : p))} className="px-5 py-1.5 rounded-full border border-[#1e293b] text-[#1e293b] text-[11px] font-medium hover:bg-slate-50 transition-colors bg-white shadow-sm ml-4">Enable</button>
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
                {insuranceData.length > 0 && <Pagination currentPage={currentPage} totalPages={Math.ceil(insuranceData.length / itemsPerPage)} onPageChange={setCurrentPage} />}
              </div>
            </div>
          )}

          {/* ── Maintenance and Updates ──────────────────────────────────────── */}
          {activeTab === "Maintenance and Updates" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Maintenance and Updates</h2>
              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Scheduled Downtime</p>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">Set the date and time for system maintenance.</p>
                  <div className="relative bg-[#f8fafc] rounded-[1.25rem] h-[64px] flex items-center px-5 max-w-md">
                    <div className="flex flex-col w-full">
                      <label className="text-[10px] font-medium text-slate-400">Scheduled Downtime</label>
                      <input type="datetime-local" value={scheduledDowntime} onChange={e => setScheduledDowntime(e.target.value)} className="bg-transparent border-none p-0 text-[13px] font-medium text-slate-800 outline-none w-full" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                  <p className="text-[12px] font-medium text-slate-800 mb-1">Backup Frequency</p>
                  <p className="text-[11px] text-slate-600 font-medium mb-6">
                    Last backup: <span className="text-[#6A8BFF]">{lastBackup ? fmtDate(lastBackup) : "Not yet run"}</span>
                  </p>
                  <div className="flex flex-col gap-4">
                    {["Daily", "Weekly", "Monthly"].map(freq => (
                      <label key={freq} onClick={() => setBackupFreq(freq)} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center transition-colors ${backupFreq === freq ? "border-[#6A8BFF]" : "border-slate-200"}`}>
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

          {/* ── Security Settings ────────────────────────────────────────────── */}
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
                    <select value={pwdExpiration} onChange={e => setPwdExpiration(e.target.value)} className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20">
                      <option>30 Days</option><option>60 Days</option><option>90 Days</option>
                    </select>
                    <svg className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  <p className="text-[12px] font-medium text-slate-800 mb-2">Reminder Period</p>
                  <div className="relative">
                    <label className="absolute top-3 left-5 text-[10px] font-medium text-slate-400 pointer-events-none">Number of Days</label>
                    <select value={reminderPeriod} onChange={e => setReminderPeriod(e.target.value)} className="w-full bg-[#f8fafc] border-none rounded-[1.25rem] h-[64px] pl-5 pt-4 text-[13px] font-medium text-slate-800 outline-none appearance-none cursor-pointer transition focus:ring-2 focus:ring-[#6A8BFF]/20">
                      <option>5 Days</option><option>10 Days</option><option>15 Days</option>
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

          {/* ── Privacy Policy and Terms ─────────────────────────────────────── */}
          {activeTab === "Privacy Policy and Terms" && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-[15px] font-medium text-[#1e293b] mb-6">Privacy Policy and Terms</h2>
              <input ref={privacyInputRef} type="file" accept=".html,text/html" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePolicyUpload("privacyPolicy", f); }} />
              <input ref={termsInputRef}   type="file" accept=".html,text/html" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePolicyUpload("terms", f); }} />
              <div className="space-y-6">
                {([
                  { title: "Privacy Policy", key: "privacyPolicy" as const, url: privacyPolicyUrl, updatedAt: privacyPolicyUpdatedAt, uploading: policyUploading, inputRef: privacyInputRef },
                  { title: "Terms and Conditions", key: "terms" as const, url: termsUrl, updatedAt: termsUpdatedAt, uploading: termsUploading, inputRef: termsInputRef },
                ]).map(({ title, key, url, updatedAt, uploading, inputRef }) => (
                  <div key={key} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                    <p className="text-[12px] font-medium text-slate-800 mb-2">{title}</p>
                    <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed max-w-[95%]">Upload an HTML file. This will be displayed on the platform for users to read.</p>
                    <p className="text-[11px] text-slate-600 font-medium mb-6">
                      Last updated: <span className="text-[#6A8BFF]">{updatedAt ? fmtDate(updatedAt) : "Never"}</span>
                    </p>
                    <div
                      className="w-full border border-dashed border-[#6A8BFF]/40 bg-blue-50/20 hover:bg-blue-50/40 transition-colors rounded-[1rem] p-10 flex flex-col items-center justify-center cursor-pointer mb-5"
                      onDragOver={handleDragOver}
                      onDrop={e => handleDropPolicy(e, key)}
                      onClick={() => inputRef.current?.click()}
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin mb-3" />
                      ) : (
                        <svg className="w-5 h-5 text-[#6A8BFF] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      )}
                      <p className="text-[13px] font-medium text-[#6A8BFF] mb-1">{uploading ? "Uploading…" : "Drop your HTML here or click to browse"}</p>
                      <p className="text-[11px] text-[#6A8BFF]/70 font-medium">Accepted Formats: HTML · Max 5 MB</p>
                    </div>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] text-[12px] font-medium px-7 py-3 rounded-full transition-transform active:scale-95 shadow-sm">
                        Preview Now ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Save bar (tabs that have save/cancel) ────────────────────────── */}
          {TABS_WITH_SAVE_BAR.includes(activeTab) && (
            <SaveBar onCancel={cancelByTab} onSave={saveByTab} saving={saving} saved={saved} />
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
