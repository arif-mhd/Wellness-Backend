"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Transaction {
  id: string;
  transactionId: string;
  source: string;
  doctor: { name: string; email: string };
  patient: { name: string; email: string };
  date: string;
  amountCharged: string;
  platformFee: string;
  paymentMethod: string;
  status: "Completed" | "Failed";
}

const mockTransactions: Transaction[] = [
  { id: "1", transactionId: "TXN22414", source: "Pharmacy", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Failed" },
  { id: "2", transactionId: "TXN36532", source: "Consultation", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "3", transactionId: "TXN30927", source: "Lab", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "4", transactionId: "TXN28511", source: "Pharmacy", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "5", transactionId: "TXN32119", source: "Lab", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "6", transactionId: "TXN29826", source: "Consultation", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "7", transactionId: "TXN29522", source: "Pharmacy", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "8", transactionId: "TXN23220", source: "Lab", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "9", transactionId: "TXN34330", source: "Consultation", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "10", transactionId: "TXN32128", source: "Consultation", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "11", transactionId: "TXN44339", source: "Consultation", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
  { id: "12", transactionId: "TXN29817", source: "Pharmacy", doctor: { name: "Dr. Rahman Ali", email: "yelena@example.c..." }, patient: { name: "Kristin Watson", email: "yelena@example.c..." }, date: "15 May 2020 8:30...", amountCharged: "AED 299.00", platformFee: "AED 50.00", paymentMethod: "Insurance", status: "Completed" },
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"All" | "Pharmacy" | "Lab" | "Radiology">("Pharmacy");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredTransactions = mockTransactions.filter(t => {
    const matchTab = activeTab === "All" || t.source === activeTab;
    if (!matchTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.transactionId.toLowerCase().includes(q) ||
      t.doctor.name.toLowerCase().includes(q) ||
      t.patient.name.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.paymentMethod.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        
        {/* Header Block */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Consultations & Earnings</h1>
          <div className="flex items-center gap-3">
            <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white px-5 py-2.5 rounded-full text-[13px] font-bold shadow-md shadow-blue-200/50 transition">
              Export Report
            </button>
            <button className="flex items-center gap-2 bg-[#f4f7ff] hover:bg-[#eaf0ff] text-[#6A8BFF] px-5 py-2.5 rounded-full text-[13px] font-bold transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Manage Platform Fee
            </button>
          </div>
        </div>

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
            <div className="flex items-center gap-2 ml-2">
              {searchOpen && (
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search transactions…"
                  className="w-48 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm"
                />
              )}
              <button
                onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearch(""); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition ${searchOpen ? "bg-[#6A8BFF] text-white border-[#6A8BFF]" : "bg-white text-slate-400 hover:text-slate-700 border-slate-100"}`}
              >
                {searchOpen
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                }
              </button>
            </div>
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
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                  <th className="pb-4 pt-1 font-bold pl-2 w-[10%]">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Transaction ID <DoubleCaret /></div>
                  </th>
                  <th className="pb-4 pt-1 font-bold w-[9%]">Source</th>
                  <th className="pb-4 pt-1 font-bold w-[15%]">Doctor Consulted</th>
                  <th className="pb-4 pt-1 font-bold w-[15%]">Patient Name</th>
                  <th className="pb-4 pt-1 font-bold w-[12%]">
                    <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Date <DoubleCaret /></div>
                  </th>
                  <th className="pb-4 pt-1 font-bold w-[10%]">Amount Charged</th>
                  <th className="pb-4 pt-1 font-bold w-[9%]">Platform Fee</th>
                  <th className="pb-4 pt-1 font-bold w-[10%]">Payment Method</th>
                  <th className="pb-4 pt-1 font-bold w-[10%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    onMouseEnter={() => setHoveredId(t.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors h-[68px]"
                  >
                    <td className="py-2 pl-2 text-[12.5px] font-bold text-slate-500">
                      {t.transactionId}
                    </td>
                    <td className="py-2 text-[12px] text-slate-500 font-medium">
                      {t.source}
                    </td>
                    <td className="py-2 pr-2">
                      <p className="text-[12.5px] font-bold text-slate-800 leading-tight">{t.doctor.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.doctor.email}</p>
                    </td>
                    <td className="py-2 pr-2">
                      <p className="text-[12.5px] font-bold text-slate-800 leading-tight">{t.patient.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.patient.email}</p>
                    </td>
                    <td className="py-2 text-[12px] text-slate-500 font-medium">
                      {t.date}
                    </td>
                    <td className="py-2 text-[12px] text-slate-600 font-bold">
                      {t.amountCharged}
                    </td>
                    <td className="py-2 text-[12px] text-slate-600 font-bold">
                      {t.platformFee}
                    </td>
                    <td className="py-2 text-[12px] font-bold text-blue-500">
                      {t.paymentMethod}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center justify-between min-w-[140px] pr-2">
                        <span className={`text-[12px] font-bold ${t.status === "Failed" ? "text-rose-500" : "text-slate-500"}`}>
                          {t.status}
                        </span>
                        {hoveredId === t.id && (
                          <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[12px] font-bold px-5 py-2 rounded-full shadow-md shadow-blue-200/50 transition-transform active:scale-95 whitespace-nowrap ml-4">
                            View Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
    </ProtectedRoute>
  );
}
