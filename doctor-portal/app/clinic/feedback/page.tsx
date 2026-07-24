"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface Review {
  id: string;
  rating: number;
  comment: string;
  date: string;
  createdAt: string;
  reviewer: { id: string; name: string; email: string; avatar: string };
  provider: { id: string; name: string; email: string; avatar: string };
  clinicReply?: { text: string; repliedAt: string } | null;
}

interface DoctorGroup {
  id: string;
  name: string;
  avatar: string;
  avgRating: number;
  total: number;
  lastDate: string;
  reviews: Review[];
}

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(value) ? "#5476FC" : "#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url && url.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold text-xs shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

type SortKey = "name" | "rating" | "date";

export default function ClinicFeedbackPage() {
  const [activeTab, setActiveTab] = useState<"clinic" | "doctors">("clinic");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/clinics/feedback")
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data.reviews) ? data.reviews : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  // Group reviews by the doctor they're about — powers both the Doctors tab
  // and the right-hand "Rating and Reviews" detail panel (always shows the
  // full context for whichever doctor is currently selected).
  const doctorGroups = useMemo<DoctorGroup[]>(() => {
    const map = new Map<string, DoctorGroup>();
    for (const r of reviews) {
      const id = r.provider?.id ?? "unknown";
      if (!map.has(id)) {
        map.set(id, { id, name: r.provider?.name ?? "Doctor", avatar: r.provider?.avatar, avgRating: 0, total: 0, lastDate: r.date, reviews: [] });
      }
      const g = map.get(id)!;
      g.reviews.push(r);
      if (new Date(r.createdAt) > new Date(g.lastDate || 0)) g.lastDate = r.date;
    }
    for (const g of map.values()) {
      g.avgRating = g.reviews.length > 0 ? Math.round((g.reviews.reduce((s, r) => s + r.rating, 0) / g.reviews.length) * 10) / 10 : 0;
      g.total = g.reviews.length;
      g.reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return Array.from(map.values());
  }, [reviews]);

  const doctorTotalById = useMemo(() => {
    const m: Record<string, number> = {};
    doctorGroups.forEach((g) => { m[g.id] = g.total; });
    return m;
  }, [doctorGroups]);

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = (a.reviewer?.name ?? "").localeCompare(b.reviewer?.name ?? "");
      else if (sortKey === "rating") cmp = a.rating - b.rating;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return cmp * sortDir;
    });
    return list;
  }, [reviews, sortKey, sortDir]);

  const sortedDoctors = useMemo(() => {
    const list = [...doctorGroups];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "rating") cmp = a.avgRating - b.avgRating;
      else cmp = new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();
      return cmp * sortDir;
    });
    return list;
  }, [doctorGroups, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  };

  const selectedDoctor = doctorGroups.find((g) => g.id === selectedDoctorId) ?? null;
  const selectedReview = selectedDoctor?.reviews.find((r) => r.id === selectedReviewId) ?? null;

  const viewReview = (r: Review) => {
    setSelectedDoctorId(r.provider?.id ?? null);
    setSelectedReviewId(r.id);
    setReplyText(r.clinicReply?.text ?? "");
    setReplyError("");
  };

  const viewDoctor = (g: DoctorGroup) => {
    setSelectedDoctorId(g.id);
    setSelectedReviewId(g.reviews[0]?.id ?? null);
    setReplyText(g.reviews[0]?.clinicReply?.text ?? "");
    setReplyError("");
  };

  const pickReview = (r: Review) => {
    setSelectedReviewId(r.id);
    setReplyText(r.clinicReply?.text ?? "");
    setReplyError("");
  };

  const submitReply = async () => {
    if (!selectedReviewId || !replyText.trim()) return;
    setSavingReply(true);
    setReplyError("");
    try {
      const res = await apiFetch(`/api/clinics/feedback/${selectedReviewId}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save reply.");
      }
      const { review } = await res.json();
      setReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
    } catch (err: any) {
      setReplyError(err.message ?? "Failed to save reply.");
    } finally {
      setSavingReply(false);
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 text-[11px] font-semibold text-[#9EA5AD] uppercase tracking-wide hover:text-[#676E76] transition-colors">
      {label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={sortKey === k ? "opacity-100" : "opacity-40"}>
        <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === 1 && sortKey === k ? "M19 15l-7-7-7 7" : "M5 9l7 7 7-7"} />
      </svg>
    </button>
  );

  return (
    <div className="flex h-full w-full font-sans select-none px-5 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Left */}
      <div className="flex-1 flex flex-col min-w-0 pr-8">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px] mb-6">
          Feedbacks and Rating
        </h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("clinic")}
            className={`px-8 py-2 rounded-xl text-[13px] font-medium tracking-wide transition-all ${activeTab === "clinic" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Clinic
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`px-8 py-2 rounded-xl text-[13px] font-medium tracking-wide transition-all ${activeTab === "doctors" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            Doctors
          </button>
        </div>

        <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr] gap-4 px-6 mb-2">
          <SortHeader label={activeTab === "clinic" ? "Name of Patient" : "Doctor"} k="name" />
          <SortHeader label="Ratings" k="rating" />
          <SortHeader label="Date" k="date" />
          <span />
        </div>

        {loading ? (
          <div className="text-center py-10 text-[#838B95] text-sm">Loading…</div>
        ) : activeTab === "clinic" ? (
          sortedReviews.length === 0 ? (
            <div className="text-center py-10 text-[#838B95] text-sm">No reviews yet.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedReviews.map((r) => (
                <div
                  key={r.id}
                  onClick={() => viewReview(r)}
                  className={`grid grid-cols-[2.5fr_1.5fr_1fr_1fr] gap-4 items-center px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selectedReviewId === r.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={r.reviewer?.name} url={r.reviewer?.avatar} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-semibold text-[#24292E] truncate">{r.reviewer?.name ?? "Patient"}</span>
                      <span className="text-[11px] text-[#9EA5AD] truncate">{r.provider?.name ?? "Doctor"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-[13px] font-semibold text-[#24292E]">{r.rating.toFixed(1)}</span>
                    <span className="text-[11px] text-[#9EA5AD]">({doctorTotalById[r.provider?.id] ?? 0})</span>
                  </div>
                  <span className="text-[12px] text-[#676E76]">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                  <button onClick={(e) => { e.stopPropagation(); viewReview(r); }} className="flex items-center gap-1 justify-self-start px-4 py-1.5 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                    View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : sortedDoctors.length === 0 ? (
          <div className="text-center py-10 text-[#838B95] text-sm">No reviews yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedDoctors.map((g) => (
              <div
                key={g.id}
                onClick={() => viewDoctor(g)}
                className={`grid grid-cols-[2.5fr_1.5fr_1fr_1fr] gap-4 items-center px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selectedDoctorId === g.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={g.name} url={g.avatar} />
                  <span className="text-[14px] font-semibold text-[#24292E] truncate">{g.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stars value={g.avgRating} />
                  <span className="text-[13px] font-semibold text-[#24292E]">{g.avgRating.toFixed(1)}</span>
                  <span className="text-[11px] text-[#9EA5AD]">({g.total})</span>
                </div>
                <span className="text-[12px] text-[#676E76]">{new Date(g.lastDate).toLocaleDateString("en-GB")}</span>
                <button onClick={(e) => { e.stopPropagation(); viewDoctor(g); }} className="flex items-center gap-1 justify-self-start px-4 py-1.5 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                  View
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Rating and Reviews detail */}
      <div className="w-[400px] shrink-0">
        <div className="bg-[#EEF0FC] rounded-[24px] p-7 shadow-sm flex flex-col gap-5 sticky top-4">
          <h2 className="text-[#24292E] text-[16px] font-medium">Rating and Reviews</h2>

          {!selectedDoctor ? (
            <p className="text-[#838B95] text-sm text-center py-16">Select a review to view details.</p>
          ) : (
            <>
              <span className="w-fit px-4 py-1.5 bg-black text-white text-[11px] font-semibold rounded-lg tracking-wide">
                {selectedDoctor.name}
              </span>

              <div className="flex items-center gap-2">
                <Stars value={selectedDoctor.avgRating} size={18} />
                <span className="text-[22px] font-semibold text-[#24292E]">{selectedDoctor.avgRating.toFixed(1)}</span>
                <span className="text-[12px] text-[#9EA5AD]">{selectedDoctor.total} review{selectedDoctor.total !== 1 ? "s" : ""}</span>
              </div>

              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                {selectedDoctor.reviews.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => pickReview(r)}
                    className={`px-4 py-3 rounded-xl border cursor-pointer transition-all ${selectedReviewId === r.id ? "border-[#5476FC] bg-white" : "border-transparent bg-white/60 hover:bg-white"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-[#24292E]">{r.reviewer?.name ?? "Patient"}</span>
                      <span className="text-[10px] text-[#9EA5AD]">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <Stars value={r.rating} />
                    <p className="text-[11px] text-[#676E76] mt-1.5 leading-relaxed line-clamp-2">{r.comment || "No comment left."}</p>
                    {r.clinicReply && (
                      <p className="text-[10.5px] text-[#5476FC] mt-1.5 leading-relaxed">
                        <span className="font-semibold">Your reply: </span>{r.clinicReply.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {selectedReview && (
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Reply</label>
                  {replyError && <p className="text-[11px] text-red-500 mb-2">{replyError}</p>}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply to this review…"
                    rows={4}
                    className="w-full border border-[#D9DEEB] rounded-xl px-4 py-3 bg-white text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm resize-none"
                  />
                  <button
                    onClick={submitReply}
                    disabled={savingReply || !replyText.trim()}
                    className="mt-3 w-full py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {savingReply ? "Updating…" : "Update"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
