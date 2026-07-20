"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logoImg from "@/assets/images/wellness_logo.png";

// Import modular step components
import Step1VerifyContact from "@/components/auth/Step1VerifyContact";
import Step2OTPVerify from "@/components/auth/Step2OTPVerify";
import Step3BasicDetails from "@/components/auth/Step3BasicDetails";
import Step4CreatePassword from "@/components/auth/Step4CreatePassword";
import Step5Success from "@/components/auth/Step5Success";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [otp1, setOtp1] = useState("");
  const [otp2, setOtp2] = useState("");
  const [otp3, setOtp3] = useState("");
  const [otp4, setOtp4] = useState("");
  const [otp5, setOtp5] = useState("");
  const [otp6, setOtp6] = useState("");
  const [resending, setResending] = useState(false);
  
  // Basic Details Form States
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Password States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  const router = useRouter();

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 2 || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const otpSetters = [setOtp1, setOtp2, setOtp3, setOtp4, setOtp5, setOtp6];

  const handleOtpChange = (value: string, index: number) => {
    if (value && isNaN(Number(value))) return;
    otpSetters[index - 1](value);
    if (value && index < 6) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && index > 1) {
      const current = [otp1, otp2, otp3, otp4, otp5, otp6][index - 1];
      if (!current) {
        otpSetters[index - 2]("");
        document.getElementById(`otp-${index - 1}`)?.focus();
      }
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrPhone.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTimeLeft(600);
        setOtp1(""); setOtp2(""); setOtp3(""); setOtp4(""); setOtp5(""); setOtp6("");
        document.getElementById("otp-1")?.focus();
      } else if (res.status === 429) {
        setError(`Please wait ${data.retryAfter ?? 60}s before requesting a new code.`);
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setResending(false);
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Step 1: Send OTP to email
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = emailOrPhone.trim();
    if (!value || !value.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setTimeLeft(600);
        setOtp1(""); setOtp2(""); setOtp3(""); setOtp4(""); setOtp5(""); setOtp6("");
      } else if (res.status === 409) {
        setError("An account with this email already exists. Please log in.");
      } else if (res.status === 429) {
        setError(`Please wait ${data.retryAfter ?? 60}s before requesting a new code.`);
      } else {
        setError("Failed to send verification code. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const completeOtp = otp1 + otp2 + otp3 + otp4 + otp5 + otp6;
    if (completeOtp.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrPhone.trim().toLowerCase(), code: completeOtp }),
      });
      const data = await res.json();
      if (data.verified) {
        setError("");
        setStep(3);
      } else {
        switch (data.reason) {
          case "INVALID_CODE":
            setError(data.attemptsLeft > 0 ? `Incorrect code. ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining.` : "Incorrect code.");
            break;
          case "EXPIRED":
            setError("Code has expired. Click Resend OTP to get a new one.");
            break;
          case "TOO_MANY_ATTEMPTS":
            setError("Too many incorrect attempts. Please request a new code.");
            break;
          default:
            setError("Verification failed. Please try again.");
        }
      }
    } catch {
      setError("Cannot reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Basic Details Submission
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !dateOfBirth.trim() || !gender.trim() || !phone.trim() || !agreed) {
      setError("Please complete all required fields and agree to the terms.");
      return;
    }
    setError("");
    setStep(4);
  };

  // Step 4: Password Creation & Registration Submit
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Use the email collected in step 3; fall back to emailOrPhone from step 1
    const registrationEmail = email.trim() || emailOrPhone.trim();

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/clinics/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:       registrationEmail,
          password,
          fullName,
          phone,
          dateOfBirth,
          gender,
          emiratesIdOrPassport: emiratesId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(5);
      } else if (res.status === 409) {
        setError("An account with this email already exists.");
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalComplete = () => {
    // Send doctor to complete their profile before awaiting approval
    router.push(`/auth/complete-profile?name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email || emailOrPhone)}&phone=${encodeURIComponent(phone)}&dob=${encodeURIComponent(dateOfBirth)}&gender=${encodeURIComponent(gender)}&emiratesId=${encodeURIComponent(emiratesId)}`);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">
      
      {/* Decorative Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center flex-1 justify-start pt-8 md:pt-16 z-10">
        
        {/* Wellness Logo at Top */}
        <div className="mb-12 flex items-center gap-3 select-none">
          <Image
            src={logoImg}
            alt="Wellness Central Logo"
            width={160}
            height={50}
            className="object-contain hover:opacity-90 transition-opacity"
            priority
          />
          <span className="text-[0.7rem] font-semibold tracking-[0.15em] text-[#5476FC] uppercase pl-3 border-l border-indigo-100">
            Clinic
          </span>
        </div>

        {/* Step Progress Indicators (Hidden on step 5 / Success screen) */}
        {step < 5 && (
          <div className="w-full max-w-[900px] border-b border-indigo-100/50 relative flex justify-between items-stretch mb-16 select-none animate-fadeIn">
            
            {/* STEP 1 Tab */}
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              className="flex-1 pb-4 flex flex-col items-center gap-1 group relative outline-none transition"
            >
              <div className="flex items-center gap-2">
                <span className={`text-base font-outfit transition-colors duration-250 ${
                  step === 1 
                    ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-bold" 
                    : "text-gray-400 font-normal"
                }`}>
                  01
                </span>
                <span className={`text-[0.68rem] tracking-wide transition-colors duration-250 font-outfit ${
                  step === 1 ? "text-gray-700 font-semibold" : "text-gray-400 font-normal"
                }`}>
                  Verify Email/Phone
                </span>
              </div>
              {step === 1 && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC]" />
              )}
            </button>

            {/* STEP 2 Tab */}
            <button
              type="button"
              onClick={() => step > 2 && setStep(2)}
              className="flex-1 pb-4 flex flex-col items-center gap-1 group relative outline-none transition"
            >
              <div className="flex items-center gap-2">
                <span className={`text-base font-outfit transition-colors duration-250 ${
                  step === 2 
                    ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-bold" 
                    : "text-gray-400 font-normal"
                }`}>
                  02
                </span>
                <span className={`text-[0.68rem] tracking-wide transition-colors duration-250 font-outfit ${
                  step === 2 ? "text-gray-700 font-semibold" : "text-gray-400 font-normal"
                }`}>
                  OTP Verification
                </span>
              </div>
              {step === 2 && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC]" />
              )}
            </button>

            {/* STEP 3 Tab */}
            <button
              type="button"
              onClick={() => step > 3 && setStep(3)}
              className="flex-1 pb-4 flex flex-col items-center gap-1 group relative outline-none transition"
            >
              <div className="flex items-center gap-2">
                <span className={`text-base font-outfit transition-colors duration-250 ${
                  step === 3 
                    ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-bold" 
                    : "text-gray-400 font-normal"
                }`}>
                  03
                </span>
                <span className={`text-[0.68rem] tracking-wide transition-colors duration-250 font-outfit ${
                  step === 3 ? "text-gray-700 font-semibold" : "text-gray-400 font-normal"
                }`}>
                  Basic Details
                </span>
              </div>
              {step === 3 && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC]" />
              )}
            </button>

            {/* STEP 4 Tab */}
            <button
              type="button"
              disabled
              className="flex-1 pb-4 flex flex-col items-center gap-1 group relative outline-none transition cursor-default"
            >
              <div className="flex items-center gap-2">
                <span className={`text-base font-outfit transition-colors duration-250 ${
                  step === 4 
                    ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] bg-clip-text text-transparent font-bold" 
                    : "text-gray-400 font-normal"
                }`}>
                  04
                </span>
                <span className={`text-[0.68rem] tracking-wide transition-colors duration-250 font-outfit ${
                  step === 4 ? "text-gray-700 font-semibold" : "text-gray-400 font-normal"
                }`}>
                  Create Password
                </span>
              </div>
              {step === 4 && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC]" />
              )}
            </button>
          </div>
        )}

        {/* Dynamic Multi-Step Form Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.06)] border border-indigo-50/50 p-10 md:p-12 w-full max-w-[500px] backdrop-blur-sm relative overflow-hidden transition-all duration-300">
          
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center font-outfit">
              {error}
            </div>
          )}

          {/* Render Step Component dynamically */}
          {step === 1 && (
            <Step1VerifyContact
              emailOrPhone={emailOrPhone}
              setEmailOrPhone={setEmailOrPhone}
              onSubmit={handleStep1Submit}
              loading={loading}
            />
          )}

          {step === 2 && (
            <Step2OTPVerify
              emailOrPhone={emailOrPhone}
              otp1={otp1}
              otp2={otp2}
              otp3={otp3}
              otp4={otp4}
              otp5={otp5}
              otp6={otp6}
              handleOtpChange={handleOtpChange}
              handleKeyDown={handleKeyDown}
              timeLeft={timeLeft}
              formatTime={formatTime}
              setTimeLeft={setTimeLeft}
              setOtp1={setOtp1}
              setOtp2={setOtp2}
              setOtp3={setOtp3}
              setOtp4={setOtp4}
              setOtp5={setOtp5}
              setOtp6={setOtp6}
              onSubmit={handleStep2Submit}
              onGoBack={() => setStep(1)}
              loading={loading}
              onResend={handleResend}
              resending={resending}
            />
          )}

          {step === 3 && (
            <Step3BasicDetails
              fullName={fullName}
              setFullName={setFullName}
              dateOfBirth={dateOfBirth}
              setDateOfBirth={setDateOfBirth}
              gender={gender}
              setGender={setGender}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              emiratesId={emiratesId}
              setEmiratesId={setEmiratesId}
              agreed={agreed}
              setAgreed={setAgreed}
              onSubmit={handleStep3Submit}
              onGoBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4CreatePassword
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              loading={loading}
              onSubmit={handleStep4Submit}
              onGoBack={() => setStep(3)}
              usernameValue={email || emailOrPhone}
              submitLabel="Sign Up"
              loadingLabel="Signing Up..."
            />
          )}

          {step === 5 && (
            <Step5Success
              onComplete={handleFinalComplete}
            />
          )}

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
