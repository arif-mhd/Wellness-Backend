"use client";

import Pagination from "@/components/Pagination";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

type Priority = "High" | "Medium" | "Low";

interface Emergency {
  id: number;
  name: string;
  email: string;
  avatar: string;
  address: string;
  contactNumber: string;
  priority: Priority;
  gender: string;
  location: string;
  emailId: string;
  date: string;
}

const mockEmergencies: Emergency[] = [
  { id: 1, name: "Kristin Watson", email: "yelena@example...", avatar: "KW", address: "3891 Ranchview Dr. Richar...", contactNumber: "(209) 555-0104", priority: "Medium", gender: "Female", location: "3891 Ranchview\nDr. Richardson, California 62639", emailId: "john@example.com", date: "2024-01-15" },
  { id: 2, name: "Cody Fisher", email: "yelena@example...", avatar: "CF", address: "6391 Elgin St. Celina, Delaw...", contactNumber: "(808) 555-0111", priority: "High", gender: "Male", location: "6391 Elgin St, Celina, Delaware", emailId: "cody@example.com", date: "2024-01-15" },
  { id: 3, name: "Wade Warren", email: "yelena@example...", avatar: "WW", address: "2464 Royal Ln. Mesa, New...", contactNumber: "(702) 555-0122", priority: "High", gender: "Male", location: "2464 Royal Ln, Mesa, New Mexico", emailId: "wade@example.com", date: "2024-01-14" },
  { id: 4, name: "Esther Howard", email: "yelena@example...", avatar: "EH", address: "4140 Parker Rd. Allentown...", contactNumber: "(671) 555-0110", priority: "Medium", gender: "Female", location: "4140 Parker Rd, Allentown", emailId: "esther@example.com", date: "2024-01-14" },
  { id: 5, name: "Arlene McCoy", email: "yelena@example...", avatar: "AM", address: "2715 Ash Dr. San Jose, Sout...", contactNumber: "(480) 555-0103", priority: "Low", gender: "Female", location: "2715 Ash Dr, San Jose", emailId: "arlene@example.com", date: "2024-01-13" },
  { id: 6, name: "Brooklyn Sim...", email: "yelena@example...", avatar: "BS", address: "3517 W. Gray St. Utica, Pen...", contactNumber: "(907) 555-0101", priority: "High", gender: "Female", location: "3517 W. Gray St, Utica, Pennsylvania", emailId: "brooklyn@example.com", date: "2024-01-13" },
  { id: 7, name: "Dianne Russell", email: "yelena@example...", avatar: "DR", address: "8502 Preston Rd. Inglewood...", contactNumber: "(207) 555-0119", priority: "Low", gender: "Female", location: "8502 Preston Rd, Inglewood", emailId: "dianne@example.com", date: "2024-01-12" },
  { id: 8, name: "Cameron Willi...", email: "yelena@example...", avatar: "CW", address: "1901 Thornridge Cir. Shiloh...", contactNumber: "(319) 555-0115", priority: "Low", gender: "Male", location: "1901 Thornridge Cir, Shiloh", emailId: "cameron@example.com", date: "2024-01-12" },
];

const avatarColors: Record<string, string> = {
  KW: "bg-rose-400", CF: "bg-blue-400", WW: "bg-teal-400",
  EH: "bg-purple-400", AM: "bg-orange-400", BS: "bg-pink-400",
  DR: "bg-indigo-400", CW: "bg-green-400",
};

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

export default function ManageEmergenciesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SOS" | "Past">("SOS");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const selected = mockEmergencies.find(e => e.id === selectedId);

  const filteredEmergencies = mockEmergencies.filter(em => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      em.name.toLowerCase().includes(q) ||
      em.email.toLowerCase().includes(q) ||
      em.address.toLowerCase().includes(q) ||
      em.contactNumber.toLowerCase().includes(q) ||
      em.priority.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selected ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Emergencies</h1>
            </div>

            {/* Tabs + Search + Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("SOS")}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === "SOS" ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"}`}
                >
                  SOS Requests
                </button>
                <button
                  onClick={() => setActiveTab("Past")}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all ${activeTab === "Past" ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"}`}
                >
                  Past Emergency Requests
                </button>
                <div className="flex items-center gap-2">
                  {searchOpen && (
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search emergencies…"
                      className="w-44 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm"
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
              <button className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Today
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            {/* Column headers */}
            <div className="flex items-center justify-between text-[13px] font-semibold text-[#64748B] select-none mt-1">
              <div className="flex items-center gap-10 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-700">
                    <th className="pb-4 pt-1 pl-2 font-semibold w-[30%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Patient Name <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-semibold w-[28%]">Address</th>
                    <th className="pb-4 pt-1 font-semibold w-[20%]">Contact Number</th>
                    <th className="pb-4 pt-1 font-semibold w-[15%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Priority <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1"></th>
                  </tr>
                </thead>
                <tbody>
                      {filteredEmergencies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((em) => {
                    const isSelected = selectedId === em.id;
                    return (
                      <tr
                        key={em.id}
                        onClick={() => setSelectedId(em.id)}
                        className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors group hover:bg-slate-50/50`}
                      >
                        <td className="py-4 pl-2 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-300">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{em.name}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{em.email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium max-w-[180px] truncate pr-4">{em.address}</td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium">{em.contactNumber}</td>
                        <td className={`py-4 text-[12px] font-semibold ${priorityColor[em.priority]}`}>{em.priority}</td>
                        <td className="py-4 pr-2 text-right">
                          <button className="text-[12px] font-semibold px-5 py-2 rounded-xl transition-all text-slate-700 bg-transparent group-hover:text-white group-hover:bg-gradient-to-b group-hover:from-[#8AA0FF] group-hover:to-[#5476FC] group-hover:shadow-[0_4px_10px_rgba(84,118,252,0.2)] whitespace-nowrap">
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredEmergencies.length > 0 && (
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={Math.ceil(filteredEmergencies.length / itemsPerPage)} 
                  onPageChange={setCurrentPage} 
                />
              )}</div>
          </div>

          {/* RIGHT: Patient Details Panel */}
          {selected && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-50">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Patient Details</h2>
                <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mt-6 mb-5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-300">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full z-10"></div>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-slate-800">{selected.name}</p>
                  <p className="text-[12px] text-slate-400 font-medium">{selected.emailId}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed mb-6 px-1">
                A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I...
              </p>

              {/* Details */}
              <div className="bg-[#f8fafd] rounded-[1.5rem] p-5 space-y-4 mb-7 border border-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Priority</span>
                  <span className={`text-[11px] font-semibold ${priorityColor[selected.priority]}`}>{selected.priority}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Gender</span>
                  <span className="text-[11px] text-slate-800 font-semibold">{selected.gender}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Location</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right leading-relaxed whitespace-pre-line">{selected.location}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Address</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right">California</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Contact Number</span>
                  <span className="text-[11px] text-slate-800 font-semibold">{selected.contactNumber}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Email ID</span>
                  <span className="text-[11px] text-slate-800 font-semibold">{selected.emailId}</span>
                </div>
              </div>

              <button className="w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-xl text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]">
                View Detailed Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
