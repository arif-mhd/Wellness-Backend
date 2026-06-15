"use client";

import { useState, useRef, useEffect } from "react";
import DoctorLoginButton from "@/components/DoctorLoginButton";

interface PersonalInformationFormProps {
  initialEmail?: string;
  initialName?: string;
  initialPhone?: string;
  initialDob?: string;
  initialGender?: string;
  initialEmiratesId?: string;
  initialLanguages?: string[];
  onSubmit: (data: any) => void;
}

const ALL_LANGUAGES = [
  "Arabic", "English", "Hindi", "Urdu", "Malayalam", "Tamil", "Tagalog",
  "Bengali", "Punjabi", "Sinhalese", "Nepali", "French", "German", "Spanish",
  "Chinese", "Japanese", "Korean", "Russian", "Persian", "Turkish", "Amharic",
];


const YEARS = Array.from({ length: 87 }, (_, i) => 2026 - i); // 1940 to 2026
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function PersonalInformationForm({
  initialEmail = "",
  initialName = "",
  initialPhone = "",
  initialDob = "",
  initialGender = "",
  initialEmiratesId = "",
  initialLanguages = [],
  onSubmit,
}: PersonalInformationFormProps) {
  // Form State
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [contactNumber, setContactNumber] = useState(initialPhone);
  const [emiratesId, setEmiratesId] = useState(initialEmiratesId);
  const [emiratesIdFile, setEmiratesIdFile] = useState<File | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [businessEmail, setBusinessEmail] = useState("");
  
  // Custom Popover Select values
  const [gender, setGender] = useState(initialGender);
  const [bloodGroup, setBloodGroup] = useState("");
  const [dob, setDob] = useState(initialDob);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [languages, setLanguages] = useState<string[]>(initialLanguages ?? []);
  const [langInput, setLangInput] = useState("");
  const [langSuggestions, setLangSuggestions] = useState<string[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const [formError, setFormError] = useState("");

  // Dropdown Popover Visibility states
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showBloodDropdown, setShowBloodDropdown] = useState(false);
  const [showMaritalDropdown, setShowMaritalDropdown] = useState(false);
  const [showPostalDropdown, setShowPostalDropdown] = useState(false);

  // Calendar Specific states
  const [calendarMonth, setCalendarMonth] = useState(0);
  const [calendarYear, setCalendarYear] = useState(1990);

  // File Input Refs
  const profilePicRef = useRef<HTMLInputElement>(null);
  const emiratesIdFileRef = useRef<HTMLInputElement>(null);

  // Sync state if initial props change
  useEffect(() => {
    if (initialPhone) setContactNumber(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (initialEmiratesId) setEmiratesId(initialEmiratesId);
  }, [initialEmiratesId]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialDob) setDob(initialDob);
  }, [initialDob]);

  useEffect(() => {
    if (initialGender) setGender(initialGender);
  }, [initialGender]);

  // Sync calendar selections when opening from existing value
  useEffect(() => {
    if (showCalendar && dob) {
      const parts = dob.split(" / ");
      if (parts.length === 3) {
        const d = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const y = Number(parts[2]);
        if (!isNaN(y) && y >= 1940 && y <= 2026) setCalendarYear(y);
        if (!isNaN(m) && m >= 0 && m <= 11) setCalendarMonth(m);
      }
    }
  }, [showCalendar, dob]);

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDaySelect = (day: number) => {
    const formattedDay = day.toString().padStart(2, "0");
    const formattedMonth = (calendarMonth + 1).toString().padStart(2, "0");
    setDob(`${formattedDay} / ${formattedMonth} / ${calendarYear}`);
    setShowCalendar(false);
  };

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const blankDays = Array.from({ length: firstDay });
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day is currently selected
  const isSelectedDay = (day: number) => {
    if (!dob) return false;
    const parts = dob.split(" / ");
    if (parts.length === 3) {
      return (
        Number(parts[0]) === day &&
        Number(parts[1]) === calendarMonth + 1 &&
        Number(parts[2]) === calendarYear
      );
    }
    return false;
  };

  // Close all other dropdowns helper
  const closeAllDropdownsExcept = (activeDropdownSetter?: (val: boolean) => void) => {
    const setters = [
      setShowCalendar,
      setShowGenderDropdown,
      setShowBloodDropdown,
      setShowMaritalDropdown,
      setShowPostalDropdown,
    ];
    setters.forEach((setter) => {
      if (setter !== activeDropdownSetter) {
        setter(false);
      }
    });
    if (activeDropdownSetter) {
      activeDropdownSetter(true);
    }
  };

  // Handle Profile Pic Select
  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  // Handle Emirates ID file select
  const handleEmiratesIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Emirates ID file exceeds the 5MB size limit.");
        return;
      }
      setEmiratesIdFile(file);
      setFormError("");
    }
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Required fields check
    if (!contactNumber.trim()) {
      setFormError("Contact number is required.");
      return;
    }
    if (!emiratesId.trim()) {
      setFormError("Emirates ID is required.");
      return;
    }
    if (!email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!gender) {
      setFormError("Gender is required.");
      return;
    }
    if (!bloodGroup) {
      setFormError("Blood group is required.");
      return;
    }
    if (!dob) {
      setFormError("Date of Birth is required.");
      return;
    }
    if (!height.trim()) {
      setFormError("Height is required.");
      return;
    }
    if (!weight.trim()) {
      setFormError("Weight is required.");
      return;
    }
    if (!maritalStatus) {
      setFormError("Marital status is required.");
      return;
    }
    if (!postalCode) {
      setFormError("Postal code is required.");
      return;
    }
    if (languages.length === 0) {
      setFormError("Please add at least one language.");
      return;
    }

    setFormError("");

    // Call parent handler
    onSubmit({
      profilePic,
      bio,
      contactNumber,
      emiratesId,
      emiratesIdFile,
      email,
      businessEmail,
      gender,
      bloodGroup,
      dob,
      height,
      weight,
      maritalStatus,
      address,
      postalCode,
      languages,  // string[]
    });
  };

  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit">
      
      {/* Form Header */}
      <div className="mb-8">
        <h3 className="text-xl md:text-[1.4rem] font-normal tracking-tight text-gray-800 font-marcellus leading-tight">
          Basic Information
        </h3>
        <p className="text-gray-400 text-xs md:text-[0.825rem] font-light mt-1">
          Hi <span className="text-[#5476FC] font-medium">{initialName || "Doctor"}</span>, Complete your profile information
        </p>
      </div>

      {/* Error Message */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center animate-fadeIn">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* PROFILE PICTURE SLOT */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F7F8FC] border border-transparent select-none">
          <input
            type="file"
            ref={profilePicRef}
            onChange={handleProfilePicChange}
            accept="image/jpeg, image/png, image/jpg"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => profilePicRef.current?.click()}
            className="w-14 h-14 rounded-full bg-[#E5ECFF] hover:bg-[#D5E1FF] text-[#5476FC] flex items-center justify-center flex-shrink-0 transition-colors duration-150 outline-none relative overflow-hidden"
          >
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">Upload Profile Picture</span>
            <span className="text-[0.68rem] text-gray-400 font-light mt-0.5 leading-snug">
              Add a profile picture to make your account more personal and easily recognizable.
            </span>
          </div>
        </div>

        {/* BIO TEXTAREA */}
        <div>
          <textarea
            placeholder="Add Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit resize-none"
          />
        </div>

        {/* CONTACT NUMBER & EMIRATES ID INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Contact Number*"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Emirates ID*"
              value={emiratesId}
              onChange={(e) => setEmiratesId(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>
        </div>

        {/* UPLOAD EMIRATES ID DRAG AND DROP */}
        <div 
          onClick={() => emiratesIdFileRef.current?.click()}
          className="border-2 border-dashed border-[#C5D3FF] bg-[#F4F7FF] hover:bg-[#EBEEFF] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 text-center select-none"
        >
          <input
            type="file"
            ref={emiratesIdFileRef}
            onChange={handleEmiratesIdFileChange}
            accept=".pdf, image/jpeg, image/png, image/jpg"
            className="hidden"
          />
          <svg className="w-8 h-8 text-[#5476FC] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm font-semibold text-[#5476FC] hover:underline">
            {emiratesIdFile ? `Emirates ID Uploaded: ${emiratesIdFile.name}` : "Upload Emirates ID"}
          </span>
          <span className="text-[0.68rem] text-[#8EA0DE] font-light mt-1">
            Accepted Formats: PDF, JPEG, PNG
          </span>
          <span className="text-[0.68rem] text-[#8EA0DE] font-light">
            File Size Limit: Maximum file size: 5 MB
          </span>
        </div>

        {/* EMAIL & BUSINESS EMAIL INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="email"
              placeholder="Email*"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="Business Email (optional)"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>
        </div>

        {/* CUSTOM DESIGNED GENDER & BLOOD GROUP POPDOWNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          
          {/* Custom Gender Popover Select */}
          <div className="relative">
            <div
              onClick={() => {
                if (showGenderDropdown) {
                  setShowGenderDropdown(false);
                } else {
                  closeAllDropdownsExcept(setShowGenderDropdown);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={gender ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {gender || "Gender*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showGenderDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showGenderDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGenderDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                  {["Male", "Female", "Other"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setGender(option);
                        setShowGenderDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        gender === option
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-gray-700 hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Custom Blood Group Popover Select */}
          <div className="relative">
            <div
              onClick={() => {
                if (showBloodDropdown) {
                  setShowBloodDropdown(false);
                } else {
                  closeAllDropdownsExcept(setShowBloodDropdown);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={bloodGroup ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {bloodGroup || "Blood Group*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showBloodDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showBloodDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBloodDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden max-h-[220px] overflow-y-auto">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setBloodGroup(option);
                        setShowBloodDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        bloodGroup === option
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-gray-700 hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* CUSTOM DOB CALENDAR POPUP & HEIGHT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          
          {/* Custom Calendar Date of Birth */}
          <div className="relative">
            <div
              onClick={() => {
                if (showCalendar) {
                  setShowCalendar(false);
                } else {
                  closeAllDropdownsExcept(setShowCalendar);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={dob ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {dob || "Date of Birth*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 hover:text-[#5476FC] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>

            {/* Custom Themed Calendar Popover */}
            {showCalendar && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                <div className="absolute left-0 mt-2 p-4 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-[275px] font-outfit animate-fadeIn">
                  {/* Select month and year */}
                  <div className="flex justify-between items-center gap-2 mb-4">
                    <select
                      value={calendarMonth}
                      onChange={(e) => setCalendarMonth(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-200/80 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-[#5476FC] focus:outline-none text-gray-700 font-medium font-outfit cursor-pointer flex-1"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={calendarYear}
                      onChange={(e) => setCalendarYear(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-200/80 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-[#5476FC] focus:outline-none text-gray-700 font-medium font-outfit cursor-pointer w-[80px]"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 text-center text-[0.65rem] text-gray-400 font-bold mb-2 uppercase tracking-wider">
                    {WEEKDAYS.map((day) => (
                      <div key={day}>{day}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 text-center gap-1">
                    {blankDays.map((_, i) => (
                      <div key={`blank-${i}`} className="h-7" />
                    ))}
                    {monthDays.map((day) => {
                      const selected = isSelectedDay(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDaySelect(day)}
                          className={`h-7 w-7 text-xs font-semibold rounded-full flex items-center justify-center transition-all ${
                            selected
                              ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md shadow-blue-500/20"
                              : "text-gray-700 hover:bg-indigo-50 hover:text-[#5476FC]"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Height input */}
          <div>
            <input
              type="text"
              placeholder="Height (in cm)*"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>
        </div>

        {/* WEIGHT & CUSTOM MARITAL STATUS POPDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          
          {/* Weight */}
          <div>
            <input
              type="text"
              placeholder="Weight (in kg)*"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Custom Marital Status Dropdown */}
          <div className="relative">
            <div
              onClick={() => {
                if (showMaritalDropdown) {
                  setShowMaritalDropdown(false);
                } else {
                  closeAllDropdownsExcept(setShowMaritalDropdown);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={maritalStatus ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {maritalStatus || "Marital Status*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showMaritalDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showMaritalDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMaritalDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                  {["Single", "Married", "Divorced", "Widowed"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMaritalStatus(option);
                        setShowMaritalDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        maritalStatus === option
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-gray-700 hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* ADDRESS & CUSTOM POSTAL CODE POPDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          
          {/* Address */}
          <div>
            <input
              type="text"
              placeholder="Address (house number, street, city)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
            />
          </div>

          {/* Custom Postal Code Dropdown */}
          <div className="relative">
            <div
              onClick={() => {
                if (showPostalDropdown) {
                  setShowPostalDropdown(false);
                } else {
                  closeAllDropdownsExcept(setShowPostalDropdown);
                }
              }}
              className="w-full bg-[#F7F8FC] border border-transparent rounded-xl pl-5 pr-10 py-4 text-sm transition font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={postalCode ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {postalCode || "Postal Code*"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showPostalDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {showPostalDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPostalDropdown(false)} />
                <div className="absolute left-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
                  {["00000", "97104", "97102", "97106"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setPostalCode(option);
                        setShowPostalDropdown(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-all ${
                        postalCode === option
                          ? "bg-indigo-50 text-[#5476FC]"
                          : "text-gray-700 hover:bg-indigo-50/60 hover:text-[#5476FC]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* LANGUAGES KNOWN — typeahead multi-select */}
        <div className="relative">
          {/* Selected language chips */}
          {languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#5476FC] text-xs font-semibold px-3 py-1.5 rounded-full"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => setLanguages(languages.filter((l) => l !== lang))}
                    className="text-[#5476FC] hover:text-indigo-800 leading-none outline-none"
                    aria-label={`Remove ${lang}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            placeholder="Languages Known* (type to search)"
            value={langInput}
            onChange={(e) => {
              const val = e.target.value;
              setLangInput(val);
              if (val.trim().length > 0) {
                setLangSuggestions(
                  ALL_LANGUAGES.filter(
                    (l) =>
                      l.toLowerCase().startsWith(val.toLowerCase()) &&
                      !languages.includes(l)
                  )
                );
                setShowLangDropdown(true);
              } else {
                setLangSuggestions([]);
                setShowLangDropdown(false);
              }
            }}
            onFocus={() => {
              if (langInput.trim().length > 0 && langSuggestions.length > 0)
                setShowLangDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowLangDropdown(false), 150)}
            className="w-full bg-[#F7F8FC] border border-transparent rounded-xl px-5 py-4 text-sm focus:outline-none transition-all text-gray-800 placeholder-gray-400 font-outfit"
          />

          {showLangDropdown && langSuggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 py-1.5 max-h-[180px] overflow-y-auto font-outfit animate-fadeIn">
              {langSuggestions.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLanguages([...languages, lang]);
                    setLangInput("");
                    setLangSuggestions([]);
                    setShowLangDropdown(false);
                  }}
                  className="w-full text-left px-5 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-[#5476FC] transition-colors"
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="hidden md:block" />
          <DoctorLoginButton
            type="submit"
            label="Continue"
            className="w-full py-4 text-center justify-center flex"
          />
        </div>

      </form>
    </div>
  );
}
