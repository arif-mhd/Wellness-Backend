"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "supertokens-web-js/recipe/session";
import { useState } from "react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-[1.15rem] h-[1.15rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/doctors",
    label: "Doctors",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 5a2 2 0 0 0-2 2v7a6 6 0 0 0 12 0V7a2 2 0 0 0-2-2h-1" />
        <circle cx="16" cy="19" r="3" />
        <path d="M10 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
        <path d="M8 7H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
        <path d="M8.5 8.5l7 7" />
        <circle cx="18" cy="6" r="3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/lab-service",
    label: "Lab Service",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
      </svg>
    ),
  },
  {
    href: "/dashboard/vaccination",
    label: "Vaccination",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/forms",
    label: "Forms",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M12 7l4 4-5 5h-4v-4z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/support",
    label: "Support",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M8 11l3 3 5-5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <circle cx="12" cy="11" r="2" />
        <path d="M9 16a3 3 0 0 1 6 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // session may already be expired
    }
    router.replace("/auth/login");
  }

  return (
    <aside className="w-[84px] min-h-screen bg-white border-r border-slate-100 flex flex-col items-center justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">

      {/* Top: Menu icon */}
      <div className="pt-6 pb-4">
        <button
          className="w-10 h-10 rounded-full bg-transparent hover:bg-slate-50 flex items-center justify-center text-slate-800 transition-all active:scale-95"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Middle: Navigation Links */}
      <nav className="flex-1 w-full flex flex-col items-center gap-[18px] py-4 overflow-y-auto no-scrollbar">
        {navItems.map((item, idx) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <div key={idx} className="relative group flex justify-center w-full">
              <Link
                href={item.href}
                className={`w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-[#6A8BFF] text-white shadow-lg shadow-blue-200/50 scale-105"
                    : "text-[#334155] hover:text-[#0f172a] hover:bg-slate-50"
                }`}
              >
                {item.icon}
              </Link>

              {/* Tooltip */}
              <div className="absolute left-[70px] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-md whitespace-nowrap z-50 tracking-wide">
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Profile Avatar & Sign Out */}
      <div className="pb-6 relative w-full flex justify-center">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-11 h-11 rounded-full overflow-hidden border-[1.5px] border-slate-100 hover:ring-2 hover:ring-blue-500/30 transition-all shrink-0 flex items-center justify-center shadow-sm"
          aria-label="User profile"
        >
          <img src="/doctor-avatar.png" alt="Admin Profile" className="w-full h-full object-cover" />
        </button>

        {showProfileMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowProfileMenu(false)}
            />
            <div className="absolute bottom-14 left-6 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-44 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2.5 border-b border-slate-50 mb-1">
                <p className="text-[13px] font-bold text-slate-800">Admin User</p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">admin@wellness.com</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
