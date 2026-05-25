"use client";

interface Step5SuccessProps {
  onComplete: () => void;
}

export default function Step5Success({ onComplete }: Step5SuccessProps) {
  return (
    <div className="flex flex-col items-center text-center py-4">

      {/* Animated check icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center mb-6 shadow-lg shadow-blue-300/30">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-3">
        Registration Submitted!
      </h2>

      <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-3 font-outfit font-light max-w-[320px]">
        Your application is now under review by our admin team.
      </p>

      {/* Status badge */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 mb-8">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[0.78rem] font-semibold font-outfit">Pending Admin Approval</span>
      </div>

      <p className="text-gray-400 text-[0.75rem] leading-relaxed mb-8 font-outfit font-light max-w-[300px]">
        You'll receive an email confirmation once your account is approved. Only then will you be able to log in to the Doctor Portal.
      </p>

      {/* Back to Login */}
      <button
        type="button"
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Login
      </button>
    </div>
  );
}
