"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PAGE_SIZE = 20;

type Source = "all" | "admin" | "doctor" | "patient" | "pharmacy" | "lab";

interface ActivityLog {
  id: string;
  source: string;
  action: string;
  details: string;
  performedBy: string;
  performedById: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

const SOURCE_TABS: { key: Source; label: string; color: string }[] = [
  { key: "all",      label: "All",      color: "bg-[#1E293B] text-white" },
  { key: "admin",    label: "Admin",    color: "bg-violet-600 text-white" },
  { key: "doctor",   label: "Doctor",   color: "bg-indigo-600 text-white" },
  { key: "patient",  label: "Patient",  color: "bg-emerald-600 text-white" },
  { key: "pharmacy", label: "Pharmacy", color: "bg-amber-500 text-white" },
  { key: "lab",      label: "Lab",      color: "bg-sky-600 text-white" },
];

const SOURCE_BADGE: Record<string, string> = {
  admin:    "bg-violet-100 text-violet-700 border-violet-200",
  doctor:   "bg-indigo-100 text-indigo-700 border-indigo-200",
  patient:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  pharmacy: "bg-amber-100 text-amber-700 border-amber-200",
  lab:      "bg-sky-100 text-sky-700 border-sky-200",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ActivityLogPage() {
  const [source, setSource]       = useState<Source>("all");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const [logs, setLogs]           = useState<ActivityLog[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Time-range filter: "recent" = last 24h, "past" = older than 24h, "all" = no filter
  const [timeRange, setTimeRange] = useState<"all" | "recent" | "past">("all");

  const fetchLogs = useCallback(async (src: Source, pg: number, tr: "all" | "recent" | "past") => {
    setLoading(true);
    setError("");
    try {
      const token = await Session.getAccessToken();
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(PAGE_SIZE),
      });
      if (src !== "all") params.set("source", src);

      const now = new Date();
      if (tr === "recent") {
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        params.set("from", cutoff);
      } else if (tr === "past") {
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        params.set("to", cutoff);
      }

      const res = await fetch(`${API_URL}/api/admin/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.pages ?? 1);
    } catch (e: any) {
      setError(e.message ?? "Error loading activity log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(source, page, timeRange);
  }, [source, page, timeRange, fetchLogs]);

  const handleSourceChange = (s: Source) => { setSource(s); setPage(1); };
  const handleTimeChange   = (t: "all" | "recent" | "past") => { setTimeRange(t); setPage(1); };

  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto space-y-6 pb-12 font-sans px-1 animate-in fade-in duration-300">

        {/* Header */}
        <div className="pt-2 flex items-center justify-between">
          <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Activity Log</h1>
          <span className="text-xs text-slate-400 font-medium">{total} total events</span>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Source filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleSourceChange(tab.key)}
                className={`px-5 py-2 rounded-full text-[12px] font-medium transition-all shadow-sm ${
                  source === tab.key
                    ? tab.color + " shadow-slate-300"
                    : "bg-white text-slate-500 border border-slate-100 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Time filters */}
          <div className="flex items-center gap-2">
            {(["all", "recent", "past"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTimeChange(t)}
                className={`px-5 py-2 rounded-full text-[12px] font-medium transition-all shadow-sm capitalize ${
                  timeRange === t
                    ? "bg-[#1E293B] text-white shadow-slate-300"
                    : "bg-white text-slate-500 border border-slate-100 hover:text-slate-800"
                }`}
              >
                {t === "all" ? "All Time" : t === "recent" ? "Last 24h" : "Past"}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(source, page, timeRange)}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700 border border-transparent hover:border-slate-100 transition"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden">
          {error ? (
            <div className="py-16 text-center text-red-500 text-sm">{error}</div>
          ) : loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs">Loading activity log…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium">No activity logs yet</span>
              <span className="text-xs">Actions across all portals will appear here</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-6 px-8 text-[12px] font-medium text-slate-800 w-[18%]">Date/Time</th>
                  <th className="py-6 px-4 text-[12px] font-medium text-slate-800 w-[12%]">Source</th>
                  <th className="py-6 px-4 text-[12px] font-medium text-slate-800 w-[20%]">Action</th>
                  <th className="py-6 px-4 text-[12px] font-medium text-slate-800 w-[35%]">Details</th>
                  <th className="py-6 px-8 text-[12px] font-medium text-slate-800">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`group border-b border-slate-50/70 last:border-0 ${
                      idx === 0 ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"
                    } transition-colors`}
                  >
                    <td className="py-4 px-8 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border capitalize ${SOURCE_BADGE[log.source] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {log.source}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[11px] font-semibold text-slate-600">{log.action}</td>
                    <td className="py-4 px-4 text-[11px] font-medium text-slate-500 max-w-sm">
                      <span className="line-clamp-2">{log.details}</span>
                    </td>
                    <td className="py-4 px-8 text-[11px] font-medium text-slate-500">{log.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-[2rem] flex items-center justify-between px-6 py-4 shadow-sm border border-slate-50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 transition"
              aria-label="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`w-9 h-9 rounded-full text-[13px] font-medium flex items-center justify-center transition-all ${
                    num === page
                      ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-200"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {num}
                </button>
              ))}
              {totalPages > 7 && page < totalPages - 3 && (
                <>
                  <span className="text-slate-400 text-xs px-1">…</span>
                  <button
                    onClick={() => setPage(totalPages)}
                    className="w-9 h-9 rounded-full text-[13px] font-medium flex items-center justify-center text-slate-500 hover:bg-slate-50"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-30 transition"
              aria-label="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
