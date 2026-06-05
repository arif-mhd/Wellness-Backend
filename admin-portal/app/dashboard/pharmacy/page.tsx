"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Pharmacy {
  id: number;
  name: string;
  email: string;
  avatar: string;
  totalPrescriptions: number;
  medicationsDispensed: number;
  rating: number; // e.g. 4 or 5
  dateJoined: string;
  status: "onboarded" | "pending_verification" | "pending_onboarding";
  tradeLicense: string;
  healthAuthorityLicense: string;
  owner: string;
  manager: string;
  pharmacistLicense: string;
  location: string;
  contactNumber: string;
  isVerified?: boolean;
}

const mockPharmacies: Pharmacy[] = [
  {
    id: 1,
    name: "Frys",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png", // reusing avatar
    totalPrescriptions: 556,
    medicationsDispensed: 177,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "onboarded",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
    isVerified: true
  },
  {
    id: 2,
    name: "CVS Pharmacy",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 647,
    medicationsDispensed: 154,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_onboarding",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
    isVerified: true
  },
  {
    id: 3,
    name: "Alto Pharmacy",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 994,
    medicationsDispensed: 883,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_onboarding",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
    isVerified: true
  },
  {
    id: 4,
    name: "Dr. Aminul Haque", // Using names from mockup
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 453,
    medicationsDispensed: 492,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_verification",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
  },
  {
    id: 5,
    name: "Dr. Shama Islam",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 922,
    medicationsDispensed: 429,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_onboarding",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
  },
  {
    id: 6,
    name: "Dr. Mehnaz Khan",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 447,
    medicationsDispensed: 556,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_verification",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
  },
  {
    id: 7,
    name: "Dr. Selima Khan",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    totalPrescriptions: 185,
    medicationsDispensed: 922,
    rating: 5,
    dateJoined: "21 Sep, 2020, 11:40 PM",
    status: "pending_onboarding",
    tradeLicense: "TD 0000 1111 2222",
    healthAuthorityLicense: "HA 7777 6666 8900",
    owner: "John Doe",
    manager: "Jane Doe",
    pharmacistLicense: "PL 6754 3456 8986",
    location: "1234 Al Zahra Streetm",
    contactNumber: "+971 50 123 4567",
  }
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1 justify-center">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-[#6A8BFF]' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

export default function ManagePharmacyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"onboard" | "queue">("onboard");
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(2); // Default to CVS Pharmacy like mockup
  const selectedPharmacy = mockPharmacies.find((p) => p.id === selectedPharmacyId);

  const displayedPharmacies = activeTab === "onboard" 
    ? mockPharmacies // In a real app, filter by onboarded
    : mockPharmacies.filter(p => p.status !== "onboarded");

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          
          {/* LEFT COLUMN */}
          <div className={`${selectedPharmacy ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
            
            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Pharmacy</h1>
              <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[13px] font-bold px-6 py-3 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Pharmacy
              </button>
            </div>

            {/* Filter / Tabs Row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("onboard")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${
                    activeTab === "onboard"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                  }`}
                >
                  Pharmacies Onboard
                </button>
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${
                    activeTab === "queue"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                  }`}
                >
                  Onboarding Queue
                </button>
                
                {/* Search Icon button */}
                <button className="w-9 h-9 ml-2 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                  Today
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Text Filter Row */}
            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-4">
              <div className="flex items-center gap-8 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></span>
              </div>
              <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Main Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-800 tracking-wider">
                      <th className="pb-4 pt-1 font-bold pl-2">
                        <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>
                      
                      {activeTab === "onboard" ? (
                        <>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Total Prescr.. <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Medications Dispensed <DoubleCaret />
                            </div>
                          </th>
                          <th className="pb-4 pt-1 font-bold">
                            <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                              Ratings <DoubleCaret />
                            </div>
                          </th>
                        </>
                      ) : (
                        <th className="pb-4 pt-1 font-bold">
                          <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                            Date Joined <DoubleCaret />
                          </div>
                        </th>
                      )}
                      
                      {activeTab === "queue" && (
                        <th className="pb-4 pt-1"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPharmacies.map((pharmacy) => {
                      const isSelected = selectedPharmacyId === pharmacy.id;
                      return (
                        <tr
                          key={pharmacy.id}
                          onClick={() => setSelectedPharmacyId(pharmacy.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected 
                              ? "bg-[#f8fafd] rounded-[1.5rem]" 
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-4 px-3 flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src={pharmacy.avatar} alt={pharmacy.name} className="w-full h-full object-cover" />
                              {pharmacy.isVerified && (
                                <div className="absolute top-0 right-0 bg-teal-400 w-2.5 h-2.5 rounded-full border border-white"></div>
                              )}
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                  {pharmacy.name}
                                </p>
                                {pharmacy.isVerified && (
                                  <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{pharmacy.email}</p>
                            </div>
                          </td>
                          
                          {activeTab === "onboard" ? (
                            <>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                {pharmacy.totalPrescriptions}
                              </td>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                {pharmacy.medicationsDispensed}
                              </td>
                              <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                <StarRating rating={pharmacy.rating} />
                              </td>
                            </>
                          ) : (
                            <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                              {pharmacy.dateJoined}
                            </td>
                          )}

                          {activeTab === "queue" && (
                            <td className="py-4 pr-4 text-right">
                              {pharmacy.status === "pending_onboarding" ? (
                                <button className="bg-[#6A8BFF] text-white text-[11px] font-bold px-6 py-2 rounded-full shadow-md shadow-blue-200/50 hover:-translate-y-0.5 transition active:translate-y-0">
                                  Complete Onboarding
                                </button>
                              ) : (
                                <button className="bg-[#E5EDFF] text-[#6A8BFF] text-[11px] font-bold px-8 py-2 rounded-full hover:-translate-y-0.5 transition active:translate-y-0">
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
              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                  aria-label="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button 
                    key={num}
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      num === 1 
                        ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                  aria-label="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          {/* Right Pharmacy Details panel */}
          {selectedPharmacy && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Pharmacy Details</h2>
                <button
                  onClick={() => setSelectedPharmacyId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header Card */}
              <div className="mb-8 mt-2 flex items-center gap-4">
                <div className="relative w-[3.5rem] h-[3.5rem] rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                  <img src={selectedPharmacy.avatar} alt={selectedPharmacy.name} className="w-full h-full object-cover p-1" />
                  {selectedPharmacy.isVerified && (
                    <div className="absolute top-0 right-0 bg-teal-400 w-3 h-3 rounded-full border-2 border-white -translate-y-1 translate-x-1"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-slate-800">{selectedPharmacy.name}</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedPharmacy.email}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-6 mb-8 px-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-[11px] text-slate-400 font-bold w-1/3">Trade License</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right w-2/3">{selectedPharmacy.tradeLicense}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-[11px] text-slate-400 font-bold w-1/3">Health Authority License</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right w-2/3">{selectedPharmacy.healthAuthorityLicense}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Owner</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selectedPharmacy.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Manager</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selectedPharmacy.manager}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-[11px] text-slate-400 font-bold w-1/3">Pharmacist License</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right w-2/3">{selectedPharmacy.pharmacistLicense}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <span className="text-[11px] text-slate-400 font-bold w-1/3">Location</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right w-2/3">{selectedPharmacy.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Contact Number</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selectedPharmacy.contactNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Email ID</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{selectedPharmacy.email}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => router.push(`/dashboard/pharmacy/${selectedPharmacy.id}`)}
                className="w-full py-4 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98]"
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
