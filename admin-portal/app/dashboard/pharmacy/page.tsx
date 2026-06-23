"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Pagination from "@/components/Pagination";
import { useRouter, useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

interface Pharmacy {
  id: string;
  supertokens_id: string;
  ownerName: string;
  pharmacyName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  location?: string;
  emiratesId?: string;
  status: "pending_approval" | "approved" | "rejected";
  registeredAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  tradeLicense?: string;
  healthAuthorityLicense?: string;
  manager?: string;
  pharmacistLicense?: string;
  contactNumber?: string;
  totalPrescriptions?: number;
  medicationsDispensed?: number;
  rating?: number;
}

interface Product {
  id: string;
  pharmacyId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string;
  rejectedReason?: string;
  requiresPrescription?: boolean;
}

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

function Avatar({ pharmacy, size = "md" }: { pharmacy: Pharmacy; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  const name = pharmacy.pharmacyName || "?";
  const imageUrl = (pharmacy as any).imageUrl; 
  return (
    <div className={`relative shrink-0`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className={`${sz} rounded-full object-cover border border-slate-100 shadow-sm`} />
      ) : (
        <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium shadow-sm`}>
          {name[0].toUpperCase()}
        </div>
      )}
      {pharmacy.status === "approved" && (
        <div className={`absolute top-0 right-0 bg-teal-400 ${size === "lg" ? "w-3.5 h-3.5 border-[2.5px]" : "w-2.5 h-2.5 border-2"} rounded-full border-white ${size === "lg" ? "translate-x-0.5 -translate-y-0.5" : ""}`}></div>
      )}
    </div>
  );
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1 justify-center">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className={`w-3.5 h-3.5 ${i < rating ? "text-[#6A8BFF]" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

type ActiveTab = "onboard" | "queue";

function ManagePharmacyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState<ActiveTab>("onboard");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  const [approvedPharmacies, setApprovedPharmacies] = useState<Pharmacy[]>([]);
  const [pendingPharmacies, setPendingPharmacies] = useState<Pharmacy[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchAll = useCallback(async () => {
    setFetchError("");
    try {
      const [pp, ap, ppr, apr] = await Promise.all([
        adminFetch("/api/admin/pharmacy/pending"),
        adminFetch("/api/admin/pharmacy/approved"),
        adminFetch("/api/admin/pharmacy/products/pending"),
        adminFetch("/api/admin/pharmacy/products/approved"),
      ]);
      let pendingList: Pharmacy[] = [];
      let approvedList: Pharmacy[] = [];
      if (pp.ok)  { const d = await pp.json();  pendingList = d.pharmacies ?? []; setPendingPharmacies(pendingList); }
      if (ap.ok)  { const d = await ap.json();  approvedList = d.pharmacies ?? []; setApprovedPharmacies(approvedList); }
      if (ppr.ok) { const d = await ppr.json(); setPendingProducts(d.products); }
      if (apr.ok) { const d = await apr.json(); setApprovedProducts(d.products); }

      if (targetId) {
        if (pendingList.some((p) => p.id === targetId)) {
          setActiveTab("queue");
          setSelectedPharmacyId(targetId);
        } else if (approvedList.some((p) => p.id === targetId)) {
          setActiveTab("onboard");
          setSelectedPharmacyId(targetId);
        }
      }
    } catch {
      setFetchError("Failed to load data.");
    }
  }, [targetId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function approvePharmacy(pharmacyId: string) {
    setActionLoading(true);
    await adminFetch(`/api/admin/pharmacy/${pharmacyId}/approve`, { method: "POST" });
    await fetchAll();
    setSelectedPharmacyId(null);
    setActionLoading(false);
  }

  async function rejectPharmacy(pharmacyId: string) {
    setActionLoading(true);
    await adminFetch(`/api/admin/pharmacy/${pharmacyId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: rejectReason }),
    });
    await fetchAll();
    setSelectedPharmacyId(null);
    setShowRejectInput(false);
    setRejectReason("");
    setActionLoading(false);
  }

  async function togglePrescription(productId: string, current: boolean) {
    await adminFetch(`/api/admin/pharmacy/products/${productId}/prescription`, {
      method: "PATCH",
      body: JSON.stringify({ requiresPrescription: !current }),
    });
    await fetchAll();
  }

  const displayedPharmacies: Pharmacy[] =
    activeTab === "onboard" ? approvedPharmacies : pendingPharmacies;

  const selectedPharmacy = displayedPharmacies.find((p) => p.id === selectedPharmacyId) ?? null;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {fetchError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {fetchError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selectedPharmacy ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Top Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Pharmacy</h1>
              <button
                onClick={() => router.push("/dashboard/pharmacy/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
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
                  onClick={() => { setActiveTab("onboard"); setSelectedPharmacyId(null); }}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all shadow-sm ${
                    activeTab === "onboard"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                  }`}
                >
                  Pharmacies Onboard
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "onboard" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {approvedPharmacies.length}
                  </span>
                </button>
                <button
                  onClick={() => { setActiveTab("queue"); setSelectedPharmacyId(null); }}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all shadow-sm ${
                    activeTab === "queue"
                      ? "bg-[#1E293B] text-white"
                      : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                  }`}
                >
                  Onboarding Queue
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "queue" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {pendingPharmacies.length}
                  </span>
                </button>

                <button className="w-9 h-9 ml-2 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
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
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[400px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                {displayedPharmacies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-sm font-semibold">
                      No {activeTab === "onboard" ? "approved" : "pending"} pharmacies
                    </p>
                  </div>
                ) : (
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
                                Total Prescr.. <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                                Medications Dispensed <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                                Ratings <DoubleCaret />
                              </div>
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                                Date Joined <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center justify-center gap-2 cursor-pointer hover:text-slate-600">
                                Status <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1"></th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedPharmacies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pharmacy) => {
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
                              <Avatar pharmacy={pharmacy} size="md" />
                              <div className="min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                    {pharmacy.pharmacyName}
                                  </p>
                                  {pharmacy.status === "approved" && (
                                    <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 truncate">{pharmacy.email}</p>
                              </div>
                            </td>

                            {activeTab === "onboard" ? (
                              <>
                                <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                  {pharmacy.totalPrescriptions ?? "—"}
                                </td>
                                <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                  {pharmacy.medicationsDispensed ?? "—"}
                                </td>
                                <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                  {pharmacy.rating != null
                                    ? <StarRating rating={pharmacy.rating} />
                                    : "—"}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                  {new Date(pharmacy.registeredAt).toLocaleDateString()}
                                </td>
                                <td className="py-4 text-[13px] text-slate-500 font-medium text-center">
                                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
                                    Pending
                                  </span>
                                </td>
                                <td className="py-4 pr-4 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedPharmacyId(pharmacy.id); }}
                                    className="bg-[#E5EDFF] text-[#6A8BFF] text-[11px] font-semibold px-8 py-2 rounded-full hover:-translate-y-0.5 transition active:translate-y-0"
                                  >
                                    Review
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              {displayedPharmacies.length > 0 && (
                <div className="mt-6 border-t border-slate-50 pt-5">
                {displayedPharmacies.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(displayedPharmacies.length / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
              )}
            </div>
          </div>

          {/* RIGHT — Pharmacy Details Panel */}
          {selectedPharmacy && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-semibold text-slate-800 tracking-tight">Pharmacy Details</h2>
                <button
                  onClick={() => { setSelectedPharmacyId(null); setShowRejectInput(false); setRejectReason(""); }}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header */}
              <div className="mb-8 mt-2 flex items-center gap-4">
                <Avatar pharmacy={selectedPharmacy} size="lg" />
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-800">{selectedPharmacy.pharmacyName}</h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{selectedPharmacy.email}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-5 mb-8 px-1">
                {selectedPharmacy.tradeLicense && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2">Trade License</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{selectedPharmacy.tradeLicense}</span>
                  </div>
                )}
                {selectedPharmacy.healthAuthorityLicense && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2">Health Authority License</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{selectedPharmacy.healthAuthorityLicense}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">Owner</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right">{selectedPharmacy.ownerName}</span>
                </div>
                {selectedPharmacy.manager && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Manager</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right">{selectedPharmacy.manager}</span>
                  </div>
                )}
                {selectedPharmacy.pharmacistLicense && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold w-1/2">Pharmacist License</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{selectedPharmacy.pharmacistLicense}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <span className="text-[11px] text-slate-400 font-semibold w-1/2">Location</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right w-1/2">{selectedPharmacy.location || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">Contact Number</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right">{selectedPharmacy.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold">License No.</span>
                  <span className="text-[11px] text-slate-800 font-semibold text-right">{selectedPharmacy.licenseNumber}</span>
                </div>
                {selectedPharmacy.emiratesId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Emirates ID</span>
                    <span className="text-[11px] text-slate-800 font-semibold text-right">{selectedPharmacy.emiratesId}</span>
                  </div>
                )}
              </div>

              {/* Approve/Reject actions for pending pharmacies */}
              {selectedPharmacy.status === "pending_approval" && (
                <div className="mb-4 space-y-3">
                  {showRejectInput ? (
                    <>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection…"
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => rejectPharmacy(selectedPharmacy.id)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60"
                        >
                          {actionLoading ? "…" : "Confirm Reject"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRejectInput(true)}
                        className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => approvePharmacy(selectedPharmacy.id)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-[#6A8BFF] text-white text-sm font-semibold hover:bg-[#5a7ae6] transition disabled:opacity-60 shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
                      >
                        {actionLoading ? "…" : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* View Detailed Profile button — for approved pharmacies */}
              {selectedPharmacy.status === "approved" && (
                <button
                  onClick={() => router.push(`/dashboard/pharmacy/${selectedPharmacy.id}`)}
                  className="w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
                >
                  View Detailed Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function ManagePharmacyPage() {
  return (
    <Suspense fallback={null}>
      <ManagePharmacyPageInner />
    </Suspense>
  );
}
