"use client";

interface Step5SuccessProps {
  onComplete: () => void;
}

export default function Step5Success({ onComplete }: Step5SuccessProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-4">
        Password Created Successfully!
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
        Your password has been set. You can now continue to log in to your account.
      </p>

      {/* Main Action Button */}
      <button
        type="button"
        onClick={onComplete}
        className="w-full flex items-center justify-center bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
      >
        Complete Profile Information
      </button>
    </div>
  );
}
