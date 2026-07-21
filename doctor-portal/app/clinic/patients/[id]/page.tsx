"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_PATIENT = {
  id: "1",
  name: "Helena",
  email: "email@figmasfakedomain.net",
  personalDetails: {
    gender: "Lorem",
    dob: "Lorem",
    bloodGroup: "Lorem",
    height: "Lorem",
    weight: "Lorem"
  },
  pastConsultations: [
    {
      doctorId: "d1",
      doctorName: "DR. Name abc",
      doctorColor: "bg-[#FF5C5C]",
      age: 32,
      reason: "Feaver",
      department: "General Medicine",
      time: "11:30",
      date: "12/10/2024",
      status: "Completed",
      statusColor: "text-[#179353]"
    },
    {
      doctorId: "d2",
      doctorName: "DR. Name abc",
      doctorColor: "bg-[#FF5C5C]",
      age: 32,
      reason: "Feaver",
      department: "General Medicine",
      time: "11:30",
      date: "12/10/2024",
      status: "Completed",
      statusColor: "text-[#179353]"
    },
    {
      doctorId: "d3",
      doctorName: "DR. Name abc",
      doctorColor: "bg-[#FF5C5C]",
      age: 32,
      reason: "Feaver",
      department: "General Medicine",
      time: "11:30",
      date: "12/10/2024",
      status: "Completed",
      statusColor: "text-[#179353]"
    },
    {
      doctorId: "d4",
      doctorName: "DR. Name abc",
      doctorColor: "bg-[#FF5C5C]",
      age: 32,
      reason: "Feaver",
      department: "General Medicine",
      time: "11:30",
      date: "12/10/2024",
      status: "Completed",
      statusColor: "text-[#179353]"
    },
    {
      doctorId: "d5",
      doctorName: "DR. Name abc",
      doctorColor: "bg-[#FF5C5C]",
      age: 32,
      reason: "Feaver",
      department: "General Medicine",
      time: "11:30",
      date: "12/10/2024",
      status: "Completed",
      statusColor: "text-[#179353]"
    }
  ]
};

function AvatarPlaceholder({ size = "w-24 h-24" }: { size?: string }) {
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-[#D6DEFF] shadow-sm`}>
      <svg className="w-full h-full text-gray-400 mt-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}



export default function PatientProfilePage() {
  const [activeTab, setActiveTab] = useState("Past Consultations");

  return (
    <div className="px-8 py-8 overflow-y-auto h-full w-full bg-[#F9FAFB] font-outfit relative flex flex-col items-center">
      <div className="w-full max-w-[1100px] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 w-full max-w-[1100px]">
          <Link
            href="/clinic/patients"
            className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
            aria-label="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
            Patient Details
          </h1>
        </div>

        {/* Profile Card */}
        <div className="w-full bg-[#EEF0F8] rounded-2xl border border-[#E4E8F0] shadow-sm p-8 flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
          <AvatarPlaceholder />
          
          <div className="flex-1 flex flex-col md:flex-row gap-8 justify-between w-full mt-2">
            {/* Name & Email */}
            <div className="flex flex-col text-center md:text-left">
              <span className="text-[#24292E] text-[18px] font-bold mb-1">{MOCK_PATIENT.name}</span>
              <span className="text-[#676E76] text-[13px]">{MOCK_PATIENT.email}</span>
            </div>

            {/* Personal Details */}
            <div className="flex flex-col gap-3">
              <span className="text-[#24292E] text-[14px] font-bold mb-1">Personal Details</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[#676E76] text-[11px]">Gender</span>
                  <span className="text-[#24292E] text-[12px] font-bold">{MOCK_PATIENT.personalDetails.gender}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#676E76] text-[11px]">Height</span>
                  <span className="text-[#24292E] text-[12px] font-bold">{MOCK_PATIENT.personalDetails.height}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#676E76] text-[11px]">Date of Birth</span>
                  <span className="text-[#24292E] text-[12px] font-bold">{MOCK_PATIENT.personalDetails.dob}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#676E76] text-[11px]">Weight</span>
                  <span className="text-[#24292E] text-[12px] font-bold">{MOCK_PATIENT.personalDetails.weight}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#676E76] text-[11px]">Blood Group</span>
                  <span className="text-[#24292E] text-[12px] font-bold">{MOCK_PATIENT.personalDetails.bloodGroup}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#EBEEF5] pb-4">
          {["Past Consultations", "Visit Informations"].map((tab) => (
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

        {/* Consultations List */}
        {activeTab === "Past Consultations" && (
          <div className="flex flex-col gap-3 pb-8">
            {MOCK_PATIENT.pastConsultations.map((consult, idx) => (
              <div key={idx} className="flex items-center px-5 py-4 rounded-xl border border-[#D6DEFF] bg-white shadow-sm">
                
                {/* Doctor Avatar + Name */}
                <div className="w-[200px] flex shrink-0 items-center gap-4">
                  <AvatarPlaceholder size="w-8 h-8" />
                  <span className="text-[#24292E] text-[13px] font-medium truncate">{consult.doctorName}</span>
                </div>

                {/* Age */}
                <div className="w-[80px] shrink-0 text-[#24292E] text-[13px] text-center font-medium">
                  {consult.age}
                </div>

                {/* Reason */}
                <div className="w-[120px] shrink-0 text-[#676E76] text-[12px] text-center truncate">
                  {consult.reason}
                </div>

                {/* Department */}
                <div className="flex-1 min-w-[120px] shrink-0 text-[#676E76] text-[12px] text-center truncate">
                  {consult.department}
                </div>

                {/* Time / Date */}
                <div className="w-[140px] shrink-0 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[#24292E] text-[12px]">Time -</span>
                    <span className="text-[#5476FC] text-[12px] font-bold">{consult.time}</span>
                  </div>
                  <span className="text-[#676E76] text-[11px] mt-0.5">{consult.date}</span>
                </div>

                {/* Status */}
                <div className={`w-[100px] shrink-0 text-center text-[12px] font-medium ${consult.statusColor}`}>
                  {consult.status}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
