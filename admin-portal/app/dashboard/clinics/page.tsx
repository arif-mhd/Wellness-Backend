"use client";

import Pagination from "@/components/Pagination";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

interface RateRow {
  category: string;
  price: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  status: "requested" | "details_pending" | "pending_approval" | "active" | "rejected";
  requestedAt?: string;
  licenseNumber?: string | null;
  dohLicense?: string | null;
  addressProofFileUrl?: string | null;
  consultationRates?: RateRow[];
  paymentSettings?: string | null;
  bio?: string | null;
  clinicImageUrl?: string | null;
}

interface Clinic {
  id: string;
  supertokens_id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  emiratesIdOrPassport: string | null;
  positionInClinic: string | null;
  licenseNumber: string | null;
  dohLicense: string | null;
  address: string | null;
  bio: string | null;
  clinicImageUrl?: string | null;
  status: "pending_approval" | "approved" | "rejected";
  registeredAt: string;
  approvedAt: string | null;
  rejectedReason?: string | null;
  isMultiBranchOrg?: boolean;
  branches?: Branch[];
}

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

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-40 ml-1.5 shrink-0">
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

const BRANCH_STATUS_LABEL: Record<Branch["status"], string> = {
  active: "Active",
  requested: "Request Awaiting Review",
  details_pending: "Awaiting Clinic's Details",
  pending_approval: "Pending Final Approval",
  rejected: "Rejected",
};
const BRANCH_STATUS_COLOR: Record<Branch["status"], string> = {
  active: "bg-emerald-50 text-emerald-600",
  requested: "bg-amber-50 text-amber-600",
  details_pending: "bg-indigo-50 text-indigo-500",
  pending_approval: "bg-amber-50 text-amber-600",
  rejected: "bg-red-50 text-red-500",
};

function ClinicAvatar({ clinic, size = "md" }: { clinic: Clinic; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-16 h-16 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-[11px]";
  if (clinic.clinicImageUrl) {
    return <img src={clinic.clinicImageUrl} alt={clinic.fullName} className={`${sz} rounded-full object-cover border border-slate-100 shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-medium shrink-0`}>
      {clinic.fullName?.split(" ").slice(0, 2).map(n => n[0]).join("") || "?"}
    </div>
  );
}

function ManageClinicsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState<"onboard" | "queue">("onboard");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [queue, setQueue] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [branchActionId, setBranchActionId] = useState<string | null>(null);

  const fetchClinics = useCallback(async () => {
    setFetchError("");
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        adminFetch("/api/admin/clinics/pending"),
        adminFetch("/api/admin/clinics/approved"),
      ]);
      if (!pendingRes.ok) {
        const b = await pendingRes.json().catch(() => ({}));
        setFetchError(pendingRes.status === 403 ? "Access denied — admin role required." : b.error ?? `Error ${pendingRes.status}`);
        return;
      }
      if (!approvedRes.ok) {
        const b = await approvedRes.json().catch(() => ({}));
        setFetchError(b.error ?? `Error ${approvedRes.status}`);
        return;
      }
      const { clinics: pending } = await pendingRes.json();
      const { clinics: approved } = await approvedRes.json();
      setQueue(pending ?? []);
      setClinics(approved ?? []);

      if (targetId) {
        if (pending?.some((c: Clinic) => c.id === targetId)) {
          setActiveTab("queue");
          setSelectedClinicId(targetId);
          return;
        }
        if (approved?.some((c: Clinic) => c.id === targetId)) {
          setActiveTab("onboard");
          setSelectedClinicId(targetId);
          return;
        }
      }

      if (!selectedClinicId) {
        if (approved?.length > 0) setSelectedClinicId(approved[0].id);
        else if (pending?.length > 0) { setActiveTab("queue"); setSelectedClinicId(pending[0].id); }
      }
    } catch {
      setFetchError("Could not reach the backend.");
    }
  }, [targetId]);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/clinics/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const approved = queue.find(c => c.id === id);
        if (approved) {
          setQueue(prev => prev.filter(c => c.id !== id));
          // Approving the clinic also activates any branches it declared at
          // registration (still "pending_approval" at this point).
          const branches = approved.branches?.map(b => b.status === "pending_approval" ? { ...b, status: "active" as const } : b);
          setClinics(prev => [{ ...approved, status: "approved", approvedAt: new Date().toISOString(), branches }, ...prev]);
        }
        setSelectedClinicId(null);
        setActiveTab("onboard");
      } else {
        setActionError(data.error || "Approval failed.");
      }
    } catch {
      setActionError("Cannot reach the server.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/clinics/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setQueue(prev => prev.filter(c => c.id !== id));
        setSelectedClinicId(null);
        setShowRejectInput(false);
        setRejectReason("");
      } else {
        setActionError(data.error || "Rejection failed.");
      }
    } catch {
      setActionError("Cannot reach the server.");
    } finally {
      setActionLoading(false);
    }
  };

  // Updates one branch's status within whichever list (clinics/queue)
  // currently holds its parent clinic — a post-registration branch request
  // can only ever belong to an already-approved org, but this stays correct
  // either way.
  const updateBranchStatus = (orgId: string, branchId: string, status: Branch["status"]) => {
    const patch = (list: Clinic[]) => list.map(c =>
      c.id === orgId
        ? { ...c, branches: c.branches?.map(b => b.id === branchId ? { ...b, status } : b) }
        : c
    );
    setClinics(prev => patch(prev));
    setQueue(prev => patch(prev));
  };

  const handleApproveBranch = async (orgId: string, branchId: string) => {
    setBranchActionId(branchId);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/clinics/${orgId}/branches/${branchId}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        updateBranchStatus(orgId, branchId, data.branchStatus === "active" ? "active" : "details_pending");
      } else {
        setActionError(data.error || "Branch approval failed.");
      }
    } catch {
      setActionError("Cannot reach the server.");
    } finally {
      setBranchActionId(null);
    }
  };

  const handleRejectBranch = async (orgId: string, branchId: string) => {
    const reason = window.prompt("Reason for rejection (optional):") ?? "";
    setBranchActionId(branchId);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/clinics/${orgId}/branches/${branchId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        updateBranchStatus(orgId, branchId, "rejected");
      } else {
        setActionError(data.error || "Branch rejection failed.");
      }
    } catch {
      setActionError("Cannot reach the server.");
    } finally {
      setBranchActionId(null);
    }
  };

  const currentList = activeTab === "onboard" ? clinics : queue;
  const sortedClinics = currentList.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.fullName?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q);
  });

  const selectedClinic = [...clinics, ...queue].find(c => c.id === selectedClinicId) ?? null;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300" style={{ fontFamily: 'Outfit, sans-serif' }}>

        {(fetchError || actionError) && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {fetchError || actionError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selectedClinic ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Clinics</h1>
              <button
                onClick={() => router.push("/dashboard/clinics/add")}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Clinic
              </button>
            </div>

            {/* Tab & search row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setActiveTab("onboard"); setSelectedClinicId(clinics[0]?.id ?? null); setShowRejectInput(false); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                    activeTab === "onboard" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
                  }`}
                >
                  Clinics Onboard
                </button>
                <button
                  onClick={() => { setActiveTab("queue"); setSelectedClinicId(queue[0]?.id ?? null); setShowRejectInput(false); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
                    activeTab === "queue" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
                  }`}
                >
                  Onboarding Queue
                  {queue.length > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${activeTab === "queue" ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"}`}>
                      {queue.length}
                    </span>
                  )}
                </button>

                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-sm ml-1"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {isSearchOpen && (
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search clinic..."
                      className="border border-slate-200 bg-white rounded-full px-4 py-2 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-44 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <button onClick={fetchClinics} className="text-[12px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Sort labels */}
            <div className="flex items-center justify-between text-[13px] font-medium text-[#64748B] px-3 select-none">
              <div className="flex items-center gap-12 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <DoubleCaret />
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Address <DoubleCaret />
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <DoubleCaret />
                </span>
              </div>
            </div>

            {/* Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">

                {sortedClinics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                    <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                    </svg>
                    <p className="text-[13px] font-semibold">
                      {activeTab === "queue" ? "No pending applications" : "No clinics onboarded yet"}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        <th className="pb-4 pt-1 font-medium pl-2">
                          <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">Name <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-medium text-center">
                          <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">Address <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedClinics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(clinic => {
                        const isSelected = selectedClinicId === clinic.id;
                        const pendingBranchCount = clinic.branches?.filter(b => b.status === "requested" || b.status === "pending_approval").length ?? 0;
                        return (
                          <tr
                            key={clinic.id}
                            onClick={() => { setSelectedClinicId(clinic.id); setShowRejectInput(false); }}
                            className="group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="py-3 px-2 flex items-center gap-3">
                              <div className="relative shrink-0">
                                <ClinicAvatar clinic={clinic} size="md" />
                                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${activeTab === "onboard" ? "bg-[#10b981]" : "bg-amber-400"}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 group-hover:text-blue-500 transition-colors truncate flex items-center gap-2">
                                  {clinic.fullName}
                                  {pendingBranchCount > 0 && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">
                                      {pendingBranchCount} branch{pendingBranchCount > 1 ? "es" : ""} pending
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] font-normal text-slate-400 truncate">{clinic.email}</p>
                              </div>
                            </td>
                            <td className="py-3 text-[13px] text-slate-700 font-medium text-center truncate max-w-[220px]">{clinic.address ?? "—"}</td>
                            <td className="py-3 pr-4 text-right">
                              {activeTab === "queue" && (
                                isSelected ? (
                                  <span className="bg-[#6A8BFF] text-white text-[11px] font-medium px-6 py-2 rounded-full shadow-[0_4px_10px_rgba(84,118,252,0.2)]">Review</span>
                                ) : (
                                  <span className="text-[12px] font-medium text-slate-800 mr-6">Review</span>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {sortedClinics.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(sortedClinics.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>

          {/* RIGHT — Clinic Details Panel */}
          {selectedClinic && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Clinic Details</h2>
                <button
                  onClick={() => { setSelectedClinicId(null); setShowRejectInput(false); }}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <ClinicAvatar clinic={selectedClinic} size="lg" />
                    <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${selectedClinic.status === "approved" ? "bg-[#10b981]" : "bg-amber-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-slate-800">{selectedClinic.fullName}</h3>
                    {selectedClinic.licenseNumber && (
                      <p className="text-[10px] font-medium text-[#6A8BFF] uppercase tracking-wide mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded">
                        LICENSE {selectedClinic.licenseNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedClinic.bio && (
                <div className="mb-6 px-1">
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-4">{selectedClinic.bio}</p>
                </div>
              )}

              <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-5 mb-6">
                {[
                  { label: "Emirates ID / Passport", value: selectedClinic.emiratesIdOrPassport },
                  { label: "Position",                value: selectedClinic.positionInClinic },
                  { label: "Gender",                  value: selectedClinic.gender },
                  { label: "Date of Birth",           value: selectedClinic.dateOfBirth },
                  { label: "Contact Number",          value: selectedClinic.phone },
                  { label: "Email ID",                value: selectedClinic.email },
                  { label: "DOH License",             value: selectedClinic.dohLicense },
                  { label: "Address",                 value: selectedClinic.address },
                  {
                    label: activeTab === "queue" ? "Applied On" : "Approved On",
                    value: activeTab === "queue"
                      ? new Date(selectedClinic.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : selectedClinic.approvedAt
                        ? new Date(selectedClinic.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : null,
                  },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{label}</span>
                    <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{value}</span>
                  </div>
                ))}
              </div>

              {selectedClinic.isMultiBranchOrg && selectedClinic.branches && selectedClinic.branches.length > 0 && (
                <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-4 mb-6">
                  <h3 className="text-[12px] font-semibold text-slate-700">Branches</h3>
                  {selectedClinic.branches.map((b) => (
                    <div key={b.id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0 space-y-1.5">
                      <div className="flex items-center gap-3">
                        {b.clinicImageUrl && (
                          <img src={b.clinicImageUrl} alt={b.name} className="w-8 h-8 rounded-full object-cover border border-slate-100 shrink-0" />
                        )}
                        <span className="text-[12px] text-slate-800 font-semibold truncate flex-1">{b.name}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${BRANCH_STATUS_COLOR[b.status]}`}>
                          {BRANCH_STATUS_LABEL[b.status]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">Address</span>
                        <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{b.address}</span>
                      </div>
                      {b.phone && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">Phone</span>
                          <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{b.phone}</span>
                        </div>
                      )}
                      {b.licenseNumber && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">License Number</span>
                          <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{b.licenseNumber}</span>
                        </div>
                      )}
                      {b.dohLicense && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">DOH License</span>
                          <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{b.dohLicense}</span>
                        </div>
                      )}
                      {b.addressProofFileUrl && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">Address Proof</span>
                          <a href={b.addressProofFileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#6A8BFF] font-medium hover:underline">View file</a>
                        </div>
                      )}
                      {b.paymentSettings && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">Payment Settings</span>
                          <span className="text-[11px] text-slate-800 font-medium truncate max-w-[170px]">{b.paymentSettings}</span>
                        </div>
                      )}
                      {b.consultationRates && b.consultationRates.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[11px] text-slate-400 font-medium">Consultation Rates</span>
                          {b.consultationRates.map((r, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 pl-2">
                              <span className="text-[11px] text-slate-500">{r.category}</span>
                              <span className="text-[11px] text-slate-800 font-medium">AED {r.price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {b.bio && (
                        <div className="pt-1">
                          <span className="text-[11px] text-slate-400 font-medium block mb-1">Bio</span>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{b.bio}</p>
                        </div>
                      )}
                      {b.status === "details_pending" && (
                        <p className="text-[11px] text-indigo-500 pt-1">Waiting on the clinic to submit the branch's full profile and schedule.</p>
                      )}
                      {(b.status === "requested" || b.status === "pending_approval") && (
                        <div className="flex gap-2 pt-1.5">
                          <button
                            onClick={() => handleRejectBranch(selectedClinic.id, b.id)}
                            disabled={branchActionId === b.id}
                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-50 transition disabled:opacity-60"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveBranch(selectedClinic.id, b.id)}
                            disabled={branchActionId === b.id}
                            className="flex-1 py-1.5 rounded-lg bg-[#6A8BFF] text-white text-[11px] font-semibold hover:bg-[#5a7ae6] transition disabled:opacity-60"
                          >
                            {branchActionId === b.id ? "…" : b.status === "requested" ? "Approve Request" : "Approve"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Approve/Reject actions for pending clinics */}
              {activeTab === "queue" && (
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
                          onClick={() => handleReject(selectedClinic.id)}
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
                        onClick={() => handleApprove(selectedClinic.id)}
                        disabled={actionLoading}
                        className="flex-1 py-2.5 rounded-xl bg-[#6A8BFF] text-white text-sm font-semibold hover:bg-[#5a7ae6] transition disabled:opacity-60 shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
                      >
                        {actionLoading ? "…" : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => router.push(`/dashboard/clinics/${selectedClinic.id}`)}
                className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
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

export default function ManageClinicsPage() {
  return (
    <Suspense fallback={null}>
      <ManageClinicsPageInner />
    </Suspense>
  );
}
