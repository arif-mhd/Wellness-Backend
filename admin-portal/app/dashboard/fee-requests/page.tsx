"use client";

import { useState, useEffect, useCallback } from "react";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

interface FeeRequest {
  id: string;
  orgId: string;
  branchId: string | null;
  targetType: "clinic" | "doctor";
  targetId: string;
  oldRates: any;
  newRates: any;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string | null;
  clinicName: string;
  branchName: string | null;
  doctorName: string | null;
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

function formatRates(rates: any): string {
  if (rates == null) return "—";
  if (Array.isArray(rates)) {
    if (rates.length === 0) return "—";
    return rates.map((r: any) => `${r.category}: AED ${r.price}`).join(", ");
  }
  return `AED ${rates}`;
}

function StatusBadge({ status }: { status: FeeRequest["status"] }) {
  const cls =
    status === "approved" ? "bg-emerald-50 text-emerald-600" :
    status === "rejected" ? "bg-red-50 text-red-500" :
    "bg-amber-50 text-amber-600";
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${cls}`}>{status}</span>;
}

function FeeRequestsPageInner() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [requests, setRequests] = useState<FeeRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  const fetchRequests = useCallback(async () => {
    setFetchError("");
    try {
      const res = await adminFetch("/api/admin/fee-requests?status=all");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFetchError(res.status === 403 ? "Access denied — admin role required." : b.error ?? `Error ${res.status}`);
        return;
      }
      const { requests: all } = await res.json();
      setRequests(all ?? []);
    } catch {
      setFetchError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const pending = requests.filter(r => r.status === "pending");
  const history = requests.filter(r => r.status !== "pending");
  const currentList = activeTab === "pending" ? pending : history;
  const selected = requests.find(r => r.id === selectedId) ?? null;

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await adminFetch(`/api/admin/fee-requests/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSelectedId(null);
        setShowRejectBox(false);
        await fetchRequests();
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
      const res = await adminFetch(`/api/admin/fee-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSelectedId(null);
        setShowRejectBox(false);
        setRejectReason("");
        await fetchRequests();
      } else {
        setActionError(data.error || "Rejection failed.");
      }
    } catch {
      setActionError("Cannot reach the server.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full pb-12 font-sans animate-in fade-in duration-300" style={{ fontFamily: "Outfit, sans-serif" }}>

      {(fetchError || actionError) && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {fetchError || actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

        {/* LEFT COLUMN */}
        <div className={`${selected ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Fee Change Requests</h1>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2.5 select-none">
            <button
              onClick={() => { setActiveTab("pending"); setSelectedId(null); }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
                activeTab === "pending" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              Pending
              {pending.length > 0 && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${activeTab === "pending" ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"}`}>
                  {pending.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("history"); setSelectedId(null); }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === "history" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              History
            </button>
          </div>

          {/* Table panel */}
          <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[500px]">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-24 text-slate-400 text-[13px] font-medium">Loading…</div>
              ) : currentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                  <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-[13px] font-semibold">
                    {activeTab === "pending" ? "No pending fee change requests" : "No reviewed requests yet"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      <th className="pb-4 pt-1 font-medium pl-2">Clinic</th>
                      <th className="pb-4 pt-1 font-medium">Target</th>
                      <th className="pb-4 pt-1 font-medium">Requested</th>
                      <th className="pb-4 pt-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => { setSelectedId(r.id); setShowRejectBox(false); setRejectReason(""); }}
                        className="group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="py-3.5 px-2">
                          <p className="text-[13px] font-medium text-slate-800 group-hover:text-blue-500 transition-colors truncate">{r.clinicName}</p>
                          {r.branchName && <p className="text-[11px] text-slate-400">{r.branchName}</p>}
                        </td>
                        <td className="py-3.5 text-[12px] text-slate-600 font-medium">
                          {r.targetType === "clinic" ? "Clinic-wide" : `Dr. ${r.doctorName ?? r.targetId}`}
                        </td>
                        <td className="py-3.5 text-[12px] text-slate-500">
                          {new Date(r.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-3.5"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Request Details Panel */}
        {selected && (
          <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Request Details</h2>
              <button
                onClick={() => { setSelectedId(null); setShowRejectBox(false); }}
                className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 mb-5">
              <h3 className="text-[15px] font-medium text-slate-800">{selected.clinicName}</h3>
              {selected.branchName && <p className="text-[11px] text-slate-400 mt-0.5">{selected.branchName}</p>}
              <span className="inline-block mt-3 px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-medium tracking-wide uppercase">
                {selected.targetType === "clinic" ? "Clinic-wide rates" : `Dr. ${selected.doctorName ?? selected.targetId}`}
              </span>
            </div>

            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-5 mb-6">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Current</span>
                <span className="text-[13px] text-slate-700 font-medium">{formatRates(selected.oldRates)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Requested</span>
                <span className="text-[13px] text-[#6A8BFF] font-semibold">{formatRates(selected.newRates)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Requested On</span>
                <span className="text-[11px] text-slate-800 font-medium">
                  {new Date(selected.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {selected.status !== "pending" && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
                  <StatusBadge status={selected.status} />
                </div>
              )}
              {selected.rejectionReason && (
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Rejection Reason</span>
                  <span className="text-[12px] text-slate-600">{selected.rejectionReason}</span>
                </div>
              )}
            </div>

            {selected.status === "pending" && (
              <div className="flex flex-col gap-3">
                {showRejectBox && (
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                )}
                <button
                  onClick={() => handleApprove(selected.id)}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98] disabled:opacity-60"
                >
                  {actionLoading ? "Working…" : "Approve"}
                </button>
                <button
                  onClick={() => showRejectBox ? handleReject(selected.id) : setShowRejectBox(true)}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98] disabled:opacity-60"
                >
                  {showRejectBox ? "Confirm Rejection" : "Reject"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeeRequestsPage() {
  return (
    <ProtectedRoute>
      <FeeRequestsPageInner />
    </ProtectedRoute>
  );
}
