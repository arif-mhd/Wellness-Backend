"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

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

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isOpen: sidebarOpen } = useSidebar();

  return (
    <div className="flex h-screen bg-[#F7F9FC] overflow-hidden relative font-sans">
      {/* Decorative Blur Blobs behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Left Blob - Using CSS radial-gradient for performance */}
        <div
          className="absolute"
          style={{
            left: "-415px",
            bottom: "-563px",
            width: "1012px",
            height: "1012px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(131, 114, 235, 0.12) 0%, rgba(131, 114, 235, 0) 70%)",
          }}
        />

        {/* Right Blob - Using CSS radial-gradient for performance */}
        <div
          className="absolute"
          style={{
            right: "-422px",
            top: "-423px",
            width: "971px",
            height: "971px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96, 156, 255, 0.12) 0%, rgba(96, 156, 255, 0) 70%)",
          }}
        />
      </div>

      {/* Main Sidebar (takes full height) */}
      <div className="z-10 h-full flex flex-col justify-between">
        <Sidebar />
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 h-full">
        {/* Header inside the right panel */}
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${sidebarOpen ? "px-6 xl:px-[24px]" : "px-10 lg:px-[40px]"}`}>
          {/* Logo Frame */}
          <div className="flex items-center">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8008cabf971217f2f64baa6799b253778c1ad571?width=182"
              className="w-[91px] h-[30px] object-contain"
              alt="Wellness Central"
            />
          </div>

          {/* Search bar container */}
          <div className="flex-1 max-w-[605px] mx-8 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12.2504 12.2504L9.71289 9.71289" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search Inventory or Orders"
              className="w-full bg-[rgba(0,0,0,0.03)] text-[#3D4B5A] placeholder-[rgba(61,75,90,0.6)] text-xs rounded-full pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#5476FC]/20 focus:bg-white transition-all border border-transparent"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1497 11.9833C16.3137 12.1475 16.4437 12.3425 16.5324 12.5569C16.621 12.7714 16.6665 13.0013 16.6663 13.2333C16.6663 13.7019 16.4802 14.1512 16.1489 14.4826C15.8176 14.8139 15.3682 15 14.8997 15H5.09967C4.63113 15 4.18177 14.8139 3.85045 14.4826C3.51914 14.1512 3.33301 13.7019 3.33301 13.2333C3.3328 13.0013 3.37833 12.7714 3.46698 12.5569C3.55563 12.3425 3.68567 12.1475 3.84968 11.9833L4.99968 10.8333V7.5C4.99968 6.17392 5.52646 4.90215 6.46414 3.96447C7.40182 3.02678 8.67359 2.5 9.99968 2.5C11.3258 2.5 12.5975 3.02678 13.5352 3.96447C14.4729 4.90215 14.9997 6.17392 14.9997 7.5V10.8333L16.1497 11.9833ZM12.4997 15H7.49968C7.49968 15.663 7.76307 16.2989 8.23191 16.7678C8.70075 17.2366 9.33663 17.5 9.99968 17.5C10.6627 17.5 11.2986 17.2366 11.7674 16.7678C12.2363 16.2989 12.4997 15.663 12.4997 15Z" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative scroll-smooth [-webkit-overflow-scrolling:touch]">
          {children}
        </main>
      </div>
    </div>
  );
}
