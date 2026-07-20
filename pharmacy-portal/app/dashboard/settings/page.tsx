"use client";

import React, { useState, useEffect } from "react";
import Session from "supertokens-web-js/recipe/session";

async function pharmacyFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

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
const CreditCardIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const inputCls = "w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all";
const labelCls = "block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5";

const TABS = [
  { id: "general", label: "General Info", icon: UserIcon },
  { id: "hours", label: "Operating Hours", icon: ClockIcon },
  { id: "payout", label: "Payout Details", icon: CreditCardIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "security", label: "Security", icon: ShieldIcon },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="px-8 pb-12 pt-6 max-w-6xl mx-auto w-full font-outfit animate-fade-in">
      <div className="mb-8 mt-2">
        <h1 className="text-[28px] text-[#383F45] font-normal tracking-[-0.56px] leading-none mb-2">Settings</h1>
        <p className="text-sm text-[#676E76] tracking-[-0.28px]">Manage your pharmacy portal preferences and configuration.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 bg-white p-6 rounded-2xl border border-[#EBEEF5] shadow-sm">
        {/* Sidebar Tabs */}
        <div className="md:w-64 shrink-0 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-[#EBEEF5] pb-6 md:pb-0 md:pr-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-[14px] font-medium tracking-wide ${
                  isActive 
                    ? "bg-[#EEF2FF] text-[#5476FC] shadow-sm border border-[#C7D2FE]/50" 
                    : "text-[#676E76] hover:bg-[#F8FAFC] hover:text-[#383F45] border border-transparent"
                }`}
              >
                <span className={`${isActive ? "text-[#5476FC]" : "text-[#A0A8B0]"}`}>
                  <tab.icon />
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 md:px-4">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "hours" && <OperatingHoursSettings />}
          {activeTab === "payout" && <PayoutSettings />}
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
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    pharmacyName: "",
    ownerName: "",
    licenseNumber: "",
    emiratesId: "",
    email: "",
    phone: "",
    location: "",
    manager: ""
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await pharmacyFetch("/api/pharmacy/me");
        if (res.ok) {
          const data = await res.json();
          if (data.pharmacy) {
            setFormData({
              pharmacyName: data.pharmacy.pharmacyName ?? "",
              ownerName: data.pharmacy.ownerName ?? "",
              licenseNumber: data.pharmacy.licenseNumber ?? "",
              emiratesId: data.pharmacy.emiratesId ?? "",
              email: data.pharmacy.email ?? "",
              phone: data.pharmacy.phone ?? "",
              location: data.pharmacy.location ?? "",
              manager: data.pharmacy.manager ?? ""
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
      const res = await pharmacyFetch("/api/pharmacy/me", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: 'success', text: 'Pharmacy information updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update information. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const activeInputCls = `${inputCls} disabled:bg-[#F9FAFC] disabled:text-[#676E76] disabled:border-transparent disabled:cursor-not-allowed disabled:pointer-events-none`;

  if (loading) {
    return (
      <div className="animate-in fade-in duration-300 flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-[#5476FC]/30 border-t-[#5476FC] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6 border-b border-[#EBEEF5] pb-3">
        <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px]">General Information</h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-[#5476FC] text-[13px] font-medium hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#F5F7FB] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            Edit Info
          </button>
        )}
      </div>
      
      {message && (
        <div className={`p-4 rounded-xl mb-6 text-[13px] font-medium flex items-center gap-3 ${message.type === 'success' ? 'bg-[#E2F8EB] text-[#179353] border border-[#179353]/20' : 'bg-[#FEE2E2] text-[#F25252] border border-[#FCA5A5]'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className={labelCls}>Pharmacy Name</label>
            <input type="text" name="pharmacyName" value={formData.pharmacyName} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Owner Name</label>
            <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className={labelCls}>License Number</label>
            <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Emirates ID</label>
            <input type="text" name="emiratesId" value={formData.emiratesId} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className={labelCls}>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Manager Name</label>
          <input type="text" name="manager" value={formData.manager} onChange={handleChange} disabled={!isEditing} className={activeInputCls} />
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Location (Address)</label>
          <textarea name="location" rows={3} value={formData.location} onChange={handleChange} disabled={!isEditing} className={`${activeInputCls} h-auto py-3 resize-none`}></textarea>
        </div>

        {isEditing && (
          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => {
                setIsEditing(false);
                setMessage(null);
              }} 
              disabled={saving} 
              className="px-6 py-3 rounded-xl bg-[#F8FAFC] border border-[#EBEEF5] text-[#383F45] font-medium text-[13px] hover:bg-white hover:border-[#D1D9E6] transition-all"
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayHours { open: string; close: string; isOpen: boolean; }
type OperatingHours = Record<string, DayHours>;

function defaultHours(): OperatingHours {
  const obj: OperatingHours = {};
  DAYS.forEach((day, idx) => {
    obj[day] = { open: idx > 4 ? "10:00" : "08:00", close: idx > 4 ? "16:00" : "20:00", isOpen: idx !== 6 };
  });
  return obj;
}

function OperatingHoursSettings() {
  const [hours, setHours] = useState<OperatingHours>(defaultHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await pharmacyFetch("/api/pharmacy/me");
        if (res.ok) {
          const data = await res.json();
          if (data.pharmacy?.operatingHours) {
            setHours({ ...defaultHours(), ...data.pharmacy.operatingHours });
          }
        }
      } catch (err) {
        console.error("Failed to load operating hours", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateDay = (day: string, updates: Partial<DayHours>) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...updates } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await pharmacyFetch("/api/pharmacy/me", {
        method: "PUT",
        body: JSON.stringify({ operatingHours: hours }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: 'success', text: 'Operating hours updated successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update hours. Please try again.' });
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
      <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-6 border-b border-[#EBEEF5] pb-3">Operating Hours</h2>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-[13px] font-medium flex items-center gap-3 ${message.type === 'success' ? 'bg-[#E2F8EB] text-[#179353] border border-[#179353]/20' : 'bg-[#FEE2E2] text-[#F25252] border border-[#FCA5A5]'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {DAYS.map((day) => {
          const d = hours[day];
          return (
            <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#EBEEF5] hover:border-gray-300 transition-colors bg-white shadow-sm">
              <div className="w-32 font-semibold text-[#383F45] text-sm mb-3 sm:mb-0">{day}</div>
              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                <input type="time" value={d.open} onChange={(e) => updateDay(day, { open: e.target.value })} disabled={!d.isOpen} className="px-3 py-2 rounded-lg border border-[#EBEEF5] text-sm text-[#383F45] focus:outline-none focus:border-[#5476FC]/50 bg-[#F8FAFC] disabled:opacity-50" />
                <span className="text-[#9EA5AD] text-[11px] uppercase font-bold tracking-wider">to</span>
                <input type="time" value={d.close} onChange={(e) => updateDay(day, { close: e.target.value })} disabled={!d.isOpen} className="px-3 py-2 rounded-lg border border-[#EBEEF5] text-sm text-[#383F45] focus:outline-none focus:border-[#5476FC]/50 bg-[#F8FAFC] disabled:opacity-50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={d.isOpen} onChange={(e) => updateDay(day, { isOpen: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-[#EBEEF5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5476FC]"></div>
                  <span className="ml-3 text-sm font-medium text-[#676E76] w-14">{d.isOpen ? 'Open' : 'Closed'}</span>
                </label>
              </div>
            </div>
          );
        })}

        <div className="pt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutSettings() {
  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-6 border-b border-[#EBEEF5] pb-3">Payout & Banking Details</h2>
      
      <div className="space-y-5 max-w-2xl">
        <div className="space-y-2">
          <label className={labelCls}>Bank Name</label>
          <input type="text" placeholder="e.g. Emirates NBD" className={inputCls} />
        </div>
        
        <div className="space-y-2">
          <label className={labelCls}>Account Holder Name</label>
          <input type="text" placeholder="e.g. Al Shifa Pharmacy LLC" className={inputCls} />
        </div>
        
        <div className="space-y-2">
          <label className={labelCls}>IBAN / Account Number</label>
          <input type="text" placeholder="AE00000000000000000000" className={inputCls} />
        </div>
        
        <div className="space-y-2">
          <label className={labelCls}>SWIFT / BIC Code</label>
          <input type="text" placeholder="EBIZAEAD" className={inputCls} />
        </div>

        <div className="pt-4 flex justify-end">
          <button className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all">
            Update Banking Details
          </button>
        </div>
      </div>
    </div>
  );
}

interface NotifPref { email: boolean; sms: boolean; }
type NotifPreferences = Record<string, NotifPref>;

const NOTIF_TYPES: { key: string; title: string; desc: string }[] = [
  { key: "new_orders",     title: "New Orders",     desc: "Receive alerts when a new prescription order is placed." },
  { key: "low_inventory",  title: "Low Inventory",  desc: "Get notified when stock levels fall below minimum threshold." },
  { key: "expiring_stock", title: "Expiring Stock", desc: "Alerts for medications expiring within 30 days." },
  { key: "daily_summary",  title: "Daily Summary",  desc: "Receive a daily email with order and revenue summaries." },
];

function defaultNotifPreferences(): NotifPreferences {
  const obj: NotifPreferences = {};
  NOTIF_TYPES.forEach((n) => { obj[n.key] = { email: true, sms: n.key === "new_orders" }; });
  return obj;
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPreferences>(defaultNotifPreferences());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await pharmacyFetch("/api/pharmacy/me");
        if (res.ok) {
          const data = await res.json();
          if (data.pharmacy?.notificationPreferences) {
            setPrefs({ ...defaultNotifPreferences(), ...data.pharmacy.notificationPreferences });
          }
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (key: string, channel: "email" | "sms") => {
    setPrefs((prev) => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await pharmacyFetch("/api/pharmacy/notifications", {
        method: "PATCH",
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update preferences. Please try again.' });
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
      <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-6 border-b border-[#EBEEF5] pb-3">Notification Preferences</h2>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-[13px] font-medium flex items-center gap-3 ${message.type === 'success' ? 'bg-[#E2F8EB] text-[#179353] border border-[#179353]/20' : 'bg-[#FEE2E2] text-[#F25252] border border-[#FCA5A5]'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3 max-w-3xl">
        {NOTIF_TYPES.map((n) => {
          const p = prefs[n.key];
          return (
            <div key={n.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#EBEEF5] bg-white hover:border-gray-300 transition-colors shadow-sm">
              <div>
                <h3 className="font-semibold text-[#24292E] text-sm">{n.title}</h3>
                <p className="text-[13px] text-[#676E76] mt-1">{n.desc}</p>
              </div>
              <div className="flex items-center gap-6 shrink-0 mt-2 sm:mt-0">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => toggle(n.key, "email")}
                    className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${p.email ? 'bg-[#5476FC] border-[#5476FC] text-white' : 'border-[#EBEEF5] bg-[#F8FAFC] text-transparent group-hover:border-[#5476FC]/50'}`}
                  >
                    <CheckIcon />
                  </button>
                  <span className="text-[13px] font-medium text-[#383F45]">Email</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => toggle(n.key, "sms")}
                    className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${p.sms ? 'bg-[#5476FC] border-[#5476FC] text-white' : 'border-[#EBEEF5] bg-[#F8FAFC] text-transparent group-hover:border-[#5476FC]/50'}`}
                  >
                    <CheckIcon />
                  </button>
                  <span className="text-[13px] font-medium text-[#383F45]">SMS</span>
                </label>
              </div>
            </div>
          );
        })}

        <div className="pt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
            {saving ? 'Saving...' : 'Update Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2fa, setLoading2fa] = useState(true);
  const [toggling2fa, setToggling2fa] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await pharmacyFetch("/api/pharmacy/2fa/status");
        if (res.ok) {
          const data = await res.json();
          setTwoFactorEnabled(!!data.twoFactorEnabled);
        }
      } catch (err) {
        console.error("Failed to load 2FA status", err);
      } finally {
        setLoading2fa(false);
      }
    })();
  }, []);

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await pharmacyFetch("/api/pharmacy/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === "WRONG_PASSWORD" ? "Current password is incorrect." : "Failed to update password. Please try again.";
        setPasswordMessage({ type: 'error', text: msg });
        return;
      }
      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: 'Failed to update password. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggle2fa = async () => {
    const next = !twoFactorEnabled;
    setToggling2fa(true);
    try {
      const res = await pharmacyFetch(`/api/pharmacy/2fa/${next ? "enable" : "disable"}`, { method: "POST" });
      if (res.ok) setTwoFactorEnabled(next);
    } catch (err) {
      console.error("Failed to toggle 2FA", err);
    } finally {
      setToggling2fa(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-6 border-b border-[#EBEEF5] pb-3">Security & Password</h2>

      <div className="space-y-8 max-w-2xl">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-[#24292E]">Change Password</h3>

          {passwordMessage && (
            <div className={`p-4 rounded-xl text-[13px] font-medium flex items-center gap-3 ${passwordMessage.type === 'success' ? 'bg-[#E2F8EB] text-[#179353] border border-[#179353]/20' : 'bg-[#FEE2E2] text-[#F25252] border border-[#FCA5A5]'}`}>
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className={labelCls}>Current Password</label>
              <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>New Password</label>
              <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
            </div>
            <div className="pt-2">
              <button onClick={handleChangePassword} disabled={changingPassword} className="px-6 py-3 bg-[#24292E] hover:bg-[#1A1F24] text-white rounded-xl font-medium text-[13px] transition-colors w-full sm:w-auto shadow-sm disabled:opacity-60">
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#EBEEF5] pt-8">
          <div className="flex items-start justify-between gap-4 p-5 border border-[#EBEEF5] rounded-xl bg-[#F8FAFC]">
            <div>
              <h3 className="text-[15px] font-semibold text-[#24292E]">Two-Factor Authentication (2FA)</h3>
              <p className="text-[13px] text-[#676E76] mt-1">Add an extra layer of security to your account by requiring a verification code upon login.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                disabled={loading2fa || toggling2fa}
                onChange={handleToggle2fa}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#EBEEF5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5476FC] peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
