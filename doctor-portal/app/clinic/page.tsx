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
  { id: "1", name: "Helena", email: "email@figma...", timing: "9.00 am to 2.00 pm", specialty: "General Physician", online: true },
  { id: "2", name: "Helena", email: "email@figma...", timing: "9.00 am to 2.00 pm", specialty: "General Physician", online: true },
  { id: "3", name: "Helena", email: "email@figma...", timing: "9.00 am to 2.00 pm", specialty: "General Physician", online: true },
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

  return (
    <div className="px-10 lg:px-[40px] py-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Header row: clinic identity + waiting patients */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {clinicAvatar ? (
                <img src={clinicAvatar} alt={clinicName} className="w-11 h-11 rounded-full object-cover border border-gray-100" />
              ) : (
                <Avatar name={clinicName || "C"} size="w-11 h-11" />
              )}
              <h1 className="text-lg font-semibold text-[#24292E]">{clinicName || "Your Clinic"}</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 flex items-center gap-4">
              <span className="text-xs font-medium text-gray-500">Patients Waiting Online</span>
              <div className="flex items-center -space-x-2">
                {["A", "B", "C"].map((l) => <Avatar key={l} name={l} size="w-7 h-7" />)}
              </div>
              <span className="text-sm font-bold text-[#24292E]">10+</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
              <span className="text-xs font-medium text-gray-500">Consultations Today</span>
              <span className="text-2xl font-bold text-[#24292E]">24 <span className="text-sm font-medium text-gray-400">Consultations</span></span>
              <span className="text-[11px] font-semibold text-emerald-500">↗ 20% Increase from yesterday</span>
            </div>
            <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
              <span className="text-xs font-medium text-gray-500">Tasks to be Completed</span>
              <span className="text-2xl font-bold text-[#24292E]">24 <span className="text-sm font-medium text-gray-400">Tasks</span></span>
              <span className="text-[11px] font-semibold text-[#5476FC]">12 Tasks Completed</span>
            </div>
            <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Revenue</span>
                <span className="text-[11px] font-semibold text-gray-400">July ▾</span>
              </div>
              <span className="text-2xl font-bold text-[#24292E]">$56,565</span>
              <span className="text-[11px] font-semibold text-red-400">↘ 8% Decrease from last month</span>
            </div>
          </div>

          {/* New Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-transparent p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#24292E]">New Appointments</h2>
              <button onClick={() => router.push("/clinic/appointments")} className="text-[#5476FC] text-xs font-semibold hover:underline">View all</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {MOCK_APPOINTMENTS.map((a) => (
                <div key={a.id} className="min-w-[220px] bg-[#F7F8FC] rounded-xl p-4 flex flex-col gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.patientName} size="w-9 h-9" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#24292E] truncate">{a.patientName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{a.patientEmail}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{a.reason}</p>
                  <p className="text-[11px] text-gray-400">Doctor - {a.doctor}</p>
                  <p className="text-[11px] text-gray-400">Time : {a.time}, Date: {a.date}</p>
                  <button className="mt-1 bg-[#1E293B] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#0f172a] transition-colors">
                    Consult Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Doctors Available */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-[#24292E]">Doctors Available</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {MOCK_DOCTORS.map((d) => (
                <div key={d.id} className="bg-[#F7F8FC] rounded-xl p-4 flex items-center gap-3">
                  <Avatar name={d.name} size="w-10 h-10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#24292E] truncate">{d.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{d.email}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Timing : {d.timing}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] font-medium text-gray-500">{d.specialty}</span>
                      {d.online && <span className="text-[11px] font-semibold text-emerald-500">Online</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage Clinic's Availability */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-xl shadow-sm border border-transparent p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-[#24292E] mb-1">Manage Clinic&apos;s Availability</h2>
              <div className="flex flex-wrap gap-x-8 gap-y-1.5">
                {MOCK_AVAILABILITY.slice(0, 5).map((row) => (
                  <span key={row.day} className="text-[11px] text-gray-400">
                    <span className="font-semibold text-gray-500">{row.day.slice(0, 3)} :</span> {row.hours}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => router.push("/clinic/schedules")}
              className="bg-[#1E293B] text-white text-xs font-semibold px-6 py-3 rounded-lg hover:bg-[#0f172a] transition-colors shrink-0"
            >
              Edit Timeslots
            </button>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#EAEBFB] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#24292E] mb-4">Tasks Pending</h3>
            <p className="text-xs text-gray-500">No pending tasks — wired up soon.</p>
          </div>

          <div className="bg-[#EAEBFB] rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#24292E]">Clinic&apos;s Availability</h3>
              <span className="text-[11px] font-semibold text-gray-400">This Week ▾</span>
            </div>
            <div className="bg-white rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wide pb-1 border-b border-gray-50">
                <span>Availability</span>
              </div>
              {MOCK_AVAILABILITY.map((row) => (
                <div key={row.day} className="flex justify-between text-[11px]">
                  <span className="text-gray-500">{row.day}</span>
                  <span className="font-medium text-gray-700">{row.hours}</span>
                </div>
              ))}
              <button
                onClick={() => setIsAvailable((v) => !v)}
                className={`mt-2 flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isAvailable ? "bg-[#E2F8EB]" : "bg-gray-50"}`}
              >
                <span className={`text-[11px] font-semibold ${isAvailable ? "text-emerald-600" : "text-gray-400"}`}>
                  {isAvailable ? "You are available now" : "You are unavailable"}
                </span>
                <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${isAvailable ? "bg-emerald-400 justify-end" : "bg-gray-300 justify-start"}`}>
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
