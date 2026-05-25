"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import logoImg from "@/assets/images/wellness_logo.png";

interface TwoFactorAuthProps {
  phoneNumber?: string;
  onVerify: (otp: string) => void;
  onGoBack: () => void;
}

export default function TwoFactorAuth({
  phoneNumber = "+91 81298398**",
  onVerify,
  onGoBack,
}: TwoFactorAuthProps) {
  const [otp1, setOtp1] = useState("");
  const [otp2, setOtp2] = useState("");
  const [otp3, setOtp3] = useState("");
  const [otp4, setOtp4] = useState("");
  const [timeLeft, setTimeLeft] = useState(85); // 01:25 countdown (85 seconds)
  const [error, setError] = useState("");

  // Countdown timer for OTP
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value && isNaN(Number(value))) return;
    
    if (index === 1) {
      setOtp1(value);
      if (value) document.getElementById("2fa-otp-2")?.focus();
    } else if (index === 2) {
      setOtp2(value);
      if (value) document.getElementById("2fa-otp-3")?.focus();
      else document.getElementById("2fa-otp-1")?.focus();
    } else if (index === 3) {
      setOtp3(value);
      if (value) document.getElementById("2fa-otp-4")?.focus();
      else document.getElementById("2fa-otp-2")?.focus();
    } else if (index === 4) {
      setOtp4(value);
      if (!value) document.getElementById("2fa-otp-3")?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (index === 2 && !otp2) {
        setOtp1("");
        document.getElementById("2fa-otp-1")?.focus();
      } else if (index === 3 && !otp3) {
        setOtp2("");
        document.getElementById("2fa-otp-2")?.focus();
      } else if (index === 4 && !otp4) {
        setOtp3("");
        document.getElementById("2fa-otp-3")?.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeOtp = otp1 + otp2 + otp3 + otp4;
    if (completeOtp.length < 4) {
      setError("Please enter the complete 4-digit code.");
      return;
    }
    setError("");
    onVerify(completeOtp);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">
      
      {/* Decorative Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center flex-1 justify-start pt-8 md:pt-16 z-10">
        
        {/* Wellness Logo at Top */}
        <div className="mb-12 select-none">
          <Image
            src={logoImg}
            alt="Wellness Central Logo"
            width={160}
            height={50}
            className="object-contain hover:opacity-90 transition-opacity"
            priority
          />
        </div>

        {/* Title above Card */}
        <h1 className="text-2xl md:text-[1.65rem] font-normal text-gray-500 font-marcellus mb-12 select-none tracking-tight">
          Two-Factor Authentication
        </h1>

        {/* Dynamic Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 w-full max-w-[500px] backdrop-blur-sm relative overflow-hidden transition-all duration-300">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center font-outfit">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
            <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
              Enter Your OTP
            </h2>
            <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
              We have successfully sent a code to{" "}
              <span className="text-[#5476FC] font-normal">{phoneNumber}</span>
            </p>
            
            {/* 4 Digit OTP Inputs */}
            <div className="flex justify-center gap-4 mb-4">
              <input
                id="2fa-otp-1"
                type="text"
                maxLength={1}
                required
                value={otp1}
                onChange={(e) => handleOtpChange(e.target.value, 1)}
                onKeyDown={(e) => handleKeyDown(e, 1)}
                placeholder="•"
                className="w-14 h-14 bg-[#f3f4fd] border-0 rounded-2xl text-center text-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition font-outfit placeholder-gray-300"
              />
              <input
                id="2fa-otp-2"
                type="text"
                maxLength={1}
                required
                value={otp2}
                onChange={(e) => handleOtpChange(e.target.value, 2)}
                onKeyDown={(e) => handleKeyDown(e, 2)}
                placeholder="•"
                className="w-14 h-14 bg-[#f3f4fd] border-0 rounded-2xl text-center text-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition font-outfit placeholder-gray-300"
              />
              <input
                id="2fa-otp-3"
                type="text"
                maxLength={1}
                required
                value={otp3}
                onChange={(e) => handleOtpChange(e.target.value, 3)}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                placeholder="•"
                className="w-14 h-14 bg-[#f3f4fd] border-0 rounded-2xl text-center text-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition font-outfit placeholder-gray-300"
              />
              <input
                id="2fa-otp-4"
                type="text"
                maxLength={1}
                required
                value={otp4}
                onChange={(e) => handleOtpChange(e.target.value, 4)}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                placeholder="•"
                className="w-14 h-14 bg-[#f3f4fd] border-0 rounded-2xl text-center text-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition font-outfit placeholder-gray-300"
              />
            </div>

            {/* Timer and Resend Row */}
            <div className="w-full flex justify-between items-center text-xs mb-8 px-1">
              <span className="text-gray-500 font-light font-outfit">
                {timeLeft > 0 ? `Try again in ${formatTime(timeLeft)}` : "Timer expired"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(85);
                  setOtp1("");
                  setOtp2("");
                  setOtp3("");
                  setOtp4("");
                }}
                className="text-[#5476FC] font-medium font-outfit hover:underline focus:outline-none"
              >
                Resend OTP
              </button>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
            >
              Verify OTP
            </button>

            {/* Go Back Link */}
            <button
              type="button"
              onClick={onGoBack}
              className="mt-6 text-gray-700 font-semibold font-outfit text-sm hover:underline focus:outline-none"
            >
              Go Back
            </button>
          </form>

        </div>

      </div>

      {/* Footer links */}
      <div className="w-full max-w-[1000px] mx-auto flex justify-center gap-3 text-[0.75rem] text-gray-400 font-light pt-8 select-none z-10">
        <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
        <span>|</span>
        <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
      </div>

    </div>
  );
}
