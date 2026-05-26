"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

interface Patient {
  id: number;
  name: string;
  avatar: string;
  tags: string[];
  time: string;
}

interface Task {
  id: number;
  title: string;
  desc: string;
  completed: boolean;
}

export default function DashboardPage() {
  const [doctorName, setDoctorName] = useState<string | null>("Dr. Jordan Anderson");
  const [selectedPatientId, setSelectedPatientId] = useState<number>(2); // Floyd Miles is selected by default
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [consultingPatient, setConsultingPatient] = useState<Patient | null>(null);

  const [patients, setPatients] = useState<Patient[]>([
    { id: 1, name: "Yelena Isinbaeva", avatar: "/patient-avatar-2.png", tags: ["Fever", "Cough"], time: "Consultation in 32 min" },
    { id: 2, name: "Floyd Miles", avatar: "/patient-avatar-1.png", tags: ["Fever", "Headache", "Cough"], time: "Consultation in 32 min" },
    { id: 3, name: "Leslie Alexander", avatar: "/patient-avatar-2.png", tags: ["Fever", "Cough"], time: "Consultation in 32 min" },
    { id: 4, name: "Jerome Bell", avatar: "/patient-avatar-1.png", tags: ["Fever", "Cough"], time: "Consultation in 32 min" },
    { id: 5, name: "Eleanor Pena", avatar: "/patient-avatar-2.png", tags: ["Fever", "Cough"], time: "Consultation in 32 min" },
    { id: 6, name: "Cameron Williamson", avatar: "/patient-avatar-1.png", tags: ["Headache", "Cough"], time: "Consultation in 32 min" },
    { id: 7, name: "Eleanor Pena", avatar: "/patient-avatar-2.png", tags: ["Fever", "Cough"], time: "Consultation in 32 min" },
    { id: 8, name: "Cameron Williamson", avatar: "/patient-avatar-1.png", tags: ["Headache", "Cough"], time: "Consultation in 32 min" },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "Test Results for Mark Robinson", desc: "Mark's blood test results for cholesterol and liver function have arrived. Review the results and provide recommendations on managing elevated cholesterol levels.", completed: true },
    { id: 2, title: "Pre-op Assessment for Lisa Chen", desc: "Review cardiogram and blood pressure logs for next week's surgery.", completed: false },
    { id: 3, title: "Prescription Renewal for David Patel", desc: "Refill request for Metformin 500mg. Verify checkup logs.", completed: false },
    { id: 4, title: "Follow-up notes for Yelena Isinbaeva", desc: "Log post-consultation details from morning call and assign medication details.", completed: false },
  ]);

  useEffect(() => {
    async function loadName() {
      try {
        const accessToken = await Session.getAccessToken();
        if (!accessToken) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/me`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setDoctorName(data.profile?.name ?? "Dr. Jordan Anderson");
        }
      } catch {
        // silently ignore — greeting falls back to "Dr. Jordan Anderson"
      }
    }
    loadName();
  }, []);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const completedPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <ProtectedRoute>
      <div className="px-8 pb-12 select-none">
        {/* Top Greeting Row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
          {/* Greeting */}
          <div className="flex flex-col justify-center items-flex-start gap-1">
            <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Good Morning!
            </span>
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {doctorName}
            </h1>
          </div>

          {/* Patients Waiting Online Widget */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-[#707070] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Inter, sans-serif" }}>
                Patients Waiting Online
              </span>
              <div className="flex items-center gap-3">
                {/* Stacked avatars */}
                <div className="flex items-center -space-x-3.5">
                  <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative z-30">
                    <img src="/patient-avatar-1.png" alt="Patient 1" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative z-20">
                    <img src="/patient-avatar-2.png" alt="Patient 2" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative z-10">
                    <img src="/patient-avatar-1.png" alt="Patient 3" className="w-full h-full object-cover" />
                  </div>
                </div>
                <span className="text-[#383F45] font-normal text-[36px] leading-none tracking-[-0.72px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  10+
                </span>
              </div>
            </div>

            {/* Waiting Room Button */}
            <button className="h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-[26px] rounded-xl font-medium text-[16px] flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_12px_24px_rgba(84,118,252,0.35)] transition-all">
              <span style={{ fontFamily: "Outfit, sans-serif" }}>Waiting Room</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 19.5L21 12L13.5 4.5M21 12H3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <div className="text-[#179353] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              12 Tasks Completed
            </div>
          </div>

          {/* Card 3: Revenue */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-center w-full">
              <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Revenue
              </span>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-[#707070] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>July</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              $56,565
            </div>
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          
          {/* Left Column: Upcoming Consultations (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Upcoming Consultations
              </h2>
              
              <div className="flex items-center gap-[38px]">
                {/* Total consultations */}
                <div className="flex items-center gap-2">
                  <span className="text-[#383F45] text-[32px] font-medium leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    86
                  </span>
                  <span className="text-[#676E76] text-xs font-normal leading-[1.3] tracking-[-0.24px] max-w-[80px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Total Consultations
                  </span>
                </div>

                {/* Divider */}
                <div className="w-[1px] h-[24px] bg-[#EBEEF5]"></div>

                {/* Scheduled Today */}
                <div className="flex items-center gap-2">
                  <span className="text-[#383F45] text-[32px] font-medium leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    14
                  </span>
                  <span className="text-[#5476FC] text-xs font-semibold leading-[1.3] tracking-[-0.24px] max-w-[80px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Scheduled Today
                  </span>
                </div>
              </div>
            </div>

            {/* Separator line */}
            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            {/* Patients List */}
            <div className="flex flex-col gap-2">
              {patients.map((p) => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#F5F6FA] border-transparent"
                        : "bg-white hover:bg-gray-50/50 border-transparent"
                    }`}
                  >
                    {/* Patient info */}
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      
                      {/* Name & tags */}
                      <div className="flex flex-col">
                        <span className="text-[#24292E] font-normal text-[14px] leading-tight tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {p.tags.map((tag, i) => (
                            <div
                              key={i}
                              className="px-2.5 py-1 rounded-full bg-[#E2EAFE] flex items-center justify-center"
                            >
                              <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                {tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Meta Info & Consult Now Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 mt-3 sm:mt-0">
                      <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {p.time}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConsultingPatient(p);
                        }}
                        className={`h-[32px] px-[13px] rounded-xl font-medium text-[13px] flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
                            : "bg-white text-[#24292E] border border-gray-150 hover:bg-gray-50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Consult Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Availability & Tasks (1/3 width) */}
          <div className="flex flex-col gap-6">
            
            {/* Availability Panel */}
            <div className="bg-white rounded-xl p-6 border border-white shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-center w-full">
                <span className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Availability
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 cursor-pointer">
                  <span className="text-[#707070] text-xs font-medium tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>This Week</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Separator line */}
              <div className="h-[1px] bg-[#EBEEF5] w-full" />

              {/* Day slots */}
              <div className="flex flex-col gap-3">
                {[
                  { day: "Monday", hours: "10AM - 06PM" },
                  { day: "Tuesday", hours: "10AM - 06PM" },
                  { day: "Wednesday", hours: "10AM - 06PM" },
                  { day: "Thursday", hours: "10AM - 06PM" },
                  { day: "Friday", hours: "10AM - 06PM" },
                  { day: "Saturday", hours: "10AM - 06PM" },
                  { day: "Sunday", hours: "10AM - 06PM" },
                ].map((sched) => (
                  <div key={sched.day} className="flex justify-between items-center text-xs">
                    <span className="text-[#596066] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{sched.day}</span>
                    <span className="text-[#24292E] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{sched.hours}</span>
                  </div>
                ))}
              </div>

              {/* Availability Banner */}
              <div className="flex items-center justify-between p-4 rounded-[8px] bg-[#E2F8EB] w-full">
                <span className="text-[#179353] font-medium text-[14px] tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {isAvailable ? "You are available Now" : "You are Offline"}
                </span>

                {/* Custom Toggle Switch */}
                <button
                  onClick={() => setIsAvailable(!isAvailable)}
                  className="w-[33px] h-[17px] rounded-full p-[2px] flex items-center justify-end transition-all select-none"
                  style={{ backgroundColor: isAvailable ? "#1FAF65" : "#D1D5EB" }}
                >
                  <div
                    className={`bg-white w-[13px] h-[13px] rounded-full shadow-sm transform transition-transform duration-200 ${
                      isAvailable ? "translate-x-0" : "-translate-x-[16px]"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Todays Tasks Panel (Figma Custom Lime-Green Theme) */}
            <div className="p-2 rounded-[24px] bg-[#F0F2F2] flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-200 transition-all">
              {/* Header */}
              <div className="flex justify-between items-center w-full pl-2.5 pr-1 py-1">
                <span className="text-[#2B2B2B] text-[16px] font-medium leading-[1.5]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
                  Todays Tasks
                </span>
                <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.66699 11.3333L11.3337 4.66663" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.66699 4.66663H11.3337V11.3333" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Lime Progress Box */}
              <div className="p-5 flex flex-col gap-3 rounded-[12px] bg-[#CDE48C] w-full">
                <div className="flex flex-col gap-2">
                  <div className="text-[#2B2B2B] text-[24px] font-medium leading-[1.5]" style={{ fontFamily: "Bricolage Grotesque, sans-serif" }}>
                    {tasks.length} Tasks
                  </div>
                  
                  {/* Progress bar line */}
                  <div className="w-full bg-[rgba(0,0,0,0.1)] rounded-full h-[7px] relative overflow-hidden">
                    <div
                      className="bg-[#00656B] h-full rounded-full transition-all duration-300"
                      style={{ width: `${completedPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="text-[#504E61] text-xs font-normal leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
                  {completedPercentage}% of tasks are completed
                </div>
              </div>

              {/* Task list items */}
              <div className="flex flex-col gap-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="p-4 bg-white hover:bg-gray-50 rounded-[12px] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex-1 pr-3 flex flex-col gap-1 select-none">
                      <span className={`text-[#2B2B2B] font-medium text-[12px] leading-[1.5] ${task.completed ? "line-through opacity-50" : ""}`} style={{ fontFamily: "Inter, sans-serif" }}>
                        {task.title}
                      </span>
                      <span className={`text-[#707070] font-normal text-[12px] leading-[1.3] line-clamp-1 ${task.completed ? "opacity-50" : ""}`} style={{ fontFamily: "Inter, sans-serif" }}>
                        {task.desc}
                      </span>
                    </div>

                    {/* Circular Checkbox matching Figma border */}
                    {task.completed ? (
                      <div className="w-6 h-6 rounded-full bg-[#00656B] flex items-center justify-center text-white shrink-0 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-[3px] border-[#D1D5EB] bg-white shrink-0 hover:border-gray-400 transition-colors" />
                    )}
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Video Consultation Simulation Modal */}
      {consultingPatient && (
        <div className="fixed inset-0 bg-[#1C2038]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full border border-gray-100 flex flex-col">
            {/* Header */}
            <div className="bg-[#1C2038] px-6 py-4 flex items-center justify-between text-white border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="font-bold text-sm tracking-wide">Live Consultation</span>
              </div>
              <button
                onClick={() => setConsultingPatient(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Screens Body */}
            <div className="relative bg-[#111322] aspect-video w-full flex items-center justify-center">
              {/* Patient Main Video (Simulated Feed) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-black/60 to-transparent">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#5872F5] shadow-lg animate-pulse mb-4">
                  <img src={consultingPatient.avatar} alt={consultingPatient.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-white text-lg font-black">{consultingPatient.name}</h3>
                <p className="text-gray-300 text-xs mt-1">Connecting video feed…</p>
              </div>

              {/* Doctor Pip Video (Bottom Right Corner) */}
              <div className="absolute bottom-4 right-4 w-32 h-20 bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                <img src="/doctor-avatar.png" alt="Doctor" className="w-full h-full object-cover" />
                <div className="absolute bottom-1.5 left-1.5 bg-black/40 text-[9px] font-bold text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                  You
                </div>
              </div>
            </div>

            {/* Call Control Actions Footer */}
            <div className="bg-[#1C2038] px-6 py-6 flex items-center justify-center gap-4 border-t border-gray-800">
              <button className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>

              <button
                onClick={() => setConsultingPatient(null)}
                className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors shadow-lg shadow-red-900/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M4.5 3.75a.75.75 0 00-1.5 0v16.5a.75.75 0 001.5 0V3.75zM19.5 3.75a.75.75 0 00-1.5 0v16.5a.75.75 0 001.5 0V3.75zM8.25 6.75a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V6.75zM15.75 6.75a.75.75 0 00-1.5 0v10.5a.75.75 0 001.5 0V6.75z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
