"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

// NOTE: There is no backend for clinic appointments/doctor-roster/revenue yet
// (that's a later slice — see the architecture plan). This page renders the
// reference layout with placeholder data, except the clinic identity header,
// which is real (GET /api/clinics/me).

const MOCK_APPOINTMENTS = [
  { id: "1", patientName: "Helena", patientEmail: "email@figma...", reason: "Fever and cough", doctor: "—", time: "12:00", date: "Today" },
  { id: "2", patientName: "Helena", patientEmail: "email@figma...", reason: "Fever and cough", doctor: "—", time: "12:00", date: "Today" },
  { id: "3", patientName: "Helena", patientEmail: "email@figma...", reason: "Fever and cough", doctor: "—", time: "12:00", date: "Today" },
];

const MOCK_DOCTORS = [
  { 
    id: "1", 
    fullName: "Helena", 
    email: "email@figma.com", 
    specialty: "General Physician", 
    isOnline: true, 
    availableFrom: "09:00", 
    availableTo: "14:00", 
    avatarUrl: null 
  },
  { 
    id: "2", 
    fullName: "Helena", 
    email: "email@figma.com", 
    specialty: "General Physician", 
    isOnline: true, 
    availableFrom: "09:00", 
    availableTo: "14:00", 
    avatarUrl: null 
  },
  { 
    id: "3", 
    fullName: "Helena", 
    email: "email@figma.com", 
    specialty: "General Physician", 
    isOnline: true, 
    availableFrom: "09:00", 
    availableTo: "14:00", 
    avatarUrl: null 
  },
];

const MOCK_AVAILABILITY = [
  { day: "Monday", hours: "10AM - 05PM" },
  { day: "Tuesday", hours: "10AM - 05PM" },
  { day: "Wednesday", hours: "10AM - 05PM" },
  { day: "Thursday", hours: "10AM - 05PM" },
  { day: "Friday", hours: "10AM - 05PM" },
  { day: "Saturday", hours: "10AM - 05PM" },
  { day: "Sunday", hours: "10AM - 05PM" },
];

function Avatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ClinicHomePage() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [clinicAvatar, setClinicAvatar] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => {
        const c = data.clinic ?? {};
        setClinicName(c.fullName ?? "Your Clinic");
        setClinicAvatar(c.clinicImageUrl ?? "");
      })
      .catch(() => setClinicName("Your Clinic"));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();

  return (
    <div className="px-8 pb-12 select-none">
      {/* Top Greeting Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col justify-center items-flex-start gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {greeting}
          </span>
          <div className="flex items-center gap-3">
            {clinicAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinicAvatar} alt={clinicName} className="w-11 h-11 rounded-full object-cover border border-gray-100" />
            ) : (
              <Avatar name={clinicName || "C"} size="w-11 h-11" />
            )}
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {clinicName || "Your Clinic"}
            </h1>
          </div>
        </div>

        {/* Patients Waiting Online Widget */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1.5">
            <span className="text-[#707070] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Inter, sans-serif" }}>
              Patients Waiting Online
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-3.5">
                {["A", "B", "C"].map((l, i) => (
                  <div key={l} className={`w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative`} style={{ zIndex: 30 - i * 10 }}>
                    <Avatar name={l} size="w-full h-full" />
                  </div>
                ))}
              </div>
              <span className="text-[#383F45] font-normal text-[36px] leading-none tracking-[-0.72px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                10+
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1: Consultations Today */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Consultations Today
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            24 Consultations
          </div>
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              <span className="text-[#179353] font-medium mr-1">20% Increase</span>
              <span className="text-[#707070]">from yesterday</span>
            </span>
          </div>
        </div>

        {/* Card 2: Tasks to be Completed */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Tasks to be Completed
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            24 Tasks
          </div>
          <div className="text-xs font-normal tracking-[-0.24px] text-[#5476FC]" style={{ fontFamily: "Outfit, sans-serif" }}>
            12 Tasks Completed
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Revenue
            </span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-[#707070] text-[11px] font-medium tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>July</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            $56,565
          </div>
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              <span className="text-[#F25252] font-medium mr-1">8% Decrease</span>
              <span className="text-[#707070]">from last month</span>
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard split content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* New Appointments */}
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                New Appointments
              </h2>
              <button onClick={() => router.push("/clinic/appointments")} className="text-[#5476FC] text-xs font-semibold hover:underline">View all</button>
            </div>

            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            <div className="flex flex-col gap-2">
              {MOCK_APPOINTMENTS.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg transition-all border bg-white hover:bg-gray-50/50 border-transparent"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      <Avatar name={a.patientName} size="w-full h-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#24292E] font-normal text-[14px] leading-tight tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {a.patientName} <span className="text-[#A0A8B0] text-xs ml-1 font-light">{a.patientEmail}</span>
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="px-2.5 py-1 rounded-full bg-[#E2EAFE] flex items-center justify-center">
                          <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {a.reason}
                          </span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-[#F0F2F2] flex items-center justify-center">
                          <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Doctor: {a.doctor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 mt-3 sm:mt-0">
                    <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Time : {a.time}, Date: {a.date}
                    </span>
                    <button
                      className="h-[32px] px-[13px] rounded-xl font-medium text-[13px] flex items-center justify-center transition-all bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Consult Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctors Available */}
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            <div className="flex items-center justify-between">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Doctors Available
              </h2>
            </div>
            
            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_DOCTORS.map((d) => {
                const formatTime = (t: string) => {
                  const [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'pm' : 'am';
                  const hr12 = h % 12 || 12;
                  return `${hr12}.${String(m).padStart(2, '0')} ${ampm}`;
                };
                const timing = `${formatTime(d.availableFrom)} to ${formatTime(d.availableTo)}`;
                return (
                  <div key={d.id} className="p-4 rounded-xl border border-gray-100 bg-[#F9FAFB] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {d.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.avatarUrl} alt={d.fullName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <Avatar name={d.fullName} size="w-10 h-10" />
                        )}
                        {d.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#1FAF65] border-2 border-white rounded-full"></span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#24292E] text-sm font-medium tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{d.fullName}</span>
                        <span className="text-[#676E76] text-[13px] font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>{d.specialty}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[#676E76] text-[13px] font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>{timing}</span>
                      <span className={`text-[12px] font-medium mt-0.5 ${d.isOnline ? 'text-[#1FAF65]' : 'text-gray-400'}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                        {d.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Availability Panel */}
          <div className="bg-white rounded-xl p-6 border border-white shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center w-full">
              <span className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Clinic&apos;s Availability
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 cursor-pointer">
                <span className="text-[#707070] text-xs font-medium tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            <div className="flex flex-col gap-3">
              {MOCK_AVAILABILITY.map((row) => (
                <div key={row.day} className="flex justify-between items-center text-xs">
                  <span className="text-[#596066] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{row.day}</span>
                  <span className="text-[#24292E] font-normal tracking-[-0.24px] text-right" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {row.hours}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-2 flex items-center justify-center">
              <button
                onClick={() => router.push("/clinic/schedules")}
                className="w-full bg-[#1E293B] text-white text-xs font-semibold px-6 py-3 rounded-lg hover:bg-[#0f172a] transition-colors shrink-0"
              >
                Edit Timeslots
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-[8px] w-full ${isAvailable ? "bg-[#E2F8EB]" : "bg-[#F5F5F5]"}`}>
              <span className={`font-medium text-[14px] tracking-[-0.28px] ${isAvailable ? "text-[#179353]" : "text-[#707070]"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                {isAvailable ? "You are available now" : "You are offline"}
              </span>
              <button
                onClick={() => setIsAvailable(v => !v)}
                className="w-[33px] h-[17px] rounded-full p-[2px] flex items-center justify-end transition-all select-none"
                style={{ backgroundColor: isAvailable ? "#1FAF65" : "#D1D5EB" }}
              >
                <div className={`bg-white w-[13px] h-[13px] rounded-full shadow-sm transform transition-transform duration-200 ${isAvailable ? "translate-x-0" : "-translate-x-[16px]"}`} />
              </button>
            </div>
          </div>

          {/* Tasks Pending Panel */}
          <div className="p-2 rounded-[24px] bg-[#F0F2F2] flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-200 transition-all">
            <div className="flex justify-between items-center w-full pl-2.5 pr-1 py-1">
              <span className="text-[#2B2B2B] text-[16px] font-medium leading-[1.5] font-bricolage">
                Tasks Pending
              </span>
            </div>

            <div className="p-5 flex flex-col gap-3 rounded-[12px] bg-[#CDE48C] w-full">
              <div className="flex flex-col gap-2">
                <div className="text-[#2B2B2B] text-[24px] font-medium leading-[1.5] font-bricolage">
                  No Tasks
                </div>
              </div>
              <div className="text-[#504E61] text-xs font-normal leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
                No pending tasks — wired up soon.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
