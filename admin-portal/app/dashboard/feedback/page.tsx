"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

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
  id: number;
  reviewer: Reviewer;
  provider: Provider;
  comment: string;
  rating: number;
  date: string;
}

const mockReviews: Review[] = [
  {
    id: 1,
    reviewer: { id: "r1", name: "Kristin Watson", email: "yelena@example.com", avatar: "KW" },
    provider: { id: "p1", name: "Dr. Rahim Chowdhury", email: "yelena@example.com", avatar: "RC" },
    comment: "Incredible group of people and talented professionals. Focused on the development of flexible and innovative solutions that meet diverse needs. Their commitment to excellence and collaboration creates an inspiring environment where ideas flourish. I highly recommend their services to anyone seeking expertise and dedication.",
    rating: 4,
    date: "2024-01-15",
  },
  {
    id: 2,
    reviewer: { id: "r2", name: "Cody Fisher", email: "yelena@example.com", avatar: "CF" },
    provider: { id: "p2", name: "Dr. Mehnaz Khan", email: "yelena@example.com", avatar: "MK" },
    comment: "Creative, innovative and strategic. We have great a...",
    rating: 4,
    date: "2024-01-14",
  },
  {
    id: 3,
    reviewer: { id: "r3", name: "Wade Warren", email: "yelena@example.com", avatar: "WW" },
    provider: { id: "p3", name: "Dr. Shama Islam", email: "yelena@example.com", avatar: "SI" },
    comment: "Creative, innovative and strategic. We have great a...",
    rating: 4,
    date: "2024-01-14",
  },
  {
    id: 4,
    reviewer: { id: "r4", name: "Esther Howard", email: "yelena@example.com", avatar: "EH" },
    provider: { id: "p4", name: "Dr. Aminul Haque", email: "yelena@example.com", avatar: "AH" },
    comment: "Very inspiring working experience with their represe...",
    rating: 4,
    date: "2024-01-13",
  },
  {
    id: 5,
    reviewer: { id: "r5", name: "Arlene McCoy", email: "yelena@example.com", avatar: "AM" },
    provider: { id: "p5", name: "Alto Pharmacy", email: "yelena@example.com", avatar: "AP" },
    comment: "The partner been progressing well with the business...",
    rating: 4,
    date: "2024-01-13",
  },
  {
    id: 6,
    reviewer: { id: "r6", name: "Brooklyn Simmons", email: "yelena@example.com", avatar: "BS" },
    provider: { id: "p6", name: "Dr. Sultana Rahman", email: "yelena@example.com", avatar: "SR" },
    comment: "Creative, innovative and strategic. We have great a...",
    rating: 4,
    date: "2024-01-12",
  },
  {
    id: 7,
    reviewer: { id: "r7", name: "Dianne Russell", email: "yelena@example.com", avatar: "DR" },
    provider: { id: "p7", name: "Dr. Nargis Ahmed", email: "yelena@example.com", avatar: "NA" },
    comment: "The service provided is incredible, the insights and k...",
    rating: 4,
    date: "2024-01-12",
  },
  {
    id: 8,
    reviewer: { id: "r8", name: "Cameron Williamson", email: "yelena@example.com", avatar: "CW" },
    provider: { id: "p8", name: "CVS Pharmacy", email: "yelena@example.com", avatar: "CP" },
    comment: "Creative, innovative and strategic. We have great a...",
    rating: 4,
    date: "2024-01-11",
  },
];

const pastReviews = [
  { id: 101, providerName: "Kelemen Krisztina", comment: "His attentive approach and thorough understanding of my condition made me feel con...", rating: 4 },
  { id: 102, providerName: "Szűcs Gabriella", comment: "I had a fantastic experience with Dr. John Smith. He is very knowledgeable and genuinely cares ab...", rating: 4 },
  { id: 103, providerName: "Somogyi Adél", comment: "Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care ar...", rating: 4 },
];

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
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const selected = mockReviews.find((r) => r.id === selectedId);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* LEFT CONTENT */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>
            
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Feedback and Rating</h1>
              <button className="flex items-center gap-2 bg-[#f4f7ff] hover:bg-[#eaf0ff] text-[#6A8BFF] px-5 py-2.5 rounded-full text-[13px] font-bold transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Manage Feedback Form
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm border border-slate-100 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <button className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Today
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] select-none mt-1">
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

            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[650px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-bold text-slate-700">
                    <th className="pb-4 pt-1 font-bold pl-2 w-[25%]">
                      <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Name <DoubleCaret /></div>
                    </th>
                    <th className="pb-4 pt-1 font-bold w-[25%]">Provider Rated</th>
                    <th className="pb-4 pt-1 font-bold w-[40%]">Comments</th>
                    <th className="pb-4 pt-1 font-bold w-[10%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockReviews.map((rev) => {
                    const isSelected = selectedId === rev.id;
                    return (
                      <tr
                        key={rev.id}
                        onClick={() => setSelectedId(rev.id)}
                        className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${isSelected ? "bg-[#f8fafd]" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="py-4 pl-2 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                            <img src="/doctor-avatar.png" alt={rev.reviewer.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-800 leading-tight">{rev.reviewer.name}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{rev.reviewer.email}</p>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src="/doctor-avatar.png" alt={rev.provider.name} className="w-full h-full object-cover opacity-90" />
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-800 leading-tight">{rev.provider.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{rev.provider.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-[12px] text-slate-500 font-medium pr-6">
                          <p className="line-clamp-1">{rev.comment}</p>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <StarRating rating={rev.rating} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button key={n} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${n === 1 ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{n}</button>
                ))}
                <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
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
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                  <img src="/doctor-avatar.png" alt={selected.reviewer.name} className="w-full h-full object-cover" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="text-[14px] font-black text-slate-800">{selected.reviewer.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{selected.reviewer.email}</p>
                </div>
              </div>

              {/* Provider Rated Block */}
              <div className="bg-[#f8fafd] rounded-[1rem] p-4 flex items-center gap-4 mb-4 border border-slate-50">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                  <img src="/doctor-avatar.png" alt={selected.provider.name} className="w-full h-full object-cover opacity-90" />
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
                  "{selected.comment}"
                </p>
              </div>

              {/* Past Reviews List */}
              <div className="pt-6 border-t border-slate-50">
                <h3 className="text-[13px] font-bold text-slate-800 mb-6">Past Reviews from this user (10)</h3>
                <div className="space-y-6">
                  {pastReviews.map((pr) => (
                    <div key={pr.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white mt-1">
                        <img src="/doctor-avatar.png" alt={pr.providerName} className="w-full h-full object-cover opacity-90" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-bold text-slate-800">{pr.providerName}</p>
                          <StarRating rating={pr.rating} />
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
                          {pr.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
