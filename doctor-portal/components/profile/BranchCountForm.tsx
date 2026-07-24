"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface BranchCountFormProps {
  onSubmit: (count: number) => void;
  onGoBack: () => void;
}

export default function BranchCountForm({ onSubmit, onGoBack }: BranchCountFormProps) {
  const [count, setCount] = useState("1");
  const [formError, setFormError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1) {
      setFormError("Enter at least 1 branch.");
      return;
    }
    setFormError("");
    onSubmit(n);
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit select-none">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          How many additional branches do you operate?
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          You&apos;ve already set up your main branch — you&apos;ll fill in each additional branch&apos;s company information and availability next.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="max-w-[200px]">
          <div className="text-[0.68rem] text-gray-400 font-light mb-1 ml-1">Number of Additional Branches</div>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-3.5 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-center">
          <button type="button" onClick={onGoBack} className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#182A6F] rounded-[0.8rem] font-medium font-outfit text-sm py-4 flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none text-center">
            Go Back
          </button>
          <DoctorLoginButton type="submit" label="Continue" className="w-full py-4 text-center justify-center flex" />
        </div>
      </form>
    </div>
  );
}
