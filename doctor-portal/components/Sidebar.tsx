"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "./SidebarContext";
import { signOut } from "supertokens-web-js/recipe/session";
import { apiFetch } from "@/lib/apiFetch";

// ─── Icons (memoised, never recreated) ───────────────────────────────────────
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6L8 1.333 14 6v7.333c0 .737-.597 1.334-1.333 1.334H3.333A1.333 1.333 0 0 1 2 13.333V6Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 14.667V8h4v6.667" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ApptIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.333 4.667H2.666A1.333 1.333 0 0 0 1.333 6v6.667A1.333 1.333 0 0 0 2.667 14h10.666A1.333 1.333 0 0 0 14.667 12.667V6a1.333 1.333 0 0 0-1.334-1.333Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.667 14V3.333A1.333 1.333 0 0 0 9.333 2H6.667A1.333 1.333 0 0 0 5.333 3.333V14" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PatientsIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.334 14v-1.333a2.667 2.667 0 0 0-2.667-2.667H5.334a2.667 2.667 0 0 0-2.667 2.667V14" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 7.333A2.667 2.667 0 1 0 8 2a2.667 2.667 0 0 0 0 5.333Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AnalyticsIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14.14 10.593a6.667 6.667 0 1 1-8.807-8.807" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.667 8A6.667 6.667 0 0 0 8 1.333V8h6.667Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TasksIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.143 3.5h2.143c.394 0 .714.32.714.733v9.534a.714.714 0 0 1-.714.733H3.714A.714.714 0 0 1 3 13.767V4.233c0-.413.32-.733.714-.733h2.143" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 11.5h4M10 8.643H6m3.333-5.714a1.333 1.333 0 1 0-2.666 0c-.177 0-.32.143-.32.32v1.429H10V3.25a.32.32 0 0 0-.667-.321Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ScheduleIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M12.667 2.667H3.333A1.333 1.333 0 0 0 2 4v9.333a1.333 1.333 0 0 0 1.333 1.334h9.334A1.333 1.333 0 0 0 14 13.333V4a1.333 1.333 0 0 0-1.333-1.333Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.667 1.333V4M5.334 1.333V4M2 6.667h12" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MessagesIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14 7.667a5.333 5.333 0 0 1-5.667 5.333 5.6 5.6 0 0 1-2.533-.467L2 14l1.267-3.8A5.333 5.333 0 1 1 14 7.667Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PaymentIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M12.667 2.667H3.333A1.333 1.333 0 0 0 2 4a1.333 1.333 0 0 0 1.333 1.333H14" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 5.333v7.334a.667.667 0 0 1-.667.666H2.667A.667.667 0 0 1 2 12.667V4a1.333 1.333 0 0 0 1.333 1.333H14Zm0 5.334h-3.333a.667.667 0 0 1-.667-.667v-1.333a.667.667 0 0 1 .667-.667H14v2.667Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const HelpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.667" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2.667" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.287 3.287 6.114 6.113M9.887 9.887l2.826 2.826M9.887 6.113l2.353-2.353M3.287 12.713l2.827-2.826" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);
const HamburgerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1.75" y="1.75" width="14.5" height="14.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 1.75v14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/appointments", label: "Appointments", Icon: ApptIcon },
  { href: "/dashboard/patients", label: "Patients", Icon: PatientsIcon },
  { href: "/dashboard/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/dashboard/prescriptions", label: "Tasks", Icon: TasksIcon },
  { href: "/dashboard/schedule", label: "Schedule", Icon: ScheduleIcon },
  { href: "/dashboard/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/dashboard/wallet", label: "Payment", Icon: PaymentIcon },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen: open, setIsOpen: setOpen } = useSidebar();
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorAvatar, setDoctorAvatar] = useState("");

  // Single toggle — no setTimeout, no stacked delays
  const toggle = () => setOpen(!open);

  useEffect(() => {
    apiFetch("/api/doctors/me")
      .then(r => r.json())
      .then(data => {
        const d = data.doctor ?? {};
        setDoctorName(d.fullName ?? "");
        setDoctorEmail(d.email ?? "");
        setDoctorAvatar(d.avatarUrl ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    try { await signOut(); } catch { /* ignore */ }
    router.replace("/auth/login");
  }

  // Labels are shown/hidden purely from open — no extra state
  const labelCls = open
    ? "opacity-100 max-w-[160px] ml-3"
    : "opacity-0 max-w-0 ml-0 pointer-events-none";

  return (
    /**
     * KEY PERF FIX:
     *  • Single <aside> element — NEVER unmounted.
     *  • Width driven by transition-[width] on the element itself.
     *    The browser compositor handles this on the GPU thread.
     *  • overflow-hidden prevents content from bleeding during the slide.
     *  • will-change:width hints the GPU to keep this layer promoted.
     */
    <aside
      style={{ willChange: "width" }}
      className={[
        "relative z-10 h-full shrink-0 flex flex-col justify-between",
        "bg-[#F5F7FB] border-r border-[#EBEEF5] overflow-hidden select-none",
        "transition-[width] duration-300 ease-in-out",
        open ? "w-[255px]" : "w-[80px]",
      ].join(" ")}
    >
      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 w-full">

        {/* Header row: logo + toggle */}
        <div className="relative flex items-center h-[72px] px-5 w-full">
          {/* Logo — stays in DOM, fades out */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/b5efd6d155e1cbbdc3835258b3a2f9b4c50ee598?width=158"
            alt="Wellness Central"
            className={`object-contain h-[27px] transition-[max-width,opacity] duration-300 ease-in-out ${open ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0 pointer-events-none"
              }`}
          />
          {/* Toggle button — always visible */}
          <button
            onClick={toggle}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#3D4B5A] hover:bg-gray-50 hover:text-[#5476FC] transition-colors shrink-0 z-20"
          >
            {open ? <CollapseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        {/* Nav links */}
        <nav className={`flex flex-col gap-1 w-full ${open ? "px-4" : "px-3"}`}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={open ? undefined : label}
                className={[
                  "flex items-center py-3 transition-[background,box-shadow,padding] duration-150 rounded-[92px] overflow-hidden",
                  open ? "px-4" : "px-3 justify-center",
                  active
                    ? "bg-gradient-to-r from-[#869DFE] to-[#5879FC] text-white shadow-[0_4px_12px_rgba(88,121,252,0.25)]"
                    : "text-[#3D4B5A] hover:bg-[#ECEFFE]",
                ].join(" ")}
              >
                {/* Icon — always rendered, never removed */}
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  <Icon active={active} />
                </span>
                {/* Label — stays in DOM, clips via max-width + opacity */}
                <span
                  className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-in-out ${labelCls}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── BOTTOM FOOTER ────────────────────────────────────────────────── */}
      <div className={`flex flex-col gap-3 w-full border-t border-[#EBEEF5] pt-4 pb-6 ${open ? "px-5" : "px-3 items-center"}`}>

        {/* Help & Support */}
        {[
          { href: "/dashboard/help", label: "Help & Support", Icon: HelpIcon },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            title={open ? undefined : label}
            className={`flex items-center py-2 rounded-lg text-[#3D4B5A] hover:bg-[#ECEFFE] transition-colors ${open ? "px-3" : "justify-center px-2"
              }`}
          >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">
              <Icon />
            </span>
            <span
              className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-in-out ${labelCls}`}
            >
              {label}
            </span>
          </Link>
        ))}

        {/* Profile row */}
        <div className={`flex items-center border-t border-[#EBEEF5] pt-4 gap-3 ${open ? "flex-row" : "flex-col"}`}>
          {/* Avatar — click to go to Profile */}
          <Link href="/dashboard/profile" title="View Profile" className="w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_3px_rgba(84,118,252,0.15)] hover:ring-2 hover:ring-[#5476FC]">
            {doctorAvatar ? (
              <img src={doctorAvatar} alt="Doctor Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold">
                {doctorName?.[0]?.toUpperCase() ?? doctorEmail?.[0]?.toUpperCase() ?? "D"}
              </div>
            )}
          </Link>

          {/* Name / email — stays in DOM */}
          <div
            className={`flex flex-col min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${open ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 pointer-events-none"
              }`}
          >
            <span className="text-[#24292E] font-medium text-sm truncate">{doctorName}</span>
            <span className="text-[#9EA5AD] text-xs truncate">{doctorEmail}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#9EA5AD] hover:text-red-500 hover:bg-red-50 transition-colors ml-auto"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
