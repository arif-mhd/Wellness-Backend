"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface OtherInfoRow {
  id: string;
  label: string;
  value: string;
}

interface OwnersPersonalInfoFormProps {
  initialFullName?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialGender?: string;
  initialDob?: string;
  initialEmiratesIdOrPassport?: string;
  onSubmit: (data: any) => void;
}

const ALL_LANGUAGES = [
  "Arabic", "English", "Hindi", "Urdu", "Malayalam", "Tamil", "Tagalog",
  "Bengali", "Punjabi", "Sinhalese", "Nepali", "French", "German", "Spanish",
  "Chinese", "Japanese", "Korean", "Russian", "Persian", "Turkish", "Amharic",
];

const inputCls =
  "w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit";

export default function OwnersPersonalInfoForm({
  initialFullName = "",
  initialEmail = "",
  initialPhone = "",
  initialGender = "",
  initialDob = "",
  initialEmiratesIdOrPassport = "",
  onSubmit,
}: OwnersPersonalInfoFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [contactNumber, setContactNumber] = useState(initialPhone);
  const [ownerId, setOwnerId] = useState(initialEmiratesIdOrPassport);
  const [ownerIdVerified, setOwnerIdVerified] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [gender, setGender] = useState(initialGender);
  const [dob, setDob] = useState(initialDob);
  const [positionInClinic, setPositionInClinic] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");
  const [langSuggestions, setLangSuggestions] = useState<string[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const [otherInfo, setOtherInfo] = useState<OtherInfoRow[]>([{ id: "1", label: "", value: "" }]);

  const [formError, setFormError] = useState("");

  const handleVerifyOwnerId = () => {
    if (!ownerId.trim()) {
      setFormError("Enter the Owner/Staff Emirates ID first.");
      return;
    }
    setFormError("");
    setOwnerIdVerified(true);
  };

  const addOtherInfoRow = () => {
    setOtherInfo((rows) => [...rows, { id: Date.now().toString(), label: "", value: "" }]);
  };

  const updateOtherInfoRow = (id: string, field: "label" | "value", val: string) => {
    setOtherInfo((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };

  const removeOtherInfoRow = (id: string) => {
    setOtherInfo((rows) => rows.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) { setFormError("Full name is required."); return; }
    if (!contactNumber.trim()) { setFormError("Contact number is required."); return; }
    if (!ownerId.trim()) { setFormError("Owner/Staff Emirates ID is required."); return; }
    if (!email.trim()) { setFormError("Email ID is required."); return; }
    if (!gender) { setFormError("Gender is required."); return; }
    if (!dob) { setFormError("Date of Birth is required."); return; }
    if (!positionInClinic.trim()) { setFormError("Position in Clinic is required."); return; }

    setFormError("");
    onSubmit({
      fullName,
      contactNumber,
      emiratesIdOrPassport: ownerId,
      email,
      gender,
      dateOfBirth: dob,
      positionInClinic,
      bloodGroup,
      maritalStatus,
      height,
      weight,
      languages,
      otherInfo: otherInfo.filter((r) => r.label.trim() || r.value.trim()),
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Owner&apos;s Personal Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Tell us about the person completing this clinic&apos;s onboarding.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          placeholder="Full Name*"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputCls}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Contact Number*"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className={inputCls}
          />
          <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-5 py-3.5 border border-transparent">
            <input
              type="text"
              placeholder="Owner / Staff Emirates ID*"
              value={ownerId}
              onChange={(e) => { setOwnerId(e.target.value); setOwnerIdVerified(false); }}
              className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit pr-20"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 select-none">
              {ownerIdVerified ? (
                <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#5476FC]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  VERIFIED
                </span>
              ) : (
                <button type="button" onClick={handleVerifyOwnerId} className="text-[0.72rem] font-semibold text-[#5476FC] hover:text-[#3B59E3] tracking-wider transition-colors">
                  VERIFY
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email ID*"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={`${inputCls} cursor-pointer ${gender ? "text-gray-800" : "text-gray-400"}`}
          >
            <option value="" disabled>Gender*</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={`${inputCls} ${dob ? "text-gray-800" : "text-gray-400"}`}
          />
          <input
            type="text"
            placeholder="Position in Clinic*"
            value={positionInClinic}
            onChange={(e) => setPositionInClinic(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className={`${inputCls} cursor-pointer ${bloodGroup ? "text-gray-800" : "text-gray-400"}`}
          >
            <option value="">Blood Group</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          <select
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value)}
            className={`${inputCls} cursor-pointer ${maritalStatus ? "text-gray-800" : "text-gray-400"}`}
          >
            <option value="">Marital Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Height (e.g. 175 cm)"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="Weight (e.g. 70 kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Languages — typeahead multi-select */}
        <div className="relative">
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {languages.map((lang) => (
                <span key={lang} className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#5476FC] text-xs font-semibold px-3 py-1.5 rounded-full">
                  {lang}
                  <button type="button" onClick={() => setLanguages(languages.filter((l) => l !== lang))} className="text-[#5476FC] hover:text-indigo-800 leading-none outline-none" aria-label={`Remove ${lang}`}>×</button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Languages Spoken (type to search)"
            value={langInput}
            onChange={(e) => {
              const val = e.target.value;
              setLangInput(val);
              if (val.trim().length > 0) {
                setLangSuggestions(ALL_LANGUAGES.filter((l) => l.toLowerCase().startsWith(val.toLowerCase()) && !languages.includes(l)));
                setShowLangDropdown(true);
              } else {
                setLangSuggestions([]);
                setShowLangDropdown(false);
              }
            }}
            onBlur={() => setTimeout(() => setShowLangDropdown(false), 150)}
            className={inputCls}
          />
          {showLangDropdown && langSuggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 py-1.5 max-h-[180px] overflow-y-auto font-outfit animate-fadeIn">
              {langSuggestions.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setLanguages([...languages, lang]); setLangInput(""); setLangSuggestions([]); setShowLangDropdown(false); }}
                  className="w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-[#5476FC] transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Other (if any) — repeatable label + value rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Other (if any)</h4>
          </div>
          <div className="space-y-3">
            {otherInfo.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input
                  type="text"
                  placeholder="Label"
                  value={row.label}
                  onChange={(e) => updateOtherInfoRow(row.id, "label", e.target.value)}
                  className={inputCls}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) => updateOtherInfoRow(row.id, "value", e.target.value)}
                    className={inputCls}
                  />
                  {otherInfo.length > 1 && (
                    <button type="button" onClick={() => removeOtherInfoRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove row">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOtherInfoRow}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add More Info
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="hidden md:block" />
          <DoctorLoginButton type="submit" label="Continue" className="w-full py-4 text-center justify-center flex" />
        </div>
      </form>
    </div>
  );
}
