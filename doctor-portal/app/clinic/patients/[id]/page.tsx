"use client";

import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";

// scheduledAt is stored as a naive local wall-clock time with a cosmetic
// trailing "Z" — handing it to `new Date()` as-is makes JS treat it as UTC,
// so toLocaleTimeString/toLocaleDateString then shift it again by the
// browser's own timezone, showing the wrong time. Strip the "Z" first, same
// pattern used everywhere else in doctor-portal (e.g. app/dashboard/page.tsx).
function parseLocalTime(isoString: string): Date {
  if (!isoString) return new Date();
  const clean = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
  return new Date(clean);
}

interface PatientDetail {
  name: string;
  email: string;
  avatarUrl: string | null;
  gender: string | null;
  dob: string | null;
  bloodGroup: string | null;
  height: string | null;
  weight: string | null;
  age: number | null;
}

interface Consultation {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  age: number | null;
  reason: string;
  scheduledAt: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-[#F59E0B]",
  in_progress: "text-[#5476FC]",
  completed: "text-[#179353]",
  cancelled: "text-[#D92D20]",
};

function AvatarPlaceholder({ avatarUrl, name, size = "w-24 h-24" }: { avatarUrl?: string | null; name?: string; size?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name ?? ""} className={`${size} rounded-full object-cover shrink-0 border border-[#D6DEFF] shadow-sm`} />;
  }
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-[#D6DEFF] shadow-sm`}>
      <svg className="w-full h-full text-gray-400 mt-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

function PatientProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const member = searchParams.get("member");
  const branchId = searchParams.get("branchId");

  const [activeTab, setActiveTab] = useState("Past Consultations");
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const query = new URLSearchParams();
    if (member) query.set("member", member);
    if (branchId) query.set("branchId", branchId);
    const qs = query.toString();
    apiFetch(`/api/clinics/patients/${id}${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to load patient.");
        }
        return r.json();
      })
      .then((data) => {
        setPatient(data.patient);
        setConsultations(Array.isArray(data.consultations) ? data.consultations : []);
      })
      .catch((err) => setError(err.message ?? "Failed to load patient."))
      .finally(() => setLoading(false));
  }, [id, member, branchId]);

  return (
    <div className="px-4 md:px-8 py-8 overflow-y-auto h-full w-full bg-[#F9FAFB] font-outfit relative flex flex-col items-center">
      <div className="w-full max-w-[1100px] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 w-full max-w-[1100px]">
          <Link
            href="/clinic/patients"
            className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
            aria-label="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
            Patient Details
          </h1>
        </div>

        {loading ? (
          <div className="text-center text-sm text-[#A0A8B0] py-16">Loading...</div>
        ) : error || !patient ? (
          <div className="text-center text-sm text-red-600 py-16">{error || "Patient not found."}</div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="w-full bg-[#EEF0F8] rounded-2xl border border-[#E4E8F0] shadow-sm p-8 flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
              <AvatarPlaceholder avatarUrl={patient.avatarUrl} name={patient.name} />

              <div className="flex-1 flex flex-col md:flex-row gap-8 justify-between w-full mt-2">
                {/* Name & Email */}
                <div className="flex flex-col text-center md:text-left">
                  <span className="text-[#24292E] text-[18px] font-bold mb-1">{patient.name}</span>
                  <span className="text-[#676E76] text-[13px]">{patient.email}</span>
                </div>

                {/* Personal Details */}
                <div className="flex flex-col gap-3">
                  <span className="text-[#24292E] text-[14px] font-bold mb-1">Personal Details</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#676E76] text-[11px]">Gender</span>
                      <span className="text-[#24292E] text-[12px] font-bold">{patient.gender ?? "—"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#676E76] text-[11px]">Height</span>
                      <span className="text-[#24292E] text-[12px] font-bold">{patient.height ?? "—"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#676E76] text-[11px]">Date of Birth</span>
                      <span className="text-[#24292E] text-[12px] font-bold">{patient.dob ? new Date(patient.dob).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#676E76] text-[11px]">Weight</span>
                      <span className="text-[#24292E] text-[12px] font-bold">{patient.weight ?? "—"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#676E76] text-[11px]">Blood Group</span>
                      <span className="text-[#24292E] text-[12px] font-bold">{patient.bloodGroup ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#EBEEF5] pb-4">
              {["Past Consultations", "Visit Informations"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all ${activeTab === tab
                    ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md scale-[1.02]"
                    : "bg-white text-[#676E76] border border-[#E4E8F0] hover:border-[#5476FC] hover:text-[#5476FC] shadow-sm"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Consultations List */}
            {activeTab === "Past Consultations" && (() => {
              const totalPages = Math.max(1, Math.ceil(consultations.length / ITEMS_PER_PAGE));
              const paginated = consultations.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );
              return (
                <div className="flex flex-col gap-3 pb-8">
                  {consultations.length === 0 ? (
                    <div className="text-center text-sm text-[#A0A8B0] py-8">No consultations with your clinic yet.</div>
                  ) : (
                    <>
                      {/* Table Header — desktop only */}
                      <div className="hidden md:flex flex-row items-center px-5 py-2 text-[13px] font-semibold text-[#9EA5AD] border-b border-[#EBEEF5]">
                        <div className="w-[200px] shrink-0">Doctor</div>
                        <div className="md:flex md:flex-row w-full">
                          <div className="md:w-[80px] shrink-0 text-center">Age</div>
                          <div className="md:w-[120px] shrink-0 text-center">Reason</div>
                          <div className="md:flex-1 md:min-w-[120px] shrink-0 text-center">Department</div>
                          <div className="md:w-[140px] shrink-0 text-center">Time &amp; Date</div>
                          <div className="md:w-[100px] shrink-0 text-center">Status</div>
                        </div>
                      </div>

                      {paginated.map((consult) => {
                        const dateObj = parseLocalTime(consult.scheduledAt);
                        return (
                          <div key={consult.id} className="flex flex-col md:flex-row items-start md:items-center px-5 py-4 rounded-xl border border-[#D6DEFF] bg-white shadow-sm hover:border-[#8AA0FF] transition-all">

                            {/* Doctor Avatar + Name */}
                            <div className="w-full md:w-[200px] flex shrink-0 items-center gap-4">
                              <AvatarPlaceholder name={consult.doctorName} size="w-8 h-8" />
                              <span className="text-[#24292E] text-[13px] font-medium truncate">{consult.doctorName}</span>
                            </div>

                            {/* Mobile grid wrapper / Desktop flex wrapper */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row w-full gap-y-4 gap-x-2 md:gap-0 mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-gray-100">
                              {/* Age */}
                              <div className="md:w-[80px] shrink-0 flex flex-col md:block justify-start">
                                <span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Age</span>
                                <span className="text-[#24292E] text-[13px] font-medium md:text-center block text-left">{consult.age ?? "—"}</span>
                              </div>

                              {/* Reason */}
                              <div className="md:w-[120px] shrink-0 flex flex-col md:block justify-start">
                                <span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Reason</span>
                                <span className="text-[#676E76] text-[12px] md:text-center block text-left truncate">{consult.reason}</span>
                              </div>

                              {/* Department */}
                              <div className="md:flex-1 md:min-w-[120px] shrink-0 flex flex-col md:block justify-start">
                                <span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Department</span>
                                <span className="text-[#676E76] text-[12px] md:text-center block text-left truncate">{consult.doctorSpecialty}</span>
                              </div>

                              {/* Time / Date */}
                              <div className="md:w-[140px] shrink-0 flex flex-col md:items-center justify-start">
                                <span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Time &amp; Date</span>
                                <div className="flex items-center gap-1">
                                  <span className="hidden md:inline text-[#24292E] text-[12px]">Time -</span>
                                  <span className="text-[#5476FC] text-[12px] font-bold">{dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                                <span className="text-[#676E76] text-[11px] mt-0.5 block md:text-center text-left">{dateObj.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
                              </div>

                              {/* Status */}
                              <div className="md:w-[100px] shrink-0 flex flex-col md:block justify-start">
                                <span className="md:hidden text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Status</span>
                                <span className={`text-[12px] font-medium block md:text-center text-left ${STATUS_COLOR[consult.status] ?? "text-[#676E76]"}`}>
                                  {STATUS_LABEL[consult.status] ?? consult.status}
                                </span>
                              </div>
                            </div>

                          </div>
                        );
                      })}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-5">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#9EA5AD] hover:text-[#5476FC] hover:border-[#5476FC] transition-all disabled:opacity-40"
                          >
                            <svg width="5" height="9" viewBox="0 0 5 9" fill="none"><path d="M4 8L1 4.5L4 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                            const isSelected = currentPage === pg;
                            return (
                              <button
                                key={pg}
                                onClick={() => setCurrentPage(pg)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${isSelected
                                    ? "bg-[#5476FC] text-white shadow-sm"
                                    : "text-[#9EA5AD] hover:text-[#5476FC]"
                                  }`}
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {pg}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-7 h-7 rounded-full border border-[#EBEEF5] bg-white flex items-center justify-center text-[#9EA5AD] hover:text-[#5476FC] hover:border-[#5476FC] transition-all disabled:opacity-40"
                          >
                            <svg width="5" height="9" viewBox="0 0 5 9" fill="none"><path d="M1 8L4 4.5L1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            {activeTab === "Visit Informations" && (
              <div className="text-center text-sm text-[#A0A8B0] py-16">No additional visit information recorded.</div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <PatientProfileContent params={params} />
    </Suspense>
  );
}
