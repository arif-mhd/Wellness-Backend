"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "./SidebarContext";
import Session, { signOut } from "supertokens-web-js/recipe/session";

// ─── Icons (memoised, never recreated) ───────────────────────────────────────
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6L8 1.333 14 6v7.333c0 .737-.597 1.334-1.333 1.334H3.333A1.333 1.333 0 0 1 2 13.333V6Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 14.667V8h4v6.667" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const InventoryIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.143 3.5h2.143c.394 0 .714.32.714.733v9.534a.714.714 0 0 1-.714.733H3.714A.714.714 0 0 1 3 13.767V4.233c0-.413.32-.733.714-.733h2.143" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 11.5h4M10 8.643H6m3.333-5.714a1.333 1.333 0 1 0-2.666 0c-.177 0-.32.143-.32.32v1.429H10V3.25a.32.32 0 0 0-.667-.321Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AddProductIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.333 4.667H2.666A1.333 1.333 0 0 0 1.333 6v6.667A1.333 1.333 0 0 0 2.667 14h10.666A1.333 1.333 0 0 0 14.667 12.667V6a1.333 1.333 0 0 0-1.334-1.333Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.667 14V3.333A1.333 1.333 0 0 0 9.333 2H6.667A1.333 1.333 0 0 0 5.333 3.333V14" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const OrdersIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4.667 2h6.666a1.333 1.333 0 0 1 1.334 1.333v9.334A1.333 1.333 0 0 1 11.333 14H4.667A1.333 1.333 0 0 1 3.333 12.667V3.333A1.333 1.333 0 0 1 4.667 2Z" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.667 6h2.666M6.667 9.333h2.666" stroke={active ? "white" : "#3D4B5A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.934 10a1 1 0 0 0 .2 1.107l.04.04a1.414 1.414 0 1 1-2 2l-.04-.04A1 1 0 0 0 10 13.267v.066a1.333 1.333 0 0 1-2.667 0v-.04A1 1 0 0 0 6.12 12.48l-.04.04a1.414 1.414 0 1 1-2-2l.04-.04A1 1 0 0 0 2.733 9.333H2.667a1.333 1.333 0 0 1 0-2.666h.04A1 1 0 0 0 3.52 5.52l-.04-.04a1.414 1.414 0 1 1 2-2l.04.04A1 1 0 0 0 6.667 2.733V2.667a1.333 1.333 0 0 1 2.666 0v.04A1 1 0 0 0 10.48 3.52l.04-.04a1.414 1.414 0 1 1 2 2l-.04.04A1 1 0 0 0 13.267 6.667h.066a1.333 1.333 0 0 1 0 2.666h-.04A1 1 0 0 0 12.934 10Z" stroke="#3D4B5A" strokeWidth="1.5" />
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
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/dashboard/orders", label: "Orders", Icon: OrdersIcon },
  { href: "/dashboard/inventory", label: "Inventory", Icon: InventoryIcon },
  { href: "/dashboard/add-product", label: "Add Product", Icon: AddProductIcon },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen: open, setIsOpen: setOpen } = useSidebar();
  const [pharmacyName, setPharmacyName] = useState("Wellness Pharmacy");
  const [ownerName, setOwnerName] = useState("Admin");

  // Single toggle — no setTimeout, no stacked delays
  const toggle = () => setOpen(!open);

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
            setPharmacyName(data.pharmacy.pharmacyName ?? "Wellness Pharmacy");
            setOwnerName(data.pharmacy.ownerName ?? "Admin");
          }
        }
      } catch { /* keep defaults */ }
    }
    loadProfile();
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
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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

        {/* Help & Settings */}
        {[
          { href: "/dashboard/help", label: "Help & Support", Icon: HelpIcon },
          { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
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
          {/* Avatar */}
          <Link href="/dashboard/profile" title="View Profile" className="w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_3px_rgba(84,118,252,0.15)] hover:ring-2 hover:ring-[#5476FC] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-bold text-sm">
            Rx
          </Link>

          {/* Name / email — stays in DOM */}
          <div
            className={`flex flex-col min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${open ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 pointer-events-none"
              }`}
          >
            <span className="text-[#24292E] font-medium text-sm truncate">{pharmacyName}</span>
            <span className="text-[#9EA5AD] text-xs truncate">{ownerName}</span>
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
