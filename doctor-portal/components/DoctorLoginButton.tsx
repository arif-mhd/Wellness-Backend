"use client";

import Link from "next/link";

interface DoctorLoginButtonProps {
  className?: string;
  href?: string;
  label?: string;
  onClick?: React.MouseEventHandler<any>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function DoctorLoginButton({
  className = "",
  href = "/auth/login",
  label = "Doctor Login",
  onClick,
  type,
  disabled = false,
}: DoctorLoginButtonProps) {
  const baseClassName = `inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white px-7 py-3.5 rounded-[0.8rem] font-medium font-outfit text-sm transition-all duration-150 shadow-lg shadow-blue-500/10 select-none hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`;

  const content = (
    <>
      <span>{label}</span>
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </>
  );

  // If a type is explicitly provided, or if href is not passed (or overridden by onClick/type)
  if (type || onClick || href === "") {
    return (
      <button
        type={type || "button"}
        className={baseClassName}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={baseClassName} onClick={onClick}>
      {content}
    </Link>
  );
}
