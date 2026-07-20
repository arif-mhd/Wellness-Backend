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
  "w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit";

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
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit">
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Personal Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Tell us about the doctor you&apos;re adding.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="First Name*" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Last Name*" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
        </div>

        <div className="relative w-full flex items-center bg-[#F7F8FC] rounded-xl px-5 py-3.5 border border-transparent">
          <input
            type="text"
            placeholder="Emirates ID*"
            value={emiratesId}
            onChange={(e) => { setEmiratesId(e.target.value); setEmiratesIdScanned(false); }}
            className="w-full bg-transparent border-none p-0 text-sm focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400 font-outfit"
          />
          <button
            type="button"
            onClick={handleScan}
            className="shrink-0 ml-3 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-95"
          >
            {emiratesIdScanned ? "SCANNED" : "SCAN"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="email" placeholder="Email ID*" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Contact Number*" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>

        <input type="text" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputCls} cursor-pointer ${gender ? "text-gray-800" : "text-gray-400"}`}>
            <option value="" disabled>Gender*</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={`${inputCls} ${dob ? "text-gray-800" : "text-gray-400"}`} />
        </div>

        <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={`${inputCls} cursor-pointer md:w-1/2 ${bloodGroup ? "text-gray-800" : "text-gray-400"}`}>
          <option value="">Blood Group</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>

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

        {/* Other (if any) */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Other (if any)</h4>
          <div className="space-y-3">
            {otherInfo.map((row) => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input type="text" placeholder="Label" value={row.label} onChange={(e) => updateOtherInfoRow(row.id, "label", e.target.value)} className={inputCls} />
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Value" value={row.value} onChange={(e) => updateOtherInfoRow(row.id, "value", e.target.value)} className={inputCls} />
                  {otherInfo.length > 1 && (
                    <button type="button" onClick={() => removeOtherInfoRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0" aria-label="Remove row">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOtherInfoRow} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
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
