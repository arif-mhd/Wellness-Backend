"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

function FloatingInput({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex-1 h-[66px] px-6 rounded-xl bg-[#F5F6FA] flex flex-col justify-center gap-0.5 relative">
      <span className="text-xs font-medium leading-none text-[#9EA5AD]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="bg-transparent text-[#383F45] text-sm font-medium outline-none placeholder-[#383F45] leading-none mt-1"
      />
    </div>
  );
}

/* ── 2FA Modal ─────────────────────────────────────────── */
interface TwoFAModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ModalStep = "phone" | "otp" | "success";

function TwoFAModal({ onClose, onSuccess }: TwoFAModalProps) {
  const [step, setStep] = useState<ModalStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(85); // 1 minute 25 seconds
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Count down timer for OTP resend
  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== "" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = () => {
    if (!phone) {
      alert("Please enter a valid phone number.");
      return;
    }
    setStep("otp");
    setTimer(85);
  };

  const handleVerify = () => {
    // Basic verification check: make sure 6 digits are input
    if (otp.some(digit => digit === "")) {
      alert("Please enter the full 6-digit OTP.");
      return;
    }
    setStep("success");
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {step === "phone" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col gap-6 shadow-2xl relative">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h3 className="text-[#24292E] text-[22px] font-normal leading-[130%] tracking-[-0.66px]"
                style={{ fontFamily: "Marcellus, serif" }}>
              Enable Two-Factor Authentication
            </h3>
            <button onClick={onClose} className="p-1 text-[#596066] hover:text-[#24292E] transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 10.163L3.403 15.76C3.25 15.913 3.058 15.991 2.826 15.995C2.595 15.998 2.4 15.92 2.24 15.76C2.08 15.6 2 15.407 2 15.179C2 14.951 2.08 14.757 2.24 14.597L7.837 9L2.24 3.403C2.087 3.25 2.009 3.058 2.005 2.826C2.002 2.595 2.08 2.4 2.24 2.24C2.4 2.08 2.594 2 2.821 2C3.049 2 3.243 2.08 3.403 2.24L9 7.837L14.597 2.24C14.75 2.087 14.942 2.009 15.174 2.005C15.405 2.002 15.6 2.08 15.76 2.24C15.92 2.4 16 2.59352 16 2.821C16 3.049 15.92 3.243 15.76 3.403L10.163 9L15.76 14.597C15.913 14.75 15.991 14.942 15.995 15.174C15.998 15.405 15.92 15.6 15.76 15.76C15.6 15.92 15.407 16 15.179 16C14.951 16 14.757 15.92 14.597 15.76L9 10.163Z" fill="#596066"/>
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-[#676E76] text-xs leading-relaxed">
            To enhance your account security, you&apos;ll receive a unique verification code via SMS each time you log in.
            <br /><br />
            Please confirm your mobile number to proceed with setup.
          </p>

          {/* Phone input */}
          <div className="flex flex-col gap-2">
            <div className="w-[435px] h-16 px-6 rounded-xl bg-[#F5F6FA] flex flex-col justify-center gap-0.5">
              <span className="text-[#9EA5AD] text-sm font-medium leading-none">Phone Number*</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 000 0000"
                className="bg-transparent text-[#383F45] text-sm font-medium outline-none placeholder-[#9EA5AD] leading-none mt-1"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#EBEEF5]" />

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium hover:bg-[#D0DAFF] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendOtp}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium shadow-[0_4px_16px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_20px_rgba(84,118,252,0.35)] transition-all"
            >
              Send OTP
            </button>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col gap-6 shadow-2xl relative">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Back button to phone input step */}
              <button
                onClick={() => setStep("phone")}
                className="w-11 h-11 rounded-full bg-[#F5F6FA] flex items-center justify-center hover:bg-[#EBEEF5] transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rotate-90">
                  <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h3 className="text-[#24292E] text-[22px] font-normal leading-[130%] tracking-[-0.66px]"
                  style={{ fontFamily: "Marcellus, serif" }}>
                Verify Your Mobile Number
              </h3>
            </div>
            <button onClick={onClose} className="p-1 text-[#596066] hover:text-[#24292E] transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 10.163L3.403 15.76C3.25 15.913 3.058 15.991 2.826 15.995C2.595 15.998 2.4 15.92 2.24 15.76C2.08 15.6 2 15.407 2 15.179C2 14.951 2.08 14.757 2.24 14.597L7.837 9L2.24 3.403C2.087 3.25 2.009 3.058 2.005 2.826C2.002 2.595 2.08 2.4 2.24 2.24C2.4 2.08 2.594 2 2.821 2C3.049 2 3.243 2.08 3.403 2.24L9 7.837L14.597 2.24C14.75 2.087 14.942 2.009 15.174 2.005C15.405 2.002 15.6 2.08 15.76 2.24C15.92 2.4 16 2.59352 16 2.821C16 3.049 15.92 3.243 15.76 3.403L10.163 9L15.76 14.597C15.913 14.75 15.991 14.942 15.995 15.174C15.998 15.405 15.92 15.6 15.76 15.76C15.6 15.92 15.407 16 15.179 16C14.951 16 14.757 15.92 14.597 15.76L9 10.163Z" fill="#596066"/>
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-[#676E76] text-xs leading-relaxed">
            We’ve sent a verification code to your registered mobile number. Please enter the code below to complete the two-factor authentication setup.
          </p>

          {/* OTP Sent Label & Inputs */}
          <div className="flex flex-col gap-3">
            <span className="text-[#24292E] text-xs font-normal">
              Enter OTP (Sent to <span className="text-[#5476FC] font-semibold">{phone || "999 888 7771"}</span>)
            </span>

            {/* Inputs Box */}
            <div className="flex gap-4">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="w-full h-16 rounded-xl bg-[#F5F6FA] text-[#383F45] text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-[#5476FC]"
                />
              ))}
            </div>

            {/* Resend details */}
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-[#2F2F2F]">
                {timer > 0 ? `Try again in ${formatTimer(timer)}` : "You can now request a code again"}
              </span>
              <button
                onClick={() => { if (timer === 0) { setTimer(85); setOtp(Array(6).fill("")); } }}
                disabled={timer > 0}
                className={`font-semibold transition-colors ${timer > 0 ? "text-[#9EA5AD] cursor-not-allowed" : "text-[#5B7BFC] hover:text-[#3B5BFC]"}`}
              >
                Resend OTP
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#EBEEF5]" />

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium hover:bg-[#D0DAFF] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-base font-medium shadow-[0_4px_16px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_20px_rgba(84,118,252,0.35)] transition-all"
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="w-[656px] bg-white rounded-xl p-8 flex flex-col items-center gap-6 shadow-2xl relative text-center">
          {/* Success Asset Icon */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/c4532564cff88e59a58a33bbc2a031faa768bc82?width=174"
            alt="Success"
            className="w-[87px] h-[86px] object-contain"
          />

          <div className="flex flex-col gap-2 w-full">
            <h3 className="text-[#24292E] text-[22px] font-normal leading-[130%] tracking-[-0.66px]"
                style={{ fontFamily: "Marcellus, serif" }}>
              Success! Two-Factor Authentication Enabled
            </h3>
            <p className="text-[#676E76] text-xs leading-relaxed max-w-[480px] mx-auto mt-2">
              Your account is now protected with Two-Factor Authentication. For each future login, you’ll receive a verification code to ensure added security.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#EBEEF5]" />

          {/* Done Button */}
          <button
            onClick={handleDone}
            className="w-[288px] py-3.5 rounded-xl bg-[#E0E7FF] text-[#383F45] text-base font-medium hover:bg-[#D0DAFF] transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function AccountSettingsPage() {
  const [timezone, setTimezone] = useState("(UTC-04:00) US/Eastern (EDT)");
  const [tzOpen, setTzOpen] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("***************");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [deleteChecked, setDeleteChecked] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  return (
    <>
      {/* 2FA Modal */}
      {show2FA && (
        <TwoFAModal
          onClose={() => setShow2FA(false)}
          onSuccess={() => setIs2FAEnabled(true)}
        />
      )}

      <h2 className="text-[#24292E] text-base font-medium tracking-tight">Account Settings</h2>

      {/* ── Time Zone ─────────────────────────────────────────── */}
      <SectionCard
        title="Time Zone"
        description="Selecting the correct time zone is essential for ensuring your schedule and notifications match your local time. You can update this setting anytime."
      >
        <div className="relative w-full max-w-[440px]">
          <button
            onClick={() => setTzOpen((o) => !o)}
            className="w-full h-[66px] px-6 rounded-xl bg-[#F5F6FA] flex items-center justify-between gap-4"
          >
            <div className="flex flex-col items-start gap-1 text-left">
              <span className="text-[#9EA5AD] text-sm font-medium leading-none">Current Time Zone</span>
              <span className="text-[#383F45] text-sm font-medium leading-none">{timezone}</span>
            </div>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={`shrink-0 transition-transform ${tzOpen ? "rotate-180" : ""}`}>
              <path d="M4.8125 7.90625L11 14.0938L17.1875 7.90625" stroke="#6D7885" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {tzOpen && (
            <div className="absolute top-full mt-1 w-full bg-white border border-[#EBEEF5] rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
              {TIMEZONES.map((tz) => (
                <button
                  key={tz}
                  onClick={() => { setTimezone(tz); setTzOpen(false); }}
                  className={`w-full text-left px-5 py-3 text-xs hover:bg-[#F5F7FF] transition-colors ${tz === timezone ? "text-[#5476FC] font-medium" : "text-[#383F45]"}`}
                >
                  {tz}
                </button>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Change Password ───────────────────────────────────── */}
      <SectionCard
        title="Change Password"
        description="Update your password regularly to keep your account secure. Make sure to choose a strong password that includes a mix of letters, numbers, and special characters."
      >
        <div className="flex gap-4">
          <FloatingInput label="Current Password" type="password" value={currentPwd} onChange={setCurrentPwd} />
          <FloatingInput label="New Password" type="password" value={newPwd} onChange={setNewPwd} placeholder="Enter new password" />
        </div>
        <div className="flex">
          <FloatingInput label="Confirm New Password" type="password" value={confirmPwd} onChange={setConfirmPwd} placeholder="Re-enter new password" />
          <div className="flex-1" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[#24292E] text-xs font-normal">Reset Password</span>
          <p className="text-xs text-[#676E76] leading-relaxed">
            If you&apos;ve forgotten your current password, click{" "}
            <a href="#" className="text-[#5476FC] underline underline-offset-2">here</a>{" "}
            to receive a reset link via email or SMS.
          </p>
        </div>
      </SectionCard>

      {/* ── 2FA ──────────────────────────────────────────────── */}
      <SectionCard title="Secure Your Account with 2FA">
        <div className="flex flex-col gap-1">
          <p className="text-[#676E76] text-xs leading-relaxed">
            Add an extra layer of security to your account by enabling Two-Factor Authentication (2FA). With 2FA, you&apos;ll be prompted to enter a unique verification code in addition to your password whenever you log in.
          </p>
          <p className="text-[#676E76] text-xs leading-relaxed mt-1">
            <span className="font-bold">Benefits of Enabling 2FA:</span><br />
            Enhanced protection for your sensitive information<br />
            Helps prevent unauthorized access<br />
            Easy to set up and manage
          </p>
        </div>
        
        {is2FAEnabled ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#E8F1FF] text-[#5476FC] text-[13px] font-semibold rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#5476FC] animate-pulse" />
              2FA Enabled
            </div>
            <button
              onClick={() => setIs2FAEnabled(false)}
              className="text-[#E84949] text-sm font-semibold hover:underline"
            >
              Disable 2FA
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShow2FA(true)}
            className="self-start h-10 px-5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium rounded-xl shadow-[0_4px_12px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_16px_rgba(84,118,252,0.35)] transition-all"
          >
            Enable 2FA
          </button>
        )}
      </SectionCard>

      {/* ── Delete Account ────────────────────────────────────── */}
      <SectionCard
        title="Delete your Account"
        description="If you choose to delete your account, all your data, including appointment history, messages, and account settings, will be permanently removed. This action cannot be undone."
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <button
            onClick={() => setDeleteChecked((c) => !c)}
            className="mt-0.5 w-[18px] h-[18px] rounded border shrink-0 flex items-center justify-center transition-colors"
            style={{ background: deleteChecked ? "#5476FC" : "#E8F1FF", borderColor: deleteChecked ? "#5476FC" : "#8AA0FF" }}
          >
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
        <button
          disabled={!deleteChecked}
          className={`self-start h-10 px-5 rounded-xl text-white text-sm font-medium transition-all ${
            deleteChecked
              ? "bg-[#E84949] shadow-[0_4px_12px_rgba(232,73,73,0.25)] hover:shadow-[0_6px_16px_rgba(232,73,73,0.35)]"
              : "bg-[#E84949]/40 cursor-not-allowed"
          }`}
        >
          Delete Account
        </button>
      </SectionCard>

      {/* ── Action buttons ────────────────────────────────────── */}
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
