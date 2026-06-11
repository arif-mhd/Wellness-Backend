"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface SlotDef {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Task {
  id: number;
  title: string;
  desc: string;
  completed: boolean;
}

interface PatientRow {
  id: string;
  name: string;
  avatar: string;
  tags: string[];
  time: string;
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")}${h >= 12 ? "PM" : "AM"}`;
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `Consultation in ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Consultation in ${hrs}h ${mins % 60}m`;
}

function pctChange(today: number, yesterday: number): { value: number; direction: "up" | "down" | "none" } {
  if (yesterday === 0 && today === 0) return { value: 0, direction: "none" };
  if (yesterday === 0) return { value: 100, direction: "up" };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { value: pct, direction: "up" };
  if (pct < 0) return { value: Math.abs(pct), direction: "down" };
  return { value: 0, direction: "none" };
}

export default function DashboardPage() {
  const router = useRouter();

  const [doctorName, setDoctorName]     = useState<string | null>(null);
  const [slots, setSlots]               = useState<SlotDef[]>([]);
  const [isAvailable, setIsAvailable]   = useState(true);

  // Appointments
  const [patients, setPatients]               = useState<PatientRow[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [todayCount, setTodayCount]           = useState(0);
  const [consultationChange, setConsultationChange] = useState<{ value: number; direction: "up" | "down" | "none" } | null>(null);

  // Waiting — patients with status "in_progress" (actively in a call)
  const [waitingCount, setWaitingCount]       = useState(0);
  const [waitingAvatars, setWaitingAvatars]   = useState<string[]>([]);

  // Tasks — local only (no backend endpoint for tasks)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const accessToken = await Session.getAccessToken();
      if (!accessToken) return;
      const headers = { Authorization: `Bearer ${accessToken}` };

      // Doctor name
      const meRes = await fetch(`${API_URL}/auth/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setDoctorName(meData.profile?.name ?? meData.profile?.fullName ?? "Doctor");
      }

      // Appointments
      const apptRes = await fetch(`${API_URL}/api/appointments/doctor`, { headers });
      if (apptRes.ok) {
        const { appointments } = await apptRes.json();
        const all: any[] = appointments ?? [];

        const todayStr     = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        const todays    = all.filter(a => a.scheduledAt?.startsWith(todayStr)     && a.status !== "cancelled");
        const yesterdays = all.filter(a => a.scheduledAt?.startsWith(yesterdayStr) && a.status !== "cancelled");
        const inProgress = all.filter(a => a.status === "in_progress");

        setTotalAppointments(all.length);
        setTodayCount(todays.length);
        setConsultationChange(pctChange(todays.length, yesterdays.length));

        // Waiting room: patients currently in_progress
        setWaitingCount(inProgress.length);
        setWaitingAvatars(
          inProgress.slice(0, 3).map((_, i) =>
            i % 2 === 0 ? "/patient-avatar-1.png" : "/patient-avatar-2.png"
          )
        );

        const rows: PatientRow[] = todays.map((a: any, i: number) => ({
          id:     a.id,
          name:   a.patientName ?? "Patient",
          avatar: i % 2 === 0 ? "/patient-avatar-1.png" : "/patient-avatar-2.png",
          tags:   [a.reason ?? "Consultation"],
          time:   timeUntil(a.scheduledAt),
        }));
        setPatients(rows);
        if (rows.length > 0) setSelectedPatientId(rows[0].id);
      }

      // Slots
      const slotsRes = await fetch(`${API_URL}/api/doctors/slots`, { headers });
      if (slotsRes.ok) {
        const { slots: s } = await slotsRes.json();
        if (s && s.length > 0) {
          setSlots(s);
        } else {
          const defaultSlots = [0,1,2,3,4,5,6].map(day => ({
            dayOfWeek: day, startTime: "09:00", endTime: "19:00",
            slotDurationMins: 30, isActive: true,
          }));
          setSlots(defaultSlots);
          fetch(`${API_URL}/api/doctors/slots`, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ slots: defaultSlots }),
          }).catch(() => {});
        }
      }
    } catch {
      // silently fall back — UI shows "no data" states
    } finally {
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load tasks from localStorage on mount; start empty if none saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem("doctor_tasks");
      if (saved) setTasks(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
    setTasksLoaded(true);
  }, []);

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    if (tasksLoaded) {
      localStorage.setItem("doctor_tasks", JSON.stringify(tasks));
    }
  }, [tasks, tasksLoaded]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount      = tasks.filter(t => t.completed).length;
  const completedPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();

  return (
    <ProtectedRoute>
      <div className="px-8 pb-12 select-none">

        {/* Top Greeting Row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
          <div className="flex flex-col justify-center items-flex-start gap-1">
            <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {greeting}
            </span>
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {doctorName ?? (dataLoaded ? "Doctor" : "—")}
            </h1>
          </div>

          {/* Patients Waiting Online Widget */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-[#707070] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Inter, sans-serif" }}>
                Patients Waiting Online
              </span>

              {waitingCount === 0 ? (
                <span className="text-[#A0A8B0] text-sm font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {dataLoaded ? "No patients waiting" : "—"}
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-3.5">
                    {waitingAvatars.map((src, i) => (
                      <div key={i} className={`w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative`} style={{ zIndex: 30 - i * 10 }}>
                        <img src={src} alt={`Patient ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[#383F45] font-normal text-[36px] leading-none tracking-[-0.72px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {waitingCount > 9 ? "9+" : waitingCount}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push("/appointments/waitingroom")}
              className="h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-[26px] rounded-xl font-medium text-[16px] flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_12px_24px_rgba(84,118,252,0.35)] transition-all"
            >
              <span style={{ fontFamily: "Outfit, sans-serif" }}>Waiting Room</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
              {dataLoaded ? `${todayCount} Consultation${todayCount !== 1 ? "s" : ""}` : "—"}
            </div>
            <div className="flex items-center gap-1">
              {!dataLoaded || consultationChange === null ? (
                <span className="text-[#A0A8B0] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>Calculating...</span>
              ) : consultationChange.direction === "none" ? (
                <span className="text-[#707070] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>0% change from yesterday</span>
              ) : consultationChange.direction === "up" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="text-[#179353] font-medium mr-1">{consultationChange.value}% Increase</span>
                    <span className="text-[#707070]">from yesterday</span>
                  </span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="text-[#F25252] font-medium mr-1">{consultationChange.value}% Decrease</span>
                    <span className="text-[#707070]">from yesterday</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Tasks */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
            <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Tasks to be Completed
            </div>
            {!tasksLoaded ? (
              <div className="text-[#A0A8B0] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>—</div>
            ) : tasks.length === 0 ? (
              <>
                <div className="text-[#A0A8B0] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>No Tasks</div>
                <div className="text-[#A0A8B0] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>No tasks added yet</div>
              </>
            ) : (
              <>
                <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {tasks.length} Task{tasks.length !== 1 ? "s" : ""}
                </div>
                <div className="text-[#179353] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {completedCount} Task{completedCount !== 1 ? "s" : ""} Completed
                </div>
              </>
            )}
          </div>

          {/* Card 3: Revenue — no backend endpoint, show unavailable */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-center w-full">
              <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Revenue
              </span>
            </div>
            <div className="text-[#A0A8B0] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Not available
            </div>
            <div className="text-[#C0C8D0] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
              Revenue data coming soon
            </div>
          </div>
        </div>

        {/* Dashboard split content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Left Column: Upcoming Consultations */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Upcoming Consultations
              </h2>
              <div className="flex items-center gap-[38px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#383F45] text-[32px] font-medium leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {dataLoaded ? totalAppointments : "—"}
                  </span>
                  <span className="text-[#676E76] text-xs font-normal leading-[1.3] tracking-[-0.24px] max-w-[80px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Total Consultations
                  </span>
                </div>
                <div className="w-[1px] h-[24px] bg-[#EBEEF5]" />
                <div className="flex items-center gap-2">
                  <span className="text-[#383F45] text-[32px] font-medium leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {dataLoaded ? todayCount : "—"}
                  </span>
                  <span className="text-[#5476FC] text-xs font-semibold leading-[1.3] tracking-[-0.24px] max-w-[80px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Scheduled Today
                  </span>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            <div className="flex flex-col gap-2">
              {!dataLoaded ? (
                <p className="text-sm text-[#A0A8B0] py-6 text-center">Loading appointments...</p>
              ) : patients.length === 0 ? (
                <p className="text-sm text-[#676E76] py-6 text-center">No appointments today</p>
              ) : (
                patients.map((p) => {
                  const isSelected = selectedPatientId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected ? "bg-[#F5F6FA] border-transparent" : "bg-white hover:bg-gray-50/50 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                          <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[#24292E] font-normal text-[14px] leading-tight tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {p.tags.map((tag, i) => (
                              <div key={i} className="px-2.5 py-1 rounded-full bg-[#E2EAFE] flex items-center justify-center">
                                <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {tag}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 mt-3 sm:mt-0">
                        <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {p.time}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/appointments/consult?appointmentId=${p.id}&patientName=${encodeURIComponent(p.name)}`);
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
                })
              )}
            </div>
          </div>

          {/* Right Column: Availability & Tasks */}
          <div className="flex flex-col gap-6">

            {/* Availability Panel */}
            <div className="bg-white rounded-xl p-6 border border-white shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-center w-full">
                <span className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Availability
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
                {slots.filter(s => s.isActive).length === 0 ? (
                  <p className="text-sm text-[#A0A8B0]" style={{ fontFamily: "Outfit, sans-serif" }}>No availability set</p>
                ) : (
                  slots.filter(s => s.isActive).map(s => (
                    <div key={s.dayOfWeek} className="flex justify-between items-center text-xs">
                      <span className="text-[#596066] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="text-[#24292E] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{fmt12(s.startTime)} - {fmt12(s.endTime)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className={`flex items-center justify-between p-4 rounded-[8px] w-full ${isAvailable ? "bg-[#E2F8EB]" : "bg-[#F5F5F5]"}`}>
                <span className={`font-medium text-[14px] tracking-[-0.28px] ${isAvailable ? "text-[#179353]" : "text-[#707070]"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                  {isAvailable ? "You are available Now" : "You are Offline"}
                </span>
                <button
                  onClick={() => setIsAvailable(!isAvailable)}
                  className="w-[33px] h-[17px] rounded-full p-[2px] flex items-center justify-end transition-all select-none"
                  style={{ backgroundColor: isAvailable ? "#1FAF65" : "#D1D5EB" }}
                >
                  <div className={`bg-white w-[13px] h-[13px] rounded-full shadow-sm transform transition-transform duration-200 ${isAvailable ? "translate-x-0" : "-translate-x-[16px]"}`} />
                </button>
              </div>
            </div>

            {/* Todays Tasks Panel */}
            <div className="p-2 rounded-[24px] bg-[#F0F2F2] flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-200 transition-all">
              <div className="flex justify-between items-center w-full pl-2.5 pr-1 py-1">
                <span className="text-[#2B2B2B] text-[16px] font-medium leading-[1.5] font-bricolage">
                  Todays Tasks
                </span>
                <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4.66699 11.3333L11.3337 4.66663" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.66699 4.66663H11.3337V11.3333" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Progress Box */}
              <div className="p-5 flex flex-col gap-3 rounded-[12px] bg-[#CDE48C] w-full">
                <div className="flex flex-col gap-2">
                  <div className="text-[#2B2B2B] text-[24px] font-medium leading-[1.5] font-bricolage">
                    {!tasksLoaded ? "—" : tasks.length === 0 ? "No Tasks" : `${tasks.length} Task${tasks.length !== 1 ? "s" : ""}`}
                  </div>
                  <div className="w-full bg-[rgba(0,0,0,0.1)] rounded-full h-[7px] relative overflow-hidden">
                    <div
                      className="bg-[#00656B] h-full rounded-full transition-all duration-300"
                      style={{ width: `${completedPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-[#504E61] text-xs font-normal leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
                  {tasks.length === 0 ? "No tasks added yet" : `${completedPercentage}% of tasks are completed`}
                </div>
              </div>

              {/* Task list */}
              <div className="flex flex-col gap-2">
                {!tasksLoaded ? (
                  <div className="p-4 text-center text-sm text-[#A0A8B0]">Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#A0A8B0]">No tasks for today</div>
                ) : (
                  tasks.map((task) => (
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
                  ))
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
