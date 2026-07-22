"use client";

import React, { useState } from "react";
import Image from "next/image";
import ScheduleListView from "@/components/schedule/ScheduleListView";
import ScheduleCalendarView, { CalendarAppointment } from "@/components/schedule/ScheduleCalendarView";

// Utility for mock calendar dates relative to today
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const MOCK_CALENDAR_APPOINTMENTS: CalendarAppointment[] = [
  {
    id: "101",
    patientName: "Clinic Timing Slot",
    patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831",
    patientAge: 0,
    day: dayLabels[today.getDay()],
    hour: "9 AM",
    patientBio: "Standard operating hours",
    reasonForVisit: "Open hours",
    dateStr: formatDate(today)
  },
  {
    id: "102",
    patientName: "Clinic Timing Slot",
    patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831",
    patientAge: 0,
    day: dayLabels[tomorrow.getDay()],
    hour: "10 AM",
    patientBio: "Standard operating hours",
    reasonForVisit: "Open hours",
    dateStr: formatDate(tomorrow)
  }
];

// Mock Data matching ScheduleItem interface
const MOCK_APPOINTMENTS = [
  { id: "1", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Fever", symptomDetails: "Fever and cough", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date().toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "Consult Now", patientBio: "No prior conditions" },
  { id: "2", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Checkup", symptomDetails: "Routine checkup", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date(Date.now() + 86400000).toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "Reschedule", patientBio: "No prior conditions" },
  { id: "3", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Fever", symptomDetails: "Fever and cough", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date(Date.now() - 86400000).toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "None", patientBio: "No prior conditions" },
  { id: "4", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Checkup", symptomDetails: "Routine checkup", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date().toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "Reschedule", patientBio: "No prior conditions" },
  { id: "5", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Fever", symptomDetails: "Fever and cough", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "Consult Now", patientBio: "No prior conditions" },
  { id: "6", patientName: "Helena", email: "email@figma.com", patientAge: 32, symptomType: "Checkup", symptomDetails: "Routine checkup", dateTime: "12/03/2022 , 02.30", scheduledAt: new Date(Date.now() - 86400000 * 2).toISOString(), patientAvatar: "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831", actionType: "None", patientBio: "No prior conditions" },
];

export default function ClinicSchedulesPage() {
  const [activeTab, setActiveTab] = useState("Appointments");
  const [timeFilter, setTimeFilter] = useState("All");
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(MOCK_APPOINTMENTS[0].id);
  
  return (
    <div className="flex flex-col h-full w-full font-sans select-none px-8 py-6 overflow-y-auto bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      
      <h1 className="text-[#24292E] text-[26px] font-bold tracking-tight mb-6">
        Schedules & Timing
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {["Appointments", "Clinic Timing", "Doctors Timing"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${
              activeTab === tab
                ? "bg-black text-white shadow-sm"
                : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Appointments" && (
        <div className="w-full mt-4">
          <ScheduleListView
            items={MOCK_APPOINTMENTS as any}
            selectedItemId={selectedItemId}
            onSelectItem={(item) => setSelectedItemId(item.id)}
          />
        </div>
      )}

      {activeTab === "Clinic Timing" && (
        <div className="w-full mt-4 bg-white p-6 rounded-[24px] border border-[#EBEEF5] shadow-sm">
          <ScheduleCalendarView appointments={MOCK_CALENDAR_APPOINTMENTS} />
        </div>
      )}

      {activeTab === "Doctors Timing" && (
        <div className="flex flex-col xl:flex-row gap-6 items-start mt-4">
           {/* Left Doctors List */}
           <div className="w-full xl:w-[340px] shrink-0 flex flex-col gap-3">
             {[1,2,3,4,5,6].map(i => (
                <div key={i} className={`rounded-[16px] px-5 py-4 flex items-center justify-between cursor-pointer transition-all border ${i === 1 ? 'border-[#5476FC] shadow-sm bg-white' : 'bg-[#F4F6F8] border-[#EBEEF5] hover:border-[#D0D5DD]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#C0CAFF] shrink-0">
                      <div className="w-full h-full bg-[#8AA0FF] opacity-50 flex items-center justify-center text-white text-[10px]">IMG</div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#24292E] text-[15px] font-bold leading-tight">DR. Abcdefg</span>
                      <span className="text-[#676E76] text-[12px]">email@figma...</span>
                    </div>
                  </div>
                  <span className="text-[#24292E] text-[13px] font-bold">Mon - Fry</span>
                </div>
             ))}
           </div>
           
           {/* Right Availablity Panel */}
           <div className="flex-1 w-full bg-[#EEF2FF] rounded-[24px] p-8 border border-[#D6DEFF] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-bold text-[#24292E]">Availablity Calendar</h2>
                <div className="flex gap-3">
                  <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-5 py-2 rounded-xl text-[13px] font-semibold shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB] transition-all">
                    Request Edit
                  </button>
                  <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-5 py-2 rounded-xl text-[13px] font-semibold shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB] transition-all">
                    Mark Absence
                  </button>
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="w-full overflow-x-auto mb-8 bg-white rounded-xl border border-[#D6DEFF] shadow-sm">
                <div className="grid grid-cols-8 gap-px bg-[#EBEEF5] min-w-[700px]">
                  {/* Header */}
                  <div className="bg-[#F9FAFC] p-3 text-center text-[10px] font-bold text-[#9EA5AD] uppercase tracking-wider">GMT</div>
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                    <div key={day} className={`bg-[#F9FAFC] p-3 text-center flex flex-col gap-1 items-center justify-center`}>
                      <span className="text-[10px] font-bold text-[#9EA5AD] uppercase tracking-wider">{day}</span>
                      <span className="text-[14px] font-bold text-[#24292E]">{10 + i}</span>
                    </div>
                  ))}
                  
                  {/* Rows */}
                  {['8 AM', '10 AM', '12 PM', '2 PM', '4 PM'].map((time) => (
                    <React.Fragment key={time}>
                      <div className="bg-white p-3 flex justify-end text-[10px] font-bold text-[#9EA5AD] whitespace-nowrap">{time}</div>
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                        let badge = null;
                        
                        // Mocking logic to show Online, Clinic, and Absences
                        if (time === '8 AM' && ['MON', 'THU', 'FRI', 'SAT', 'SUN'].includes(day)) {
                          badge = <div className="bg-[#E8FCF1] text-[#179353] text-[10px] font-bold px-2 py-1.5 rounded-md w-full text-center">Online</div>;
                        } else if (time === '10 AM' && ['TUE', 'WED', 'SAT', 'SUN'].includes(day)) {
                          badge = <div className="bg-[#E8F1FF] text-[#5476FC] text-[10px] font-bold px-2 py-1.5 rounded-md w-full text-center">Clinic</div>;
                        } else if (time === '2 PM' && day === 'WED') {
                          badge = (
                            <div className="bg-[#FFE9E9] text-[#D75C5C] text-[10px] font-bold px-2 py-1.5 rounded-md w-full text-center relative group cursor-pointer">
                              Absent
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-white text-[#24292E] text-[10px] p-2 rounded shadow-lg border border-[#EBEEF5] z-10 font-medium">
                                Pending Approval
                              </div>
                            </div>
                          );
                        } else if (time === '12 PM' && day === 'FRI') {
                           badge = (
                            <div className="bg-[#F0F2F5] text-[#676E76] text-[10px] font-bold px-2 py-1.5 rounded-md w-full text-center relative group cursor-pointer">
                              Absent
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-white text-[#24292E] text-[10px] p-2 rounded shadow-lg border border-[#EBEEF5] z-10 font-medium">
                                Completed
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={`${time}-${day}`} className="bg-white p-1.5 min-h-[60px] flex items-center justify-center border-t border-[#EBEEF5]">
                            {badge}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Absents Marked List */}
              <div className="flex items-center gap-4 mb-6 mt-4">
                <h2 className="text-[18px] font-bold text-[#24292E]">Absents Marked</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-white border border-[#5476FC] rounded-[16px] px-6 py-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-12">
                    <span className="text-[#676E76] text-[13px] font-medium">12/10/2024 (Wed)</span>
                    <span className="text-[#24292E] text-[13px] font-medium">Timing - <span className="text-red-500 font-bold">2 PM Slot</span></span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="bg-[#FFE9E9] text-[#D75C5C] text-[11px] font-bold px-4 py-1.5 rounded-full">Pending</span>
                    <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-6 py-2 rounded-xl text-[13px] font-semibold shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB] transition-all">
                      Approve
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#D6DEFF] rounded-[16px] px-6 py-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-12">
                    <span className="text-[#676E76] text-[13px] font-medium">14/10/2024 (Fri)</span>
                    <span className="text-[#24292E] text-[13px] font-medium">Timing - 12 PM Slot</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="bg-[#F0F2F5] text-[#676E76] text-[11px] font-bold px-4 py-1.5 rounded-full">Completed</span>
                    <button className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-6 py-2 rounded-xl text-[13px] font-semibold shadow-[0_4px_12px_rgba(88,121,252,0.25)] hover:from-[#758FFF] hover:to-[#4065FB] transition-all">
                      Approve
                    </button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
