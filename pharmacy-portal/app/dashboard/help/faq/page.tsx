"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 1,
    question: "How do I reset my password?",
    answer: "To reset your password, click on the \"Forgot Password\" link on the login page, enter your email or phone number, and follow the instructions sent to your inbox.",
  },
  {
    id: 2,
    question: "How can I schedule an appointment?",
    answer: "You can schedule an appointment by logging into your account, navigating to the \"Appointments\" section, and selecting your preferred date and time from the available slots.",
  },
  {
    id: 3,
    question: "How do I update my personal information?",
    answer: "To update your personal details, log into your account, go to the \"Profile\" section, and make the necessary changes to your information.",
  },
  {
    id: 4,
    question: "Can I cancel or reschedule an appointment?",
    answer: "Yes, you can cancel or reschedule an appointment up to 24 hours before the scheduled time by going to the \"Appointments\" section and selecting \"Reschedule\" or \"Cancel.\"",
  },
  {
    id: 5,
    question: "How do I update my personal information?",
    answer: "To update your personal details, log into your account, go to the \"Profile\" section, and make the necessary changes to your information.",
  },
  {
    id: 6,
    question: "How can I schedule an appointment?",
    answer: "You can schedule an appointment by logging into your account, navigating to the \"Appointments\" section, and selecting your preferred date and time from the available slots.",
  },
  {
    id: 7,
    question: "Can I cancel or reschedule an appointment?",
    answer: "Yes, you can cancel or reschedule an appointment up to 24 hours before the scheduled time by going to the \"Appointments\" section and selecting \"Reschedule\" or \"Cancel.\"",
  },
  {
    id: 8,
    question: "Can I cancel or reschedule an appointment?",
    answer: "Yes, you can cancel or reschedule an appointment up to 24 hours before the scheduled time by going to the \"Appointments\" section and selecting \"Reschedule\" or \"Cancel.\"",
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // Pre-expand all items to match mockup visual state perfectly on load
  const [expandedIds, setExpandedIds] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);

  const toggleExpand = (id: number) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter((x) => x !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="px-10 pb-12 select-none flex flex-col gap-8">
        
        {/* Header: Back Button + Title */}
        <div className="flex items-center gap-4 mt-2">
          <Link
            href="/dashboard/help"
            title="Back to Help & Support"
            className="w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#EBEEF5] flex items-center justify-center text-[#5476FC] hover:bg-slate-50 hover:shadow-md transition-all shrink-0"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path
                d="M5 9L1 5l4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          
          <h1
            className="text-[#24292E] font-medium text-[22px] tracking-[-0.44px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Frequently Asked Questions
          </h1>
        </div>

        {/* Center Search Help Input */}
        <div className="flex flex-col items-center justify-center py-2 w-full">
          <div className="relative w-full max-w-[480px]">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#9EA5AD]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12.2504 12.2504L9.71289 9.71289"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Need some help?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F6FA] text-[#24292E] placeholder-[#9EA5AD] text-xs rounded-full pl-12 pr-6 py-3.5 border border-transparent focus:border-[#EBEEF5] focus:bg-white outline-none transition-all text-center"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        </div>

        {/* Accordion FAQ list */}
        <div className="flex flex-col gap-4 w-full">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                onClick={() => toggleExpand(faq.id)}
                className="bg-[#F5F7FB] border border-[#E9EEF5] rounded-[16px] p-5 cursor-pointer hover:bg-[#EEF1F7] transition-all flex flex-col gap-2.5"
              >
                {/* Header: Marcellus Question + Rotating Chevron */}
                <div className="flex items-center justify-between gap-4 w-full">
                  <h3
                    className="text-[#24292E] text-base font-normal tracking-tight"
                    style={{ fontFamily: "Marcellus, serif" }}
                  >
                    {faq.question}
                  </h3>
                  <div
                    className={`text-[#9EA5AD] hover:text-[#5476FC] transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
                      <path
                        d="M1 1l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Body Answer: Outfit Answer Text */}
                {isExpanded && (
                  <p
                    className="text-[#676E76] text-xs leading-relaxed font-medium animate-in fade-in slide-in-from-top-1 duration-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div
              className="py-12 text-center text-[#9EA5AD] text-xs font-semibold"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              No frequently asked questions found.
            </div>
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}
