"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// ─── ClinicSearch ──────────────────────────────────────────────────────────────

interface ClinicSearchResult {
  type: "doctor" | "patient" | "appointment";
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  date?: string;
  avatarUrl?: string | null;
  href: string;
}

interface ClinicSearchResults {
  doctors: ClinicSearchResult[];
  patients: ClinicSearchResult[];
  appointments: ClinicSearchResult[];
}

const TYPE_COLORS: Record<string, string> = {
  doctor:      "bg-[#5476FC]/10 text-[#5476FC]",
  patient:     "bg-purple-50 text-purple-600",
  appointment: "bg-amber-50 text-amber-600",
};
const TYPE_LABELS: Record<string, string> = {
  doctor: "Doctor", patient: "Patient", appointment: "Appt",
};

function SearchResultAvatar({ item }: { item: ClinicSearchResult }) {
  if (item.avatarUrl) {
    return <img src={item.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />;
  }
  const initials = item.title.slice(0, 2).toUpperCase();
  const cls = TYPE_COLORS[item.type] ?? "bg-slate-100 text-slate-500";
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${cls}`}>
      {initials}
    </div>
  );
}

function SearchTypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${cls}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

function ClinicSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClinicSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const totalResults = results
    ? results.doctors.length + results.patients.length + results.appointments.length
    : 0;

  useEffect(() => {
    if (searchExpanded) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchExpanded]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults(null); setLoading(false); return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/clinics/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) { const data = await res.json(); setResults(data); setDropdownOpen(true); }
      } catch { /* silent */ } finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        if (!query) setSearchExpanded(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query]);

  function handleNavigate(href: string) {
    setDropdownOpen(false); setQuery(""); setResults(null); setSearchExpanded(false);
    router.push(href);
  }

  function handleClose() {
    setDropdownOpen(false); setQuery(""); setResults(null); setSearchExpanded(false);
  }

  const showDropdown = dropdownOpen && query.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="flex items-center justify-end relative">
      {/* Animated expanding search bar */}
      <div
        className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out rounded-full ${
          searchExpanded
            ? "w-[300px] ring-2 ring-[#5476FC]/20 bg-white shadow-sm border border-[#EBEEF5]"
            : "w-0 opacity-0 pointer-events-none border-transparent"
        }`}
      >
        <div className="pl-4 pr-1 flex items-center shrink-0">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#9EA5AD" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.2504 12.2504L9.71289 9.71289" stroke="#9EA5AD" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          id="clinic-search"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
          onFocus={() => { if (results && totalResults > 0) setDropdownOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
          placeholder="Search doctors, patients, appointments…"
          className="flex-1 py-2.5 pr-2 text-xs bg-transparent border-none placeholder-[rgba(61,75,90,0.5)] focus:outline-none text-[#3D4B5A] font-medium min-w-0"
        />

        <button
          onClick={handleClose}
          className="pr-3 pl-1 flex items-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Close search"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Search icon button (collapsed state) */}
      <button
        id="clinic-search-btn"
        onClick={() => setSearchExpanded(true)}
        aria-label="Open search"
        className={`w-12 h-12 bg-white hover:bg-[#5476FC]/5 rounded-full flex items-center justify-center text-[#3D4B5A] hover:text-[#5476FC] border border-[#EBEEF5] transition-all ${
          searchExpanded ? "opacity-0 pointer-events-none w-0 overflow-hidden" : "opacity-100"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-[380px] bg-white rounded-2xl border border-[#EBEEF5] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[9999] overflow-hidden">
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
              <p className="text-[10px] text-[#C4C9D0] mt-1">Try a doctor name, patient, or appointment reason</p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto divide-y divide-[#F4F5F7]">

              {/* Doctors */}
              {results.doctors.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Doctors</p>
                  {results.doctors.map((item) => (
                    <button key={item.id} onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group">
                      <SearchResultAvatar item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-[#5476FC] transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <SearchTypeBadge type={item.type} />
                    </button>
                  ))}
                </div>
              )}

              {/* Patients */}
              {results.patients.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Patients</p>
                  {results.patients.map((item) => (
                    <button key={item.id} onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group">
                      <SearchResultAvatar item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-purple-600 transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <SearchTypeBadge type={item.type} />
                    </button>
                  ))}
                </div>
              )}

              {/* Appointments */}
              {results.appointments.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[9px] font-bold text-[#9EA5AD] uppercase tracking-widest">Appointments</p>
                  {results.appointments.map((item) => (
                    <button key={item.id} onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left group">
                      <SearchResultAvatar item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#24292E] truncate group-hover:text-amber-500 transition-colors">{item.title}</p>
                        <p className="text-[10px] text-[#9EA5AD] truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <SearchTypeBadge type={item.type} />
                        {item.date && <span className="text-[9px] text-[#C4C9D0]">{fmtDate(item.date)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

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

// ─── ClinicLayoutContent ───────────────────────────────────────────────────────

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

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const fetchChatUnread = useCallback(async () => {
    try {
      const res = await apiFetch("/api/clinic-messages/conversations");
      if (res.ok) {
        const data = await res.json();
        const total = (data.conversations ?? []).reduce((sum: number, c: any) => sum + (c.unreadCount ?? 0), 0);
        setChatUnreadCount(total);
      }
    } catch (err) {
      console.error("Fetch clinic chat unread count error:", err);
    }
  }, []);

  useEffect(() => {
    fetchChatUnread();
    const id = setInterval(fetchChatUnread, 15_000);
    return () => clearInterval(id);
  }, [fetchChatUnread]);

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

    const checkAuth = async () => {
      if (!cancelled) setAllowed(null);
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
        // A failed request here (network blip or a genuinely dead session)
        // must not grant access — the previous "fail open" fallback let a
        // logged-out user through on the assumption that per-call
        // requireRole() would catch it, but that only protects individual
        // API calls, not the page shell itself.
        if (!cancelled) router.replace("/auth/login");
      }
    };

    checkAuth();

    // A bfcache restore (browser Back/Forward) fires `pageshow` with
    // persisted:true without rerunning this effect — revalidate against the
    // backend again so a stale allowed=true from before isn't trusted.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) checkAuth();
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] font-outfit">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F9FC] overflow-x-hidden relative font-sans">
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

      {/* On tablet+, this div participates in flex layout. On mobile, it renders as zero-height since the aside inside is position:fixed and covers the full viewport */}
      <div className="shrink-0 md:z-10">
        <ClinicSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${sidebarOpen ? "px-6 xl:px-[24px]" : "px-6 lg:px-[40px]"}`}>
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2 text-gray-600 hover:text-black focus:outline-none"
              onClick={() => setIsMobileOpen(true)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8008cabf971217f2f64baa6799b253778c1ad571?width=182"
              className="w-[91px] h-[30px] object-contain hidden sm:block"
              alt="Wellness Central"
            />
            <span className="hidden sm:inline-block text-[0.68rem] font-semibold tracking-[0.15em] text-[#5476FC] uppercase pl-3 border-l border-indigo-100">
              Clinic
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Collapsible Global Search */}
            <ClinicSearch />

            {/* Notification Bell */}
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
                  <div className="absolute right-0 top-14 bg-white border border-[#EBEEF5] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[380px] max-w-[calc(100vw-1.5rem)] p-6 z-50 text-left animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
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

            {/* Chat */}
            <button
              onClick={() => router.push("/clinic/messages")}
              className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all relative"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.465L3 21l1.554-3.887A7.964 7.964 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {chatUnreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-[#E84949] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                </span>
              )}
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
