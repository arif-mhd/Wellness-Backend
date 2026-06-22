"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Pagination from "@/components/Pagination";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

type Priority = "High" | "Medium" | "Low";
type Status = "Open" | "In Progress" | "Closed";
type SubmitterRole = "all" | "patient" | "doctor";

interface Ticket {
  id: string;
  patientId: string;
  patientName?: string;
  submitterName?: string;
  submitterRole?: string;
  subject: string;
  description: string;
  category: string;
  status: Status;
  adminReply?: string | null;
  createdAt: string;
  updatedAt: string;
}

function getPriority(category: string): Priority {
  if (category === "billing_inquiries") return "High";
  if (category === "technical_problems") return "Medium";
  return "Low";
}

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

function SupportPageInner() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [roleFilter, setRoleFilter] = useState<SubmitterRole>("all");

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("submitterRole", roleFilter);
      const res = await apiFetch(`/api/support/admin/all?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (targetId && data.some((t: Ticket) => t.id === targetId)) {
          setSelectedId(targetId);
        } else if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roleFilter, targetId]);

  useEffect(() => {
    setLoading(true);
    if (!targetId) setSelectedId(null);
    fetchTickets();
  }, [fetchTickets]);

  const selected = tickets.find((t) => t.id === selectedId);

  useEffect(() => {
    if (selected) setReplyText(selected.adminReply || "");
  }, [selectedId]);

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSavingReply(true);
    try {
      const res = await apiFetch(`/api/support/admin/${selected.id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      }
    } finally {
      setSavingReply(false);
    }
  };

  const handleStatusChange = async (status: Status) => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      const res = await apiFetch(`/api/support/admin/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const filtered = statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter);

  // Compute open counts per role (from all currently loaded tickets regardless of status filter)
  const patientOpenCount = tickets.filter(t => (t.submitterRole === "patient" || !t.submitterRole) && t.status === "Open").length;
  const doctorOpenCount = tickets.filter(t => t.submitterRole === "doctor" && t.status === "Open").length;

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  const statusColors: Record<Status, string> = {
    "Open": "bg-[#f45a5a] text-white",
    "In Progress": "bg-amber-400 text-white",
    "Closed": "bg-[#24b26b] text-white",
  };

  const displayName = (t: Ticket) => t.submitterName || t.patientName || (t.submitterRole === "doctor" ? "Unknown Doctor" : "Unknown Patient");

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>

            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Support and Tickets</h1>

            {/* Role tabs */}
            <div className="flex items-center gap-2">
              {([
                { key: "all", label: "All Requests" },
                { key: "patient", label: "Patient Requests", count: patientOpenCount },
                { key: "doctor", label: "Doctor Requests", count: doctorOpenCount },
              ] as { key: SubmitterRole; label: string; count?: number }[]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setRoleFilter(key)}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 ${
                    roleFilter === key ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                  }`}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleFilter === key ? "bg-white/20 text-white" : "bg-rose-50 text-rose-500"}`}>
                      {count} open
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Status filters */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["all", "Open", "In Progress", "Closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                      statusFilter === s ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
              <button onClick={fetchTickets} className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Refresh
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>

            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-1">
              <div className="flex items-center gap-6 flex-1">
                {["Date", "Priority", "Status"].map((filter) => (
                  <span key={filter} className="flex items-center gap-1.5">
                    {filter} <DoubleCaret />
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[650px]">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-slate-400 text-sm font-medium">Loading tickets...</div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                      <th className="pb-4 pt-1 font-bold pl-2 w-[24%]">
                        <div className="flex items-center gap-2">Subject <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[10%]">
                        <div className="flex items-center gap-2">Priority <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-bold w-[14%]">Category</th>
                      <th className="pb-4 pt-1 font-bold w-[8%]">Type</th>
                      <th className="pb-4 pt-1 font-bold w-[18%]">Submitter</th>
                      <th className="pb-4 pt-1 font-bold w-[14%]">Date</th>
                      <th className="pb-4 pt-1 font-bold w-[12%] text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">No tickets found</td>
                      </tr>
                    ) : (
                      filtered.map((t) => {
                        const isSelected = selectedId === t.id;
                        const priority = getPriority(t.category);
                        const isDoctor = t.submitterRole === "doctor";
                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedId(t.id)}
                            className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-4 pl-2">
                              <p className="text-[13px] font-bold text-slate-800 leading-tight">{t.subject}</p>
                              <p className="text-[11px] text-slate-400 font-medium">ID: {t.id.slice(0, 8).toUpperCase()}</p>
                            </td>
                            <td className={`py-4 text-[12px] font-bold ${priorityColor[priority]}`}>{priority}</td>
                            <td className="py-4 text-[12px] text-slate-500 font-medium capitalize">{(t.category || "").replace(/_/g, " ")}</td>
                            <td className="py-4">
                              <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${isDoctor ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                                {isDoctor ? "Doctor" : "Patient"}
                              </span>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[12px] flex-shrink-0">
                                  {displayName(t).slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[12px] font-bold text-slate-800 leading-tight">{displayName(t)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-[12px] text-slate-500 font-medium">{formatDate(t.createdAt)}</td>
                            <td className="py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-bold ${statusColors[t.status] || "bg-slate-100 text-slate-600"}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              <div className="mt-6 border-t border-slate-50 pt-5">
                {(
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(1 / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Ticket Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300 flex flex-col gap-5">

              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">{selected.subject}</h2>
                <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Type badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold ${selected.submitterRole === "doctor" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                  {selected.submitterRole === "doctor" ? "Doctor Request" : "Patient Request"}
                </span>
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                {(["Open", "In Progress", "Closed"] as Status[]).map((s) => (
                  <button
                    key={s}
                    disabled={savingStatus}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
                      selected.status === s
                        ? s === "Open" ? "bg-rose-500 text-white border-rose-500" : s === "In Progress" ? "bg-amber-400 text-white border-amber-400" : "bg-emerald-500 text-white border-emerald-500"
                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Created by */}
              <div>
                <p className="text-[12.5px] font-bold text-slate-800 mb-2">
                  {selected.submitterRole === "doctor" ? "Doctor" : "Patient"}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[13px] flex-shrink-0">
                    {displayName(selected).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-slate-800">{displayName(selected)}</p>
                    <p className="text-[11px] text-slate-400 font-medium">ID: {selected.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </div>

              {/* Properties */}
              <div className="bg-[#f8fafd] rounded-[1.25rem] p-5 space-y-3 border border-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Category</span>
                  <span className="text-[11px] text-slate-800 font-bold capitalize">{(selected.category || "").replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Date Created</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{formatDate(selected.createdAt)}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">Last Updated</span>
                  <span className="text-[11px] text-slate-800 font-bold text-right">{formatDate(selected.updatedAt)}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[12.5px] font-bold text-slate-800 mb-2">Message</p>
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed bg-slate-50 rounded-xl p-4">
                  {selected.description}
                </p>
              </div>

              {/* Admin Reply */}
              <div>
                <p className="text-[12.5px] font-bold text-slate-800 mb-2">Admin Reply</p>
                {selected.adminReply && (
                  <div className="bg-blue-50 border-l-4 border-[#6A8BFF] rounded-xl p-3 mb-3">
                    <p className="text-[11px] font-bold text-[#6A8BFF] mb-1">Sent reply</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">{selected.adminReply}</p>
                  </div>
                )}
                <textarea
                  className="w-full border border-slate-100 rounded-xl p-4 text-[12px] font-medium text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:border-[#6A8BFF] bg-[#f8fafd] transition min-h-[100px]"
                  placeholder={`Type your reply to the ${selected.submitterRole === "doctor" ? "doctor" : "patient"}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  onClick={handleSendReply}
                  disabled={savingReply || !replyText.trim()}
                  className="w-full py-3 mt-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] disabled:opacity-50 text-white rounded-[1rem] text-[13px] font-bold transition duration-200"
                >
                  {savingReply ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={null}>
      <SupportPageInner />
    </Suspense>
  );
}
