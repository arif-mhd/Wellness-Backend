"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "supertokens-web-js/recipe/session";
import { useRouter } from "next/navigation";
import logoImg from "@/assets/images/wellness_logo.png";

export default function PendingApprovalPage() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/auth/login");
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col items-center justify-center py-12 px-4 overflow-hidden font-outfit">

      {/* Decorative blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center">

        {/* Logo */}
        <div className="mb-12 select-none">
          <Image src={logoImg} alt="Wellness Central" width={160} height={50} className="object-contain" priority />
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 flex flex-col items-center text-center">

          {/* Hourglass icon */}
          <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-normal tracking-tight text-gray-800 font-marcellus mb-3">
            Awaiting Approval
          </h1>

          <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-4 font-outfit font-light">
            Your registration has been submitted successfully. Our admin team is currently reviewing your application.
          </p>

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[0.78rem] font-semibold">Pending Admin Approval</span>
          </div>

          <div className="w-full bg-[#f3f4fd] rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[#5476FC] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[0.78rem] text-gray-600 font-outfit font-light">
                Your details have been saved and sent to the admin team for verification.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[#5476FC] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-[0.78rem] text-gray-600 font-outfit font-light">
                You'll receive an email once your account is approved and you can start using the Clinic Portal.
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 cursor-pointer hover:opacity-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>

          <Link href="/auth/login" className="mt-4 text-[0.75rem] text-gray-400 hover:text-indigo-500 transition font-outfit">
            Back to Login
          </Link>
        </div>

        {/* Footer */}
        <div className="flex gap-3 text-[0.72rem] text-gray-400 font-light mt-8">
          <a href="#" className="hover:text-indigo-500 transition">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="hover:text-indigo-500 transition">Terms of Use</a>
        </div>
      </div>
    </div>
  );
}
