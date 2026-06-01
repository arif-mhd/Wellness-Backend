"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [step, setStep] = useState<"license" | "otp" | "records">("license");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseError, setLicenseError] = useState("");
  
  // OTP states
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(85);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

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
      setStep("records");
    } else {
      setOtpError("Invalid verification code. Please try again.");
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
              To access the patient's emergency records, please enter your valid medical license number. Once verified, an OTP will be sent to you for secure access.
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
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-[#24292E] text-[22px] font-normal leading-[1.3] tracking-[-0.66px] font-marcellus">
                Enter Verification OTP
              </h2>
              <button 
                onClick={() => setStep("license")}
                className="text-xs text-[#5476FC] font-semibold hover:underline"
              >
                Change License
              </button>
            </div>
            <p className="text-[#24292E] text-xs font-normal leading-5 tracking-[-0.24px] mb-6">
              A 6-digit OTP verification code has been sent to your registered medical contact details. Enter it below to authorize emergency access.
            </p>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
              {/* Digit fields */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
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
                      className="w-[72px] h-[72px] text-center bg-[#F5F6FA] text-[#24292E] text-2xl font-bold rounded-xl border border-transparent focus:bg-white focus:border-[#5476FC]/40 outline-none transition-all"
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="text-red-500 text-xs px-1 mt-1 font-medium">{otpError}</p>
                )}
              </div>

              {/* Timer/Resend block */}
              <div className="flex justify-between items-center px-1 text-xs">
                <span className="text-[#707070]">
                  Didn't receive the code?
                </span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-[#5476FC] font-bold hover:underline"
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span className="text-[#9EA5AD] font-medium">
                    Resend in <strong className="text-[#383F45]">{timer}s</strong>
                  </span>
                )}
              </div>

              {/* Secure audit warning */}
              <div className="flex gap-3 bg-[#FDF2F2] p-4 rounded-xl border border-[#FDE8E8]">
                <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.515 2.63H4.72c-1.343 0-2.188-1.463-1.515-2.63l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" fill="#F87171" />
                </svg>
                <p className="text-[#24292E] text-xs font-normal leading-[18px] tracking-[-0.24px]">
                  <strong>Warning:</strong> Emergency record access is fully monitored and audited. Proceeding asserts that you have consent or valid clinical authorization.
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-base rounded-xl flex items-center justify-center shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] active:scale-[0.99] transition-all"
              >
                Verify & Access Records
              </button>
            </form>
          </div>
        )}

        {step === "records" && (
          <div className="w-full max-w-[800px] bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all duration-300">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBEEF5] pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-red-600 text-xs font-bold uppercase tracking-wider">
                    Emergency Medical File
                  </span>
                </div>
                <h2 className="text-[#24292E] text-2xl font-normal tracking-[-0.66px] font-marcellus">
                  {SIMULATED_RECORD.patientName}
                </h2>
                <p className="text-[#9EA5AD] text-xs mt-1">
                  {SIMULATED_RECORD.age} y/o &bull; {SIMULATED_RECORD.gender} &bull; Blood Type: <strong className="text-[#24292E]">{SIMULATED_RECORD.bloodGroup}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-[#383F45] text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print Records
                </button>
                <button
                  onClick={handleResetFlow}
                  className="h-10 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#383F45] text-xs font-semibold flex items-center justify-center transition-colors"
                >
                  Back / Lock File
                </button>
              </div>
            </div>

            {/* Grid structure for data */}
            <div className="flex flex-col gap-6">
              
              {/* Emergency Contact */}
              <div className="p-4 bg-red-50/60 border border-red-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-red-700 text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Primary Emergency Contact
                  </span>
                  <strong className="text-[#24292E] text-sm block">
                    {SIMULATED_RECORD.emergencyContact.name} ({SIMULATED_RECORD.emergencyContact.relation})
                  </strong>
                </div>
                <a
                  href={`tel:${SIMULATED_RECORD.emergencyContact.phone}`}
                  className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold flex items-center gap-2 justify-center transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 22.621l-3.521-6.795c-.008.004-1.974.97-2.064 1.011-2.24 1.086-6.779-7.786-4.537-8.872.09-.043 2.056-1.006 2.064-1.01l-3.52-6.795c-.012-.002-2.03.99-2.03.99-3.797 1.839.294 12.441 5.3 17.447 5.006 5.006 15.608 9.097 17.448 5.299 0 0-1.005-2.017-1.005-2.029z"/>
                  </svg>
                  Call {SIMULATED_RECORD.emergencyContact.phone}
                </a>
              </div>

              {/* Allergies - Critical Warning */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-gray-900 border-l-[3px] border-red-500 pl-2">
                  Known Allergies
                </h3>
                <ul className="flex flex-col gap-2">
                  {SIMULATED_RECORD.allergies.map((allergy, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      {allergy}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Chronic Conditions */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-gray-900 border-l-[3px] border-[#5476FC] pl-2">
                  Chronic Health Conditions
                </h3>
                <ul className="flex flex-col gap-2">
                  {SIMULATED_RECORD.chronicConditions.map((cond, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#5476FC] shrink-0" />
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active Medications */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-gray-900 border-l-[3px] border-[#8AA0FF] pl-2">
                  Active Medications
                </h3>
                <ul className="flex flex-col gap-2">
                  {SIMULATED_RECORD.medications.map((med, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8AA0FF] shrink-0" />
                      {med}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Special Clinical Instructions */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-gray-900 border-l-[3px] border-yellow-500 pl-2">
                  Special Instructions / Notes
                </h3>
                <div className="text-xs text-yellow-800 bg-yellow-50/50 border border-yellow-100 rounded-lg p-4 leading-5">
                  {SIMULATED_RECORD.specialInstructions}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
