"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface EmergencyRecord {
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  specialInstructions: string;
}

const SIMULATED_RECORD: EmergencyRecord = {
  patientName: "Floyd Miles",
  age: 32,
  gender: "Male",
  bloodGroup: "O Positive (O+)",
  allergies: [
    "Penicillin (Severe - risk of anaphylaxis)",
    "Peanuts (Moderate - causes hives & swelling)",
    "Aspirin (Mild - triggers asthma symptoms)"
  ],
  chronicConditions: [
    "Bronchial Asthma (Diagnosed 2018, managed via daily inhaler)",
    "Mild Hypertension (Stage 1, diagnosed 2023)"
  ],
  medications: [
    "Albuterol HFA 90 mcg (Inhaler) - 2 puffs as needed for shortness of breath",
    "Lisinopril 10 mg (Oral Tablet) - Once daily in the morning"
  ],
  emergencyContact: {
    name: "Jane Miles",
    relation: "Wife",
    phone: "+1 (555) 019-2834"
  },
  specialInstructions: "Always carry an active epinephrine auto-injector if severe allergic reaction symptoms are detected. Patient has a history of asthma flare-ups during respiratory infections."
};

export default function SOSPage() {
  const router = useRouter();
  const [step, setStep] = useState<"license" | "otp" | "sosCode">("license");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseError, setLicenseError] = useState("");
  
  // OTP states
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(85);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // SOS Code states
  const [sosCode, setSosCode] = useState<string[]>(Array(6).fill(""));
  const [sosCodeError, setSosCodeError] = useState("");
  const sosInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Count down for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber.trim()) {
      setLicenseError("Please enter your medical license number.");
      return;
    }
    if (licenseNumber.trim().length < 5) {
      setLicenseError("Please enter a valid medical license number (minimum 5 characters).");
      return;
    }
    setLicenseError("");
    setStep("otp");
    setTimer(85);
    setCanResend(false);
    setOtp(Array(6).fill(""));
  };

  const handleOtpChange = (index: number, value: string) => {
    if (/[^0-9]/.test(value)) return; // Allow numbers only
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setOtpError("Please enter all 6 digits of the verification code.");
      return;
    }
    // Simulate verification
    if (fullOtp === "123456" || fullOtp.length === 6) {
      setOtpError("");
      setStep("sosCode");
    } else {
      setOtpError("Invalid verification code. Please try again.");
    }
  };

  const handleSosCodeChange = (index: number, value: string) => {
    if (/[^0-9]/.test(value)) return; // Allow numbers only
    const newCode = [...sosCode];
    newCode[index] = value;
    setSosCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      sosInputsRef.current[index + 1]?.focus();
    }
  };

  const handleSosCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !sosCode[index] && index > 0) {
      sosInputsRef.current[index - 1]?.focus();
    }
  };

  const handleSosCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = sosCode.join("");
    if (fullCode.length < 6) {
      setSosCodeError("Please enter all 6 digits of the SOS code.");
      return;
    }
    // Simulate verification
    if (fullCode === "123456" || fullCode.length === 6) {
      setSosCodeError("");
      router.push("/appointments/patient-details?id=all-20");
    } else {
      setSosCodeError("Invalid SOS code. Please try again.");
    }
  };

  const handleResendOtp = () => {
    setTimer(85);
    setCanResend(false);
    setOtp(Array(6).fill(""));
    setOtpError("");
    // Focus the first input box
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 100);
  };

  const handleResetFlow = () => {
    setLicenseNumber("");
    setOtp(Array(6).fill(""));
    setStep("license");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-100px)] flex flex-col justify-center items-center px-4 py-8 select-none font-outfit">
        {step === "license" && (
          <div className="w-full max-w-[624px] bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all duration-300">
            <h2 className="text-[#24292E] text-[22px] font-normal leading-[1.3] tracking-[-0.66px] mb-3 font-marcellus">
              Enter Your License Number
            </h2>
            <p className="text-[#24292E] text-xs font-normal leading-5 tracking-[-0.24px] mb-6">
              To access the patient's SOS records, please enter your valid medical license number. Once verified, an OTP will be sent to you for secure access.
            </p>

            <form onSubmit={handleLicenseSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[#24292E] text-xs font-normal tracking-[-0.24px] px-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => {
                    setLicenseNumber(e.target.value);
                    if (e.target.value) setLicenseError("");
                  }}
                  placeholder="Please enter your license number"
                  className="w-full h-14 px-5 rounded-xl bg-[#F5F6FA] border border-transparent text-[#24292E] placeholder-[#9EA5AD] text-base font-medium focus:bg-white focus:border-[#5476FC]/30 outline-none transition-all"
                />
                {licenseError && (
                  <p className="text-red-500 text-xs px-1 mt-1 font-medium">{licenseError}</p>
                )}
              </div>

              {/* Warnings and audit note box */}
              <div className="flex gap-3 bg-[#EEF2FF] p-4 rounded-xl border border-[#E0E7FF]">
                <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.0001 18.3327C5.39771 18.3327 1.66675 14.6017 1.66675 9.99935C1.66675 5.39697 5.39771 1.66602 10.0001 1.66602C14.6024 1.66602 18.3334 5.39697 18.3334 9.99935C18.3334 14.6017 14.6024 18.3327 10.0001 18.3327ZM10.0001 16.666C13.682 16.666 16.6667 13.6813 16.6667 9.99935C16.6667 6.31745 13.682 3.33268 10.0001 3.33268C6.31818 3.33268 3.33341 6.31745 3.33341 9.99935C3.33341 13.6813 6.31818 16.666 10.0001 16.666ZM9.16675 5.83268H10.8334V7.49935H9.16675V5.83268ZM9.16675 9.16602H10.8334V14.166H9.16675V9.16602Z" fill="#8AA0FF"/>
                </svg>
                <p className="text-[#24292E] text-xs font-normal leading-[18px] tracking-[-0.24px]">
                  Ensure that you enter your correct license number as registered with the medical authorities. After submitting your license number, you will receive an OTP to complete the verification process.
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-base rounded-xl flex items-center justify-center shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] active:scale-[0.99] transition-all"
              >
                Verify License & Continue
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="w-full max-w-[624px] bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all duration-300">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-3">
              <button
                type="button"
                onClick={() => setStep("license")}
                className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-[#EBEEF5] flex items-center justify-center text-[#65799D] transition-all select-none"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h2 className="text-[#24292E] text-[22px] font-normal leading-[1.3] tracking-[-0.66px] font-marcellus">
                OTP Verification
              </h2>
            </div>

            <p className="text-[#24292E] text-xs font-normal leading-5 tracking-[-0.24px] mb-6">
              An OTP has been sent to your registered phone number <span className="text-[#5476FC] font-medium">(219) 555-0114</span>. Please enter the OTP below to verify your identity and access the patient's SOS records.
            </p>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
              {/* Digit fields */}
              <div className="flex flex-col gap-2">
                <label className="block text-[#24292E] text-xs font-normal tracking-[-0.24px] px-1">
                  Verify OTP
                </label>
                <div className="grid grid-cols-6 gap-2.5">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputsRef.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-full h-16 text-center bg-[#F5F6FA] text-[#24292E] text-xl font-bold rounded-xl border border-transparent focus:bg-white focus:border-[#5476FC]/40 outline-none transition-all"
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="text-red-500 text-xs px-1 mt-1 font-medium">{otpError}</p>
                )}
              </div>

              {/* Timer/Resend block */}
              <div className="flex justify-between items-center px-1 text-xs">
                <span className="text-[#2F2F2F]">
                  {!canResend && `Try again in ${formatTime(timer)}`}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className={`font-semibold transition-all ${
                    canResend 
                      ? "text-[#5B7BFC] hover:underline" 
                      : "text-[#9EA5AD] cursor-not-allowed"
                  }`}
                >
                  Resend OTP
                </button>
              </div>

              {/* Info block */}
              <div className="flex gap-3 bg-[#F5F8FF] p-4 rounded-xl border border-[#EBEEF5]">
                <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.0001 18.3327C5.39771 18.3327 1.66675 14.6017 1.66675 9.99935C1.66675 5.39697 5.39771 1.66602 10.0001 1.66602C14.6024 1.66602 18.3334 5.39697 18.3334 9.99935C18.3334 14.6017 14.6024 18.3327 10.0001 18.3327ZM10.0001 16.666C13.682 16.666 16.6667 13.6813 16.6667 9.99935C16.6667 6.31745 13.682 3.33268 10.0001 3.33268C6.31818 3.33268 3.33341 6.31745 3.33341 9.99935C3.33341 13.6813 6.31818 16.666 10.0001 16.666ZM9.16675 5.83268H10.8334V7.49935H9.16675V5.83268ZM9.16675 9.16602H10.8334V14.166H9.16675V9.16602Z" fill="#8AA0FF"/>
                </svg>
                <p className="text-[#24292E] text-xs font-normal leading-[18px] tracking-[-0.24px]">
                  Make sure to enter your correct license number as registered with the appropriate medical authorities.
                </p>
              </div>

              {/* Secure audit warning */}
              <div className="flex gap-3 bg-[#FDF2F2] p-4 rounded-xl border border-[#FDE8E8]">
                <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.515 2.63H4.72c-1.343 0-2.188-1.463-1.515-2.63l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" fill="#F87171" />
                </svg>
                <p className="text-[#24292E] text-xs font-normal leading-[18px] tracking-[-0.24px]">
                  <strong>Warning:</strong> SOS record access is fully monitored and audited. Proceeding asserts that you have consent or valid clinical authorization.
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-base rounded-xl flex items-center justify-center shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] active:scale-[0.99] transition-all"
              >
                Verify OTP
              </button>
            </form>
          </div>
        )}

        {step === "sosCode" && (
          <div className="w-full max-w-[624px] bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all duration-300">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-3">
              <button
                type="button"
                onClick={() => setStep("otp")}
                className="w-10 h-10 rounded-full bg-white hover:bg-gray-50 border border-[#EBEEF5] flex items-center justify-center text-[#65799D] transition-all select-none"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h2 className="text-[#24292E] text-[22px] font-normal leading-[1.3] tracking-[-0.66px] font-marcellus">
                Enter SOS Code
              </h2>
            </div>

            <p className="text-[#24292E] text-xs font-normal leading-5 tracking-[-0.24px] mb-6">
              To access the patient's SOS records, please enter the unique SOS code provided by the patient. This ensures secure retrieval of critical information during emergencies.
            </p>

            <form onSubmit={handleSosCodeSubmit} className="flex flex-col gap-6">
              {/* Digit fields */}
              <div className="flex flex-col gap-2">
                <label className="block text-[#24292E] text-xs font-normal tracking-[-0.24px] px-1">
                  Enter SOS Code
                </label>
                <div className="grid grid-cols-6 gap-2.5">
                  {sosCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { sosInputsRef.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleSosCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleSosCodeKeyDown(i, e)}
                      className="w-full h-16 text-center bg-[#E84949]/10 text-[#24292E] text-xl font-bold rounded-xl border border-transparent focus:bg-white focus:border-[#E84949]/40 outline-none transition-all"
                    />
                  ))}
                </div>
                {sosCodeError && (
                  <p className="text-red-500 text-xs px-1 mt-1 font-medium">{sosCodeError}</p>
                )}
              </div>

              {/* Warning/Info block */}
              <div className="flex gap-3 bg-[#FFF5F5] p-4 rounded-xl border border-[#FFE3E3]">
                <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18.3327C5.39765 18.3327 1.66669 14.6017 1.66669 9.99935C1.66669 5.39697 5.39765 1.66602 10 1.66602C14.6024 1.66602 18.3334 5.39697 18.3334 9.99935C18.3334 14.6017 14.6024 18.3327 10 18.3327ZM10 16.666C13.6819 16.666 16.6667 13.6813 16.6667 9.99935C16.6667 6.31745 13.6819 3.33268 10 3.33268C6.31812 3.33268 3.33335 6.31745 3.33335 9.99935C3.33335 13.6813 6.31812 16.666 10 16.666ZM9.16669 5.83268H10.8334V7.49935H9.16669V5.83268ZM9.16669 9.16602H10.8334V14.166H9.16669V9.16602Z" fill="#E84949"/>
                </svg>
                <p className="text-[#24292E] text-xs font-normal leading-[18px] tracking-[-0.24px]">
                  Please note that these records are available for access for <span className="text-[#E84949] font-semibold">only 1 hour</span> from the time of entry. Ensure timely retrieval of the necessary information.
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-base rounded-xl flex items-center justify-center shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] active:scale-[0.99] transition-all"
              >
                Access SOS Records
              </button>
            </form>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
