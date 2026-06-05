"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

type Priority = "High" | "Medium" | "Low";
type Status = "Open" | "Closed";

interface Developer {
  name: string;
  email: string;
  avatar: string;
}

interface Ticket {
  id: string;
  ticketId: string;
  date: string;
  time: string;
  priority: Priority;
  category: string;
  developer: Developer;
  estimatedTime: string;
  status: Status;
  creator: {
    name: string;
    email: string;
    avatar: string;
  };
  subject: string;
  comments: string;
  attachments: string[];
}

const mockTickets: Ticket[] = [
  {
    id: "1",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "Medium",
    category: "Technical Problems",
    developer: { name: "Szabó Jakab", email: "yelena@example.com", avatar: "SJ" },
    estimatedTime: "30 minutes to 2 hours",
    status: "Open",
    creator: { name: "Kristin Watson", email: "john@example.com", avatar: "KW" },
    subject: "Technical Problems",
    comments: "I am experiencing a technical issue when trying to access my medical records through the patient portal. Every time I log in and attempt to view my records, I receive an error message stating, \"Server error, please try again later.\" I've tried multiple times over the past few days with no success. I would appreciate it if this could be resolved as soon as possible, as I need access to my records for an upcoming consultation.",
    attachments: ["Screenshot.png"],
  },
  {
    id: "2",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "High",
    category: "Billing Inquiries",
    developer: { name: "Kovács Lajos", email: "yelena@example.com", avatar: "KL" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Cody Fisher", email: "cody@example.com", avatar: "CF" },
    subject: "Billing Issue",
    comments: "Double charge on my recent consultation.",
    attachments: [],
  },
  {
    id: "3",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "High",
    category: "Service-Related",
    developer: { name: "Somogyi Adrián", email: "yelena@example.com", avatar: "SA" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Wade Warren", email: "wade@example.com", avatar: "WW" },
    subject: "Service Complaint",
    comments: "Doctor was 30 minutes late to the virtual call.",
    attachments: [],
  },
  {
    id: "4",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "Medium",
    category: "Billing Inquiries",
    developer: { name: "Kende Attila", email: "yelena@example.com", avatar: "KA" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Esther Howard", email: "esther@example.com", avatar: "EH" },
    subject: "Invoice Request",
    comments: "Need an invoice for my insurance claim.",
    attachments: [],
  },
  {
    id: "5",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "Low",
    category: "Service-Related",
    developer: { name: "Szigmund Kálmán", email: "yelena@example.com", avatar: "SK" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Arlene McCoy", email: "arlene@example.com", avatar: "AM" },
    subject: "General Inquiry",
    comments: "Do you offer in-person visits?",
    attachments: [],
  },
  {
    id: "6",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "High",
    category: "Billing Inquiries",
    developer: { name: "Szücs Endre", email: "yelena@example.com", avatar: "SE" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Brooklyn Simmons", email: "brooklyn@example.com", avatar: "BS" },
    subject: "Refund Status",
    comments: "Checking on the status of my refund.",
    attachments: [],
  },
  {
    id: "7",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "Low",
    category: "Service-Related",
    developer: { name: "Szilágyi Erik", email: "yelena@example.com", avatar: "SE" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Dianne Russell", email: "dianne@example.com", avatar: "DR" },
    subject: "App Feedback",
    comments: "The new UI is a bit confusing to navigate.",
    attachments: [],
  },
  {
    id: "8",
    ticketId: "Ticket_Feb2020",
    date: "1 Feb, 2020",
    time: "11:40 PM",
    priority: "Low",
    category: "Technical Problems",
    developer: { name: "Novák Balázs", email: "yelena@example.com", avatar: "NB" },
    estimatedTime: "0 hours",
    status: "Closed",
    creator: { name: "Cameron Williamson", email: "cameron@example.com", avatar: "CW" },
    subject: "Password Reset",
    comments: "Not receiving the password reset email.",
    attachments: [],
  },
];

const priorityColor: Record<Priority, string> = {
  High: "text-red-500",
  Medium: "text-orange-400",
  Low: "text-[#6A8BFF]",
};

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"Patients" | "Doctors" | "Pharmacies">("Patients");
  const [selectedId, setSelectedId] = useState<string | null>("1");

  const selected = mockTickets.find((t) => t.id === selectedId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* LEFT COLUMN */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>
            
            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Support and Tickets</h1>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["Patients", "Doctors", "Pharmacies"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                      activeTab === tab ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button className="ml-2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm border border-slate-100 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
              <button className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Today
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-1">
              <div className="flex items-center gap-6 flex-1">
                {["Date", "Priority", "Status"].map((filter) => (
                  <span key={filter} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    {filter} <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                ))}
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[650px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                    <th className="pb-4 pt-1 font-bold pl-2 w-[22%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Ticket # <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[12%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Priority <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[16%]">Issue Category</th>
                    <th className="pb-4 pt-1 font-bold w-[20%]">Developer</th>
                    <th className="pb-4 pt-1 font-bold w-[18%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Estimated Time <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[12%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTickets.map((t) => {
                    const isSelected = selectedId === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="py-4 pl-2">
                          <p className="text-[13px] font-bold text-slate-800 leading-tight">{t.ticketId}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{t.date}, {t.time}</p>
                        </td>
                        <td className={`py-4 text-[12px] font-bold ${priorityColor[t.priority]}`}>
                          {t.priority}
                        </td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{t.category}</td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src="/doctor-avatar.png" alt={t.developer.name} className="w-full h-full object-cover opacity-90" />
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-800 leading-tight">{t.developer.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{t.developer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{t.estimatedTime}</td>
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-bold ${
                            t.status === "Open" ? "bg-[#f45a5a] text-white" : "bg-[#24b26b] text-white"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${n === 1 ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{n}</button>
                ))}
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Ticket Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              <div className="flex flex-col gap-4 pb-5 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-black text-slate-800 tracking-tight">{selected.ticketId}</h2>
                  <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div>
                  <button className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold border transition ${
                    selected.status === "Open" ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200/50" : "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200/50"
                  }`}>
                    {selected.status}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>

              {/* Created by */}
              <div className="mt-5 mb-6">
                <p className="text-[12.5px] font-bold text-slate-800 mb-3">Created by</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                    <img src="/doctor-avatar.png" alt={selected.creator.name} className="w-full h-full object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-slate-800">{selected.creator.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{selected.creator.email}</p>
                  </div>
                </div>
              </div>

              {/* Properties Box */}
              <div className="bg-[#f8fafd] rounded-[1.25rem] p-5 space-y-4 mb-6 border border-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Priority</span>
                  <span className={`text-[11px] font-bold ${priorityColor[selected.priority]}`}>{selected.priority}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Date Created</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selected.date}, {selected.time}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Category</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selected.category}</span>
                </div>
              </div>

              {/* Subject & Comments */}
              <div className="mb-8">
                <p className="text-[12.5px] font-bold text-slate-800 mb-1">Subject</p>
                <p className="text-[11.5px] text-slate-500 font-medium mb-4">{selected.subject}</p>

                <p className="text-[12.5px] font-bold text-slate-800 mb-1">Comments</p>
                <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                  {selected.comments}
                </p>
              </div>

              {/* Attachments */}
              {selected.attachments.length > 0 && (
                <div className="mb-8">
                  <p className="text-[12.5px] font-bold text-slate-800 mb-3">Attachments</p>
                  <div className="flex flex-col gap-2">
                    {selected.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 cursor-pointer group">
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </div>
                        <span className="text-[12px] text-slate-600 font-medium group-hover:text-blue-500 transition">{att}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button className="w-full py-4 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] rounded-[1rem] text-[13px] font-bold transition duration-200 mt-2">
                Update Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
