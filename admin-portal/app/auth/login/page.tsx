"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "supertokens-web-js/recipe/emailpassword";
import STGeneralError from "supertokens-web-js/utils/error";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Shared by the post-signIn redirect and the "you're already logged in"
// prompt below. Uses `router.replace` (not `push`) so this intermediate
// step never lingers as a Back target once the user is in.
async function goToLanding(router: ReturnType<typeof useRouter>, email: string) {
  try {
    const twoFaRes = await fetch(`${API_URL}/api/admin/dashboard/2fa/status`, { credentials: "include" });
    if (twoFaRes.ok) {
      const twoFaData = await twoFaRes.json();
      if (twoFaData.twoFactorEnabled === true) {
        router.replace(`/auth/two-factor?email=${encodeURIComponent(email)}`);
        return;
      }
    }
  } catch {
    // If 2FA check fails, fall through to dashboard
  }
  router.replace("/dashboard");
}

export default function LoginPage() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  // Landing on this page (via Back/Forward, a stale tab, or a typed URL)
  // while a session is still valid server-side must never just silently
  // show the login form as if signed out — that's exactly how Forward could
  // later walk back into the dashboard without a real login. Ask instead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const wantsLogout = window.confirm("You're already logged in. Do you want to log out?");
          if (cancelled) return;
          if (wantsLogout) {
            try { await signOut(); } catch { /* ignore */ }
            setCheckingSession(false);
          } else {
            const data = await res.json().catch(() => ({}));
            await goToLanding(router, data?.profile?.email ?? "");
          }
        } else {
          setCheckingSession(false);
        }
      } catch {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await signIn({
        formFields: [
          { id: "email",    value: email },
          { id: "password", value: password },
        ],
      });

      if (response.status === "OK") {
        await goToLanding(router, email);
      } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
        setError("Invalid email or password. Please try again.");
      } else if (response.status === "FIELD_ERROR") {
        setError(response.formFields[0]?.error || "Please check your input.");
      } else {
        setError("Sign in is not allowed right now. Please contact support.");
      }
    } catch (err) {
      // The backend can reject sign-in with a GENERAL_ERROR (e.g. a deleted
      // account) — that arrives here as a thrown STGeneralError carrying the
      // real message, and must not be papered over with the network-failure text.
      if (STGeneralError.isThisError(err)) {
        setError(err.message);
      } else {
        setError("Cannot reach the server. Make sure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  }


  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f3f4fd] via-[#f8f9ff] to-[#f0f4ff] flex items-center justify-center p-6 md:p-12">
      <div className="flex flex-col md:flex-row gap-8 items-stretch w-full max-w-[960px] justify-center">

        {/* ── Left: Doctor image panel ──────────────────────────────── */}
        <div className="hidden md:flex md:w-[45%] relative rounded-[2rem] bg-[#3276D2] overflow-hidden min-h-[500px] items-end justify-center shadow-lg shadow-blue-100/30">
          <Image
            src="/doctor-login.png"
            alt="Wellness Central Doctor"
            fill
            className="object-cover object-center scale-[1.01]"
            priority
          />
        </div>

        {/* ── Right: Form panel ─────────────────────────────────────── */}
        <div className="flex-grow md:w-[55%] bg-white rounded-[2rem] shadow-xl shadow-slate-100/60 p-10 md:p-12 flex flex-col justify-between border border-slate-100/50 min-h-[500px]">

          {/* Logo */}
          <div className="select-none mb-2">
            <Image
              src="/wellness-logo.png"
              alt="Wellness Central Logo"
              width={160}
              height={50}
              className="object-contain hover:opacity-90 transition-opacity"
              priority
            />
          </div>

          <div className="my-6">
            <h1 className="text-2xl font-normal font-serif text-slate-800 mb-6 tracking-normal">
              Glad to See You Again!
            </h1>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
              {/* Email */}
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                placeholder="Email*"
                className="w-full bg-[#f4f6fa] border-none rounded-2xl px-6 py-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F83FD]/20 focus:bg-white transition-all font-medium"
              />

              {/* Password */}
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  required
                  placeholder="Password*"
                  className="w-full bg-[#f4f6fa] border-none rounded-2xl px-6 py-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F83FD]/20 focus:bg-white transition-all font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Remember me + Forgot Password */}
              <div className="flex items-center justify-between pt-1 pb-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? "border-[#4F83FD] bg-[#4F83FD] text-white" : "border-slate-300 bg-white"}`}>
                      {rememberMe && (
                        <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Remember me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-[#4F83FD] hover:underline font-semibold transition">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-fit px-8 py-3.5 bg-[#4F83FD] hover:bg-[#3d70e6] text-white rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all duration-200 shadow-md shadow-blue-100 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Login
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2.5 text-[11px] text-gray-400 font-medium">
              <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Use</Link>
            </div>
            <p className="text-[11px] text-gray-400">
              No account?{" "}
              <Link href="/auth/signup" className="text-[#4F83FD] hover:underline font-semibold">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
