"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

type NotificationType =
  | "doctor_approval"
  | "pharmacy_approval"
  | "product_approval"
  | "support_ticket"
  | "support_reply"
  | "slot_change"
  | "sos_emergency"
  | "low_rating";

interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function notificationAvatar(type: NotificationType) {
  if (type === "support_ticket" || type === "support_reply") {
    return (
      <div className="w-9 h-9 rounded-full shrink-0 bg-rose-50 flex items-center justify-center text-rose-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  if (type === "sos_emergency") {
    return (
      <div className="w-9 h-9 rounded-full shrink-0 bg-red-50 flex items-center justify-center text-red-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    );
  }
  if (type === "low_rating") {
    return (
      <div className="w-9 h-9 rounded-full shrink-0 bg-amber-50 flex items-center justify-center text-amber-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full shrink-0 bg-blue-50 flex items-center justify-center text-blue-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

export default function TopBar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<"Unread" | "All">("Unread");
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await adminFetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // leave list as-is — dropdown shows whatever was last loaded
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (showNotifications) fetchNotifications();
  }, [showNotifications, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = activeTab === "Unread" ? notifications.filter((n) => !n.isRead) : notifications;

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await adminFetch(`/api/admin/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // optimistic update already applied — next fetch will reconcile if it failed
    }
  }

  function handleNotificationClick(n: AdminNotification) {
    if (!n.isRead) markAsRead(n.id);
    setShowNotifications(false);
    router.push(n.link);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-8 shrink-0 z-40 w-full relative">

      {/* Left: Logo */}
      <div className="flex items-center w-[200px]">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/8008cabf971217f2f64baa6799b253778c1ad571?width=182"
          className="w-[100px] object-contain"
          alt="Wellness Central"
        />
      </div>

      {/* Middle: Pill Search Input */}
      <div className="flex-1 max-w-lg mx-auto relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="topbar-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Anything with AI"
          className="w-full pl-12 pr-5 py-2.5 text-sm bg-[#eef2f7] border-none rounded-full placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-700 font-medium transition-all"
        />
      </div>

      {/* Right: Action Buttons and Notification icons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/emergencies")}
          className="bg-gradient-to-b from-[#FF6B6B] to-[#E84949] hover:from-[#FF7A7A] hover:to-[#D63D3D] text-white px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2.5 shadow-[0_4px_10px_rgba(232,73,73,0.2)] transition-all active:scale-95 select-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          SOS Records
        </button>

        {/* Notification Bell Wrapper */}
        <div className="relative" ref={notificationsRef}>
          <button
            id="topbar-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center transition-all active:scale-95 shadow-sm ${
              showNotifications ? "text-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown & Overlay */}
          {showNotifications && (
            <>
              {/* Dark Overlay */}
              <div
                className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200"
                aria-hidden="true"
              />

              {/* Dropdown Panel */}
              <div className="absolute top-full mt-3 right-0 w-[380px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 p-6 animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[17px] font-black text-slate-800">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 mb-4 px-1">
                  <div className="flex items-center gap-6">
                    {(["Unread", "All"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-[13px] font-bold transition-colors relative ${
                          activeTab === tab ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#6A8BFF] rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                        try { await adminFetch("/api/admin/notifications/read-all", { method: "PATCH" }); } catch {}
                      }}
                      className="text-[11px] font-bold text-[#6A8BFF] hover:text-[#4f6fe0] transition mb-3"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {notifLoading && notifications.length === 0 ? (
                    <p className="text-center text-[12px] text-slate-400 font-medium py-8">Loading notifications…</p>
                  ) : visibleNotifications.length === 0 ? (
                    <p className="text-center text-[12px] text-slate-400 font-medium py-8">
                      {activeTab === "Unread" ? "You're all caught up." : "No notifications yet."}
                    </p>
                  ) : (
                    visibleNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-4 rounded-[1.25rem] border shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-100 transition-colors cursor-pointer ${
                          n.isRead ? "bg-white border-slate-50" : "bg-blue-50/40 border-blue-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            {notificationAvatar(n.type)}
                            <div className="leading-tight">
                              <p className="text-[12px] font-medium text-slate-500">
                                {n.title}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap mt-1">{timeAgo(n.createdAt)}</span>
                            {!n.isRead && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                title="Mark as read"
                                className="w-4 h-4 rounded-full bg-[#6A8BFF] hover:bg-[#4f6fe0] transition shrink-0 mt-1"
                              />
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                          {n.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Message / Chat Bubble */}
        <button
          id="topbar-messages"
          className="w-10 h-10 rounded-full border border-slate-200/60 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm relative transition-all active:scale-95"
          aria-label="Messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

