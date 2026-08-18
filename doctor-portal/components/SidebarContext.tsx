"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  showWaitingRoom: boolean;
  setShowWaitingRoom: (open: boolean) => void;
  isOnline: boolean;
  isManuallyOffline: boolean;
  setOnlineState: (isOnline: boolean, isManuallyOffline: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);

  // Single shared source of truth for online/offline status. Previously the
  // Sidebar indicator and the dashboard's Availability card each fetched and
  // polled this independently — a toggle in one only reached the other on
  // its next up-to-30s poll (or not at all, if that component wasn't
  // mounted), instead of immediately. Living here means both read the exact
  // same state and a toggle updates everywhere the instant it succeeds.
  const [isOnline, setIsOnline] = useState(true);
  const [isManuallyOffline, setIsManuallyOffline] = useState(false);

  const setOnlineState = useCallback((online: boolean, manuallyOffline: boolean) => {
    setIsOnline(online);
    setIsManuallyOffline(manuallyOffline);
  }, []);

  useEffect(() => {
    // SidebarProvider also wraps the clinic portal, whose sessions have no
    // doctor role — this endpoint 403s for them, so only keep polling once
    // the first call confirms the session actually is a doctor.
    let cancelled = false;
    let id: ReturnType<typeof setInterval> | undefined;
    const fetchStatus = () => {
      apiFetch("/api/doctors/me")
        .then((r) => {
          if (!r.ok) throw new Error("not a doctor session");
          return r.json();
        })
        .then((data) => {
          if (cancelled) return;
          const d = data.doctor ?? {};
          setIsOnline(d.isOnline !== false);
          setIsManuallyOffline(d.isManuallyOffline ?? false);
          if (!id) id = setInterval(fetchStatus, 30_000);
        })
        .catch(() => {});
    };
    fetchStatus();
    return () => { cancelled = true; if (id) clearInterval(id); };
  }, []);

  return (
    <SidebarContext.Provider value={{
      isOpen, setIsOpen, isMobileOpen, setIsMobileOpen, showWaitingRoom, setShowWaitingRoom,
      isOnline, isManuallyOffline, setOnlineState,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    return {
      isOpen: true,
      setIsOpen: () => {},
      isMobileOpen: false,
      setIsMobileOpen: () => {},
      showWaitingRoom: false,
      setShowWaitingRoom: () => {},
      isOnline: true,
      isManuallyOffline: false,
      setOnlineState: () => {},
    };
  }
  return context;
}
