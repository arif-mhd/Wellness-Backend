"use client";

import Link from "next/link";

interface DoctorLoginButtonProps {
  className?: string;
  href?: string;
}

export default function DoctorLoginButton({
  className = "",
  href = "/auth/login",
}: DoctorLoginButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white px-7 py-3.5 rounded-[0.8rem] font-medium font-outfit text-sm transition-colors shadow-lg shadow-blue-500/10 select-none ${className}`}
    >
      <span>Doctor Login</span>
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </Link>
  );
}
