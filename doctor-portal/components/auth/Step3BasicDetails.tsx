"use client";

interface Step3BasicDetailsProps {
  clinicName: string;
  setClinicName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}

export default function Step3BasicDetails({
  clinicName,
  setClinicName,
  email,
  setEmail,
  phone,
  setPhone,
  agreed,
  setAgreed,
  onSubmit,
  onGoBack,
}: Step3BasicDetailsProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2 text-center">
        Fill in Your Clinic&apos;s Basic Details
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light text-center">
        Tell us a little about your clinic — you&apos;ll add your own personal details next.
      </p>

      <div className="w-full space-y-4 mb-6">
        {/* Clinic Name */}
        <div>
          <input
            type="text"
            required
            placeholder="Clinic Name*"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>

        {/* Email (Optional) */}
        <div>
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>

        {/* Phone Number */}
        <div>
          <input
            type="text"
            required
            placeholder="Clinic Phone Number*"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>
      </div>

      {/* Checkbox agreement */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <input
          id="agreed-checkbox"
          type="checkbox"
          required
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 text-[#5476FC] bg-white border-2 border-indigo-200 rounded focus:ring-[#5476FC] transition duration-150 cursor-pointer"
        />
        <label htmlFor="agreed-checkbox" className="text-xs text-gray-500 leading-normal font-light font-outfit select-none cursor-pointer">
          I agree to the{" "}
          <a href="#" className="text-[#5476FC] hover:underline">Terms and Conditions</a>{" "}
          and{" "}
          <a href="#" className="text-[#5476FC] hover:underline">Privacy Policy</a>.
        </label>
      </div>

      {/* Main Submit Action */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white py-4 rounded-[0.8rem] font-medium font-outfit text-sm shadow-lg shadow-blue-500/10 transition-all duration-150 select-none cursor-pointer"
      >
        Submit Details
      </button>

      {/* Centered Go Back Button */}
      <button
        type="button"
        onClick={onGoBack}
        className="mt-6 text-gray-700 font-semibold font-outfit text-sm hover:underline focus:outline-none text-center"
      >
        Go Back
      </button>
    </form>
  );
}
