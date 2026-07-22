"use client";

interface MultiBranchPopupProps {
  onNo: () => void;
  onYes: () => void;
}

export default function MultiBranchPopup({ onNo, onYes }: MultiBranchPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="relative w-full max-w-[440px] bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(79,70,229,0.15)] border border-indigo-50/50 p-8 md:p-10 text-center animate-in zoom-in-95 fade-in duration-200 font-outfit">
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-[#5476FC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V11l6 4v6M9 9v.01M9 12v.01M9 15v.01" />
          </svg>
        </div>

        <h2 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus mb-3">
          Do you operate multiple branches?
        </h2>
        <p className="text-gray-500 text-[0.85rem] leading-relaxed mb-8 font-outfit font-light">
          If your clinic has more than one physical location, let us know so we can set up branch management for your account.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onNo}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 transition-colors duration-150"
          >
            No
          </button>
          <button
            onClick={onYes}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 hover:opacity-95"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
