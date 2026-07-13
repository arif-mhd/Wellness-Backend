"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import ChatBox from "@/components/ChatBox";

export default function SharedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ── Search result types ────────────────────────────────────────────────────

interface SearchResult {
  type: "patient" | "appointment" | "prescription";
  id: string;
  title: string;
  subtitle: string;
  date?: string;
  status?: string;
  avatarUrl?: string | null;
  href: string;
}

interface SearchResults {
  patients: SearchResult[];
  appointments: SearchResult[];
  prescriptions: SearchResult[];
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function ResultAvatar({ item }: { item: SearchResult }) {
  const initials = item.title.slice(0, 1).toUpperCase();
  const colors: Record<string, string> = {
    patient: "bg-[#5476FC]/10 text-[#5476FC]",
    appointment: "bg-amber-50 text-amber-500",
    prescription: "bg-emerald-50 text-emerald-500",
  };
  if (item.avatarUrl) {
    return <img src={item.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />;
  }
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colors[item.type]}`}>
      {initials}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    patient:      { label: "Patient",      cls: "bg-[#5476FC]/10 text-[#5476FC]" },
    appointment:  { label: "Appointment",  cls: "bg-amber-50 text-amber-600" },
    prescription: { label: "Prescription", cls: "bg-emerald-50 text-emerald-600" },
  };
  const { label, cls } = map[type] ?? { label: type, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>
  );
}

// ── GlobalSearch component ────────────────────────────────────────────────────

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const totalResults = results
    ? results.patients.length + results.appointments.length + results.prescriptions.length
    : 0;

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/doctors/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Click outside closes dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleNavigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="flex-1 max-w-[605px] mx-8 relative">
      {/* Input */}
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.2504 12.2504L9.71289 9.71289" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (results && totalResults > 0) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); setResults(null); } }}
        placeholder="Search patients, appointments, prescriptions…"
        className="w-full bg-[rgba(0,0,0,0.03)] text-[#3D4B5A] placeholder-[rgba(61,75,90,0.6)] text-xs rounded-full pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#5476FC]/20 focus:bg-white transition-all border border-transparent"
      />

      {/* Clear button */}
      {query && (
        <button
          onClick={() => { setQuery(""); setResults(null); setOpen(false); }}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[9999] overflow-hidden">
          {/* Loading skeleton while API is in-flight */}
          {loading && !results ? (
            <div className="px-5 py-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
                    <div className="h-2 bg-gray-100 rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !results || totalResults === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-semibold text-[#9EA5AD]">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-[10px] text-[#C4C9D0] mt-1">Try a patient name, appointment reason, or medicine name</p>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-[#F4F5F7]">

              {/* Patients */}
              {results.patients.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Patients</p>
                  {results.patients.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group"
                    >
                      <ResultAvatar item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-[#5476FC] transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <TypeBadge type={item.type} />
                    </button>
                  ))}
                </div>
              )}

              {/* Appointments */}
              {results.appointments.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Appointments</p>
                  {results.appointments.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group"
                    >
                      <ResultAvatar item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-amber-500 transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <TypeBadge type={item.type} />
                        {item.date && <span className="text-[9px] text-[#C4C9D0]">{fmtDate(item.date)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Prescriptions */}
              {results!.prescriptions.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Prescriptions</p>
                  {results!.prescriptions.map((item) => (
                    <button
                      key={`rx-${item.id}`}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                          <rect x="9" y="3" width="6" height="4" rx="1" />
                          <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-emerald-500 transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <TypeBadge type={item.type} />
                        {item.date && <span className="text-[9px] text-[#C4C9D0]">{fmtDate(item.date)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Footer hint */}
              <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#EBEEF5]">
                <p className="text-[9px] text-[#C4C9D0] text-center">
                  {totalResults} result{totalResults !== 1 ? "s" : ""} · press <kbd className="bg-white border border-[#EBEEF5] px-1 rounded text-[8px]">Esc</kbd> to close
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── DashboardLayoutContent ────────────────────────────────────────────────────

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isOpen: sidebarOpen } = useSidebar();
  const pathname = usePathname();
  const isVideoCall = pathname === "/video-calls";

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifTab, setNotifTab] = useState<"Unread" | "All">("Unread");
  const [notifLoading, setNotifLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [showChat, setShowChat] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);

  const fetchWaitingCount = useCallback(async () => {
    try {
      const res = await apiFetch("/api/appointments/doctor");
      if (!res.ok) return;
      const { appointments } = await res.json();
      const count = (appointments ?? []).filter(
        (a: any) => a.patientWaitingSince && a.status !== "completed" && a.status !== "cancelled"
      ).length;
      setWaitingCount(count);
    } catch (err) {
      console.error("Fetch waiting count error:", err);
    }
  }, []);

  useEffect(() => {
    fetchWaitingCount();
    const id = setInterval(fetchWaitingCount, 10_000);
    return () => clearInterval(id);
  }, [fetchWaitingCount]);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await apiFetch("/api/doctors/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 10_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    try {
      await apiFetch(`/api/doctors/notifications/${notifId}/read`, { method: "PATCH" });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await apiFetch("/api/doctors/notifications/read-all", { method: "PATCH" });
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  function handleNotificationClick(notif: any) {
    if (!notif.isRead) handleMarkAsRead(notif.id);
    setShowDropdown(false);
    if (notif.link) router.push(notif.link);
  }

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
    if (type === "new_message") {
      return (
        <div className="w-9 h-9 rounded-full shrink-0 bg-blue-50 flex items-center justify-center text-blue-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    if (type === "patient_waiting") {
      return (
        <div className="w-9 h-9 rounded-full shrink-0 bg-amber-50 flex items-center justify-center text-amber-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    if (type === "appointment_booked") {
      return (
        <div className="w-9 h-9 rounded-full shrink-0 bg-emerald-50 flex items-center justify-center text-emerald-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    if (type === "support_reply") {
      return (
        <div className="w-9 h-9 rounded-full shrink-0 bg-rose-50 flex items-center justify-center text-rose-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    if (type === "doctor_approved" || type === "slots_verified") {
      return (
        <div className="w-9 h-9 rounded-full shrink-0 bg-emerald-50 flex items-center justify-center text-emerald-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (type === "doctor_rejected") {
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

  const visibleNotifications = notifTab === "Unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="flex h-screen bg-[#F7F9FC] overflow-hidden relative font-sans">
      {/* Decorative Blur Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute"
          style={{
            left: "-415px", bottom: "-563px", width: "1012px", height: "1012px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(131, 114, 235, 0.12) 0%, rgba(131, 114, 235, 0) 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            right: "-422px", top: "-423px", width: "971px", height: "971px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96, 156, 255, 0.12) 0%, rgba(96, 156, 255, 0) 70%)",
          }}
        />
      </div>

      {/* Sidebar */}
      {!isVideoCall && (
        <div className="z-10 h-full flex flex-col justify-between">
          <Sidebar />
        </div>
      )}

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${
          isVideoCall ? "px-10 lg:px-[40px]" : sidebarOpen ? "px-6 xl:px-[24px]" : "px-10 lg:px-[40px]"
        }`}>
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8008cabf971217f2f64baa6799b253778c1ad571?width=182"
              className="w-[91px] h-[30px] object-contain"
              alt="Wellness Central"
            />
          </div>

          {/* ── Global Search Bar ── */}
          <GlobalSearch />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* SOS Records */}
            <button
              onClick={() => router.push("/dashboard/sos")}
              className="h-[48px] bg-gradient-to-b from-[#FF6B6B] to-[#E84949] hover:from-[#FF7A7A] hover:to-[#D63D3D] text-white px-5 rounded-xl text-[13px] font-medium flex items-center gap-2.5 shadow-[0_4px_10px_rgba(232,73,73,0.2)] transition-all active:scale-95 select-none"
            >
              <svg width="19" height="17" viewBox="0 0 19 17" fill="none">
                <path d="M16.0443 2.584e-07C16.9558 0.871834 17.6763 1.89775 18.2058 3.07775C18.7353 4.25792 19 5.52917 19 6.8915C19 8.20617 18.7507 9.44158 18.252 10.5978C17.7533 11.7539 17.0766 12.7596 16.2218 13.6148C15.3669 14.4699 14.3617 15.147 13.206 15.646C12.0503 16.1448 10.8156 16.3943 9.50175 16.3943C8.18775 16.3943 6.95267 16.1448 5.7965 15.646C4.64033 15.1472 3.63467 14.4702 2.7795 13.615C1.92433 12.7598 1.24725 11.7543 0.74825 10.5983C0.249417 9.44225 7.17486e-07 8.20709 6.02583e-07 6.89275C4.83528e-07 5.53092 0.26475 4.25708 0.794251 3.07125C1.32375 1.88525 2.04425 0.861501 2.95575 1.40263e-06L4 1.05375C3.23333 1.78592 2.625 2.65533 2.175 3.662C1.725 4.66867 1.5 5.74609 1.5 6.89425C1.5 9.12759 2.275 11.0193 3.825 12.5693C5.375 14.1193 7.26667 14.8943 9.5 14.8943C11.7333 14.8943 13.625 14.1193 15.175 12.5693C16.725 11.0193 17.5 9.12758 17.5 6.89425C17.5 5.74425 17.275 4.66925 16.825 3.66925C16.375 2.66925 15.7583 1.80258 14.975 1.06925L16.0443 2.584e-07ZM13.2192 2.825C13.7641 3.33017 14.1971 3.9315 14.5183 4.629C14.8394 5.32667 15 6.08175 15 6.89425C15 8.42208 14.4655 9.72067 13.3965 10.79C12.3275 11.8595 11.0294 12.3943 9.50225 12.3943C7.97508 12.3943 6.67625 11.8592 5.60575 10.789C4.53525 9.71883 4 8.41934 4 6.8905C4 6.08017 4.16058 5.32375 4.48175 4.62125C4.80292 3.91859 5.23592 3.31983 5.78075 2.825L6.85 3.89425C6.43333 4.27759 6.10417 4.72759 5.8625 5.24425C5.62083 5.76092 5.5 6.31092 5.5 6.89425C5.5 7.99425 5.89167 8.93592 6.675 9.71925C7.45833 10.5026 8.4 10.8943 9.5 10.8943C10.6 10.8943 11.5417 10.5026 12.325 9.71925C13.1083 8.93592 13.5 7.99425 13.5 6.89425C13.5 6.29425 13.3792 5.74008 13.1375 5.23175C12.8958 4.72342 12.5667 4.27758 12.15 3.89425L13.2192 2.825ZM9.5 5.39425C9.909 5.39425 10.2613 5.542 10.5567 5.8375C10.8522 6.133 11 6.48525 11 6.89425C11 7.30325 10.8522 7.6555 10.5568 7.951C10.2613 8.2465 9.909 8.39425 9.5 8.39425C9.091 8.39425 8.73875 8.2465 8.44325 7.951C8.14775 7.6555 8 7.30325 8 6.89425C8 6.48525 8.14775 6.133 8.44325 5.8375C8.73875 5.542 9.091 5.39425 9.5 5.39425Z" fill="white" />
              </svg>
              <span>SOS Records</span>
            </button>

            {/* Waiting Room */}
            <button
              onClick={() => router.push("/appointments/waitingroom")}
              className="h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-5 rounded-xl text-[13px] font-bold flex items-center gap-2.5 shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] transition-all select-none"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M12.0398 10.8189C11.3984 10.8189 10.8525 10.5844 10.4021 10.1155C9.95171 9.64665 9.72651 9.07735 9.72651 8.40763C9.72651 7.73791 9.95104 7.168 10.4001 6.69788C10.8492 6.22762 11.3944 5.99249 12.0358 5.99249C12.6772 5.99249 13.2232 6.22685 13.6735 6.69558C14.1238 7.16446 14.3489 7.73376 14.3489 8.40348C14.3489 9.0732 14.1244 9.64319 13.6755 10.1135C13.2265 10.5837 12.6812 10.8189 12.0398 10.8189ZM7.07542 16V14.6019C7.07542 14.34 7.13632 14.0906 7.25812 13.8536C7.37993 13.6166 7.5479 13.4284 7.76205 13.2889C8.40214 12.8972 9.07765 12.6006 9.78859 12.399C10.4997 12.1972 11.2494 12.0963 12.0378 12.0963C12.8262 12.0963 13.5759 12.1972 14.2868 12.399C14.9978 12.6006 15.6733 12.8972 16.3136 13.2889C16.5276 13.4284 16.6955 13.6166 16.8173 13.8536C16.9391 14.0906 17 14.34 17 14.6019V16H7.07542ZM8.48249 14.4741V14.616H15.5929V14.4741C15.0434 14.1487 14.4687 13.9017 13.8688 13.7332C13.269 13.5646 12.6586 13.4804 12.0378 13.4804C11.4169 13.4804 10.8065 13.5646 10.2066 13.7332C9.6067 13.9017 9.032 14.1487 8.48249 14.4741ZM12.0378 9.43482C12.3109 9.43482 12.5434 9.33455 12.7353 9.13402C12.9273 8.93349 13.0234 8.69067 13.0234 8.40556C13.0234 8.12044 12.9273 7.8777 12.7353 7.67732C12.5434 7.47679 12.3109 7.37652 12.0378 7.37652C11.7648 7.37652 11.5322 7.47679 11.3401 7.67732C11.1481 7.8777 11.0521 8.12044 11.0521 8.40556C11.0521 8.69067 11.1481 8.93349 11.3401 9.13402C11.5322 9.33455 11.7648 9.43482 12.0378 9.43482ZM1 10.7656V9.38153H7.62773V10.7656H1ZM1 3.38404V2H11.1625V3.38404H1ZM8.03047 7.0748H1V5.69077H8.68154C8.5263 5.89299 8.39596 6.10798 8.2905 6.33573C8.18519 6.56348 8.09852 6.80984 8.03047 7.0748Z" fill="#E8EAED" />
              </svg>
              <span>Waiting Room{waitingCount > 0 ? ` (${waitingCount})` : ""}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all relative"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.1497 11.9833C16.3137 12.1475 16.4437 12.3425 16.5324 12.5569C16.621 12.7714 16.6665 13.0013 16.6663 13.2333C16.6663 13.7019 16.4802 14.1512 16.1489 14.4826C15.8176 14.8139 15.3682 15 14.8997 15H5.09967C4.63113 15 4.18177 14.8139 3.85045 14.4826C3.51914 14.1512 3.33301 13.7019 3.33301 13.2333C3.3328 13.0013 3.37833 12.7714 3.46698 12.5569C3.55563 12.3425 3.68567 12.1475 3.84968 11.9833L4.99968 10.8333V7.5C4.99968 6.17392 5.52646 4.90215 6.46414 3.96447C7.40182 3.02678 8.67359 2.5 9.99968 2.5C11.3258 2.5 12.5975 3.02678 13.5352 3.96447C14.4729 4.90215 14.9997 6.17392 14.9997 7.5V10.8333L16.1497 11.9833ZM12.4997 15H7.49968C7.49968 15.663 7.76307 16.2989 8.23191 16.7678C8.70075 17.2366 9.33663 17.5 9.99968 17.5C10.6627 17.5 11.2986 17.2366 11.7674 16.7678C12.2363 16.2989 12.4997 15.663 12.4997 15Z" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-[#E84949] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in duration-200"
                    aria-hidden="true"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 top-14 bg-white border border-[#EBEEF5] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[380px] p-6 z-50 text-left animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[17px] font-black text-[#24292E]">Notifications</h3>
                      <button
                        onClick={() => setShowDropdown(false)}
                        className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 mb-4 px-1">
                      <div className="flex items-center gap-6">
                        {(["Unread", "All"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setNotifTab(tab)}
                            className={`pb-3 text-[13px] font-bold transition-colors relative ${
                              notifTab === tab ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            {tab}
                            {notifTab === tab && (
                              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#5476FC] rounded-t-full" />
                            )}
                          </button>
                        ))}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] font-bold text-[#5476FC] hover:text-[#3d5fe0] transition mb-3"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {notifLoading && notifications.length === 0 ? (
                        <p className="text-center text-[12px] text-slate-400 font-medium py-8">Loading notifications…</p>
                      ) : visibleNotifications.length === 0 ? (
                        <p className="text-center text-[12px] text-slate-400 font-medium py-8">
                          {notifTab === "Unread" ? "You're all caught up." : "No notifications yet."}
                        </p>
                      ) : (
                        visibleNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 rounded-[1.25rem] border shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-colors cursor-pointer ${
                              notif.isRead ? "bg-white border-slate-50" : "bg-[#5476FC]/5 border-[#5476FC]/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3">
                                {notificationIcon(notif.type)}
                                <p className="text-[12px] font-bold text-[#24292E] leading-tight">{notif.title}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-[#9EA5AD] whitespace-nowrap mt-1">{timeAgo(notif.createdAt)}</span>
                                {!notif.isRead && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                    title="Mark as read"
                                    className="w-4 h-4 rounded-full bg-[#5476FC] hover:bg-[#3d5fe0] transition shrink-0 mt-1"
                                  />
                                )}
                              </div>
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

            {/* Chat */}
            <div className="relative">
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15.675 13.525L16.6667 17.5L12.5417 15.4333C11.7208 15.6996 10.863 15.8346 10 15.8333C5.83333 15.8333 2.5 12.85 2.5 9.16667C2.5 5.48333 5.83333 2.5 10 2.5C14.1667 2.5 17.5 5.48333 17.5 9.16667C17.4863 10.8025 16.831 12.3675 15.675 13.525Z" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.95801 9.16675H10.0413" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.58301 9.16675H6.66634" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.333 9.16675H13.4163" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showChat && <ChatBox onClose={() => setShowChat(false)} />}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative scroll-smooth [-webkit-overflow-scrolling:touch]">
          {children}
        </main>
      </div>
    </div>
  );
}
