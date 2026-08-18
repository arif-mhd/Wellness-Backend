"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface OtherInfoRow {
  id: string;
  label: string;
  value: string;
}

interface DoctorPersonalInfoFormProps {
  onSubmit: (data: any) => void;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmiratesId?: string;
  initialEmail?: string;
  initialPhone?: string;
  initialGender?: string;
  initialDob?: string;
  initialBloodGroup?: string;
  initialLocation?: string;
  initialLanguages?: string[];
  initialOtherInfo?: OtherInfoRow[];
}

const ALL_LANGUAGES = [
  "Arabic", "English", "Hindi", "Urdu", "Malayalam", "Tamil", "Tagalog",
  "Bengali", "Punjabi", "Sinhalese", "Nepali", "French", "German", "Spanish",
  "Chinese", "Japanese", "Korean", "Russian", "Persian", "Turkish", "Amharic",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const inputCls =
  "w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors bg-white placeholder-[#A7AAB4]";
const errCls = "border-red-300 bg-red-50 focus:border-red-400";

type FieldErrors = Partial<Record<"firstName" | "lastName" | "emiratesId" | "email" | "phone" | "gender" | "dob", string>>;

export default function DoctorPersonalInfoForm({
  onSubmit,
  initialFirstName = "",
  initialLastName = "",
  initialEmiratesId = "",
  initialEmail = "",
  initialPhone = "",
  initialGender = "",
  initialDob = "",
  initialBloodGroup = "",
  initialLocation = "",
  initialLanguages = [],
  initialOtherInfo,
}: DoctorPersonalInfoFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [emiratesId, setEmiratesId] = useState(initialEmiratesId);
  const [emiratesIdScanned, setEmiratesIdScanned] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [gender, setGender] = useState(initialGender);
  const [dob, setDob] = useState(initialDob);
  const [bloodGroup, setBloodGroup] = useState(initialBloodGroup);
  const [location, setLocation] = useState(initialLocation);

  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [langInput, setLangInput] = useState("");
  const [langSuggestions, setLangSuggestions] = useState<string[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const [otherInfo, setOtherInfo] = useState<OtherInfoRow[]>(
    initialOtherInfo && initialOtherInfo.length > 0 ? initialOtherInfo : [{ id: "1", label: "", value: "" }]
  );

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});

  // Emails already in use fail the account creation only once every other
  // step (license, specializations, resume...) has been filled in — checking
  // here at Step 1 surfaces that immediately instead.
  const [emailCheckState, setEmailCheckState] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const emailCheckToken = useRef(0);

  const today = new Date();
  const dobMax = today.toISOString().slice(0, 10);
  const dobMin = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  const dobInputRef = useRef<HTMLInputElement>(null);

  const validateDob = (value: string): string => {
    if (!value) return "Date of Birth is required.";
    const picked = new Date(`${value}T00:00:00`);
    if (Number.isNaN(picked.getTime())) return "Enter a valid date of birth.";
    if (picked > today) return "Date of Birth cannot be in the future.";
    let age = today.getFullYear() - picked.getFullYear();
    const hadBirthdayThisYear =
      today.getMonth() > picked.getMonth() ||
      (today.getMonth() === picked.getMonth() && today.getDate() >= picked.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    if (age < 18) return "Must be at least 18 years old.";
    if (age > 100) return "Enter a valid date of birth.";
    return "";
  };

  const validateEmailFormat = (value: string): string => {
    if (!value.trim()) return "Email ID is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
    return "";
  };

  const validateField = (field: keyof FieldErrors, values = { firstName, lastName, emiratesId, email, phone, gender, dob }): string => {
    switch (field) {
      case "firstName": return values.firstName.trim() ? "" : "First name is required.";
      case "lastName": return values.lastName.trim() ? "" : "Last name is required.";
      case "emiratesId": return values.emiratesId.trim() ? "" : "Emirates ID is required.";
      case "email": return validateEmailFormat(values.email);
      case "phone": return values.phone.trim() ? "" : "Contact number is required.";
      case "gender": return values.gender ? "" : "Gender is required.";
      case "dob": return validateDob(values.dob);
      default: return "";
    }
  };

  const markTouched = (field: keyof FieldErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setFieldErrors((e) => ({ ...e, [field]: validateField(field) }));
  };

  // Debounced existence check — fires 500ms after the user stops typing a
  // syntactically-valid email, not on every keystroke.
  useEffect(() => {
    const emailErr = validateEmailFormat(email);
    if (emailErr) { setEmailCheckState("idle"); return; }
    const token = ++emailCheckToken.current;
    setEmailCheckState("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/clinics/doctors/check-email?email=${encodeURIComponent(email.trim())}`);
        if (token !== emailCheckToken.current) return;
        if (res.ok) {
          const data = await res.json();
          setEmailCheckState(data.exists ? "taken" : "available");
        } else {
          setEmailCheckState("idle");
        }
      } catch {
        if (token === emailCheckToken.current) setEmailCheckState("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const isFormValid = useMemo(() => {
    const values = { firstName, lastName, emiratesId, email, phone, gender, dob };
    const hasErrors = (["firstName", "lastName", "emiratesId", "email", "phone", "gender", "dob"] as const)
      .some((f) => validateField(f, values));
    return !hasErrors && emailCheckState !== "taken";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, emiratesId, email, phone, gender, dob, emailCheckState]);

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

    const values = { firstName, lastName, emiratesId, email, phone, gender, dob };
    const fields = ["firstName", "lastName", "emiratesId", "email", "phone", "gender", "dob"] as const;
    const errors: FieldErrors = {};
    fields.forEach((f) => { const err = validateField(f, values); if (err) errors[f] = err; });
    setFieldErrors(errors);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));

    if (Object.keys(errors).length > 0) {
      setFormError("Please fill in all required fields highlighted below.");
      return;
    }
    if (emailCheckState === "taken") {
      setFormError("This email is already registered to another account.");
      return;
    }

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
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => markTouched("firstName")}
              className={`${inputCls} ${touched.firstName && fieldErrors.firstName ? errCls : ""}`}
            />
            {touched.firstName && fieldErrors.firstName && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.firstName}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => markTouched("lastName")}
              className={`${inputCls} ${touched.lastName && fieldErrors.lastName ? errCls : ""}`}
            />
            {touched.lastName && fieldErrors.lastName && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.lastName}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#24292E]">Emirates ID</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={emiratesId}
              onChange={(e) => { setEmiratesId(e.target.value); setEmiratesIdScanned(false); }}
              onBlur={() => markTouched("emiratesId")}
              className={`${inputCls} ${touched.emiratesId && fieldErrors.emiratesId ? errCls : ""}`}
            />
            <button
              type="button"
              onClick={handleScan}
              className="shrink-0 h-11 px-8 rounded-xl bg-[#24292E] text-white text-[12px] font-bold tracking-widest hover:bg-black transition-colors shadow-sm"
            >
              {emiratesIdScanned ? "SCANNED" : "SCAN"}
            </button>
          </div>
          {touched.emiratesId && fieldErrors.emiratesId && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.emiratesId}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Email ID</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              className={`${inputCls} ${(touched.email && fieldErrors.email) || emailCheckState === "taken" ? errCls : ""}`}
            />
            {touched.email && fieldErrors.email && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.email}</span>}
            {!fieldErrors.email && emailCheckState === "checking" && <span className="text-[#A7AAB4] text-[11px] mt-0.5">Checking availability…</span>}
            {!fieldErrors.email && emailCheckState === "taken" && <span className="text-red-500 text-[11px] mt-0.5">This email is already registered.</span>}
            {!fieldErrors.email && emailCheckState === "available" && <span className="text-emerald-600 text-[11px] mt-0.5">Email is available.</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Contact Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => markTouched("phone")}
              className={`${inputCls} ${touched.phone && fieldErrors.phone ? errCls : ""}`}
            />
            {touched.phone && fieldErrors.phone && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.phone}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              onBlur={() => markTouched("gender")}
              className={`${inputCls} cursor-pointer appearance-none ${touched.gender && fieldErrors.gender ? errCls : ""}`}
            >
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {touched.gender && fieldErrors.gender && <span className="text-red-500 text-[11px] mt-0.5">{fieldErrors.gender}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Date of Birth</label>
            <input type="date" max="9999-12-31" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-[#24292E]">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className={`${inputCls} cursor-pointer appearance-none ${bloodGroup ? "" : "text-[#A7AAB4]"}`}
            >
              <option value="">Select Blood Group</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
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
          <button
            type="submit"
            disabled={!isFormValid}
            className="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-bold tracking-widest hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            CONTINUE
          </button>
        </div>
      </form>
    </div>
  );
}
