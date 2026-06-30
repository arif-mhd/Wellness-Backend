"use client";

import { useEffect, useState, useCallback } from "react";
import Session from "supertokens-web-js/recipe/session";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(opts.headers ?? {}),
    },
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl shadow-lg border border-[#EBEEF5] px-4 py-3 text-sm"
      style={{ background: "white", minWidth: 160 }}
    >
      <p className="font-semibold text-[#24292E] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-6 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-[#383F45]">
            {entry.value} Stars
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<{ averageRating: number, totalReviews: number, history: any[] }>({
    averageRating: 0,
    totalReviews: 0,
    history: []
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/feedback/pharmacy/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
    </div>
  );

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* ── Title Row ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 mb-8 mt-2">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
          Analytics & Trends
        </h1>
        <p className="text-[#707070] text-sm tracking-[-0.28px]">
          Track your performance and patient satisfaction
        </p>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
              Average Rating
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#D97706]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </span>
          </div>
          <div className="text-[#24292E] text-[28px] font-semibold tracking-[-0.56px]">
            {stats.averageRating.toFixed(1)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
              Total Reviews
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5476FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </span>
          </div>
          <div className="text-[#24292E] text-[28px] font-semibold tracking-[-0.56px]">
            {stats.totalReviews}
          </div>
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-[#EBEEF5] hover:border-gray-100 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
          <div>
            <h2 className="text-[#24292E] text-[20px] font-semibold tracking-[-0.4px]">
              Patient Satisfaction Trend
            </h2>
            <p className="text-[#A0A8B0] text-xs mt-0.5">
              Average rating month over month
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[#676E76]">
              <span className="w-3 h-0.5 rounded-full bg-[#D97706] inline-block" /> Avg Rating
            </span>
          </div>
        </div>

        <div className="h-[1px] bg-[#EBEEF5] w-full my-4" />

        {stats.history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <p className="font-medium text-[#24292E] mb-1">No rating history yet</p>
            <p className="text-xs text-[#676E76]">Once patients review your pharmacy, trends will appear here.</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.history} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontFamily: "Outfit" }}
                  dy={8}
                  tickFormatter={(val) => {
                    const d = new Date(val + "-01");
                    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                  }}
                />
                <YAxis
                  domain={[0, 5]}
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit" }}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="average"
                  name="Average Rating"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  fill="url(#gradRating)"
                  dot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#F59E0B", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
