"use client";

interface Step1VerifyContactProps {
  emailOrPhone: string;
  setEmailOrPhone: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function Step1VerifyContact({
  emailOrPhone,
  setEmailOrPhone,
  onSubmit,
}: Step1VerifyContactProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center text-center">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2">
        Provide Your Email or Phone
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
        We'll send you a one-time password (OTP) to verify your contact details.
      </p>
      
      <div className="w-full mb-6">
        <input
          type="text"
          required
          placeholder="Email/ Phone Number*"
          value={emailOrPhone}
          onChange={(e) => setEmailOrPhone(e.target.value)}
          className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
        />
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
      >
        Continue
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
}
