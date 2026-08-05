"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import ClinicSidebar from "@/components/ClinicSidebar";
import { apiFetch } from "@/lib/apiFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ClinicNotification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string; }

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  return `${Math.floor(hrs / 24)}d`;
}

function notificationIcon(type: string) {
  if (type === "fee_change_approved") {
    return (
      <div className="w-9 h-9 rounded-full shrink-0 bg-emerald-50 flex items-center justify-center text-emerald-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (type === "fee_change_rejected") {
    return (
      <div className="w-9 h-9 rounded-full shrink-0 bg-red-50 flex items-center justify-center text-red-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </div>
  );
}

function ClinicLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isOpen: sidebarOpen, setIsMobileOpen } = useSidebar();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [notifications, setNotifications] = useState<ClinicNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifTab, setNotifTab] = useState<"Unread" | "All">("Unread");
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = notifTab === "Unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/api/clinics/payments/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      console.error("Fetch clinic notifications error:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    try { await apiFetch(`/api/clinics/payments/notifications/${notifId}/read`, { method: "PATCH" }); } catch { /* best-effort */ }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(unread.map((n) => apiFetch(`/api/clinics/payments/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {})));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
        if (!res.ok) { if (!cancelled) router.replace("/auth/login"); return; }
        const data = await res.json();
        const roles: string[] = data.roles ?? [];
        if (cancelled) return;
        if (roles.includes("clinic") || roles.includes("clinic_pending")) {
          setAllowed(true);
        } else if (roles.includes("doctor")) {
          router.replace("/dashboard");
        } else {
          router.replace("/auth/login");
        }
      } catch {
        if (!cancelled) setAllowed(true); // fail open — backend still enforces requireRole on every call
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] font-outfit">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F9FC] overflow-hidden relative font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute"
          style={{ left: "-415px", bottom: "-563px", width: "1012px", height: "1012px", borderRadius: "50%", background: "radial-gradient(circle, rgba(131, 114, 235, 0.12) 0%, rgba(131, 114, 235, 0) 70%)" }}
        />
        <div
          className="absolute"
          style={{ right: "-422px", top: "-423px", width: "971px", height: "971px", borderRadius: "50%", background: "radial-gradient(circle, rgba(96, 156, 255, 0.12) 0%, rgba(96, 156, 255, 0) 70%)" }}
        />
      </div>

      <div className="z-50 h-full flex flex-col justify-between lg:z-10">
        <ClinicSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${sidebarOpen ? "px-6 xl:px-[24px]" : "px-6 lg:px-[40px]"}`}>
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-black focus:outline-none" 
              onClick={() => setIsMobileOpen(true)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8008cabf971217f2f64baa6799b253778c1ad571?width=182"
              className="w-[91px] h-[30px] object-contain"
              alt="Wellness Central"
            />
            <span className="text-[0.68rem] font-semibold tracking-[0.15em] text-[#5476FC] uppercase pl-3 border-l border-indigo-100">
              Clinic
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown((v) => !v)}
                className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all relative"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-[#E84949] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <>
                  <div className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200" aria-hidden="true" onClick={() => setShowNotifDropdown(false)} />
                  <div className="absolute right-0 top-14 bg-white border border-[#EBEEF5] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[380px] p-6 z-50 text-left animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[17px] font-black text-[#24292E]">Notifications</h3>
                      <button onClick={() => setShowNotifDropdown(false)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 mb-4 px-1">
                      <div className="flex items-center gap-6">
                        {(["Unread", "All"] as const).map((tab) => (
                          <button key={tab} onClick={() => setNotifTab(tab)} className={`pb-3 text-[13px] font-bold transition-colors relative ${notifTab === tab ? "text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>
                            {tab}
                            {notifTab === tab && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#5476FC] rounded-t-full" />}
                          </button>
                        ))}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllAsRead} className="text-[11px] font-bold text-[#5476FC] hover:text-[#3d5fe0] transition mb-3">Mark all read</button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {visibleNotifications.length === 0 ? (
                        <p className="text-center text-[12px] text-slate-400 font-medium py-8">
                          {notifTab === "Unread" ? "You're all caught up." : "No notifications yet."}
                        </p>
                      ) : (
                        visibleNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleMarkAsRead(notif.id)}
                            className={`p-4 rounded-[1.25rem] border shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-colors cursor-pointer ${notif.isRead ? "bg-white border-slate-50" : "bg-[#5476FC]/5 border-[#5476FC]/10"}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3">
                                {notificationIcon(notif.type)}
                                <p className="text-[12px] font-bold text-[#24292E] leading-tight">{notif.title}</p>
                              </div>
                              <span className="text-[11px] font-bold text-[#9EA5AD] whitespace-nowrap mt-1 shrink-0">{timeAgo(notif.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-[#676E76] leading-relaxed font-medium line-clamp-2">{notif.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.465L3 21l1.554-3.887A7.964 7.964 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative scroll-smooth [-webkit-overflow-scrolling:touch]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ClinicLayoutContent>{children}</ClinicLayoutContent>
    </SidebarProvider>
  );
}
