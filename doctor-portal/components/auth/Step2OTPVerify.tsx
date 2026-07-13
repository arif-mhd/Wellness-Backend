"use client";

interface Step2OTPVerifyProps {
  emailOrPhone: string;
  otp1: string;
  otp2: string;
  otp3: string;
  otp4: string;
  otp5?: string;
  otp6?: string;
  handleOtpChange: (value: string, index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  timeLeft: number;
  formatTime: (seconds: number) => string;
  setTimeLeft: (value: number) => void;
  setOtp1: (value: string) => void;
  setOtp2: (value: string) => void;
  setOtp3: (value: string) => void;
  setOtp4: (value: string) => void;
  setOtp5?: (value: string) => void;
  setOtp6?: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
  loading?: boolean;
  onResend?: () => void;
  resending?: boolean;
}

export default function Step2OTPVerify({
  emailOrPhone,
  otp1, otp2, otp3, otp4, otp5 = "", otp6 = "",
  handleOtpChange,
  handleKeyDown,
  timeLeft,
  formatTime,
  setTimeLeft,
  setOtp1, setOtp2, setOtp3, setOtp4, setOtp5, setOtp6,
  onSubmit,
  onGoBack,
  loading = false,
  onResend,
  resending = false,
}: Step2OTPVerifyProps) {

  const handleResend = async () => {
    if (onResend) {
      onResend();
      return;
    }
    // Fallback: reset locally if no handler provided
    setTimeLeft(600);
    setOtp1(""); setOtp2(""); setOtp3(""); setOtp4("");
    setOtp5?.(""); setOtp6?.("");
  };

  const inputClass = (filled: boolean) =>
    `w-12 h-12 md:w-14 md:h-14 rounded-2xl text-center text-xl font-semibold font-outfit transition focus:outline-none focus:ring-2 focus:ring-[#5476FC] ${
      filled
        ? "bg-[#EEF2FF] border-2 border-[#5476FC] text-gray-800"
        : "bg-[#f3f4fd] border-0 text-gray-800"
    } placeholder-gray-300`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center text-center">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
        Enter Your OTP
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
        We sent a 6-digit code to{" "}
        <span className="text-[#5476FC] font-medium">{emailOrPhone || "your email"}</span>
      </p>

      {/* 6-digit OTP inputs */}
      <div className="flex justify-center gap-2 md:gap-3 mb-4">
        {[
          { id: "otp-1", val: otp1, idx: 1 },
          { id: "otp-2", val: otp2, idx: 2 },
          { id: "otp-3", val: otp3, idx: 3 },
          { id: "otp-4", val: otp4, idx: 4 },
          { id: "otp-5", val: otp5, idx: 5 },
          { id: "otp-6", val: otp6, idx: 6 },
        ].map(({ id, val, idx }) => (
          <input
            key={id}
            id={id}
            type="text"
            inputMode="numeric"
            maxLength={1}
            required
            value={val}
            onChange={(e) => handleOtpChange(e.target.value, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder="•"
            className={inputClass(!!val)}
          />
        ))}
      </div>

      {/* Timer and Resend */}
      <div className="w-full flex justify-between items-center text-xs mb-8 px-1">
        <span className="text-gray-500 font-light font-outfit">
          {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired"}
        </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-[#5476FC] font-medium font-outfit hover:underline focus:outline-none disabled:text-gray-300 disabled:no-underline"
        >
          {resending ? "Sending…" : "Resend OTP"}
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Verifying…" : "Verify OTP"}
      </button>

      <button
        type="button"
        onClick={onGoBack}
        className="mt-6 text-gray-700 font-semibold font-outfit text-sm hover:underline focus:outline-none"
      >
        Go Back
      </button>
    </form>
  );
}
