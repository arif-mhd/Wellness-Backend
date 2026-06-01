"use client";

import React from "react";

interface Review {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
}

export default function PatientRatings() {
  const reviews: Review[] = [
    {
      id: 1,
      name: "Kelemen Krisztina",
      avatar: "/patient-avatar-2.png",
      rating: 5,
      comment: "His attentive approach and thorough understanding of my condition made me feel extremely cared for.",
    },
    {
      id: 2,
      name: "Szűts Gabriella",
      avatar: "/patient-avatar-1.png",
      rating: 5,
      comment: "I had a fantastic experience with Dr. John Smith. He is very knowledgeable and genuinely caring.",
    },
    {
      id: 3,
      name: "Somogyi Adél",
      avatar: "/patient-avatar-2.png",
      rating: 5,
      comment: "Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care is unmatched.",
    },
    {
      id: 4,
      name: "Barta Emese",
      avatar: "/patient-avatar-1.png",
      rating: 4,
      comment: "Very professional and friendly behavior. Listened to all my queries patiently and answered thoroughly.",
    },
    {
      id: 5,
      name: "Somogyi Adél",
      avatar: "/patient-avatar-2.png",
      rating: 5,
      comment: "Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care is unmatched.",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-white shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
          Patient Ratings
        </h2>
        <button
          onClick={() => alert("View all reviews")}
          className="text-[#5476FC] text-xs font-semibold hover:underline"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          View All Reviews
        </button>
      </div>

      {/* Average Rating Block */}
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" className="fill-[#5476FC] stroke-[#5476FC]">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[#24292E] text-[18px] font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
          4.2
        </span>
      </div>

      {/* Separator line */}
      <div className="h-[1px] bg-[#EBEEF5] w-full" />

      {/* Review list */}
      <div className="flex flex-col gap-3">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-4 bg-[#F5F6FA] rounded-[16px] border border-transparent hover:border-gray-200 transition-all flex flex-col gap-3"
          >
            {/* Reviewer Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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
                <div className="flex flex-col">
                  <span className="text-[#383F45] text-xs font-semibold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {rev.name}
                  </span>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5">
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
            <p className="text-[#596066] text-xs leading-relaxed font-normal" style={{ fontFamily: "Inter, sans-serif" }}>
              {rev.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
