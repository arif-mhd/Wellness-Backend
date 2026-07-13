"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "supertokens-web-js/recipe/emailpassword";
import logoImg from "@/assets/images/wellness_logo.png";
import doctorPortalImg from "@/assets/images/doctorportal.jpg";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await signIn({
        formFields: [
          { id: "email", value: email },
          { id: "password", value: password },
        ],
      });

      if (response.status === "OK") {
        // ── Check if this doctor has 2FA enabled ──────────────────────────────
        // The SuperTokens session is now active, so we can call the protected endpoint.
        try {
          const twoFaRes = await fetch(`${API_URL}/api/doctors/2fa/status`, {
            credentials: "include",
          });
          if (twoFaRes.ok) {
            const twoFaData = await twoFaRes.json();
            if (twoFaData.twoFactorEnabled === true) {
              // Redirect to the 2FA verification page — full session is held there.
              router.push(`/auth/two-factor?email=${encodeURIComponent(email)}`);
              return;
            }
          }
        } catch {
          // If we can't check 2FA status, let the doctor through normally.
        }
        router.push("/dashboard");
      } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
        setError("Invalid email or password.");
      } else if (response.status === "FIELD_ERROR") {
        setError(response.formFields[0]?.error || "Please check your input.");
      } else {
        setError("Sign in is not allowed right now.");
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">

      {/* Decorative Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="relative z-10 w-full max-w-[1380px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center flex-1 py-6">

        {/* Left Side: Doctor Image */}
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

        {/* Right Side: Login Card */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[760px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 backdrop-blur-sm relative overflow-hidden transition-all duration-300">

            {/* Logo */}
            <div className="mb-8 select-none">
              <Image
                src={logoImg}
                alt="Wellness Central Logo"
                width={160}
                height={50}
                className="object-contain hover:opacity-90 transition-opacity"
                priority
              />
            </div>

            <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-8">
              Glad to See You Again!
            </h2>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center font-outfit animate-fadeIn">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email input */}
              <div>
                <input
                  type="email"
                  required
                  placeholder="Email*"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
                />
              </div>

              {/* Password input */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f3f4fd] border-0 rounded-xl pl-5 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5476FC] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex justify-between items-center text-xs px-1 pt-1 select-none">
                <label className="flex items-center gap-2 text-gray-400 font-light font-outfit cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#5476FC] bg-white border-2 border-indigo-200 rounded focus:ring-[#5476FC] transition duration-150 cursor-pointer"
                  />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-[#5476FC] hover:underline font-light font-outfit">
                  Forgot Password?
                </Link>
              </div>

              {/* Buttons Row */}
              <div className="flex gap-4 pt-4 justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white px-8 py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer hover:opacity-95"
                >
                  <span>{loading ? "Signing in…" : "Login"}</span>
                  {!loading && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>

                <Link
                  href="/auth/signup"
                  className="bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] px-8 py-3.5 rounded-[0.8rem] font-medium font-outfit text-sm flex items-center justify-center transition-all hover:translate-y-[-1px] active:translate-y-[0px] duration-150"
                >
                  Register Now
                </Link>
              </div>
            </form>

            {/* Footer links inside the card */}
            <div className="flex gap-2 text-[0.75rem] text-gray-400 font-light pt-8 select-none">
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
