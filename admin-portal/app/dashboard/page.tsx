"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

const stats = [
  { label: "Total Users",          value: "1,284", sub: "+34 this week",    bg: "bg-blue-50",   text: "text-blue-700"   },
  { label: "Registered Doctors",   value: "47",    sub: "3 pending approval", bg: "bg-green-50",  text: "text-green-700"  },
  { label: "Appointments Today",   value: "128",   sub: "89% confirmed",    bg: "bg-purple-50", text: "text-purple-700" },
  { label: "Lab Tests Booked",     value: "56",    sub: "Today",            bg: "bg-orange-50", text: "text-orange-700" },
];

const recentSignups = [
  { name: "Dr. Khalid Al Habsi",  role: "Doctor",  email: "khalid@clinic.ae",   time: "2 min ago"  },
  { name: "Aisha Mohammed",       role: "Patient", email: "aisha@gmail.com",    time: "15 min ago" },
  { name: "Dr. Priya Sharma",     role: "Doctor",  email: "priya@hospital.ae",  time: "1 hr ago"   },
  { name: "Tariq Al Balushi",     role: "Patient", email: "tariq@outlook.com",  time: "2 hr ago"   },
  { name: "Dr. James Wilson",     role: "Doctor",  email: "jwilson@med.ae",     time: "3 hr ago"   },
];

export default function AdminDashboardPage() {
  const [adminName, setAdminName] = useState<string | null>(null);

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
          setAdminName(data.profile?.name ?? null);
        }
      } catch {
        // silently ignore — greeting falls back to "Admin"
      }
    }
    loadName();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {adminName ?? "Admin"} 🛡️
          </h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview and management</p>
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

        {/* Two-column row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent sign-ups */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Recent Sign-ups</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentSignups.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-purple-600 text-sm font-semibold">{u.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        u.role === "Doctor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{u.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {[
                { label: "Approve Doctors",     icon: "✅", color: "bg-green-50 hover:bg-green-100 text-green-700"   },
                { label: "View Reports",        icon: "📊", color: "bg-blue-50 hover:bg-blue-100 text-blue-700"     },
                { label: "Manage Services",     icon: "🔧", color: "bg-orange-50 hover:bg-orange-100 text-orange-700"},
                { label: "Send Notification",   icon: "🔔", color: "bg-purple-50 hover:bg-purple-100 text-purple-700"},
                { label: "Export Data",         icon: "📥", color: "bg-gray-50 hover:bg-gray-100 text-gray-700"     },
                { label: "System Settings",     icon: "⚙️", color: "bg-gray-50 hover:bg-gray-100 text-gray-700"     },
              ].map((action) => (
                <button
                  key={action.label}
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${action.color}`}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Showing mock data — connect to the backend API to see live platform data
        </p>
      </div>
    </ProtectedRoute>
  );
}
