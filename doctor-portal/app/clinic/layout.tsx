"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import ClinicSidebar from "@/components/ClinicSidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function ClinicLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isOpen: sidebarOpen } = useSidebar();
  const [allowed, setAllowed] = useState<boolean | null>(null);

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

      <div className="z-10 h-full flex flex-col justify-between">
        <ClinicSidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${sidebarOpen ? "px-6 xl:px-[24px]" : "px-10 lg:px-[40px]"}`}>
          <div className="flex items-center gap-3">
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
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
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
