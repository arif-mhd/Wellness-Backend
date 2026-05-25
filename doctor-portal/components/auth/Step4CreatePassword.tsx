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
}

export default function Step4CreatePassword({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  loading,
  onSubmit,
  onGoBack,
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
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2 text-center">
        Create Your Password
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light text-center">
        Choose a strong password to secure your account and keep your information safe.
      </p>
      
      <div className="w-full space-y-4 mb-6">
        {/* Password field */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
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

        {/* Confirm Password field */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            required
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl pl-5 pr-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#5476FC] transition-colors focus:outline-none"
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
      <div className="w-full space-y-2 mb-8 px-1 text-left select-none">
        {/* Rule 1: Min Length */}
        <div className="flex items-start gap-2">
          {isMinLength ? (
            <svg className="w-4 h-4 text-[#5476FC] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
            </svg>
          )}
          <span className={`text-[0.7rem] font-light font-outfit leading-relaxed ${isMinLength ? "text-gray-600" : "text-gray-400"}`}>
            Minimum Length: At least 8 characters.
          </span>
        </div>

        {/* Rule 2: Complexity */}
        <div className="flex items-start gap-2">
          {isComplex ? (
            <svg className="w-4 h-4 text-[#5476FC] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
            </svg>
          )}
          <span className={`text-[0.7rem] font-light font-outfit leading-relaxed ${isComplex ? "text-gray-600" : "text-gray-400"}`}>
            Your password must include at least one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special character (e.g., !@#$%^&*).
          </span>
        </div>
      </div>

      {/* Main Submit Action */}
      <button
        type="submit"
        disabled={loading || !isMinLength || !isComplex}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating Account..." : "Create Password"}
      </button>

      {/* Centered Go Back Button */}
      <button
        type="button"
        onClick={onGoBack}
        className="mt-6 text-gray-700 font-semibold font-outfit text-sm hover:underline focus:outline-none text-center"
      >
        Go Back
      </button>
    </form>
  );
}
