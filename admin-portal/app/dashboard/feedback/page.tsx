"use client";

import { useEffect, useState, useCallback } from "react";
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

interface Reviewer {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface Review {
  id: string;
  reviewer: Reviewer;
  provider: Provider;
  comment: string;
  rating: number;
  date: string;
  folder: string; // appointment, pharmacy, lab
  createdAt: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-3.5 h-3.5 ${star <= rating ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#dce5fe] fill-[#dce5fe]"}`}
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function FeedbackPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<string>("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filterFolder ? `/api/feedback/admin?folder=${filterFolder}` : "/api/feedback/admin";
      const res = await adminFetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch reviews: status ${res.status}`);
      }
      const data = await res.json();
      setReviews(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      } else {
        setSelectedId(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while loading feedbacks.");
    } finally {
      setLoading(false);
    }
  }, [filterFolder]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const selected = reviews.find((r) => r.id === selectedId);

  // Filter other reviews from the same reviewer (to display on the sidebar)
  const reviewerPastReviews = selected
    ? reviews.filter((r) => r.reviewer.id === selected.reviewer.id && r.id !== selected.id)
    : [];

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        {error && (
          <div className="mb-6 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-[13px] font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          {/* LEFT CONTENT */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Feedback and Rating</h1>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { value: "", label: "All Reviews" },
                  { value: "appointment", label: "Consultations" },
                  { value: "pharmacy", label: "Pharmacy" },
                  { value: "lab", label: "Diagnostics/Lab" },
                ].map((tab) => {
                  const isActive = filterFolder === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setFilterFolder(tab.value)}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                        isActive
                          ? "bg-[#24292E] text-white border-transparent shadow-sm"
                          : "bg-white text-[#475569] border-[#e2e8f0] hover:border-slate-300 hover:text-slate-800"
                      }`}
                    >
                      {tab.value === "" ? "ALL" : tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchReviews}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 shadow-sm border border-slate-100 transition"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[650px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 my-auto">
                  <div className="w-8 h-8 border-[3px] border-[#6A8BFF]/30 border-t-[#6A8BFF] rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 font-semibold">Loading reviews…</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 my-auto">
                  <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.173-.439.81-.439.98 0l2.42 5.03 5.433.727c.48.064.672.643.298.98l-3.972 3.593 1.05 5.378c.09.46-.395.813-.81.588L12 18.068l-4.836 2.54c-.415.225-.9-.128-.81-.588l1.05-5.378-3.972-3.593c-.374-.337-.182-.916.298-.98l5.433-.727 2.42-5.03z" />
                  </svg>
                  <p className="text-sm font-semibold">No reviews found for this service</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                        <th className="pb-4 pt-1 font-bold pl-2 w-[25%]">
                          <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Name <DoubleCaret /></div>
                        </th>
                        <th className="pb-4 pt-1 font-bold w-[25%]">Provider Rated</th>
                        <th className="pb-4 pt-1 font-bold w-[35%]">Comments</th>
                        <th className="pb-4 pt-1 font-bold w-[5%] text-center">Service</th>
                        <th className="pb-4 pt-1 font-bold w-[10%] text-right pr-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((rev) => {
                        const isSelected = selectedId === rev.id;
                        return (
                          <tr
                            key={rev.id}
                            onClick={() => setSelectedId(rev.id)}
                            className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-4 pl-2 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full border border-slate-100 flex-shrink-0 bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-bold text-sm">
                                {rev.reviewer.avatar || rev.reviewer.name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{rev.reviewer.name}</p>
                                <p className="text-[11px] text-slate-400 font-medium truncate">{rev.reviewer.email}</p>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border border-slate-100 flex-shrink-0 bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                  {rev.provider.avatar || rev.provider.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[12px] font-bold text-slate-800 leading-tight truncate">{rev.provider.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium truncate">{rev.provider.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-[12px] text-slate-500 font-medium pr-6">
                              <p className="line-clamp-1">{rev.comment || <span className="italic text-slate-300">No comment left</span>}</p>
                            </td>
                            <td className="py-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rev.folder === "appointment" ? "bg-blue-50 text-blue-500" :
                                rev.folder === "pharmacy" ? "bg-emerald-50 text-emerald-500" : "bg-purple-50 text-purple-500"
                              }`}>
                                {rev.folder === "appointment" ? "Consult" : rev.folder === "pharmacy" ? "Pharmacy" : "Lab"}
                              </span>
                            </td>
                            <td className="py-4 pr-2 text-right">
                              <div className="flex justify-end">
                                <StarRating rating={rev.rating} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination (visual placeholder matching design) */}
              {!loading && reviews.length > 0 && (
                <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition" aria-label="Previous">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center bg-[#6A8BFF] text-white shadow-md shadow-blue-100">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition" aria-label="Next">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Rating Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">
              <div className="flex items-center justify-between pb-5 border-b border-slate-50">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Rating Details</h2>
                <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Reviewer Details */}
              <div className="flex items-center gap-4 mt-6 mb-8">
                <div className="relative w-12 h-12 rounded-full border border-slate-100 flex-shrink-0 bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-bold text-base">
                  {selected.reviewer.avatar || selected.reviewer.name[0]}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="text-[14px] font-black text-slate-800">{selected.reviewer.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{selected.reviewer.email}</p>
                </div>
              </div>

              {/* Provider Rated Block */}
              <div className="bg-[#f8fafd] rounded-[1rem] p-4 flex items-center gap-4 mb-4 border border-slate-50">
                <div className="w-10 h-10 rounded-full border border-slate-100 flex-shrink-0 bg-white flex items-center justify-center text-slate-600 font-bold text-xs">
                  {selected.provider.avatar || selected.provider.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-800">{selected.provider.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{selected.provider.email}</p>
                </div>
              </div>

              {/* Rating & Full Comment */}
              <div className="mb-8">
                <div className="mb-3">
                  <StarRating rating={selected.rating} />
                </div>
                <p className="text-[12.5px] text-slate-500 font-medium leading-relaxed">
                  {selected.comment ? `"${selected.comment}"` : <span className="italic text-slate-400">No comment provided</span>}
                </p>
              </div>

              {/* Past Reviews List from this User */}
              <div className="pt-6 border-t border-slate-50">
                <h3 className="text-[13px] font-bold text-slate-800 mb-6">
                  Past Reviews from this user ({reviewerPastReviews.length})
                </h3>
                {reviewerPastReviews.length === 0 ? (
                  <p className="text-[11.5px] text-slate-400 font-medium italic">No other reviews from this user.</p>
                ) : (
                  <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1">
                    {reviewerPastReviews.map((pr) => (
                      <div key={pr.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-xs mt-1">
                          {pr.provider.avatar || pr.provider.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-bold text-slate-800">{pr.provider.name}</p>
                            <StarRating rating={pr.rating} />
                          </div>
                          <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                            {pr.comment || <span className="italic text-slate-300">No comment</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
