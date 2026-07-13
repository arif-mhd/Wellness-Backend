"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import logoImg from "@/assets/images/wellness_logo.png";
import doctorPortalImg from "@/assets/images/doctorportal.jpg";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const OTP_LENGTH        = 6;
const COUNTDOWN_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN   = 60;  // 1 minute before resend is allowed

// ── Inner component (uses useSearchParams, must be inside Suspense) ────────────
function TwoFactorInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get("email") ?? "";

  const [otp, setOtp]         = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const [sent, setSent]       = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sent || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [sent, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Send OTP on mount ────────────────────────────────────────────────────────
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
        if (data.error === "TOO_SOON") {
          setError(`Please wait ${data.retryAfter ?? 60}s before requesting another code.`);
        } else {
          setError("Failed to send code. Please try again.");
        }
        return;
      }
      setSent(true);
      if (isResend) {
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeLeft(COUNTDOWN_SECONDS);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSending(false);
    }
  }, [email]);

  useEffect(() => {
    sendCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── OTP input handlers ───────────────────────────────────────────────────────
  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    setError("");
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = [...Array(OTP_LENGTH).fill("")];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  // ── Verify ───────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError(`Please enter the full ${OTP_LENGTH}-digit code.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}/api/otp/verify`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.verified) {
        router.push("/dashboard");
        return;
      }
      switch (data.reason) {
        case "INVALID_CODE":
          setError(
            data.attemptsLeft !== undefined && data.attemptsLeft > 0
              ? `Incorrect code. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining.`
              : "Incorrect code."
          );
          break;
        case "EXPIRED":
          setError("Code has expired. Click Resend to get a new one.");
          break;
        case "TOO_MANY_ATTEMPTS":
          setError("Too many incorrect attempts. Please request a new code.");
          break;
        default:
          setError("Verification failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const canResend = timeLeft <= COUNTDOWN_SECONDS - RESEND_COOLDOWN;

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">

      {/* Decorative blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="relative z-10 w-full max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center flex-1 py-6">

        {/* Left: image */}
        <div className="w-full flex justify-center select-none">
          <div className="relative w-full max-h-[82vh] aspect-[4/5] md:aspect-[0.8] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] border-4 border-white/80 group">
            <div className="absolute inset-0 bg-indigo-900/5 group-hover:bg-indigo-900/0 transition-colors duration-500 z-10" />
            <Image
              src={doctorPortalImg}
              alt="Wellness Doctor Team"
              fill
              priority
              className="object-cover transform group-hover:scale-[1.02] transition-transform duration-[2000ms] ease-out"
            />
          </div>
        </div>

        {/* Right: OTP card */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[760px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 backdrop-blur-sm">

            {/* Logo */}
            <div className="mb-8 select-none">
              <Image src={logoImg} alt="Wellness Central" width={160} height={50} className="object-contain" priority />
            </div>

            {/* Shield icon */}
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-[#5476FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
              Two-Factor Verification
            </h2>
            <p className="text-sm text-gray-500 font-outfit mb-8 leading-relaxed">
              {sent ? (
                <>
                  We&apos;ve sent a 6-digit verification code to{" "}
                  <span className="text-[#5476FC] font-medium">{email}</span>.
                  Enter it below to complete your login.
                </>
              ) : (
                "Sending verification code to your registered email…"
              )}
            </p>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm text-center font-outfit flex items-center gap-2 justify-center">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* OTP Inputs */}
            <div className="flex gap-3 mb-4" onPaste={handlePaste}>
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
                    w-full h-[62px] rounded-xl text-center text-xl font-semibold outline-none transition-all duration-150
                    ${otp[i]
                      ? "bg-indigo-50 border-2 border-[#5476FC] text-[#5476FC]"
                      : "bg-[#f3f4fd] border-2 border-transparent text-gray-800"}
                    ${error ? "border-red-300 bg-red-50" : ""}
                    focus:ring-2 focus:ring-[#5476FC]/30 focus:border-[#5476FC]
                    disabled:opacity-40 disabled:cursor-not-allowed
                  `}
                />
              ))}
            </div>

            {/* Timer + Resend row */}
            <div className="flex items-center justify-between text-xs mb-8 px-1">
              <span className="text-gray-400 font-outfit">
                {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired"}
              </span>
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={!canResend || sending}
                className={`font-semibold font-outfit transition-colors ${
                  canResend && !sending
                    ? "text-[#5476FC] hover:underline cursor-pointer"
                    : "text-gray-300 cursor-not-allowed"
                }`}
              >
                {sending ? "Sending…" : "Resend Code"}
              </button>
            </div>

            {/* Verify button */}
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || !sent}
              className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white px-8 py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Back to login */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-xs text-gray-400 hover:text-indigo-600 transition-colors font-outfit"
              >
                ← Back to Login
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// ── Default export wrapped in Suspense (required for useSearchParams) ──────────
export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TwoFactorInner />
    </Suspense>
  );
}
