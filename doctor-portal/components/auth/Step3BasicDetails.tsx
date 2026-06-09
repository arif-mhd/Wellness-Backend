"use client";

import { useState, useEffect } from "react";

interface Step3BasicDetailsProps {
  fullName: string;
  setFullName: (value: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  emiratesId: string;
  setEmiratesId: (value: string) => void;
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}

const YEARS = Array.from({ length: 76 }, (_, i) => 2015 - i); // 1940 to 2015
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function Step3BasicDetails({
  fullName,
  setFullName,
  dateOfBirth,
  setDateOfBirth,
  gender,
  setGender,
  email,
  setEmail,
  phone,
  setPhone,
  emiratesId,
  setEmiratesId,
  agreed,
  setAgreed,
  onSubmit,
  onGoBack,
}: Step3BasicDetailsProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(0); // January
  const [calendarYear, setCalendarYear] = useState(1990);

  // Sync calendar selections when opening from existing value
  useEffect(() => {
    if (showCalendar && dateOfBirth) {
      const parts = dateOfBirth.split(" / ");
      if (parts.length === 3) {
        const d = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const y = Number(parts[2]);
        if (!isNaN(y) && y >= 1940 && y <= 2015) setCalendarYear(y);
        if (!isNaN(m) && m >= 0 && m <= 11) setCalendarMonth(m);
      }
    }
  }, [showCalendar, dateOfBirth]);

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
    setDateOfBirth(`${formattedDay} / ${formattedMonth} / ${calendarYear}`);
    setShowCalendar(false);
  };

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const blankDays = Array.from({ length: firstDay });
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day is currently selected
  const isSelectedDay = (day: number) => {
    if (!dateOfBirth) return false;
    const parts = dateOfBirth.split(" / ");
    if (parts.length === 3) {
      return (
        Number(parts[0]) === day &&
        Number(parts[1]) === calendarMonth + 1 &&
        Number(parts[2]) === calendarYear
      );
    }
    return false;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h2 className="text-2xl md:text-[1.65rem] font-normal tracking-tight text-gray-800 font-marcellus mb-2 text-center">
        Fill in Your Basic Details
      </h2>
      <p className="text-gray-500 text-[0.8rem] md:text-[0.85rem] leading-relaxed mb-8 font-outfit font-light text-center">
        Provide a few details to help us set up your profile and personalize your experience.
      </p>
      
      <div className="w-full space-y-4 mb-6">
        {/* Full Name */}
        <div>
          <input
            type="text"
            required
            placeholder="Full Name*"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>

        {/* Date of Birth & Gender Split Row */}
        <div className="flex gap-4 relative">
          {/* Date of Birth */}
          <div className="relative flex-1">
            <input
              type="text"
              required
              readOnly
              placeholder="Date of Birth"
              value={dateOfBirth}
              onClick={() => {
                setShowCalendar(!showCalendar);
                setShowGenderDropdown(false); // Close gender dropdown if open
              }}
              className="w-full bg-[#f3f4fd] border-0 rounded-xl pl-5 pr-10 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit cursor-pointer select-none"
            />
            <div 
              onClick={() => {
                setShowCalendar(!showCalendar);
                setShowGenderDropdown(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-[#5476FC] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
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

          {/* Custom Gender Select */}
          <div className="relative flex-1">
            <div
              onClick={() => {
                setShowGenderDropdown(!showGenderDropdown);
                setShowCalendar(false); // Close calendar if open
              }}
              className="w-full bg-[#f3f4fd] border-0 rounded-xl pl-5 pr-10 py-4 text-sm focus-within:ring-2 focus-within:ring-[#5476FC] transition text-gray-800 font-outfit cursor-pointer select-none relative flex items-center min-h-[52px]"
            >
              <span className={gender ? "text-gray-800 font-normal" : "text-gray-400 font-normal"}>
                {gender || "Gender"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showGenderDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Custom Gender Dropdown Popover */}
            {showGenderDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowGenderDropdown(false)} />
                <div className="absolute right-0 mt-2 py-2 bg-white border border-indigo-100 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] z-50 w-full font-outfit animate-fadeIn overflow-hidden">
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
            placeholder="Phone Number*"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#f3f4fd] border-0 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#5476FC] transition text-gray-800 placeholder-gray-400 font-outfit"
          />
        </div>

        {/* Emirates ID or Passport Number */}
        <div>
          <input
            type="text"
            placeholder="Emirates ID or Passport Number"
            value={emiratesId}
            onChange={(e) => setEmiratesId(e.target.value)}
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
