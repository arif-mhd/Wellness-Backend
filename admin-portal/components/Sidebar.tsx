"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "supertokens-web-js/recipe/session";
import { useSidebar } from "./SidebarContext";
import WellnessCentralLogo from "./WellnessCentralLogo";
import { useAdminProfile } from "@/context/AdminProfileContext";

// ─── Icons ────────────────────────────────────────────────────────────────────
const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1.75" y="1.75" width="14.5" height="14.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 1.75v14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const HamburgerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

// ─── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/clinics",
    label: "Clinics",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
        <path d="M9 9h1M14 9h1M9 13h1M14 13h1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="18" r="1.5" />
        <circle cx="11" cy="11" r="1.5" />
        <circle cx="17" cy="14" r="1.5" />
        <circle cx="21" cy="6" r="1.5" />
        <path d="M6.2 17.2l3.6-5.4" />
        <path d="M12.4 11.7l3.2 1.6" />
        <path d="M18.2 13.2l2-6.4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/patients",
    label: "Patients",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M18 4v8" />
        <rect x="16" y="12" width="4" height="6" rx="1" />
        <path d="M18 18v3h-2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/pharmacy",
    label: "Pharmacy",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
        <path d="M8.5 8.5l7 7" />
        <circle cx="18" cy="6" r="3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/lab-service",
    label: "Lab Service",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/vaccination",
    label: "Vaccination",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/forms",
    label: "Forms",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <circle cx="12" cy="14" r="2" />
        <path d="M9 19a3 3 0 0 1 6 0" />
      </svg>
    ),
  },
  {
    href: "/dashboard/emergencies",
    label: "Emergencies",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 10H6" />
        <path d="M14 10h1" />
        <path d="M3 14h1" />
        <path d="M20 14h1" />
        <path d="M9 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h10l4 4v3" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="8" cy="18" r="2" />
        <path d="M8 10V7" />
        <path d="M8 7h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/feedback",
    label: "Feedback",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M12 7l4 4-5 5h-4v-4z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/support",
    label: "Support",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11V9a9 9 0 0 1 18 0v2" />
        <rect x="2" y="11" width="4" height="6" rx="1" />
        <rect x="18" y="11" width="4" height="6" rx="1" />
        <path d="M20 17v2a2 2 0 0 1-2 2H9" />
      </svg>
    ),
  },
  {
    href: "/dashboard/earnings",
    label: "Earnings",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        <path d="M14 10h4" />
        <path d="M16 8l2 2-2 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/roles",
    label: "Roles",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M8 11l3 3 5-5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/articles",
    label: "Articles",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v2H4z" />
        <path d="M4 9h16" />
        <path d="M4 14h10" />
        <path d="M4 19h7" />
        <rect x="14" y="13" width="7" height="7" rx="1" />
        <path d="M16 17h3M17.5 15v4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/activity-log",
    label: "Activity Log",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke={active ? "white" : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen: open, setIsOpen: setOpen } = useSidebar();

  const { profile } = useAdminProfile();
  const adminName = profile.name;
  const adminEmail = profile.email;
  const adminAvatar = profile.avatarUrl;

  const toggle = () => setOpen(!open);

  const labelCls = open
    ? "opacity-100 max-w-[180px] ml-3"
    : "opacity-0 max-w-0 ml-0 pointer-events-none";

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // session may already be expired
    }
    router.replace("/auth/login");
  }

  return (
    <aside
      style={{ willChange: "width" }}
      className={[
        "relative z-30 h-screen shrink-0 flex flex-col justify-between sticky top-0",
        "bg-white border-r border-slate-100 overflow-hidden select-none",
        "transition-[width] duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.03)]",
        open ? "w-[260px]" : "w-[80px]",
      ].join(" ")}
    >
      {/* ── TOP ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 gap-1 w-full">

        {/* Header: logo + toggle */}
        <div className="relative shrink-0 flex items-center h-[72px] px-5 w-full border-b border-slate-50">
          {/* Logo — fades in/out with sidebar */}
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/b5efd6d155e1cbbdc3835258b3a2f9b4c50ee598?width=158"
            alt="Wellness Central"
            className={`object-contain h-[27px] transition-[max-width,opacity] duration-300 ease-in-out ${
              open ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 pointer-events-none"
            }`}
          />

          {/* Toggle button — always visible */}
          <button
            onClick={toggle}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#6A8BFF] transition-colors shrink-0 z-20"
          >
            {open ? <CollapseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        {/* Nav links */}
        <nav className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-0.5 w-full pt-3 pb-3 ${open ? "px-4" : "px-3"}`}>
          {navItems.map(({ href, label, icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                title={open ? undefined : label}
                className={[
                  "flex items-center py-2.5 transition-all duration-150 rounded-[92px] overflow-hidden shrink-0",
                  open ? "px-4" : "px-3 justify-center",
                  isActive
                    ? "bg-gradient-to-r from-[#869DFE] to-[#6A8BFF] text-white shadow-lg shadow-blue-200/40 scale-[1.02]"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {icon(isActive)}
                </span>
                <span
                  className={`text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-in-out ${labelCls}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── BOTTOM ───────────────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 flex flex-col gap-2 w-full border-t border-slate-100 pt-4 pb-6 ${
          open ? "px-5" : "px-3 items-center"
        }`}
      >
        {/* Profile row */}
        <div className={`flex items-center ${open ? "flex-row" : "flex-col"}`}>
          <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_3px_rgba(106,139,255,0.15)]">
            {adminAvatar ? (
              <img src={adminAvatar} alt="Admin Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold">
                {adminName?.[0]?.toUpperCase() ?? adminEmail?.[0]?.toUpperCase() ?? "A"}
              </div>
            )}
          </div>

          {/* Name / email */}
          <div
            className={`flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
              open ? "opacity-100 max-w-[140px] max-h-[100px] ml-3" : "opacity-0 max-w-0 max-h-0 ml-0 pointer-events-none"
            }`}
          >
            <span className="text-slate-800 font-semibold text-sm truncate">{adminName || adminEmail.split("@")[0] || "Admin"}</span>
            <span className="text-slate-400 text-xs truncate">{adminEmail || ""}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300 ease-in-out ${
              open ? "ml-auto opacity-100 max-w-[32px] max-h-[32px]" : "opacity-0 max-w-0 max-h-0 m-0 pointer-events-none"
            }`}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
