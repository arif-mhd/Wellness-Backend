"use client";

import { useState } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface OtherInfoRow {
  id: string;
  label: string;
  value: string;
}

interface DoctorPersonalInfoFormProps {
  onSubmit: (data: any) => void;
}

const ALL_LANGUAGES = [
  "Arabic", "English", "Hindi", "Urdu", "Malayalam", "Tamil", "Tagalog",
  "Bengali", "Punjabi", "Sinhalese", "Nepali", "French", "German", "Spanish",
  "Chinese", "Japanese", "Korean", "Russian", "Persian", "Turkish", "Amharic",
];

const inputCls =
  "w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors bg-white placeholder-[#A7AAB4]";

export default function DoctorPersonalInfoForm({ onSubmit }: DoctorPersonalInfoFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [emiratesIdScanned, setEmiratesIdScanned] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [location, setLocation] = useState("");

  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");
  const [langSuggestions, setLangSuggestions] = useState<string[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const [otherInfo, setOtherInfo] = useState<OtherInfoRow[]>([{ id: "1", label: "", value: "" }]);

  const [formError, setFormError] = useState("");

  const handleScan = () => {
    if (!emiratesId.trim()) {
      setFormError("Enter the Emirates ID first.");
      return;
    }
    // No OCR/ID-lookup service exists in this codebase — this just marks the
    // field as reviewed, same shallow pattern as every other VERIFY button.
    setFormError("");
    setEmiratesIdScanned(true);
  };

  const addOtherInfoRow = () => setOtherInfo((rows) => [...rows, { id: Date.now().toString(), label: "", value: "" }]);
  const updateOtherInfoRow = (id: string, field: "label" | "value", val: string) =>
    setOtherInfo((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const removeOtherInfoRow = (id: string) => setOtherInfo((rows) => rows.filter((r) => r.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) { setFormError("First name is required."); return; }
    if (!lastName.trim()) { setFormError("Last name is required."); return; }
    if (!emiratesId.trim()) { setFormError("Emirates ID is required."); return; }
    if (!email.trim()) { setFormError("Email ID is required."); return; }
    if (!phone.trim()) { setFormError("Contact number is required."); return; }
    if (!gender) { setFormError("Gender is required."); return; }
    if (!dob) { setFormError("Date of Birth is required."); return; }

    setFormError("");
    onSubmit({
      firstName,
      lastName,
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      emiratesId,
      email,
      phone,
      gender,
      dateOfBirth: dob,
      bloodGroup,
      location,
      languages,
      otherInfo: otherInfo.filter((r) => r.label.trim() || r.value.trim()),
    });
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow-sm border border-[#E4E8F0] p-8 md:p-12 font-outfit animate-fade-in">
      <h2 className="text-[20px] font-bold text-[#24292E] mb-8">Personal Information</h2>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#24292E]">Emirates ID</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={emiratesId}
              onChange={(e) => { setEmiratesId(e.target.value); setEmiratesIdScanned(false); }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleScan}
              className="shrink-0 h-11 px-8 rounded-xl bg-[#24292E] text-white text-[12px] font-bold tracking-widest hover:bg-black transition-colors shadow-sm"
            >
              {emiratesIdScanned ? "SCANNED" : "SCAN"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Email ID</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Contact Number</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Blood Group</label>
            <input type="text" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Languages — typeahead multi-select */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[12px] font-semibold text-[#24292E]">Languages</label>
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {languages.map((lang) => (
                <span key={lang} className="inline-flex items-center gap-1.5 bg-[#F4F7FF] text-[#5476FC] text-[12px] font-bold px-3 py-1.5 rounded-full border border-[#D6DEFF]">
                  {lang}
                  <button type="button" onClick={() => setLanguages(languages.filter((l) => l !== lang))} className="text-[#5476FC] hover:text-[#24292E] leading-none outline-none" aria-label={`Remove ${lang}`}>×</button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
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

        {/* Other (if any) */}
        <div className="mt-8 border-t border-[#E4E8F0] pt-8 space-y-4">
          <h3 className="text-[14px] font-bold text-[#24292E] mb-4">Other (if any)</h3>
          <div className="space-y-4">
            {otherInfo.map((row) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input type="text" placeholder="Detail Label" value={row.label} onChange={(e) => updateOtherInfoRow(row.id, "label", e.target.value)} className={inputCls} />
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Detail Value" value={row.value} onChange={(e) => updateOtherInfoRow(row.id, "value", e.target.value)} className={inputCls} />
                  {otherInfo.length > 1 && (
                    <button type="button" onClick={() => removeOtherInfoRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove row">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOtherInfoRow} className="flex items-center gap-1.5 text-xs font-semibold text-[#5476FC] hover:text-[#24292E] transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add More Info
          </button>
        </div>

        <div className="flex justify-end mt-10 pt-4">
          <button type="submit" className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-bold tracking-widest hover:shadow-md transition-all">
            CONTINUE
          </button>
        </div>
      </form>
    </div>
  );
}
