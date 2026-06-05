"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  isVerified?: boolean;
}

interface Order {
  id: string;
  orderId: string;
  orderType: string;
  doctor: UserProfile;
  patient: UserProfile;
  dateOrdered: string;
  paymentType: "Insurance" | "Cash";
  amount: string;
  status: "Completed" | "Pending" | "Failed";
  processedBy: UserProfile;
}

const mockOrders: Order[] = [
  { id: "1", orderId: "ORD-023", orderType: "Pharmacy", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.com", avatar: "RA" }, patient: { name: "Kristin Watson", email: "yelena@example.com", avatar: "KW" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CVS", isVerified: true } },
  { id: "2", orderId: "ORD-028", orderType: "Lab", doctor: { name: "Dr. Shafiqul Islam", email: "yelena@example.com", avatar: "SI" }, patient: { name: "Floyd Miles", email: "yelena@example.com", avatar: "FM" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "City Lab", email: "yelena@example.com", avatar: "CL", isVerified: true } },
  { id: "3", orderId: "ORD-013", orderType: "Radiology", doctor: { name: "Dr. Mehnaz Khan", email: "yelena@example.com", avatar: "MK" }, patient: { name: "Guy Hawkins", email: "yelena@example.com", avatar: "GH" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Cash", amount: "AED 299.00", status: "Completed", processedBy: { name: "HealthRad", email: "yelena@example.com", avatar: "HR", isVerified: true } },
  { id: "4", orderId: "ORD-016", orderType: "Pharmacy", doctor: { name: "Dr. Kazi Khan", email: "yelena@example.com", avatar: "KK" }, patient: { name: "Savannah Nguyen", email: "yelena@example.com", avatar: "SN" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "Walgreens", email: "yelena@example.com", avatar: "WG", isVerified: true } },
  { id: "5", orderId: "ORD-003", orderType: "Pharmacy", doctor: { name: "Dr. Riazul Islam", email: "yelena@example.com", avatar: "RI" }, patient: { name: "Ronald Richards", email: "yelena@example.com", avatar: "RR" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CVS", isVerified: true } },
  { id: "6", orderId: "ORD-025", orderType: "Pharmacy", doctor: { name: "Dr. Farhana Begum", email: "yelena@example.com", avatar: "FB" }, patient: { name: "Esther Howard", email: "yelena@example.com", avatar: "EH" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "Rite Aid", email: "yelena@example.com", avatar: "RA", isVerified: true } },
  { id: "7", orderId: "ORD-006", orderType: "Pharmacy", doctor: { name: "Dr. Nasrin Ali", email: "yelena@example.com", avatar: "NA" }, patient: { name: "Theresa Webb", email: "yelena@example.com", avatar: "TW" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CVS", isVerified: true } },
  { id: "8", orderId: "ORD-011", orderType: "Pharmacy", doctor: { name: "Dr. Jahid Chowdhury", email: "yelena@example.com", avatar: "JC" }, patient: { name: "Wade Warren", email: "yelena@example.com", avatar: "WW" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "Walgreens", email: "yelena@example.com", avatar: "WG", isVerified: true } },
  { id: "9", orderId: "ORD-018", orderType: "Pharmacy", doctor: { name: "Dr. Tahmina Akhtar", email: "yelena@example.com", avatar: "TA" }, patient: { name: "Jane Cooper", email: "yelena@example.com", avatar: "JC" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CVS", isVerified: true } },
  { id: "10", orderId: "ORD-027", orderType: "Pharmacy", doctor: { name: "Dr. Imran Ali", email: "yelena@example.com", avatar: "IA" }, patient: { name: "Leslie Alexander", email: "yelena@example.com", avatar: "LA" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "Rite Aid", email: "yelena@example.com", avatar: "RA", isVerified: true } },
  { id: "11", orderId: "ORD-012", orderType: "Pharmacy", doctor: { name: "Dr. Ahsan Khan", email: "yelena@example.com", avatar: "AK" }, patient: { name: "Annette Black", email: "yelena@example.com", avatar: "AB" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CVS", isVerified: true } },
  { id: "12", orderId: "ORD-026", orderType: "Pharmacy", doctor: { name: "Dr. Mizanur Rahman", email: "yelena@example.com", avatar: "MR" }, patient: { name: "Dianne Russell", email: "yelena@example.com", avatar: "DR" }, dateOrdered: "15 May 2020 8:30 am", paymentType: "Insurance", amount: "AED 299.00", status: "Completed", processedBy: { name: "Walgreens", email: "yelena@example.com", avatar: "WG", isVerified: true } },
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"All" | "Pharmacy" | "Lab" | "Radiology">("Pharmacy");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = mockOrders.find((o) => o.id === selectedId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        
        {/* Header Block */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Orders</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* LEFT: Main Table Area */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>
            
            {/* Tabs & Search */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {(["All", "Pharmacy", "Lab", "Radiology"] as const).map((tab) => (
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

            {/* Filters Row */}
            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-4 mb-2">
              <div className="flex items-center gap-5 flex-wrap flex-1">
                {["Name", "Order Type", "Pharmacy", "Lab", "Doctor", "Patient", "Date range", "Payment type", "Status"].map((filter) => (
                  <span key={filter} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    {filter} <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                ))}
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                      <th className="pb-4 pt-1 font-bold pl-2 w-[12%]">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Order ID <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[10%]">Order Type</th>
                      <th className="pb-4 pt-1 font-bold w-[18%]">Doctor Consulted</th>
                      <th className="pb-4 pt-1 font-bold w-[18%]">Patient Name</th>
                      <th className="pb-4 pt-1 font-bold w-[14%]">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Date Ordered <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[10%]">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Payment <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[10%]">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Amount <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[8%]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map((o) => {
                      const isSelected = selectedId === o.id;
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedId(o.id)}
                          onMouseEnter={() => setHoveredId(o.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors h-[68px] ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                        >
                          <td className="py-2 pl-2 text-[12px] font-bold text-slate-500">
                            {o.orderId}
                          </td>
                          <td className="py-2 text-[12px] text-slate-500 font-medium">
                            {o.orderType}
                          </td>
                          <td className="py-2 pr-2">
                            <p className="text-[12.5px] font-bold text-slate-800 leading-tight">{o.doctor.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{o.doctor.email}</p>
                          </td>
                          <td className="py-2 pr-2">
                            <p className="text-[12.5px] font-bold text-slate-800 leading-tight">{o.patient.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{o.patient.email}</p>
                          </td>
                          <td className="py-2 text-[12px] text-slate-500 font-medium">
                            {o.dateOrdered}
                          </td>
                          <td className="py-2 text-[12px] font-bold text-[#6A8BFF]">
                            {o.paymentType}
                          </td>
                          <td className="py-2 text-[12px] text-slate-600 font-bold">
                            {o.amount}
                          </td>
                          <td className="py-2 pr-2 relative">
                            <div className="flex items-center justify-between min-w-[130px] pr-2">
                              <span className={`text-[12px] font-bold ${o.status === "Failed" ? "text-rose-500" : "text-slate-500"}`}>
                                {o.status}
                              </span>
                              {hoveredId === o.id && (
                                <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[12px] font-bold px-5 py-2 rounded-full shadow-md shadow-blue-200/50 transition-transform active:scale-95 whitespace-nowrap ml-4">
                                  View Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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

          {/* RIGHT: Order Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              <div className="flex flex-col gap-4 pb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Order Details</h2>
                  <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {/* Order Info Fields */}
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-1">Order ID</p>
                  <p className="text-[13px] font-bold text-[#6A8BFF]">{selected.orderId}</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-3">Doctor Consulted</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-100">
                      <img src="/doctor-avatar.png" alt={selected.doctor.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-800 leading-tight">{selected.doctor.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{selected.doctor.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-3">Patient Name</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-slate-100">
                      <img src="/doctor-avatar.png" alt={selected.patient.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-800 leading-tight">{selected.patient.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{selected.patient.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-1.5">Date Ordered</p>
                  <p className="text-[12px] text-slate-500 font-medium">{selected.dateOrdered}</p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-3">Order Processed By</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white border border-slate-100 p-1">
                      {/* Using generic pill logo for pharmacy/lab */}
                      <div className="w-full h-full bg-rose-50 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-11h2v4h-2V9zm0 6h2v2h-2v-2z" /></svg>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-slate-800 leading-tight">{selected.processedBy.name}</p>
                        {selected.processedBy.isVerified && (
                          <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{selected.processedBy.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-1.5">Payment</p>
                  <p className="text-[12px] font-bold text-slate-600">
                    {selected.amount} <span className="text-[#6A8BFF] ml-1">{selected.paymentType}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-800 mb-1.5">Status</p>
                  <p className="text-[12px] font-bold text-slate-500">{selected.status}</p>
                </div>

              </div>

              {/* CTA */}
              <button className="w-full py-4 mt-8 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] rounded-[1rem] text-[13px] font-bold transition duration-200 active:scale-[0.98]">
                Go to Consultation
              </button>

            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
