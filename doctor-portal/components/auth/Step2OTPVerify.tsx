"use client";

interface Step2OTPVerifyProps {
  emailOrPhone: string;
  otp1: string;
  otp2: string;
  otp3: string;
  otp4: string;
  handleOtpChange: (value: string, index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
  timeLeft: number;
  formatTime: (seconds: number) => string;
  setTimeLeft: (value: number) => void;
  setOtp1: (value: string) => void;
  setOtp2: (value: string) => void;
  setOtp3: (value: string) => void;
  setOtp4: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}

export default function Step2OTPVerify({
  emailOrPhone,
  otp1,
  otp2,
  otp3,
  otp4,
  handleOtpChange,
  handleKeyDown,
  timeLeft,
  formatTime,
  setTimeLeft,
  setOtp1,
  setOtp2,
  setOtp3,
  setOtp4,
  onSubmit,
  onGoBack,
}: Step2OTPVerifyProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center text-center">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
        Enter Your OTP
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
        We have successfully sent a code to{" "}
        <span className="text-[#5476FC] font-normal">{emailOrPhone || "john@example.com"}</span>
      </p>
      
      {/* 4 Digit OTP Block Inputs */}
      <div className="flex justify-center gap-4 mb-4">
        <input
          id="otp-1"
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
          id="otp-2"
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
          id="otp-3"
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
          id="otp-4"
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

      {/* Main Submit Action */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
      >
        Verify OTP
      </button>

      {/* Centered Go Back Button */}
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
