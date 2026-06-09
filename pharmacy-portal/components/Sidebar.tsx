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
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/dashboard/add-product",
    label: "Add Product",
    icon: (
      <svg className="w-[1.25rem] h-[1.25rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  async function handleSignOut() {
    try { await signOut(); } catch { /* expired */ }
    router.replace("/auth/login");
  }

  return (
    <aside className="w-[84px] min-h-screen bg-white border-r border-slate-100 flex flex-col items-center justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
      {/* Logo pill */}
      <div className="pt-6 pb-4 flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5l7 7" />
          </svg>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 w-full flex flex-col items-center gap-[18px] py-4 overflow-y-auto no-scrollbar">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <div key={idx} className="relative group flex justify-center w-full">
              <Link
                href={item.href}
                className={`w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-[#22c55e] text-white shadow-lg shadow-green-200/50 scale-105"
                    : "text-[#334155] hover:text-[#0f172a] hover:bg-slate-50"
                }`}
              >
                {item.icon}
              </Link>
              <div className="absolute left-[70px] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-md whitespace-nowrap z-50 tracking-wide">
                {item.label}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile / sign-out */}
      <div className="pb-6 relative w-full flex justify-center">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm hover:ring-2 hover:ring-green-300 transition-all"
          aria-label="Profile"
        >
          Rx
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute bottom-14 left-6 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-44 z-50 animate-fade-in">
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
