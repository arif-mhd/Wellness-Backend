"use client";

import React, { useState, useEffect } from "react";
import Session from "supertokens-web-js/recipe/session";

// Icons (SVG)
const UserIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const ClockIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const TABS = [
  { id: "general", label: "General Info", icon: UserIcon },
  { id: "hours", label: "Operating Hours", icon: ClockIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "security", label: "Security", icon: ShieldIcon },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#24292E] tracking-tight">Settings</h1>
        <p className="text-[#9EA5AD] mt-1">Manage your pharmacy portal preferences and configuration.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 bg-white p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[#EBEEF5]">
        {/* Sidebar Tabs */}
        <div className="md:w-64 shrink-0 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-[#EBEEF5] pb-6 md:pb-0 md:pr-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? "bg-[#ECEFFE] text-[#5476FC]" 
                    : "text-[#3D4B5A] hover:bg-gray-50 hover:text-[#24292E]"
                }`}
              >
                <span className={`${isActive ? "text-[#5476FC]" : "text-[#9EA5AD]"}`}>
                  <tab.icon />
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "hours" && <OperatingHoursSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    pharmacyName: "",
    licenseNumber: "",
    email: "",
    phone: "",
    location: ""
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = await Session.getAccessToken();
        if (!token) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/pharmacy/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.pharmacy) {
            setFormData({
              pharmacyName: data.pharmacy.pharmacyName ?? "",
              licenseNumber: data.pharmacy.licenseNumber ?? "",
              email: data.pharmacy.email ?? "",
              phone: data.pharmacy.phone ?? "",
              location: data.pharmacy.location ?? ""
            });
          }
        }
      } catch (err) {
        console.error("Failed to load pharmacy profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = await Session.getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/pharmacy/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: 'success', text: 'Pharmacy information updated successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update information. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-300 flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-[#5476FC]/30 border-t-[#5476FC] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xl font-semibold text-[#24292E] mb-6">General Information</h2>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#3D4B5A]">Pharmacy Name</label>
            <input type="text" name="pharmacyName" value={formData.pharmacyName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#3D4B5A]">License Number</label>
            <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#3D4B5A]">Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#3D4B5A]">Phone Number</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#3D4B5A]">Location (Address)</label>
          <textarea name="location" rows={3} value={formData.location} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all resize-none"></textarea>
        </div>

        <div className="pt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-[#5476FC] hover:bg-[#4362EA] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-[0_4px_12px_rgba(84,118,252,0.25)] flex items-center gap-2">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OperatingHoursSettings() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xl font-semibold text-[#24292E] mb-6">Operating Hours</h2>
      
      <div className="space-y-4">
        {days.map((day, idx) => (
          <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#EBEEF5] hover:border-[#D1D9E6] transition-colors bg-[#F9FAFC]">
            <div className="w-32 font-medium text-[#3D4B5A] mb-3 sm:mb-0">{day}</div>
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <input type="time" defaultValue={idx > 4 ? "10:00" : "08:00"} className="px-3 py-2 rounded-lg border border-[#EBEEF5] text-sm focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none text-[#3D4B5A]" />
              <span className="text-[#9EA5AD]">to</span>
              <input type="time" defaultValue={idx > 4 ? "16:00" : "20:00"} className="px-3 py-2 rounded-lg border border-[#EBEEF5] text-sm focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none text-[#3D4B5A]" />
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={idx !== 6} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5476FC]"></div>
                <span className="ml-3 text-sm font-medium text-[#3D4B5A] w-12">{idx === 6 ? 'Closed' : 'Open'}</span>
              </label>
            </div>
          </div>
        ))}

        <div className="pt-6 flex justify-end">
          <button className="px-6 py-2.5 bg-[#5476FC] hover:bg-[#4362EA] text-white rounded-lg font-medium transition-colors shadow-[0_4px_12px_rgba(84,118,252,0.25)]">
            Save Hours
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const notifs = [
    { id: 1, title: "New Orders", desc: "Receive alerts when a new prescription order is placed.", email: true, sms: true },
    { id: 2, title: "Low Inventory", desc: "Get notified when stock levels fall below minimum threshold.", email: true, sms: false },
    { id: 3, title: "Expiring Stock", desc: "Alerts for medications expiring within 30 days.", email: true, sms: false },
    { id: 4, title: "Daily Summary", desc: "Receive a daily email with order and revenue summaries.", email: true, sms: false },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xl font-semibold text-[#24292E] mb-6">Notification Preferences</h2>
      
      <div className="space-y-4">
        {notifs.map((n) => (
          <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#EBEEF5] bg-white hover:border-[#D1D9E6] transition-colors">
            <div>
              <h3 className="font-medium text-[#24292E]">{n.title}</h3>
              <p className="text-sm text-[#9EA5AD] mt-1">{n.desc}</p>
            </div>
            <div className="flex items-center gap-6 shrink-0 mt-2 sm:mt-0">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${n.email ? 'bg-[#5476FC] border-[#5476FC] text-white' : 'border-[#EBEEF5] text-transparent group-hover:border-[#5476FC]'}`}>
                  <CheckIcon />
                </div>
                <span className="text-sm text-[#3D4B5A]">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${n.sms ? 'bg-[#5476FC] border-[#5476FC] text-white' : 'border-[#EBEEF5] text-transparent group-hover:border-[#5476FC]'}`}>
                  <CheckIcon />
                </div>
                <span className="text-sm text-[#3D4B5A]">SMS</span>
              </label>
            </div>
          </div>
        ))}

        <div className="pt-6 flex justify-end">
          <button className="px-6 py-2.5 bg-[#5476FC] hover:bg-[#4362EA] text-white rounded-lg font-medium transition-colors shadow-[0_4px_12px_rgba(84,118,252,0.25)]">
            Update Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-xl font-semibold text-[#24292E] mb-6">Security & Password</h2>
      
      <div className="space-y-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#24292E]">Change Password</h3>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#3D4B5A]">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#3D4B5A]">New Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#3D4B5A]">Confirm New Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-[#EBEEF5] focus:ring-2 focus:ring-[#5476FC]/20 focus:border-[#5476FC] outline-none transition-all" />
            </div>
            <button className="px-6 py-2.5 bg-[#24292E] hover:bg-[#1A1F24] text-white rounded-lg font-medium transition-colors w-full sm:w-auto">
              Update Password
            </button>
          </div>
        </div>

        <div className="border-t border-[#EBEEF5] pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-[#24292E]">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-[#9EA5AD] mt-1">Add an extra layer of security to your account by requiring a verification code upon login.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5476FC]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
