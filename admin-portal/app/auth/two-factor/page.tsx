"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const API_URL        = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const OTP_LENGTH     = 6;
const COUNTDOWN_SECS = 600; // 10 minutes
const RESEND_COOLDOWN = 60; // 1 minute

function TwoFactorInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get("email") ?? "";

  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!sent || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [sent, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    return `${m}:${(secs % 60).toString().padStart(2, "0")}`;
  };

  // Send OTP
  const sendCode = useCallback(async (isResend = false) => {
    if (!email) return;
    if (isResend) setSending(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}/api/otp/send`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email, purpose: "login_2fa" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "TOO_SOON"
          ? `Please wait ${data.retryAfter ?? 60}s before requesting another code.`
          : "Failed to send code. Please try again.");
        return;
      }
      setSent(true);
      if (isResend) {
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeLeft(COUNTDOWN_SECS);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  }, [email]);

  useEffect(() => { sendCode(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // OTP input handlers
  const handleChange = (value: string, idx: number) => {
    if (!/^\d?$/.test(value)) return;
    setError("");
    const next = [...otp]; next[idx] = value; setOtp(next);
    if (value && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  // Verify
  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError(`Please enter the full ${OTP_LENGTH}-digit code.`); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/otp/verify`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.verified) { router.push("/dashboard"); return; }
      switch (data.reason) {
        case "INVALID_CODE":
          setError(data.attemptsLeft > 0
            ? `Incorrect code. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining.`
            : "Incorrect code."); break;
        case "EXPIRED": setError("Code expired. Click Resend to get a new one."); break;
        case "TOO_MANY_ATTEMPTS": setError("Too many attempts. Please request a new code."); break;
        default: setError("Verification failed. Please try again.");
      }
    } catch { setError("Network error. Please check your connection."); }
    finally { setLoading(false); }
  };

  const canResend = timeLeft <= COUNTDOWN_SECS - RESEND_COOLDOWN;

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f3f4fd] via-[#f8f9ff] to-[#f0f4ff] flex items-center justify-center p-6 md:p-12">
      <div className="flex flex-col md:flex-row gap-8 items-stretch w-full max-w-[960px] justify-center">

        {/* Left image panel */}
        <div className="hidden md:flex md:w-[45%] relative rounded-[2rem] bg-[#3276D2] overflow-hidden min-h-[500px] items-end justify-center shadow-lg shadow-blue-100/30">
          <Image
            src="/doctor-login.png"
            alt="Wellness Central"
            fill
            className="object-cover object-center scale-[1.01]"
            priority
          />
        </div>

        {/* Right card */}
        <div className="flex-grow md:w-[55%] bg-white rounded-[2rem] shadow-xl shadow-slate-100/60 p-10 md:p-12 flex flex-col justify-between border border-slate-100/50 min-h-[500px]">

          {/* Logo */}
          <div className="select-none mb-2">
            <Image src="/wellness-logo.png" alt="Wellness Central" width={160} height={50} className="object-contain" priority />
          </div>

          <div className="flex-1 flex flex-col justify-center py-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4F83FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h1 className="text-2xl font-normal font-serif text-slate-800 mb-2 tracking-normal">
              Two-Factor Verification
            </h1>
            <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">
              {sent ? (
                <>We&apos;ve sent a 6-digit code to <span className="text-[#4F83FD] font-semibold">{email}</span>. Enter it below to continue.</>
              ) : (
                "Sending verification code to your registered email…"
              )}
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* OTP inputs */}
            <div className="flex gap-2 mb-3" onPaste={handlePaste}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i]}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  disabled={!sent || loading}
                  className={`
                    w-full h-14 rounded-xl text-center text-xl font-bold outline-none transition-all
                    ${otp[i] ? "bg-blue-50 border-2 border-[#4F83FD] text-[#4F83FD]" : "bg-[#f4f6fa] border-2 border-transparent text-slate-800"}
                    ${error ? "border-red-300 bg-red-50" : ""}
                    focus:ring-2 focus:ring-[#4F83FD]/20 focus:border-[#4F83FD]
                    disabled:opacity-40 disabled:cursor-not-allowed
                  `}
                />
              ))}
            </div>

            {/* Timer + Resend */}
            <div className="flex justify-between items-center text-xs mb-6">
              <span className="text-slate-400 font-medium">
                {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Code expired"}
              </span>
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={!canResend || sending}
                className={`font-semibold transition-colors ${canResend && !sending ? "text-[#4F83FD] hover:underline cursor-pointer" : "text-slate-300 cursor-not-allowed"}`}
              >
                {sending ? "Sending…" : "Resend Code"}
              </button>
            </div>

            {/* Verify button */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || !sent}
              className="w-fit px-8 py-3.5 bg-[#4F83FD] hover:bg-[#3d70e6] text-white rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all duration-200 shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 mb-4"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  Verify & Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <Link href="/auth/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium">
              ← Back to Login
            </Link>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2.5 text-[11px] text-gray-400 font-medium">
              <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4fd]">
        <div className="w-8 h-8 border-4 border-[#4F83FD] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TwoFactorInner />
    </Suspense>
  );
}
