"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "supertokens-web-js/recipe/emailpassword";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result = await signIn({ formFields: [{ id: "email", value: email }, { id: "password", value: password }] });
      if (result.status === "OK") {
        // Check role
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const Session = (await import("supertokens-web-js/recipe/session")).default;
        const token = await Session.getAccessToken();
        const res = await fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
        const data = await res.json();
        const roles: string[] = data.roles ?? [];
        if (roles.includes("pharmacy"))         router.replace("/dashboard");
        else if (roles.includes("pharmacy_pending")) router.replace("/auth/pending");
        else setError("This account is not a pharmacy account. Please use the correct portal.");
      } else if (result.status === "WRONG_CREDENTIALS_ERROR") {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 flex items-center justify-center p-4">
      {/* Decorative blurs */}
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-green-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5l7 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Pharmacy Central</h1>
          <p className="text-sm text-slate-500 font-outfit mt-1">Wellness Platform</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100/80 p-8">
          <h2 className="text-xl font-bricolage font-bold text-[#1a2332] mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 font-outfit mb-7">Sign in to manage your pharmacy</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-outfit">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="pharmacy@example.com"
                className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 focus:border-[#22c55e]/60 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 focus:border-[#22c55e]/60 transition"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-outfit font-semibold text-sm shadow-lg shadow-green-200/50 hover:shadow-green-300/60 transition-all disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm font-outfit text-slate-500 mt-6">
            New pharmacy?{" "}
            <Link href="/auth/register" className="text-[#16a34a] font-semibold hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
