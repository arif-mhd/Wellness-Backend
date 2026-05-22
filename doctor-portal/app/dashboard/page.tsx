"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

const stats = [
  { label: "Today's Appointments", value: "8",   sub: "+2 from yesterday",  bg: "bg-blue-50",   text: "text-blue-700"   },
  { label: "Active Patients",       value: "142", sub: "+12 this month",     bg: "bg-green-50",  text: "text-green-700"  },
  { label: "Pending Reviews",       value: "3",   sub: "2 urgent",           bg: "bg-orange-50", text: "text-orange-700" },
  { label: "Completed Today",       value: "5",   sub: "62.5% of schedule",  bg: "bg-purple-50", text: "text-purple-700" },
];

const appointments = [
  { time: "9:00 AM",  name: "Ahmed Al Rashidi",      type: "Follow-up",    status: "Confirmed" },
  { time: "10:30 AM", name: "Fatima Hassan",          type: "New Patient",  status: "Confirmed" },
  { time: "11:00 AM", name: "Mohammed Al Mansoori",   type: "Consultation", status: "Pending"   },
  { time: "2:00 PM",  name: "Sarah Al Zaabi",         type: "Follow-up",    status: "Confirmed" },
  { time: "3:30 PM",  name: "Omar Khalid",            type: "Video Call",   status: "Confirmed" },
];

export default function DashboardPage() {
  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    async function loadName() {
      try {
        const token = await Session.getAccessTokenPayloadSecurely();
        // token is the decoded payload — we need the raw JWT for the Authorization header.
        // Use the fetch-with-header approach instead:
        const accessToken = await Session.getAccessToken();
        if (!accessToken) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/me`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setDoctorName(data.profile?.name ?? null);
        }
      } catch {
        // silently ignore — greeting falls back to "Doctor"
      }
    }
    loadName();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {doctorName ?? "Doctor"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s your schedule for today</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl p-5 ${s.bg}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-2 ${s.text}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Appointments table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Today&apos;s Appointments</h2>
            <span className="text-xs text-gray-400">5 total</span>
          </div>

          <div className="divide-y divide-gray-50">
            {appointments.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-20 shrink-0">{a.time}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-sm font-semibold">{a.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.type}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    a.status === "Confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder notice */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Showing mock data — connect to the backend API to see real appointments
        </p>
      </div>
    </ProtectedRoute>
  );
}
