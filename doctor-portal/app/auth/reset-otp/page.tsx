"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/assets/images/wellness_logo.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 600;

export default function ResetOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    setError("");
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = useCallback(async () => {
    setResending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "TOO_SOON"
          ? `Please wait ${data.retryAfter ?? 60}s before requesting a new code.`
          : "Failed to resend code. Please try again.");
        setResending(false);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
      setResending(false);
      return;
    }
    setOtp(Array(OTP_LENGTH).fill(""));
    setTimeLeft(COUNTDOWN_SECONDS);
    setResending(false);
    inputRefs.current[0]?.focus();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!data.verified) {
        switch (data.reason) {
          case "INVALID_CODE":
            setError(
              data.attemptsLeft > 0
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
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
      return;
    }

    router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
  };

  const inputClass = (filled: boolean) =>
    `w-12 h-12 md:w-14 md:h-14 rounded-2xl text-center text-xl font-semibold font-outfit transition focus:outline-none focus:ring-2 focus:ring-[#5476FC] ${
      filled
        ? "bg-[#EEF2FF] border-2 border-[#5476FC] text-gray-800"
        : "bg-[#f3f4fd] border-0 text-gray-800"
    } placeholder-gray-300`;

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">

      {/* Decorative Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center flex-1 justify-start pt-8 md:pt-16 z-10">

        {/* Logo */}
        <div className="mb-12 select-none">
          <Link href="/">
            <Image
              src={logoImg}
              alt="Wellness Central Logo"
              width={160}
              height={50}
              className="object-contain hover:opacity-90 transition-opacity"
              priority
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 w-full max-w-[500px] backdrop-blur-sm relative overflow-hidden transition-all duration-300">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center font-outfit">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
            <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
              Enter Your OTP
            </h2>
            <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
              We sent a 6-digit reset code to{" "}
              <span className="text-[#5476FC] font-medium">{email || "your email"}</span>
            </p>

            {/* 6-digit OTP inputs */}
            <div className="flex justify-center gap-2 md:gap-3 mb-4">
              {otp.map((val, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  required
                  value={val}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  placeholder="•"
                  className={inputClass(!!val)}
                />
              ))}
            </div>

            {/* Timer and Resend */}
            <div className="w-full flex justify-between items-center text-xs mb-8 px-1">
              <span className="text-gray-500 font-light font-outfit">
                {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired"}
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || timeLeft > COUNTDOWN_SECONDS - 60}
                className="text-[#5476FC] font-medium font-outfit hover:underline focus:outline-none disabled:text-gray-300 disabled:no-underline"
              >
                {resending ? "Sending…" : "Resend OTP"}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/auth/forgot-password")}
              className="mt-6 text-gray-700 font-semibold font-outfit text-sm hover:underline focus:outline-none"
            >
              Go Back
            </button>
          </form>

        </div>
      </div>

      {/* Footer links */}
      <div className="w-full max-w-[1000px] mx-auto flex justify-center gap-3 text-[0.75rem] text-gray-400 font-light pt-8 select-none z-10">
        <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
        <span>|</span>
        <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
      </div>

    </div>
  );
}
