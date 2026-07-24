"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { signOut } from "supertokens-web-js/recipe/session";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Branch {
  id: string;
  name: string;
  address?: string;
  status: "requested" | "details_pending" | "pending_approval" | "active" | "rejected";
}

interface ClinicDoctor {
  id: string;
  isOnline?: boolean;
}

interface Review {
  rating: number;
  comment?: string;
  reviewer?: { name?: string; avatar?: string };
  createdAt: string;
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr12 = h % 12 || 12;
  return `${hr12}.${String(m).padStart(2, "0")} ${ampm}`;
}

const BRANCH_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  requested: "Request Pending Review",
  details_pending: "Awaiting Your Details",
  pending_approval: "Pending Final Approval",
  rejected: "Rejected",
};

const BRANCH_STATUS_COLOR: Record<string, string> = {
  active: "text-[#179353] bg-[#E2F8EB]",
  requested: "text-[#B7791F] bg-[#FEF3C7]",
  details_pending: "text-[#3B59E3] bg-[#EEF2FF]",
  pending_approval: "text-[#B7791F] bg-[#FEF3C7]",
  rejected: "text-[#DC2626] bg-[#FEE2E2]",
};

// ── Small helpers ──────────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[#596066] hover:text-[#5476FC] transition-colors p-0.5 shrink-0">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.75 9a6.75 6.75 0 1 1-6.75-6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.335 9.788 8.25 9.75V7.665l4.822-4.822a.563.563 0 0 1 .796 0l1.065 1.065a.563.563 0 0 1 0 .795L10.335 9.788Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function SectionCard({ title, children, onEdit, editLabel }: { title: string, children: React.ReactNode, onEdit?: () => void, editLabel?: string }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-medium tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</span>
        {onEdit && (
          editLabel ? (
            <button onClick={onEdit} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[11px] font-medium px-4 py-1.5 rounded-lg shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none">
              {editLabel}
            </button>
          ) : (
            <EditBtn onClick={onEdit} />
          )
        )}
      </div>
      <div className="h-[1px] bg-[#EBEEF5] w-full" />
      <div className="text-[#676E76] text-[13px] font-normal leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, bold }: { label: string, value: string, bold?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#676E76] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</span>
      <span className={`text-[#24292E] text-[13px] ${bold ? 'font-medium' : 'font-normal'}`} style={{ fontFamily: "Outfit, sans-serif" }}>{value || "—"}</span>
    </div>
  );
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= full ? "#3B82F6" : "#A0A8B0"} stroke={i <= full ? "#3B82F6" : "#A0A8B0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
}

export default function ClinicProfilePage() {
  const router = useRouter();
  const [clinic, setClinic] = useState<any>({});
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewTab, setReviewTab] = useState<"patient" | "peer">("patient");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => setClinic(data.clinic ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));

    apiFetch("/api/clinics/doctors")
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data.doctors) ? data.doctors : []))
      .catch(() => setDoctors([]));

    apiFetch("/api/clinics/reviews")
      .then((r) => r.json())
      .then((data) => {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setReviewTotal(data.total ?? 0);
        setAvgRating(data.avgRating ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    try { await signOut(); } catch { /* ignore */ }
    router.replace("/auth/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = clinic.clinicName || clinic.fullName;
  const branches: Branch[] = Array.isArray(clinic.branches) ? clinic.branches : [];
  const clinicSlots: Slot[] = Array.isArray(clinic.slots) ? clinic.slots : [];
  const insurances: any[] = Array.isArray(clinic.insurances) ? clinic.insurances : [];
  const otherInfo: { label: string; value: string }[] = Array.isArray(clinic.otherInfo) ? clinic.otherInfo : [];
  const languages = clinic.languages || "—";

  const doctorsOnline = doctors.filter((d) => d.isOnline).length;

  const groupedClinicSlots = DAY_NAMES.map((name, dow) => {
    const daySlots = clinicSlots.filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { day: name, hours: daySlots.length > 0 ? daySlots.map((s) => `${fmt12(s.startTime)} - ${fmt12(s.endTime)}`).join(", ") : "Closed" };
  });

  return (
    <div className="px-8 py-8 overflow-y-auto h-full w-full">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6 w-full min-w-0">

          {/* Hero Section */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-5">
              <div className="w-[84px] h-[84px] rounded-full border-2 border-[#EBEEF5] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {clinic.clinicImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.clinicImageUrl} alt="Clinic Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#5476FC] text-2xl font-bold">{displayName?.[0]?.toUpperCase() || "C"}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[#24292E] text-[28px] font-medium leading-none tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {displayName || "Your Clinic Name"}
                </h1>
                <span className="text-[#676E76] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {`Lic number ${clinic.licenseNumber || "—"}`}
                  {branches.filter((b) => b.status === "active").length > 0 &&
                    ` · ${branches.filter((b) => b.status === "active").length} additional branch${branches.filter((b) => b.status === "active").length === 1 ? "" : "es"}`}
                </span>
                {doctors.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 w-fit bg-[#E2F8EB] text-[#179353] text-[11px] font-medium px-2.5 py-1 rounded-full mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1FAF65]" />
                    {doctorsOnline}/{doctors.length} Doctors Online
                  </span>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-6 py-2 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              LOGOUT
            </button>
          </div>

          <div className="h-[1px] bg-[#EBEEF5] w-full" />

          {/* Time slots — main branch's own hours, always meaningful */}
          <SectionCard title="Time slots" onEdit={() => router.push("/clinic/schedules")} editLabel="EDIT TIMESLOTS">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {groupedClinicSlots.map((row) => (
                <div key={row.day} className="min-w-[140px]">
                  {row.day.slice(0, 3)} : {row.hours}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Bio */}
          <SectionCard title="Bio">
            {clinic.bio || "No bio added yet."}
          </SectionCard>

          {/* Licenses */}
          <SectionCard title="Licenses">
            <div className="flex flex-col gap-1">
              <span>License Number: {clinic.licenseNumber || "—"}</span>
              <span>DOH License: {clinic.dohLicense || "—"}</span>
            </div>
          </SectionCard>

          {/* Locations */}
          <SectionCard title="Locations">
            {clinic.address || "No address added yet."}
          </SectionCard>

          {/* Additional branch locations, if any */}
          {branches.length > 0 && (
            <SectionCard title="Additional Branch Locations">
              <div className="flex flex-col gap-3">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-gray-50/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#24292E] text-[13px] font-medium">{b.name}</span>
                      <span className="text-[#676E76] text-xs">{b.address || "—"}</span>
                    </div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${BRANCH_STATUS_COLOR[b.status] ?? "text-gray-500 bg-gray-100"}`}>
                      {BRANCH_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Insurances */}
          <SectionCard title="Insurances">
            {insurances.length === 0 ? (
              <span>No insurances added yet.</span>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {insurances.map((ins, i) => (
                  <li key={i}>{i + 1} - {ins.insurance}{ins.network ? ` (${ins.network})` : ""}{ins.discounts ? ` — ${ins.discounts}` : ""}</li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="h-[1px] bg-[#EBEEF5] w-full my-2" />

          {/* Owner Details */}
          <SectionCard title="Owner Details">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
              <Field label="Contact Number" value={clinic.phone} bold />
              <Field label="Height" value={clinic.height} bold />
              <Field label="Weight" value={clinic.weight} bold />

              <Field label="Emirates ID" value={clinic.emiratesIdOrPassport} bold />
              <Field label="Position in Clinic" value={clinic.positionInClinic} bold />
              <div className="hidden lg:block"></div>

              <Field label="Email ID" value={clinic.email} bold />
              <Field label="Languages" value={languages} bold />
              <div className="hidden lg:block"></div>

              <Field label="Gender" value={clinic.gender} bold />
              <div className="col-span-1 lg:col-span-2 row-span-4 bg-gray-50/50 rounded-lg p-3">
                <span className="text-[#24292E] text-[13px] font-medium block mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Other Information</span>
                {otherInfo.length === 0 ? (
                  <span className="text-xs text-[#676E76]">No additional information added.</span>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-xs text-[#676E76]">
                    {otherInfo.map((row, i) => (
                      <li key={i}>• {row.label}: {row.value}</li>
                    ))}
                  </ul>
                )}
              </div>

              <Field label="Date of Birth" value={clinic.dateOfBirth} bold />
              <Field label="Blood Group" value={clinic.bloodGroup} bold />
              <Field label="Marital Status" value={clinic.maritalStatus} bold />
            </div>
          </SectionCard>

        </div>

        {/* Right Sidebar - Reviews & Ratings */}
        <div className="w-full lg:w-[340px] xl:w-[380px] bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all p-6 flex flex-col gap-6 shrink-0">
          <h2 className="text-[#24292E] text-base font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Rating and Reviews</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setReviewTab("patient")}
              className={`flex-1 py-2 rounded text-xs font-medium uppercase tracking-wider transition-colors ${reviewTab === "patient" ? "bg-[#5476FC] text-white" : "bg-[#C4C9CF] text-white hover:bg-[#A0A8B0]"}`}
            >
              Patient ({reviewTotal})
            </button>
            <button
              onClick={() => setReviewTab("peer")}
              className={`flex-1 py-2 rounded text-xs font-medium uppercase tracking-wider transition-colors ${reviewTab === "peer" ? "bg-[#5476FC] text-white" : "bg-[#C4C9CF] text-white hover:bg-[#A0A8B0]"}`}
            >
              Peer (0)
            </button>
          </div>

          {reviewTab === "patient" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[#24292E] text-[28px] font-medium leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {avgRating ?? "—"}
                </span>
                <Stars rating={avgRating ?? 0} />
              </div>

              <div className="flex flex-col gap-4 mt-2 max-h-[420px] overflow-y-auto">
                {reviews.length === 0 && (
                  <div className="text-center text-sm text-[#A0A8B0] py-6">No reviews yet.</div>
                )}
                {reviews.map((rv, i) => (
                  <div key={i} className="flex flex-col gap-1.5 pb-4 border-b border-[#D6DEFF] last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[#24292E] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {rv.reviewer?.name || "Patient"}
                      </span>
                      <Stars rating={rv.rating} size={10} />
                    </div>
                    {rv.comment && (
                      <p className="text-[#676E76] text-[11px] leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {rv.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-[#A0A8B0] py-10">No peer reviews yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
