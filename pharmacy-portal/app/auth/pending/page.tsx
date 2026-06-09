"use client";

import { useRouter } from "next/navigation";
import { signOut } from "supertokens-web-js/recipe/session";

export default function PendingPage() {
  const router = useRouter();
  async function handleSignOut() {
    try { await signOut(); } catch { /* expired */ }
    router.replace("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 flex items-center justify-center p-4">
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full bg-green-200/30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] animate-slide-up">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100/80 p-10 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-marcellus text-[#1a2332] mb-3">Application Under Review</h2>
          <p className="text-sm font-outfit text-slate-500 leading-relaxed mb-4">
            Your pharmacy registration has been submitted successfully. Our admin team is reviewing your details and license information.
          </p>
          <p className="text-sm font-outfit text-slate-500 leading-relaxed mb-8">
            You'll receive an update once your account is approved. This usually takes <span className="font-semibold text-[#16a34a]">1–2 business days</span>.
          </p>

          <div className="w-full bg-green-50 border border-green-100 rounded-xl px-5 py-4 mb-8 text-left">
            <p className="text-xs font-outfit font-bold text-green-700 uppercase tracking-wide mb-2">What happens next?</p>
            {["Admin verifies your pharmacy license", "Account is approved and activated", "You can start adding products"].map((s, i) => (
              <div key={i} className="flex items-start gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-green-700">{i + 1}</span>
                </div>
                <p className="text-xs font-outfit text-slate-600">{s}</p>
              </div>
            ))}
          </div>

          <button onClick={handleSignOut}
            className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 font-outfit font-semibold text-sm hover:bg-slate-50 transition">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
