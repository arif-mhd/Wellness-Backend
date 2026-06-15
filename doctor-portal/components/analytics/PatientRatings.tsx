"use client";

import React from "react";

interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
}

interface PatientRatingsProps {
  feedback: any[];
}

export default function PatientRatings({ feedback = [] }: PatientRatingsProps) {
  const reviews: Review[] = feedback.map((item) => {
    let avatarVal = "/patient-avatar-2.png";
    if (item.reviewer?.avatar) {
      if (item.reviewer.avatar.length <= 2) {
        // It's a text initials avatar, e.g. "KW", use patient-avatar or generate initials UI
        avatarVal = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.reviewer.name)}&background=random&color=fff`;
      } else {
        avatarVal = item.reviewer.avatar;
      }
    }
    return {
      id: item.id,
      name: item.reviewer?.name ?? "Anonymous Patient",
      avatar: avatarVal,
      rating: Number(item.rating) || 5,
      comment: item.comment || "",
    };
  });

  const totalReviews = feedback.length;
  const averageRating = totalReviews > 0
    ? (feedback.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / totalReviews).toFixed(1)
    : "5.0";

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-5 w-[340px]">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Patient Ratings
        </h2>
        <span className="text-[#838B95] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
        </span>
      </div>

      {/* Average Rating Block */}
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-[#5476FC] stroke-[#5476FC]">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[#24292E] text-[18px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
          {averageRating}
        </span>
      </div>

      {/* Separator line */}
      <div className="h-[1px] bg-[#EBEEF5] w-full" />

      {/* Review list */}
      <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
        {reviews.length === 0 ? (
          <div className="text-center text-xs text-[#838B95] py-8">
            No patient reviews available.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 bg-[#F5F6FA] rounded-[16px] border border-transparent hover:border-gray-200 transition-all flex flex-col gap-3"
            >
              {/* Reviewer Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm shrink-0">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/patient-avatar-2.png";
                      }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[#383F45] text-xs font-semibold leading-tight truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {rev.name}
                    </span>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      className={`${
                        i < rev.rating ? "fill-[#5476FC] stroke-[#5476FC]" : "fill-none stroke-gray-300"
                      }`}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <p className="text-[#596066] text-xs leading-relaxed font-normal break-words" style={{ fontFamily: "Inter, sans-serif" }}>
                {rev.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
