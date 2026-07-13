"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/assets/images/wellness_logo.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "pharmacy_reset" }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "EMAIL_NOT_FOUND") {
          setError("No account found with this email address.");
        } else if (data.error === "TOO_SOON") {
          setError(`Please wait ${data.retryAfter ?? 60}s before requesting a new code.`);
        } else {
          setError("Failed to send code. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push(`/auth/reset-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">

      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center flex-1 justify-start pt-8 md:pt-16 z-10">

        <div className="mb-12 select-none">
          <Link href="/">
            <Image src={logoImg} alt="Wellness Central Logo" width={160} height={50} className="object-contain hover:opacity-90 transition-opacity" priority />
          </Link>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 w-full max-w-[500px] backdrop-blur-sm relative overflow-hidden transition-all duration-300">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center font-outfit">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-4">
              Forgot Your Password?
            </h2>
            <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
              Don't worry! Just enter your email, and we'll send you a one-time code to reset your password.
            </p>

            <div className="w-full mb-6">
              <input
                type="email"
                required
                placeholder="Email*"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send Reset Code"}
            </button>
          </form>

        </div>
      </div>

      <div className="w-full max-w-[1000px] mx-auto flex justify-center gap-3 text-[0.75rem] text-gray-400 font-light pt-8 select-none z-10">
        <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
        <span>|</span>
        <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
      </div>

    </div>
  );
}
