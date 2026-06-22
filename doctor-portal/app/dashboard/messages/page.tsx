"use client";

import { useState } from "react";
import Image from "next/image";
import medicineIcon from "@/assets/images/medicine_icon_png.png";
// We'll use next/image or standard img for avatars. For now just img or div placeholders.

interface Contact {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatarIcon?: React.ReactNode;
  time: string;
  preview: string;
  type: "pharmacy" | "lab" | "patient";
}

const mockContacts: Contact[] = [
  {
    id: "1",
    name: "Message from Pharmacy",
    email: "mail@example.com",
    avatarIcon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    time: "11:02 AM",
    preview: "The CBC and BMP results are now available....",
    type: "pharmacy",
  },
  {
    id: "2",
    name: "Message from Lab",
    email: "yelena@example.com",
    avatarIcon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    time: "11:02 AM",
    preview: "The CBC and BMP results are now available....",
    type: "lab",
  },
  {
    id: "3",
    name: "Message from Pharmacy",
    email: "mail@example.com",
    avatarIcon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    time: "11:02 AM",
    preview: "The CBC and BMP results are now available....",
    type: "pharmacy",
  },
  {
    id: "4",
    name: "Bessie Cooper",
    email: "mail@example.com",
    avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    time: "11:02 AM",
    preview: "The CBC and BMP results are now available....",
    type: "patient",
  },
];

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"All" | "Unread">("All");
  const [selectedContactId, setSelectedContactId] = useState<string>("4");

  const selectedContact = mockContacts.find((c) => c.id === selectedContactId) || mockContacts[0];

  return (
    <div className="w-full min-h-[calc(100vh-80px)] font-outfit animate-in fade-in duration-300 px-6 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#1e293b] tracking-tight">Messages</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CONTACTS LIST */}
        <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-fit overflow-hidden">
          {/* Tabs & Search */}
          <div className="p-5 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab("All")}
                className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${
                  activeTab === "All" ? "bg-[#1E293B] text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab("Unread")}
                className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${
                  activeTab === "Unread" ? "bg-[#1E293B] text-white" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Unread
              </button>
            </div>
            <button className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-800 transition rounded-full hover:bg-slate-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Contacts List */}
          <div className="overflow-y-auto flex-1 p-2">
            {mockContacts.map((contact) => (
              <div 
                key={contact.id} 
                onClick={() => setSelectedContactId(contact.id)}
                className={`flex gap-3 p-3 rounded-[1.5rem] cursor-pointer transition-colors ${
                  selectedContactId === contact.id ? "bg-[#f8fafd]" : "hover:bg-slate-50"
                } border-b border-slate-50 last:border-0`}
              >
                <div className="w-11 h-11 rounded-full bg-[#f8fafd] border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {contact.avatarUrl ? (
                    <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                  ) : (
                    contact.avatarIcon
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-800 truncate pr-2">{contact.name}</h3>
                    <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">{contact.time}</span>
                  </div>
                  {contact.type !== "patient" && (
                    <p className="text-[11px] font-medium text-slate-400 truncate">{contact.email}</p>
                  )}
                  <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{contact.preview}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE COLUMN: CHAT AREA */}
        <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-[650px] overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-center gap-4 border-b border-slate-50 bg-white z-10">
            <div className="w-11 h-11 rounded-full bg-[#f8fafd] border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {selectedContact.avatarUrl ? (
                <img src={selectedContact.avatarUrl} alt={selectedContact.name} className="w-full h-full object-cover" />
              ) : (
                selectedContact.avatarIcon
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">{selectedContact.type === "patient" ? selectedContact.name : "Wellness Pharmacy"}</h2>
              <p className="text-[11px] font-medium text-slate-400">{selectedContact.email}</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white flex flex-col">
            {/* Incoming */}
            <div className="flex flex-col items-start max-w-[85%]">
              <div className="bg-slate-50 border border-slate-100 text-slate-800 text-[13px] font-medium px-5 py-3.5 rounded-2xl rounded-tl-sm">
                Hi Doctor
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1.5 ml-1">11:02 AM</span>
            </div>

            {/* Outgoing */}
            <div className="flex flex-col items-end self-end max-w-[85%]">
              <div className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-800 text-[13px] font-medium px-5 py-3.5 rounded-2xl rounded-tr-sm">
                Yes, Let&apos;s start this meeting
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1.5 mr-1">11:02 AM</span>
            </div>

            {/* Date Divider */}
            <div className="flex items-center justify-center py-2">
              <span className="text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Today</span>
            </div>

            {/* Incoming */}
            <div className="flex flex-col items-start max-w-[90%]">
              <div className="bg-slate-50 border border-slate-100 text-slate-800 text-[13px] font-medium px-5 py-3.5 rounded-2xl rounded-tl-sm leading-relaxed">
                The CBC and BMP results are now available. Would you like me to send them directly to your EMR system?
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1.5 ml-1">11:02 AM</span>
            </div>

            {/* Outgoing */}
            <div className="flex flex-col items-end self-end max-w-[90%]">
              <div className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-slate-800 text-[13px] font-medium px-5 py-3.5 rounded-2xl rounded-tr-sm leading-relaxed">
                Yes, please send the CBC and BMP results directly to my EMR system. I appreciate your prompt assistance!
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1.5 mr-1">11:02 AM</span>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-50">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-full pr-2 pl-4 py-1.5 focus-within:ring-2 focus-within:ring-[#6A8BFF]/20 focus-within:border-[#6A8BFF]/30 transition-all">
              <button className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input 
                type="text" 
                placeholder="Type Something..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-[13px] font-medium text-slate-700 placeholder-slate-400 py-2.5"
              />
              <button className="w-10 h-10 rounded-full bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white flex items-center justify-center shadow-md shadow-blue-200/50 transition transform hover:scale-105 active:scale-95">
                <svg className="w-4 h-4 ml-0.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS PANEL */}
        <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col h-fit">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {selectedContact.avatarUrl ? (
                <img src={selectedContact.avatarUrl} alt={selectedContact.name} className="w-full h-full object-cover" />
              ) : (
                selectedContact.avatarIcon
              )}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-800">{selectedContact.type === "patient" ? selectedContact.name : "Wellness Pharmacy"}</h2>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{selectedContact.email}</p>
            </div>
          </div>

          {selectedContact.type === "patient" ? (
            <>
              {/* Orders Details Section */}
              <div className="mb-6">
                <div className="bg-[#E5EDFF] text-[#6A8BFF] text-[12px] font-bold px-4 py-2.5 rounded-xl inline-block w-full text-center mb-6">
                  Orders Details
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Image src={medicineIcon} alt="Medicine" className="w-5 h-5 object-contain" />
                      <h4 className="text-[13px] font-semibold text-slate-800">Paracetamol 500 mg</h4>
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 pl-6">Take 1 tablet every 6 hours for 5 days, with or after meals.</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Image src={medicineIcon} alt="Medicine" className="w-5 h-5 object-contain" />
                      <h4 className="text-[13px] font-semibold text-slate-800">Ibuprofen 200 mg</h4>
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 pl-6">Take 1 tablet every 6 hours for 5 days, with or after meals.</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-50">
                <h4 className="text-[12px] font-semibold text-slate-800 mb-3">Summary of medicine history</h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500 mb-6">
                  The lab report for <span className="text-[#6A8BFF] font-semibold">Arlene McCoy</span> has been completed and is ready for review. Please check the results, update the electronic medical record (EMR), and finalize the consultation notes to ensure accurate documentation and follow-up care.
                </p>
                <button className="w-full py-3.5 bg-gradient-to-r from-[#81A3FF] to-[#6A8BFF] text-white rounded-[1.25rem] text-[14px] font-semibold transition duration-200 shadow-[0_4px_14px_rgba(106,139,255,0.4)] hover:shadow-[0_6px_20px_rgba(106,139,255,0.5)] active:scale-[0.98]">
                  Remind of Consultation
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Summary of medicine history Section */}
              <div className="mt-2">
                <h4 className="text-[12px] font-semibold text-slate-800 mb-3">Summary of medicine history</h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                  The lab report for <span className="text-[#6A8BFF] font-semibold">Arlene McCoy</span> has been completed and is ready for review. Please check the results, update the electronic medical record (EMR), and finalize the consultation notes to ensure accurate documentation and follow-up care.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
