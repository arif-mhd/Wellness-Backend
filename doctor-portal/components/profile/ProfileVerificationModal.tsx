"use client";

interface ProfileVerificationModalProps {
  onClose: () => void;
}

export default function ProfileVerificationModal({ onClose }: ProfileVerificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="relative w-full max-w-[420px] bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(79,70,229,0.15)] border border-indigo-50/50 p-8 md:p-10 text-center animate-in zoom-in-95 fade-in duration-200 font-outfit">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus mb-3">
          Profile Verification
        </h2>
        <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
          Your profile has been sent for verification. You will be notified within 24 hours at your registered email.
        </p>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer hover:opacity-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
