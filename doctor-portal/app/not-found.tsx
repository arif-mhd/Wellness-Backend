import Image from "next/image";
import Link from "next/link";
import logoImg from "@/assets/images/wellness_logo.png";

export default function NotFound() {
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

          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center mb-6">
            <svg className="w-9 h-9 text-[#5476FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>

          <h1 className="text-2xl font-normal tracking-tight text-gray-800 font-marcellus mb-3">
            Page Not Found
          </h1>

          <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
            The page you&apos;re looking for isn&apos;t available. It may have been moved, or the link you followed might be broken.
          </p>

          <Link
            href="/dashboard"
            className="w-full bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-3.5 rounded-xl font-medium font-outfit text-sm shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            Return to Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
