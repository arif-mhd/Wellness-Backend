"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import WaitingRoom from "@/components/waiting-room/WaitingRoom";

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
        <header className={`h-[96px] flex items-center justify-between shrink-0 select-none transition-all duration-300 ${sidebarOpen ? "px-6 xl:px-[24px]" : "px-10 lg:px-[40px]"
          }`}>
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
              placeholder="Search Anything with AI"
              className="w-full bg-[rgba(0,0,0,0.03)] text-[#3D4B5A] placeholder-[rgba(61,75,90,0.6)] text-xs rounded-full pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#5476FC]/20 focus:bg-white transition-all border border-transparent"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* SOS Records Button */}
            <button
              onClick={() => router.push("/dashboard/sos")}
              className="h-[48px] bg-[#E84949] text-white px-5 rounded-xl text-[13px] font-bold flex items-center gap-2.5 shadow-[0_6px_20px_rgba(232,73,73,0.25)] hover:shadow-[0_8px_24px_rgba(232,73,73,0.35)] transition-all select-none"
            >
              <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.0443 2.584e-07C16.9558 0.871834 17.6763 1.89775 18.2058 3.07775C18.7353 4.25792 19 5.52917 19 6.8915C19 8.20617 18.7507 9.44158 18.252 10.5978C17.7533 11.7539 17.0766 12.7596 16.2218 13.6148C15.3669 14.4699 14.3617 15.147 13.206 15.646C12.0503 16.1448 10.8156 16.3943 9.50175 16.3943C8.18775 16.3943 6.95267 16.1448 5.7965 15.646C4.64033 15.1472 3.63467 14.4702 2.7795 13.615C1.92433 12.7598 1.24725 11.7543 0.74825 10.5983C0.249417 9.44225 7.17486e-07 8.20709 6.02583e-07 6.89275C4.83528e-07 5.53092 0.26475 4.25708 0.794251 3.07125C1.32375 1.88525 2.04425 0.861501 2.95575 1.40263e-06L4 1.05375C3.23333 1.78592 2.625 2.65533 2.175 3.662C1.725 4.66867 1.5 5.74609 1.5 6.89425C1.5 9.12759 2.275 11.0193 3.825 12.5693C5.375 14.1193 7.26667 14.8943 9.5 14.8943C11.7333 14.8943 13.625 14.1193 15.175 12.5693C16.725 11.0193 17.5 9.12758 17.5 6.89425C17.5 5.74425 17.275 4.66925 16.825 3.66925C16.375 2.66925 15.7583 1.80258 14.975 1.06925L16.0443 2.584e-07ZM13.2192 2.825C13.7641 3.33017 14.1971 3.9315 14.5183 4.629C14.8394 5.32667 15 6.08175 15 6.89425C15 8.42208 14.4655 9.72067 13.3965 10.79C12.3275 11.8595 11.0294 12.3943 9.50225 12.3943C7.97508 12.3943 6.67625 11.8592 5.60575 10.789C4.53525 9.71883 4 8.41934 4 6.8905C4 6.08017 4.16058 5.32375 4.48175 4.62125C4.80292 3.91859 5.23592 3.31983 5.78075 2.825L6.85 3.89425C6.43333 4.27759 6.10417 4.72759 5.8625 5.24425C5.62083 5.76092 5.5 6.31092 5.5 6.89425C5.5 7.99425 5.89167 8.93592 6.675 9.71925C7.45833 10.5026 8.4 10.8943 9.5 10.8943C10.6 10.8943 11.5417 10.5026 12.325 9.71925C13.1083 8.93592 13.5 7.99425 13.5 6.89425C13.5 6.29425 13.3792 5.74008 13.1375 5.23175C12.8958 4.72342 12.5667 4.27758 12.15 3.89425L13.2192 2.825ZM9.5 5.39425C9.909 5.39425 10.2613 5.542 10.5567 5.8375C10.8522 6.133 11 6.48525 11 6.89425C11 7.30325 10.8522 7.6555 10.5568 7.951C10.2613 8.2465 9.909 8.39425 9.5 8.39425C9.091 8.39425 8.73875 8.2465 8.44325 7.951C8.14775 7.6555 8 7.30325 8 6.89425C8 6.48525 8.14775 6.133 8.44325 5.8375C8.73875 5.542 9.091 5.39425 9.5 5.39425Z" fill="white" />
              </svg>
              <span>Emergency Records</span>
            </button>

            {/* Waiting Room (12) Button */}
            <button
              onClick={() => router.push("/appointments/waitingroom")}
              className="h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white px-5 rounded-xl text-[13px] font-bold flex items-center gap-2.5 shadow-[0_6px_20px_rgba(84,118,252,0.25)] hover:shadow-[0_8px_24px_rgba(84,118,252,0.35)] transition-all select-none"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.0398 10.8189C11.3984 10.8189 10.8525 10.5844 10.4021 10.1155C9.95171 9.64665 9.72651 9.07735 9.72651 8.40763C9.72651 7.73791 9.95104 7.168 10.4001 6.69788C10.8492 6.22762 11.3944 5.99249 12.0358 5.99249C12.6772 5.99249 13.2232 6.22685 13.6735 6.69558C14.1238 7.16446 14.3489 7.73376 14.3489 8.40348C14.3489 9.0732 14.1244 9.64319 13.6755 10.1135C13.2265 10.5837 12.6812 10.8189 12.0398 10.8189ZM7.07542 16V14.6019C7.07542 14.34 7.13632 14.0906 7.25812 13.8536C7.37993 13.6166 7.5479 13.4284 7.76205 13.2889C8.40214 12.8972 9.07765 12.6006 9.78859 12.399C10.4997 12.1972 11.2494 12.0963 12.0378 12.0963C12.8262 12.0963 13.5759 12.1972 14.2868 12.399C14.9978 12.6006 15.6733 12.8972 16.3136 13.2889C16.5276 13.4284 16.6955 13.6166 16.8173 13.8536C16.9391 14.0906 17 14.34 17 14.6019V16H7.07542ZM8.48249 14.4741V14.616H15.5929V14.4741C15.0434 14.1487 14.4687 13.9017 13.8688 13.7332C13.269 13.5646 12.6586 13.4804 12.0378 13.4804C11.4169 13.4804 10.8065 13.5646 10.2066 13.7332C9.6067 13.9017 9.032 14.1487 8.48249 14.4741ZM12.0378 9.43482C12.3109 9.43482 12.5434 9.33455 12.7353 9.13402C12.9273 8.93349 13.0234 8.69067 13.0234 8.40556C13.0234 8.12044 12.9273 7.8777 12.7353 7.67732C12.5434 7.47679 12.3109 7.37652 12.0378 7.37652C11.7648 7.37652 11.5322 7.47679 11.3401 7.67732C11.1481 7.8777 11.0521 8.12044 11.0521 8.40556C11.0521 8.69067 11.1481 8.93349 11.3401 9.13402C11.5322 9.33455 11.7648 9.43482 12.0378 9.43482ZM1 10.7656V9.38153H7.62773V10.7656H1ZM1 3.38404V2H11.1625V3.38404H1ZM8.03047 7.0748H1V5.69077H8.68154C8.5263 5.89299 8.39596 6.10798 8.2905 6.33573C8.18519 6.56348 8.09852 6.80984 8.03047 7.0748Z" fill="#E8EAED" />
              </svg>
              <span>Waiting Room (12)</span>
            </button>

            {/* Notification Bell */}
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1497 11.9833C16.3137 12.1475 16.4437 12.3425 16.5324 12.5569C16.621 12.7714 16.6665 13.0013 16.6663 13.2333C16.6663 13.7019 16.4802 14.1512 16.1489 14.4826C15.8176 14.8139 15.3682 15 14.8997 15H5.09967C4.63113 15 4.18177 14.8139 3.85045 14.4826C3.51914 14.1512 3.33301 13.7019 3.33301 13.2333C3.3328 13.0013 3.37833 12.7714 3.46698 12.5569C3.55563 12.3425 3.68567 12.1475 3.84968 11.9833L4.99968 10.8333V7.5C4.99968 6.17392 5.52646 4.90215 6.46414 3.96447C7.40182 3.02678 8.67359 2.5 9.99968 2.5C11.3258 2.5 12.5975 3.02678 13.5352 3.96447C14.4729 4.90215 14.9997 6.17392 14.9997 7.5V10.8333L16.1497 11.9833ZM12.4997 15H7.49968C7.49968 15.663 7.76307 16.2989 8.23191 16.7678C8.70075 17.2366 9.33663 17.5 9.99968 17.5C10.6627 17.5 11.2986 17.2366 11.7674 16.7678C12.2363 16.2989 12.4997 15.663 12.4997 15Z" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Chat Icon */}
            <button className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center text-[#3D4B5A] border border-[#EBEEF5] transition-all">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.675 13.525L16.6667 17.5L12.5417 15.4333C11.7208 15.6996 10.863 15.8346 10 15.8333C5.83333 15.8333 2.5 12.85 2.5 9.16667C2.5 5.48333 5.83333 2.5 10 2.5C14.1667 2.5 17.5 5.48333 17.5 9.16667C17.4863 10.8025 16.831 12.3675 15.675 13.525Z" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.95801 9.16675H10.0413" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.58301 9.16675H6.66634" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.333 9.16675H13.4163" stroke="#3D4B5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
