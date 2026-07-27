"use client";

import React, { useState } from "react";

const TICKETS = [
  { id: "1736787", title: "Ticket 1", text: "Lorem Ipsum is simply dummy text of", status: "Pending" },
  { id: "1736787", title: "Ticket 1", text: "Lorem Ipsum is simply dummy text of", status: "Closed" },
  { id: "1736787", title: "Ticket 1", text: "Lorem Ipsum is simply dummy text of", status: "Closed" },
  { id: "1736787", title: "Ticket 1", text: "Lorem Ipsum is simply dummy text of", status: "Closed" },
];

const RECEIVED_TICKETS = [
  { id: "#1234", priority: "P1", description: "Lorem", status: "Pending", date: "11/01/2024", developer: "Developer A", patientName: "Sarah Jenkins", avatar: "https://ui-avatars.com/api/?name=Sarah+Jenkins&background=F4F6FF&color=5476FC", subject: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy te", comments: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s." },
  { id: "#1235", priority: "P3", description: "Payment Issue", status: "Open", date: "11/01/2024", developer: "Developer D", patientName: "Michael Chen", avatar: "https://ui-avatars.com/api/?name=Michael+Chen&background=F4F6FF&color=5476FC", subject: "Cannot process payment with my credit card on file", comments: "User reported a payment failure. The gateway returned a timeout error. Will investigate the API logs." },
  { id: "#1236", priority: "P2", description: "Login Error", status: "Resolved", date: "11/01/2024", developer: "Developer C", patientName: "Emma Watson", avatar: "https://ui-avatars.com/api/?name=Emma+Watson&background=F4F6FF&color=5476FC", subject: "Unable to login to the patient portal using Safari", comments: "The login issue was traced back to a recent Safari update blocking third-party cookies required by our auth provider. A patch has been applied." },
  { id: "#1237", priority: "P5", description: "Feature Request", status: "Closed", date: "11/01/2024", developer: "Developer E", patientName: "David Miller", avatar: "https://ui-avatars.com/api/?name=David+Miller&background=F4F6FF&color=5476FC", subject: "Can we have dark mode in the mobile app?", comments: "User requested dark mode. Added to the product backlog for Q3 roadmap." },
];

const CATEGORIES = [
  "technical problems",
  "billing inquiries",
  "service-related",
  "Option 4",
  "Option 5"
];

export default function ClinicHelpPage() {
  const [activeTab, setActiveTab] = useState<"Sent" | "Received">("Received");
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("technical problems");
  const [expandedRow, setExpandedRow] = useState<number | null>(0);

  return (
    <div className="flex w-full h-full font-sans px-5 pb-12 pt-2 min-h-screen" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Left Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pr-8">
        <h1 className="text-[#383F45] font-semibold text-[28px] leading-none tracking-[-0.5px] mb-5">
          Support and tickets
        </h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("Sent")}
            className={`px-8 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "Sent" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab("Received")}
            className={`px-8 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "Received" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Received
          </button>
        </div>

        <div className="h-px bg-[#EBEEF5] mb-6 w-full" />

        {activeTab === "Sent" ? (
          <>
            <h2 className="text-[#383F45] font-semibold text-[22px] mb-12">Help & Support</h2>

            {/* Centered Search block */}
            <div className="flex flex-col items-center justify-center w-full max-w-[500px] mx-auto">
              <h3 className="text-[20px] font-bold text-[#24292E] mb-6">Need some help?</h3>
              <div className="relative w-full mb-8">
                <input type="text" placeholder="Search" className="w-full h-[46px] pl-5 pr-12 border border-[#D0D5DD] rounded-[8px] text-[13px] outline-none focus:border-[#5476FC] transition-colors shadow-sm" />
                <svg className="absolute right-4 top-3.5 text-[#9EA5AD]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <button onClick={() => setShowModal(true)} className="px-10 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-wide">
                Raise an issue
              </button>
            </div>

            {/* Past Tickets */}
            <div className="mt-16 w-full max-w-[500px] mx-auto">
              <h3 className="text-[18px] font-bold text-[#24292E] mb-5">Past Tickets</h3>
              <div className="flex flex-col gap-3">
                {TICKETS.map((t, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#E5E7EB] border border-[#D0D5DD]/50 px-5 py-4 rounded-[8px] hover:shadow-sm transition-all">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[14px] font-bold text-[#24292E]">{t.title}</span>
                      <span className="text-[12px] text-[#676E76] font-medium">{t.text}</span>
                    </div>
                    <div className="flex flex-col items-end justify-between h-full min-h-[40px] gap-2">
                      <span className="text-[11px] font-bold text-[#24292E]">ID: {t.id}</span>
                      <span className={`text-[11px] font-semibold ${t.status === 'Pending' ? 'text-[#D92D20]' : 'text-[#179353]'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col w-full h-full">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative w-[200px]">
                  <input type="text" placeholder="Search all" className="w-full h-[36px] pl-3 pr-10 border border-[#D0D5DD] rounded-[8px] text-[13px] outline-none focus:border-[#5476FC] transition-colors" />
                  <svg className="absolute right-3 top-2.5 text-[#9EA5AD]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <button className="text-[#383F45] hover:text-[#5476FC] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[#676E76] font-medium">
                <button className="text-[#24292E] font-bold">Last 1 hour</button>
                <button className="hover:text-[#24292E] transition-colors">All</button>
                <button className="hover:text-[#24292E] transition-colors">Today</button>
                <button className="hover:text-[#24292E] transition-colors">This Week</button>
                <button className="hover:text-[#24292E] transition-colors">This month</button>
              </div>
            </div>

            {/* Table Headers */}
            <div className="flex items-center px-6 pb-3 text-[11px] font-bold text-[#24292E]">
              <div className="w-[15%] flex items-center gap-1 cursor-pointer">Ticket # <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
              <div className="w-[12%] flex items-center gap-1 cursor-pointer">Priority <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
              <div className="w-[20%] flex items-center gap-1 cursor-pointer">Ticket Description <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
              <div className="w-[18%] flex items-center gap-1 cursor-pointer">Ticket status <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
              <div className="w-[15%] flex items-center gap-1 cursor-pointer">Date <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
              <div className="w-[20%] flex items-center gap-1 cursor-pointer">Developer <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg></div>
            </div>

            {/* Tickets List */}
            <div className="flex flex-col gap-3">
              {RECEIVED_TICKETS.map((t, i) => {
                const isExpanded = expandedRow === i;
                const getStatusColor = (status: string) => {
                  if (status === 'Pending') return 'text-[#9EA5AD]';
                  if (status === 'Open') return 'text-[#5476FC]';
                  if (status === 'Resolved') return 'text-[#179353]';
                  return 'text-[#111827]';
                };
                return (
                  <div 
                    key={i} 
                    className={`flex items-center px-6 py-4 cursor-pointer min-h-[60px] border rounded-[8px] transition-all duration-300 ${isExpanded ? "bg-[#F4F6FF] border-[#5476FC]" : "bg-white border-[#D0D5DD] hover:border-[#9EA5AD]"}`}
                    onClick={() => setExpandedRow(i)}
                  >
                    <div className="w-[15%] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full shrink-0 border border-[#D0D5DD] overflow-hidden bg-[#EAF0F6]">
                        <svg className="w-full h-full text-[#A0ABB8] mt-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[#111827]">{t.id}</span>
                        <span className="text-[11px] text-[#676E76] font-medium truncate max-w-[80px]">{t.patientName}</span>
                      </div>
                    </div>
                    <div className="w-[12%] text-[12px] font-medium text-[#676E76]">{t.priority}</div>
                    <div className="w-[20%] text-[13px] font-bold text-[#5476FC]">{t.description}</div>
                    <div className={`w-[18%] flex items-center gap-1 text-[13px] font-bold ${getStatusColor(t.status)}`}>
                      {t.status}
                    </div>
                    <div className="w-[15%] text-[12px] font-medium text-[#676E76]">{t.date}</div>
                    <div className="w-[20%] text-[12px] font-medium text-[#676E76]">{t.developer}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className={`w-[360px] shrink-0 ${activeTab === "Received" ? "pt-[104px]" : ""}`}>
        {activeTab === "Received" ? (
          expandedRow !== null ? (
            <div className="bg-[#EEF0FC] rounded-[24px] p-6 shadow-sm sticky top-4 flex flex-col gap-6">
              <h2 className="text-[#24292E] text-[16px] font-bold">Ticket Details</h2>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D0D5DD] bg-[#EAF0F6]">
                  <svg className="w-full h-full text-[#A0ABB8] mt-1.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#111827]">{RECEIVED_TICKETS[expandedRow].patientName}</span>
                  <span className="text-[11px] text-[#676E76] font-medium">{RECEIVED_TICKETS[expandedRow].description}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-[#111827]">Subject</span>
                <div className="bg-white rounded-xl p-4 text-[13px] text-[#676E76] font-medium leading-relaxed shadow-sm border border-[#D0D5DD]/30">
                  {RECEIVED_TICKETS[expandedRow].subject}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-[#111827]">Comments</span>
                <div className="bg-white rounded-xl p-4 text-[13px] text-[#676E76] font-medium leading-relaxed shadow-sm border border-[#D0D5DD]/30 min-h-[140px]">
                  {RECEIVED_TICKETS[expandedRow].comments}
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button className="w-full py-2.5 rounded-xl bg-[#A0A4A8] text-white text-[13px] font-medium tracking-wide hover:bg-[#8B8F94] transition-colors">
                  Edit
                </button>
                <button className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium tracking-wide shadow-[0_2px_8px_rgba(84,118,252,0.2)] hover:shadow-[0_4px_12px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Solve
                </button>
              </div>
            </div>
          ) : null
        ) : (
          <div className="bg-[#EEF0FC] rounded-[24px] p-7 shadow-sm min-h-[calc(100vh-140px)] sticky top-4">
            <h2 className="text-[#24292E] text-[16px] font-bold">Help Suggestions & FAQs</h2>
          </div>
        )}
      </div>

      {/* Raise Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div className="bg-white w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-[16px] p-6 shadow-2xl flex flex-col gap-4 relative border border-[#D0D5DD] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button onClick={() => setShowModal(false)} className="absolute right-5 top-5 text-[#9EA5AD] hover:text-[#24292E] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="text-[#111827] text-[18px] font-bold tracking-tight mb-1">Raise an issue</h2>

            <div className="flex flex-col gap-3">
              <span className="text-[#111827] text-[13px] font-semibold">Choose issue category</span>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map(cat => (
                  <label key={cat} onClick={() => setSelectedCategory(cat)} className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all ${selectedCategory === cat ? "border-[#5476FC]" : "border-[#D0D5DD] group-hover:border-[#5476FC]"}`}>
                      {selectedCategory === cat && <div className="w-2.5 h-2.5 bg-[#5476FC] rounded-full" />}
                    </div>
                    <span className="text-[13px] text-[#24292E] font-medium capitalize">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[#111827] text-[13px] font-semibold">Contact number</span>
              <input type="text" className="w-full h-11 border border-[#D0D5DD] rounded-xl px-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors" />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[#111827] text-[13px] font-semibold">Write about it</span>
              <textarea className="w-full border border-[#D0D5DD] rounded-xl p-4 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] min-h-[100px] resize-none transition-colors" />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[#111827] text-[13px] font-semibold">Upload images or attach a file</span>
              <div className="flex gap-3">
                <div className="flex-1 border border-[#D0D5DD] rounded-xl px-4 py-3 text-[13px] text-[#9EA5AD] flex items-center bg-white cursor-pointer transition-colors">
                  Select
                </div>
                <button className="px-6 py-2 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-wide">
                  Attach
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-2 gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl border border-[#D0D5DD] text-[#676E76] text-[13px] font-medium hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => setShowModal(false)} className="px-8 py-2.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-wide">
                Create ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
