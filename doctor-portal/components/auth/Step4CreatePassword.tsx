"use client";

import { useState } from "react";

interface Step4CreatePasswordProps {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
  /** When provided, renders a read-only "Username" field above Password — this is
   *  just the email collected earlier in the flow, not a separate credential. */
  usernameValue?: string;
  submitLabel?: string;
  loadingLabel?: string;
}

export default function Step4CreatePassword({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  loading,
  onSubmit,
  onGoBack,
  usernameValue,
  submitLabel = "Create Password",
  loadingLabel = "Creating Account...",
}: Step4CreatePasswordProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Live Validation States
  const isMinLength = password.length >= 8;
  const isComplex = 
    /[A-Z]/.test(password) && 
    /[a-z]/.test(password) && 
    /[0-9]/.test(password) && 
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h2 className="text-[20px] font-bold text-[#24292E] mb-2">Create Your Password</h2>
      <p className="text-[12px] text-[#676E76] leading-relaxed mb-8">
        Choose a strong password to secure your account and keep your information safe.
      </p>
      
      <div className="w-full flex flex-col gap-6 mb-8">
        {/* Username field (read-only — this is the email from the earlier step) */}
        {usernameValue !== undefined && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Username</label>
            <input
              type="text"
              readOnly
              value={usernameValue}
              placeholder="Username"
              className="w-full h-11 border border-[#D6DEFF] bg-[#F9FAFB] rounded-xl px-4 text-[13px] text-[#A7AAB4] outline-none cursor-not-allowed select-text"
            />
          </div>
        )}

        {/* Password field */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[12px] font-semibold text-[#24292E]">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 pr-12 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors placeholder-[#A7AAB4]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 bottom-[10px] text-[#A7AAB4] hover:text-[#5476FC] transition-colors focus:outline-none"
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

        {/* Confirm Password field */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[12px] font-semibold text-[#24292E]">Re-enter Password</label>
          <input
            type={showConfirmPassword ? "text" : "password"}
            required
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 pr-12 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors placeholder-[#A7AAB4]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 bottom-[10px] text-[#A7AAB4] hover:text-[#5476FC] transition-colors focus:outline-none"
          >
            {showConfirmPassword ? (
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
      </div>

      {/* Validation Checklist Grid */}
      <ul className="w-full flex flex-col gap-1.5 text-[11px] text-[#676E76] list-disc pl-5 marker:text-[#8AA0FF] mb-12">
        <li className={`${isMinLength ? "text-[#5476FC]" : ""}`}>
          Minimum Length: At least 8 characters.
        </li>
        <li className={`${isComplex ? "text-[#5476FC]" : ""}`}>
          Must include uppercase, lowercase, number, and special character.
        </li>
      </ul>

      <div className="flex justify-between w-full pt-4 border-t border-[#E4E8F0]">
        <button
          type="button"
          onClick={onGoBack}
          className="px-10 py-3.5 rounded-xl bg-white border border-[#E4E8F0] text-[#676E76] text-[13px] font-bold tracking-widest hover:bg-gray-50 transition-colors shadow-sm"
        >
          BACK
        </button>
        
        <button
          type="submit"
          disabled={loading || !isMinLength || !isComplex}
          className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-bold tracking-widest hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
