"use client";

import Pagination from "@/components/Pagination";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface LabService {
  id: number;
  name: string;
  email: string;
  avatar: string;
  totalTests: number;
  testsCompleted: number;
  rating: number;
  dateJoined: string;
  status: "onboarded" | "pending_verification" | "pending_onboarding";
  labLicense: string;
  healthAuthorityLicense: string;
  director: string;
  manager: string;
  accreditationNumber: string;
  location: string;
  contactNumber: string;
  isVerified?: boolean;
  specializations: string[];
}

const mockLabServices: LabService[] = [
  {
    id: 1,
    name: "LifeCare Diagnostics",
    email: "admin@lifecare.com",
    avatar: "",
    totalTests: 3820,
    testsCompleted: 3654,
    rating: 5,
    dateJoined: "14 Mar, 2021, 09:00 AM",
    status: "onboarded",
    labLicense: "LL 1234 5678 9012",
    healthAuthorityLicense: "HA 9876 5432 1000",
    director: "Dr. Aisha Al-Mansoori",
    manager: "Omar Hassan",
    accreditationNumber: "AC 0011 2233 4455",
    location: "Block 7, Healthcare City, Dubai",
    contactNumber: "+971 4 234 5678",
    isVerified: true,
    specializations: ["Blood Tests", "Radiology", "Pathology"],
  },
  {
    id: 2,
    name: "MedScan Labs",
    email: "info@medscan.com",
    avatar: "",
    totalTests: 2100,
    testsCompleted: 1877,
    rating: 4,
    dateJoined: "02 Jul, 2022, 11:30 AM",
    status: "pending_onboarding",
    labLicense: "LL 3344 5566 7788",
    healthAuthorityLicense: "HA 1122 3344 5566",
    director: "Dr. Karim Mansoor",
    manager: "Sarah Khalid",
    accreditationNumber: "AC 9988 7766 5544",
    location: "Al Nahda Street, Sharjah",
    contactNumber: "+971 6 556 7890",
    isVerified: false,
    specializations: ["MRI", "CT Scan", "Ultrasound"],
  },
  {
    id: 3,
    name: "PrimeLab Testing",
    email: "contact@primelab.ae",
    avatar: "",
    totalTests: 5200,
    testsCompleted: 5010,
    rating: 5,
    dateJoined: "19 Jan, 2020, 08:15 AM",
    status: "onboarded",
    labLicense: "LL 7788 9900 1122",
    healthAuthorityLicense: "HA 4455 6677 8899",
    director: "Dr. Fatima Al-Rashidi",
    manager: "Ahmed Zubair",
    accreditationNumber: "AC 2211 4433 6655",
    location: "Jumeirah Road, Abu Dhabi",
    contactNumber: "+971 2 789 0123",
    isVerified: true,
    specializations: ["Genetics", "Microbiology", "Hematology"],
  },
  {
    id: 4,
    name: "QuickDiagnose Center",
    email: "hello@quickdiagnose.ae",
    avatar: "",
    totalTests: 890,
    testsCompleted: 542,
    rating: 3,
    dateJoined: "08 Nov, 2023, 02:00 PM",
    status: "pending_verification",
    labLicense: "LL 5566 7788 9900",
    healthAuthorityLicense: "HA 0011 2233 4455",
    director: "Dr. Nasser Al-Balushi",
    manager: "Layla Ibrahim",
    accreditationNumber: "AC 6677 8899 0011",
    location: "Corniche West, Ajman",
    contactNumber: "+971 6 423 9876",
    isVerified: false,
    specializations: ["COVID Testing", "Allergy Tests"],
  },
  {
    id: 5,
    name: "BioPrecision Labs",
    email: "labs@bioprecision.ae",
    avatar: "",
    totalTests: 4100,
    testsCompleted: 3988,
    rating: 5,
    dateJoined: "27 Apr, 2021, 10:45 AM",
    status: "onboarded",
    labLicense: "LL 2233 4455 6677",
    healthAuthorityLicense: "HA 6677 8899 0011",
    director: "Dr. Mariam Al-Farsi",
    manager: "Tariq Siddiqui",
    accreditationNumber: "AC 3344 5566 7788",
    location: "Business Bay, Dubai",
    contactNumber: "+971 4 567 8901",
    isVerified: true,
    specializations: ["Oncology", "Immunology", "Biochemistry"],
  },
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" />
    </svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1 justify-center">
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-3.5 h-3.5 ${i < rating ? "text-[#6A8BFF]" : "text-slate-200"}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

function Avatar({ lab, size = "md" }: { lab: LabService; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : size === "xl" ? "w-[3.5rem] h-[3.5rem] text-xl" : "w-10 h-10 text-sm";
  const name = lab.name || "?";
  const imageUrl = lab.avatar;
  return (
    <div className={`relative shrink-0`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className={`${sz} rounded-full object-cover border border-slate-100 shadow-sm`} />
      ) : (
        <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium shadow-sm`}>
          {name[0].toUpperCase()}
        </div>
      )}
      {lab.isVerified && (
        <div className={`absolute top-0 right-0 bg-teal-400 ${size === "xl" ? "w-3 h-3 border-2 -translate-y-1 translate-x-1" : size === "lg" ? "w-3.5 h-3.5 border-[2.5px] translate-x-0.5 -translate-y-0.5" : "w-2.5 h-2.5 border-2"} rounded-full border-white`}></div>
      )}
    </div>
  );
}

export default function ManageLabServicePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"onboard" | "queue">("onboard");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedLabId, setSelectedLabId] = useState<number | null>(1);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const selectedLab = mockLabServices.find((l) => l.id === selectedLabId);

  const tabFiltered =
    activeTab === "onboard"
      ? mockLabServices
      : mockLabServices.filter((l) => l.status !== "onboarded");

  const displayedLabs = tabFiltered.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.director.toLowerCase().includes(q) ||
      l.location.toLowerCase().includes(q) ||
      l.specializations.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT COLUMN */}
          <div className={`${selectedLab ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">
                Manage Lab Services
              </h1>
              <button
                onClick={() => router.push("/dashboard/lab-service/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Lab Service
              </button>
            </div>

            {/* Filter / Tabs Row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("onboard")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all shadow-sm ${activeTab === "onboard"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                >
                  Labs Onboard
                </button>
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all shadow-sm ${activeTab === "queue"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                >
                  Onboarding Queue
                </button>
                <div className="flex items-center gap-2 ml-2">
                  {searchOpen && (
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search labs…"
                      className="w-44 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm"
                    />
                  )}
                  <button
                    onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearch(""); }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border transition ${searchOpen ? "bg-[#6A8BFF] text-white border-[#6A8BFF]" : "bg-white text-slate-400 hover:text-slate-800 border-slate-100"}`}
                  >
                    {searchOpen
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                  Today
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Text Filter Row */}
            <div className="flex items-center justify-between text-[13px] font-semibold text-[#64748B] select-none mt-4">
              <div className="flex items-center gap-8 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                </svg>
              </button>
            </div>

            {/* Main Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800 tracking-wider">
                      <th className="pb-4 pt-1 font-semibold pl-2">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>

                      {activeTab === "onboard" ? (
                        <>
                          <th className="pb-4 pt-1 font-semibold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Total Tests <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-semibold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Tests Completed <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-semibold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Ratings <DoubleCaret />
                            </div>
                          </th>
                        </>
                      ) : (
                        <th className="pb-4 pt-1 font-semibold">
                          <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                            Date Joined <DoubleCaret />
                          </div>
                        </th>
                      )}

                      {activeTab === "queue" && <th className="pb-4 pt-1"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lab) => {
                      const isSelected = selectedLabId === lab.id;
                      return (
                        <tr
                          key={lab.id}
                          onClick={() => setSelectedLabId(lab.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${isSelected
                              ? "bg-[#f8fafd] rounded-[1.5rem]"
                              : "hover:bg-slate-50/50"
                            }`}
                        >
                          <td className="py-4 px-3 flex items-center gap-3">
                            <Avatar lab={lab} size="md" />
                            <div className="min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-semibold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                  {lab.name}
                                </p>
                                {lab.isVerified && (
                                  <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{lab.email}</p>
                            </div>
                          </td>

                          {activeTab === "onboard" ? (
                            <>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                {lab.totalTests.toLocaleString()}
                              </td>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                {lab.testsCompleted.toLocaleString()}
                              </td>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                <StarRating rating={lab.rating} />
                              </td>
                            </>
                          ) : (
                            <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                              {lab.dateJoined}
                            </td>
                          )}

                          {activeTab === "queue" && (
                            <td className="py-4 pr-4 text-right">
                              {lab.status === "pending_onboarding" ? (
                                <button className="bg-[#6A8BFF] text-white text-[11px] font-semibold px-6 py-2 rounded-full shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 transition active:translate-y-0">
                                  Complete Onboarding
                                </button>
                              ) : (
                                <button className="bg-[#E5EDFF] text-[#6A8BFF] text-[11px] font-semibold px-8 py-2 rounded-full hover:-translate-y-0.5 transition active:translate-y-0">
                                  Verify
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {/* Pagination Controls */}
              <div className="mt-6 border-t border-slate-50 pt-5">
                {displayedLabs.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(displayedLabs.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Lab Details Panel */}
          {selectedLab && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-semibold text-slate-800 tracking-tight">Lab Details</h2>
                <button
                  onClick={() => setSelectedLabId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header */}
              <div className="mb-6 mt-2 flex items-center gap-4">
                <Avatar lab={selectedLab} size="xl" />
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-800">{selectedLab.name}</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedLab.email}</p>
                </div>
              </div>

              {/* Specializations */}
              <div className="mb-6">
                <p className="text-[11px] font-semibold text-slate-400 mb-2">Specializations</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLab.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="px-2.5 py-1 bg-[#EEF2FF] text-[#6A8BFF] text-[10px] font-semibold rounded-full"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-5 mb-8 px-1">
                {[
                  { label: "Lab License", value: selectedLab.labLicense },
                  { label: "Health Authority License", value: selectedLab.healthAuthorityLicense },
                  { label: "Accreditation No.", value: selectedLab.accreditationNumber },
                  { label: "Director", value: selectedLab.director },
                  { label: "Manager", value: selectedLab.manager },
                  { label: "Location", value: selectedLab.location },
                  { label: "Contact Number", value: selectedLab.contactNumber },
                  { label: "Email ID", value: selectedLab.email },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2 shrink-0">{label}</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{value}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => router.push(`/dashboard/lab-service/${selectedLab.id}`)}
                className="w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
              >
                View Detailed Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
