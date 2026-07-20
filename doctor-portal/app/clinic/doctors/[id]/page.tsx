"use client";

import { useState } from "react";
import Link from "next/link";

function ToggleSwitch({ isOn }: { isOn: boolean }) {
  return (
    <div className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isOn ? 'bg-[#179353]' : 'bg-gray-300'}`}>
      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

export default function DoctorProfilePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("ABOUT");

  // Tab capsules
  const tabs = ["ABOUT", "CONSULTATIONS", "SCHEDULES", "RATING AND PERFORMANCE"];

  return (
    <div className="px-8 py-8 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/clinic/doctors"
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Doctor Details
        </h1>
      </div>

      {/* ── Top Profile Card ── */}
      <div className="bg-[#EEF0F6] rounded-2xl p-7 relative w-full flex flex-col lg:flex-row gap-12 lg:gap-24 mb-6 shadow-sm border border-[#E4E8F0]">
        
        {/* Edit Button top-right */}
        <button className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-[#24292E] hover:text-[#5476FC] bg-white rounded-lg shadow-sm border border-[#E4E8F0] transition-colors">
          <EditIcon />
        </button>

        {/* Column 1: Identity */}
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-gray-300 shrink-0 overflow-hidden border border-[#D6DEFF] flex justify-center items-center">
             {/* Dummy Avatar */}
             <svg className="w-full h-full text-gray-500 mt-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[#24292E] text-[18px] font-semibold">Dr. Helena Thomas</h2>
            <span className="text-[#676E76] text-[13px] mb-3">email@figmasfakedomain.net</span>
            <div className="flex items-center gap-3">
              <span className="text-[#24292E] text-[14px] font-medium">Available</span>
              <ToggleSwitch isOn={true} />
            </div>
          </div>
        </div>

        {/* Column 2: Personal Details */}
        <div className="flex flex-col flex-1">
          <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Personal Details</h3>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3">
            {[
              { label: "Gender", val: "Lorem" },
              { label: "Date of Birth", val: "Lorem" },
              { label: "Blood Group", val: "Lorem" },
              { label: "Height", val: "Lorem" },
              { label: "Weight", val: "Lorem" },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center text-[12px]">
                <span className="text-[#676E76]">{item.label}</span>
                <span className="text-[#24292E] font-bold">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Credentials */}
        <div className="flex flex-col flex-1">
          <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Credentials</h3>
          <div className="flex flex-col gap-3 pr-8">
            {[
              { label: "Name", val: "Lorem" },
              { label: "Username", val: "Lorem" },
              { label: "Password", val: "Lorem" },
            ].map((item, idx) => (
              <div key={item.label} className="flex justify-between items-center text-[12px]">
                <span className="text-[#676E76]">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#24292E] font-bold">{item.val}</span>
                  {idx === 0 && <button className="text-gray-400 hover:text-black"><EditIcon /></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#EBEEF5] pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all ${
              activeTab === tab 
                ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md scale-[1.02]" 
                : "bg-white text-[#676E76] border border-[#E4E8F0] hover:border-[#5476FC] hover:text-[#5476FC] shadow-sm"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "ABOUT" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10 mb-20 bg-white p-6 rounded-xl border border-[#E4E8F0] shadow-sm">
          
          {/* Left Column */}
          <div className="flex flex-col gap-8">
            {/* About Box */}
            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-3">About</h3>
              <div className="border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the
                industry&apos;s standard dummy text ever since theLorem Ipsum is simply dummy text of the printing and typesetting
                industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s,Lorem Ipsum is
                simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s standard
                dummy text ever since the 1500s,Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s, 1500s,
              </div>
            </div>

            {/* Personal Details Form Grid */}
            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                
                {/* Col 1 inputs */}
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Gender", val: "female" },
                    { label: "License Number", val: "12345667786" },
                    { label: "Emirates ID", val: "Lorem" },
                    { label: "Specialization", val: "Lorem" },
                    { label: "Qualification", val: "Lorem" },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[11px] font-medium">{f.label}</span>
                      <input 
                        type="text" 
                        readOnly 
                        value={f.val} 
                        className="w-[120px] h-6 border border-[#D6D9E0] text-[11px] font-medium text-center text-[#24292E] outline-none" 
                      />
                    </div>
                  ))}
                </div>

                {/* Col 2 inputs */}
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Location", val: "Lorem" },
                    { label: "Consultation Fees", val: "Lorem" },
                    { label: "Contact Number", val: "Lorem" },
                    { label: "Office Phone", val: "Lorem" },
                    { label: "Languages", val: "Lorem" },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[11px] font-medium">{f.label}</span>
                      <input 
                        type="text" 
                        readOnly 
                        value={f.val} 
                        className="w-[120px] h-6 border border-[#D6D9E0] text-[11px] font-medium text-center text-[#676E76] outline-none" 
                      />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8">
            {/* Eligibility Box */}
            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-3">Eligibility</h3>
              <div className="border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been
                the industry&apos;s standard dummy text ever since theLorem Ipsum is simply dummy text of the printing
                and typesetting industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the
                1500s,Lorem Ipsum is simply dummy text of the printing and typesetting
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[#24292E] text-[14px] font-bold">Time slots</h3>
                <button className="text-[#676E76] hover:text-[#24292E]">
                  <EditIcon />
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  "Mon : 09 am to 05 pm",
                  "Mon : 09 am to 05 pm",
                  "Mon : 09 am to 05 pm",
                  "Mon : 09 am to 05 pm",
                  "Mon : 09 am to 05 pm",
                ].map((slot, i) => (
                  <div key={i} className="border border-[#D6D9E0] h-8 flex items-center justify-center text-[11px] text-[#676E76] font-medium">
                    {slot}
                  </div>
                ))}
                {/* Empty slot for design */}
                <div className="border border-[#D6D9E0] h-8 flex items-center justify-center" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 col-span-1 xl:col-span-2">
            <button className="px-8 py-2.5 rounded-lg bg-[#A7AAB4] text-white text-[12px] font-bold tracking-widest hover:bg-gray-500 transition-colors">
              DELETE
            </button>
            <button className="px-8 py-2.5 rounded-lg bg-[#A7AAB4] text-white text-[12px] font-bold tracking-widest hover:bg-gray-500 transition-colors">
              EDIT
            </button>
            <button className="px-10 py-2.5 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] shadow-sm text-white text-[12px] font-bold tracking-widest hover:shadow-md transition-all">
              SAVE
            </button>
          </div>

        </div>
      )}

      {/* ── CONSULTATIONS Tab ── */}
      {activeTab === "CONSULTATIONS" && (
        <div className="flex flex-col gap-3 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#E4E8F0] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 w-[180px]">
                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden shrink-0 flex items-center justify-center border border-[#D6DEFF]">
                  <svg className="w-6 h-6 text-gray-500 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#24292E]">Helena</span>
                  <span className="text-[11px] text-[#676E76]">email@figma...</span>
                </div>
              </div>
              <span className="text-[12px] font-medium text-[#24292E]">32</span>
              <span className="text-[11px] font-medium text-[#676E76]">Primary Diagnosis</span>
              <span className="text-[11px] font-medium text-[#676E76]">Summary</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-[#24292E]">Time - <span className="text-[#5476FC]">11:30</span></span>
                <span className="text-[11px] text-[#676E76]">12/10/2024</span>
              </div>
              <span className={`text-[12px] font-medium ${i === 2 ? 'text-[#D92D20]' : 'text-[#D92D20]'}`}>
                {i === 2 ? "Pending report" : "Completed"}
              </span>
              <button className="flex items-center gap-1 text-[12px] font-medium text-[#24292E] hover:text-[#5476FC] transition-colors">
                View
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── SCHEDULES Tab ── */}
      {activeTab === "SCHEDULES" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 mb-10">
          
          {/* Left Column: Edit or Add Timeslot */}
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold text-[#24292E] mb-6">Edit or Add Timeslot</h3>
            <div className="flex items-center gap-6 mb-4 px-2">
               <span className="text-[12px] font-bold text-[#24292E]">Week</span>
               <span className="text-[12px] text-[#676E76]">month</span>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { day: "Monday", slots: 1 },
                { day: "Tuesday", slots: 1 },
                { day: "Wednesday", slots: 2 },
                { day: "Thursday", slots: 1 },
                { day: "Friday", slots: 2 },
                { day: "Saturday", slots: 1 },
                { day: "Sunday", slots: 1 },
              ].map((row, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 px-2 py-1">
                  <span className="w-24 text-[13px] font-medium text-[#676E76] shrink-0">{row.day}</span>
                  <div className="flex items-center flex-wrap gap-3">
                    {Array.from({ length: row.slots }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#F4F7FF] border border-[#D6DEFF] rounded-full px-4 py-2 shadow-sm transition-all hover:border-[#5476FC]">
                        <span className="text-[12px] font-bold text-[#5476FC]">8:00 AM</span>
                        <span className="text-[11px] text-[#838B95]">to</span>
                        <span className="text-[12px] font-bold text-[#5476FC]">5:00 PM</span>
                        <button className="w-5 h-5 rounded-full bg-[#FFE5E5] text-[#D92D20] flex items-center justify-center hover:bg-[#FFD1D1] transition-colors ml-1">
                          <span className="text-[14px] leading-none font-bold mt-[-2px]">-</span>
                        </button>
                      </div>
                    ))}
                    <button className="w-8 h-8 rounded-full bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white flex items-center justify-center hover:shadow-md transition-all shadow-sm">
                      <span className="text-[18px] leading-none font-medium mt-[-2px]">+</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Column: ABSENSE */}
          <div className="flex flex-col lg:border-l border-[#E4E8F0] lg:pl-12 pt-4 lg:pt-0">
            <div className="bg-gradient-to-r from-[#FF9A9A] to-[#D92D20] text-white text-[11px] font-bold tracking-widest px-6 py-2 rounded-full w-fit mb-8 shadow-sm">
              ABSENCE
            </div>
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-[#E4E8F0] rounded-xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-[13px] font-bold text-[#24292E]">1. Reason</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-[#24292E]">Time - <span className="text-[#5476FC]">11:30</span></span>
                    <span className="text-[11px] text-[#676E76]">12/10/2024</span>
                  </div>
                  <span className="text-[12px] font-medium text-[#D92D20]">Completed</span>
                  <button className="flex items-center gap-1 text-[12px] font-medium text-[#24292E] hover:text-[#5476FC] transition-colors">
                    View
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── RATING AND PERFORMANCE Tab ── */}
      {activeTab === "RATING AND PERFORMANCE" && (
        <div className="bg-[#EEF0F6] border border-[#E4E8F0] rounded-2xl p-8 mb-10 shadow-sm">
          <h3 className="text-[16px] font-bold text-[#24292E] mb-6">Rating and Reviews</h3>
          
          <div className="flex items-end gap-3 mb-8">
            <div className="flex items-center gap-1 text-[#5476FC]">
              {[1, 2, 3, 4].map(i => (
                <svg key={i} width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ))}
              {/* Grey/Half star placeholder */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#A7AAB4"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <span className="text-[24px] font-bold text-[#676E76] leading-none">4.0</span>
            <span className="text-[11px] font-medium text-[#A7AAB4] leading-none mb-1">452</span>
          </div>

          <div className="flex flex-col">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start justify-between py-6 border-b border-[#D6DEFF] last:border-0">
                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-12 w-full">
                  <div className="flex flex-col gap-1 w-24 shrink-0">
                    <span className="text-[13px] font-bold text-[#24292E]">Name</span>
                    <div className="flex items-center gap-0.5 text-[#5476FC]">
                      {[1, 2, 3, 4].map(s => <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#A7AAB4"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#A7AAB4] leading-relaxed flex-1 sm:pr-10">
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry
                  </p>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-[#A7AAB4]">
                    <span>11/01/2024</span>
                    <span>01:00 pm</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
