"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = 1 | 2 | 3;

const STEPS = ["Account", "Pharmacy", "Review"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]             = useState<Step>(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  // Step 1 — account credentials
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // Step 2 — pharmacy details
  const [ownerName, setOwnerName]         = useState("");
  const [pharmacyName, setPharmacyName]   = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone]                 = useState("");
  const [location, setLocation]           = useState("");
  const [emiratesId, setEmiratesId]       = useState("");

  function validateStep1() {
    if (!email || !password || !confirmPwd) return "All fields are required.";
    if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPwd) return "Passwords do not match.";
    return null;
  }

  function validateStep2() {
    if (!ownerName || !pharmacyName || !licenseNumber || !phone) return "Owner name, pharmacy name, license number and phone are required.";
    return null;
  }

  function handleNext() {
    setError("");
    if (step === 1) {
      const err = validateStep1(); if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2(); if (err) { setError(err); return; }
      setStep(3);
    }
  }

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/pharmacy/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ownerName, pharmacyName, licenseNumber, phone, location, emiratesId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }
      router.replace("/auth/pending");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 flex items-center justify-center p-4">
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-green-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[480px] animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5l7 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Pharmacy Central</h1>
        </div>

        {/* Step tabs */}
        <div className="flex mb-6 bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={n} className="flex-1 text-center py-2.5 rounded-xl transition-all text-xs font-outfit font-semibold" style={{
                background: active ? "linear-gradient(90deg,#22c55e,#16a34a)" : "transparent",
                color: active ? "white" : done ? "#22c55e" : "#94a3b8",
              }}>
                {done ? "✓ " : `0${n} · `}{label}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100/80 p-8">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-outfit">{error}</div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bricolage font-bold text-[#1a2332] mb-4">Create your account</h2>
              {[
                { label: "Email address", value: email, set: setEmail, type: "email", ph: "pharmacy@example.com" },
                { label: "Password", value: password, set: setPassword, type: "password", ph: "Min. 8 characters" },
                { label: "Confirm password", value: confirmPwd, set: setConfirmPwd, type: "password", ph: "Repeat password" },
              ].map(({ label, value, set, type, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph}
                    className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
              ))}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bricolage font-bold text-[#1a2332] mb-4">Pharmacy details</h2>
              {[
                { label: "Owner full name *", value: ownerName, set: setOwnerName, ph: "e.g. Ahmed Al Mansouri" },
                { label: "Pharmacy name *", value: pharmacyName, set: setPharmacyName, ph: "e.g. Al Shifa Pharmacy" },
                { label: "License number *", value: licenseNumber, set: setLicenseNumber, ph: "e.g. DHA-2024-XXXXX" },
                { label: "Phone number *", value: phone, set: setPhone, ph: "+971 50 000 0000" },
                { label: "Location / Address", value: location, set: setLocation, ph: "Dubai, UAE" },
                { label: "Emirates ID", value: emiratesId, set: setEmiratesId, ph: "784-XXXX-XXXXXXX-X" },
              ].map(({ label, value, set, ph }) => (
                <div key={label}>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input type="text" value={value} onChange={e => set(e.target.value)} placeholder={ph}
                    className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
              ))}
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bricolage font-bold text-[#1a2332] mb-5">Review & submit</h2>
              <div className="space-y-3 mb-6">
                {[
                  ["Email",          email],
                  ["Owner",          ownerName],
                  ["Pharmacy name",  pharmacyName],
                  ["License",        licenseNumber],
                  ["Phone",          phone],
                  ["Location",       location || "—"],
                  ["Emirates ID",    emiratesId || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-xs font-outfit text-slate-400 font-semibold uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-outfit text-[#1a2332] font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs font-outfit text-amber-700">
                Your registration will be reviewed by the admin team. You'll be notified once approved.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`flex gap-3 mt-7 ${step > 1 ? "flex-row" : "flex-col"}`}>
            {step > 1 && (
              <button onClick={() => { setError(""); setStep((step - 1) as Step); }}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-outfit font-semibold text-sm hover:bg-slate-50 transition">
                Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-outfit font-semibold text-sm shadow-lg shadow-green-200/50 hover:shadow-green-300/60 transition-all">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-outfit font-semibold text-sm shadow-lg shadow-green-200/50 hover:shadow-green-300/60 transition-all disabled:opacity-60">
                {loading ? "Submitting…" : "Submit Registration"}
              </button>
            )}
          </div>

          <p className="text-center text-sm font-outfit text-slate-500 mt-5">
            Already registered? <Link href="/auth/login" className="text-[#16a34a] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
