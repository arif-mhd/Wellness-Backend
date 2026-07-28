"use client";

import React, { createContext, useContext, useState } from "react";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  showWaitingRoom: boolean;
  setShowWaitingRoom: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, isMobileOpen, setIsMobileOpen, showWaitingRoom, setShowWaitingRoom }}>
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
      setShowWaitingRoom: () => {} 
    };
  }
  return context;
}
