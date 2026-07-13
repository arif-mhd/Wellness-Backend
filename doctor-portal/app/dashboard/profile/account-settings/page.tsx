"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

const TIMEZONES = [
  "(UTC-12:00) International Date Line West",
  "(UTC-08:00) US/Pacific",
  "(UTC-07:00) US/Mountain",
  "(UTC-06:00) US/Central",
  "(UTC-05:00) US/Eastern",
  "(UTC-04:00) US/Eastern (EDT)",
  "(UTC+00:00) UTC",
  "(UTC+04:00) Gulf Standard Time",
  "(UTC+05:30) India Standard Time",
  "(UTC+08:00) China Standard Time",
];

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[#24292E] text-xs font-normal">{title}</span>
        {description && <p className="text-[#676E76] text-xs leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function FloatingInput({ label, type = "text", value, onChange, placeholder, showToggle = false }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; showToggle?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex-1 h-[66px] px-6 rounded-xl bg-[#F5F6FA] flex flex-col justify-center gap-0.5 relative">
      <span className="text-xs font-medium leading-none text-[#9EA5AD]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={showToggle ? (show ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#383F45] text-sm font-medium outline-none placeholder-[#9EA5AD] leading-none mt-1"
        />
        {showToggle && (
          <button type="button" onClick={() => setShow(s => !s)} className="text-[#9EA5AD] hover:text-[#5476FC] transition-colors mt-1 shrink-0">
            {show ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── 2FA Modal ─────────────────────────────────────────── */
type ModalStep = "phone" | "otp" | "success";

function TwoFAModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<ModalStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(85);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleOtpChange = (el: HTMLInputElement, i: number) => {
    if (isNaN(Number(el.value))) return;
    const next = [...otp]; next[i] = el.value; setOtp(next);
    if (el.value && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && otp[i] === "" && i > 0) otpRefs.current[i - 1]?.focus();
  };

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {step === "phone" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col gap-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <h3 className="text-[#24292E] text-[22px] font-normal" style={{ fontFamily: "Marcellus, serif" }}>Enable Two-Factor Authentication</h3>
            <button onClick={onClose} className="p-1 text-[#596066] hover:text-[#24292E]">✕</button>
          </div>
          <p className="text-[#676E76] text-xs leading-relaxed">
            To enhance your account security, you&apos;ll receive a unique verification code via SMS each time you log in.<br /><br />
            Please confirm your mobile number to proceed with setup.
          </p>
          <div className="w-[435px] h-16 px-6 rounded-xl bg-[#F5F6FA] flex flex-col justify-center gap-0.5">
            <span className="text-[#9EA5AD] text-sm font-medium">Phone Number*</span>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" className="bg-transparent text-[#383F45] text-sm font-medium outline-none placeholder-[#9EA5AD]" />
          </div>
          <div className="w-full h-px bg-[#EBEEF5]" />
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium">Cancel</button>
            <button onClick={() => { if (!phone) return; setStep("otp"); setTimer(85); }} className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium">Send OTP</button>
          </div>
        </div>
      )}
      {step === "otp" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col gap-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setStep("phone")} className="w-11 h-11 rounded-full bg-[#F5F6FA] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rotate-90"><path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h3 className="text-[#24292E] text-[22px] font-normal" style={{ fontFamily: "Marcellus, serif" }}>Verify Your Mobile Number</h3>
            </div>
            <button onClick={onClose} className="p-1 text-[#596066]">✕</button>
          </div>
          <p className="text-[#676E76] text-xs leading-relaxed">We&apos;ve sent a verification code to your registered mobile number.</p>
          <div className="flex flex-col gap-3">
            <span className="text-[#24292E] text-xs">Enter OTP (Sent to <span className="text-[#5476FC] font-semibold">{phone}</span>)</span>
            <div className="flex gap-4">
              {otp.map((digit, idx) => (
                <input key={idx} ref={el => { otpRefs.current[idx] = el; }} type="text" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(e.target, idx)} onKeyDown={e => handleKeyDown(e, idx)}
                  className="w-full h-16 rounded-xl bg-[#F5F6FA] text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-[#5476FC]" />
              ))}
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-[#2F2F2F]">{timer > 0 ? `Try again in ${fmt(timer)}` : "You can now request a code again"}</span>
              <button onClick={() => { if (timer === 0) { setTimer(85); setOtp(Array(6).fill("")); } }} disabled={timer > 0}
                className={`font-semibold ${timer > 0 ? "text-[#9EA5AD] cursor-not-allowed" : "text-[#5B7BFC]"}`}>Resend OTP</button>
            </div>
          </div>
          <div className="w-full h-px bg-[#EBEEF5]" />
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium">Cancel</button>
            <button onClick={() => { if (otp.some(d => d === "")) return; setStep("success"); }}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium">Verify</button>
          </div>
        </div>
      )}
      {step === "success" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col items-center gap-6 shadow-2xl text-center">
          <div className="w-[87px] h-[87px] rounded-full bg-[#E8F9F0] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1FAF65" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[#24292E] text-[22px] font-normal" style={{ fontFamily: "Marcellus, serif" }}>Success! Two-Factor Authentication Enabled</h3>
            <p className="text-[#676E76] text-xs leading-relaxed max-w-[480px] mx-auto mt-2">Your account is now protected with Two-Factor Authentication.</p>
          </div>
          <div className="w-full h-px bg-[#EBEEF5]" />
          <button onClick={() => { onSuccess(); onClose(); }} className="w-[288px] py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium">Done</button>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function AccountSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Time zone
  const [timezone, setTimezone] = useState("(UTC+04:00) Gulf Standard Time");
  const [tzOpen, setTzOpen] = useState(false);
  const [savingTz, setSavingTz] = useState(false);
  const [tzSaved, setTzSaved] = useState(false);

  // Change password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // 2FA
  const [show2FA, setShow2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Delete account
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    apiFetch("/api/doctors/me")
      .then(r => r.json())
      .then(data => {
        const doc = data.doctor;
        if (doc?.timezone) setTimezone(doc.timezone);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveTimezone = async () => {
    setSavingTz(true);
    setTzSaved(false);
    try {
      const res = await apiFetch("/api/doctors/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) throw new Error();
      setTzSaved(true);
      setTimeout(() => setTzSaved(false), 3000);
    } catch {
      alert("Failed to save timezone.");
    } finally {
      setSavingTz(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError("");
    setPwdSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("All password fields are required.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }

    setSavingPwd(true);
    try {
      const res = await apiFetch("/api/doctors/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "WRONG_PASSWORD") setPwdError("Current password is incorrect.");
        else if (data.error === "PASSWORD_TOO_SHORT") setPwdError("New password must be at least 8 characters.");
        else setPwdError("Failed to change password. Please try again.");
        return;
      }
      setPwdSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 4000);
    } catch {
      setPwdError("Network error. Please try again.");
    } finally {
      setSavingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await apiFetch("/api/doctors/me", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.replace("/auth/login");
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {show2FA && <TwoFAModal onClose={() => setShow2FA(false)} onSuccess={() => setIs2FAEnabled(true)} />}

      <h2 className="text-[#24292E] text-base font-medium tracking-tight">Account Settings</h2>

      {/* ── Time Zone ─────────────────────────────────────────── */}
      <SectionCard
        title="Time Zone"
        description="Selecting the correct time zone is essential for ensuring your schedule and notifications match your local time."
      >
        <div className="flex items-end gap-4">
          <div className="relative w-full max-w-[440px]">
            <button
              onClick={() => setTzOpen(o => !o)}
              className="w-full h-[66px] px-6 rounded-xl bg-[#F5F6FA] flex items-center justify-between gap-4"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="text-[#9EA5AD] text-sm font-medium">Current Time Zone</span>
                <span className="text-[#383F45] text-sm font-medium">{timezone}</span>
              </div>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={`shrink-0 transition-transform ${tzOpen ? "rotate-180" : ""}`}>
                <path d="M4.8125 7.90625L11 14.0938L17.1875 7.90625" stroke="#6D7885" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {tzOpen && (
              <div className="absolute top-full mt-1 w-full bg-white border border-[#EBEEF5] rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                {TIMEZONES.map(tz => (
                  <button key={tz} onClick={() => { setTimezone(tz); setTzOpen(false); }}
                    className={`w-full text-left px-5 py-3 text-xs hover:bg-[#F5F7FF] transition-colors ${tz === timezone ? "text-[#5476FC] font-medium" : "text-[#383F45]"}`}>
                    {tz}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSaveTimezone} disabled={savingTz}
            className="h-[66px] px-6 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium shrink-0 hover:shadow-md transition-all disabled:opacity-70 flex items-center gap-2">
            {savingTz && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {tzSaved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </SectionCard>

      {/* ── Change Password ───────────────────────────────────── */}
      <SectionCard
        title="Change Password"
        description="Update your password regularly to keep your account secure. Make sure to choose a strong password that includes a mix of letters, numbers, and special characters."
      >
        {pwdError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">{pwdError}</div>
        )}
        {pwdSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl px-4 py-2">Password changed successfully.</div>
        )}
        <div className="flex gap-4">
          <FloatingInput label="Current Password" showToggle value={currentPwd} onChange={setCurrentPwd} placeholder="Enter current password" />
          <FloatingInput label="New Password" showToggle value={newPwd} onChange={setNewPwd} placeholder="Enter new password" />
        </div>
        <div className="flex gap-4">
          <FloatingInput label="Confirm New Password" showToggle value={confirmPwd} onChange={setConfirmPwd} placeholder="Re-enter new password" />
          <div className="flex-1" />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPwd}
          className="self-start h-10 px-6 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium rounded-xl shadow-[0_4px_12px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_16px_rgba(84,118,252,0.35)] transition-all disabled:opacity-70 flex items-center gap-2"
        >
          {savingPwd && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Update Password
        </button>
      </SectionCard>

      {/* ── 2FA ──────────────────────────────────────────────── */}
      <SectionCard title="Secure Your Account with 2FA">
        <p className="text-[#676E76] text-xs leading-relaxed">
          Add an extra layer of security by enabling Two-Factor Authentication (2FA). With 2FA, you&apos;ll be prompted to enter a unique verification code in addition to your password whenever you log in.
        </p>
        {is2FAEnabled ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#E8F1FF] text-[#5476FC] text-[13px] font-semibold rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#5476FC] animate-pulse" />
              2FA Enabled
            </div>
            <button onClick={() => setIs2FAEnabled(false)} className="text-[#E84949] text-sm font-semibold hover:underline">Disable 2FA</button>
          </div>
        ) : (
          <button onClick={() => setShow2FA(true)}
            className="self-start h-10 px-5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium rounded-xl shadow-[0_4px_12px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_16px_rgba(84,118,252,0.35)] transition-all">
            Enable 2FA
          </button>
        )}
      </SectionCard>

      {/* ── Delete Account ────────────────────────────────────── */}
      <SectionCard
        title="Delete your Account"
        description="If you choose to delete your account, all your data will be permanently removed. This action cannot be undone."
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <button onClick={() => { setDeleteChecked(c => !c); setDeleteError(""); }}
            className="mt-0.5 w-[18px] h-[18px] rounded border shrink-0 flex items-center justify-center transition-colors"
            style={{ background: deleteChecked ? "#5476FC" : "#E8F1FF", borderColor: deleteChecked ? "#5476FC" : "#8AA0FF" }}>
            {deleteChecked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[#676E76] text-xs leading-relaxed">
            I understand that deleting my account is permanent and all my data will be lost. This action cannot be undone.
          </span>
        </label>
        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">{deleteError}</div>
        )}
        <button
          onClick={handleDeleteAccount}
          disabled={!deleteChecked || deleting}
          className={`self-start h-10 px-5 rounded-xl text-white text-sm font-medium transition-all flex items-center gap-2 ${
            deleteChecked ? "bg-[#E84949] shadow-[0_4px_12px_rgba(232,73,73,0.25)] hover:shadow-[0_6px_16px_rgba(232,73,73,0.35)]" : "bg-[#E84949]/40 cursor-not-allowed"
          }`}
        >
          {deleting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Delete Account
        </button>
      </SectionCard>
    </>
  );
}
