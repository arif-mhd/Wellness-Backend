"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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

interface AvailabilitySlot {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  emiratesId: string | null;
  specialty: string | null;
  license: string | null;
  bio: string | null;
  fees: string | null;
  feesPerEmirate?: Record<string, string> | null;
  languages: string | null;
  avatarUrl?: string | null;
  height?: string | null;
  weight?: string | null;
  address?: string | null;
  postalCode?: string | null;
  status: string;
  registeredAt: string;
  approvedAt: string | null;
  consultations?: number;
  avgConsultation?: number;
  prescriptions?: number;
  rating?: number;
  slots?: AvailabilitySlot[];
  degreeFileUrl?: string | null;
  specFileUrl?: string | null;
  otherFileUrl?: string | null;
  slotsPending?: boolean;
  tempSlots?: AvailabilitySlot[];
}

type Tab = "about" | "diagnosis" | "reviews";

const DetailRow = ({
  label,
  value,
  valueClass = "text-slate-800 font-bold",
  labelClass = "text-slate-400 font-bold",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  labelClass?: string;
}) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value ?? "—"}</span>
  </div>
);

const DocLink = ({ title, filename, href = "#" }: { title: string; filename: string; href?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-600 font-medium">{title}</span>
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#6A8BFF] hover:underline underline-offset-2">{filename}</a>
  </div>
);

const DiagnosisCard = ({ title, count, colorHex }: { title: string; count: number; colorHex: string }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
      <span className="text-[11px] font-bold text-slate-500">{title}</span>
    </div>
    <div className="text-[22px] font-black text-slate-800 tracking-tight">{count}</div>
  </div>
);

const ReviewCard = ({ name, rating, review }: { name: string; rating: number; review: string }) => (
  <div className="bg-[#f8fafd] rounded-[1rem] p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-xs font-black">
      {name[0]}
    </div>
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <h4 className="text-[12px] font-bold text-slate-800">{name}</h4>
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`w-3 h-3 ${i < rating ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#6A8BFF] opacity-25"}`} viewBox="0 0 24 24" fill={i < rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{review}</p>
    </div>
  </div>
);

interface DiagnosisEntry { reason: string; count: number; }
interface ReviewEntry { id: string; rating: number; comment: string; reviewer: { name: string; avatar: string }; date: string; }

const PALETTE = ["#8b5cf6", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#3b82f6", "#ec4899", "#84cc16", "#f97316", "#0ea5e9"];

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [diagnosis, setDiagnosis] = useState<DiagnosisEntry[]>([]);
  const [diagTotal, setDiagTotal] = useState(0);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerifySlots = async () => {
    setVerifying(true);
    try {
      const res = await adminFetch(`/api/admin/doctors/${id}/verify-slots`, {
        method: "POST",
      });
      if (res.ok) {
        setDoctor(prev => {
          if (!prev) return null;
          return {
            ...prev,
            slots: prev.tempSlots ?? prev.slots,
            slotsPending: false,
          };
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error ?? "Failed to verify slots.");
      }
    } catch (err) {
      console.error("Error verifying slots:", err);
      alert("An error occurred while verifying slots.");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    async function fetchDoctor() {
      setLoading(true);
      setError("");
      try {
        const res = await adminFetch(`/api/admin/doctors/${id}`);
        if (res.ok) {
          const d = await res.json();
          setDoctor(d.doctor);
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Error ${res.status}`);
        }
      } catch {
        setError("Failed to load doctor data.");
      } finally {
        setLoading(false);
      }
    }
    fetchDoctor();
  }, [id]);

  useEffect(() => {
    if (activeTab === "diagnosis" && diagnosis.length === 0) {
      setTabLoading(true);
      adminFetch(`/api/admin/doctors/${id}/diagnosis`)
        .then(r => r.json())
        .then(d => { setDiagnosis(d.diagnosis ?? []); setDiagTotal(d.total ?? 0); })
        .catch(() => {})
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === "reviews" && reviews.length === 0) {
      setTabLoading(true);
      adminFetch(`/api/admin/doctors/${id}/reviews`)
        .then(r => r.json())
        .then(d => { setReviews(d.reviews ?? []); setAvgRating(d.avgRating ?? null); setReviewsTotal(d.total ?? 0); })
        .catch(() => {})
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, id]);

  if (loading) return (
    <ProtectedRoute>
      <div className="w-full flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6A8BFF]" />
      </div>
    </ProtectedRoute>
  );

  if (error || !doctor) return (
    <ProtectedRoute>
      <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-red-500 font-semibold text-sm">{error || "Doctor not found."}</p>
        <button onClick={() => router.push("/dashboard/doctors")} className="text-[#6A8BFF] text-sm font-bold hover:underline">
          Back to Doctors
        </button>
      </div>
    </ProtectedRoute>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "about", label: "About" },
    { key: "diagnosis", label: "Diagnosis" },
    { key: "reviews", label: "Rating and Reviews" },
  ];

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans animate-in fade-in duration-300">

        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/doctors")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1e293b] tracking-tight">Doctor Profile</h1>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">

          {/* Left — main content */}
          <div className="xl:col-span-8 space-y-7">

            {/* Header Card */}
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                  {doctor.avatarUrl ? (
                    <img src={doctor.avatarUrl} alt={doctor.fullName} className="w-[84px] h-[84px] rounded-full object-cover border-[3px] border-slate-50 shadow-sm shrink-0" />
                  ) : (
                    <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-black text-2xl shrink-0 border-[3px] border-slate-50 shadow-sm">
                      {doctor.fullName?.split(" ").slice(0, 2).map(n => n[0]).join("") || "?"}
                    </div>
                  )}
                  <div>
                    <h2 className="text-[19px] font-black text-slate-800 tracking-tight">{doctor.fullName}</h2>
                    {doctor.license && (
                      <p className="text-[10px] font-bold text-[#6A8BFF] uppercase tracking-wide mt-1.5">
                        LICENSE NUMBER {doctor.license}
                      </p>
                    )}
                    {doctor.specialty && (
                      <div className="mt-3 inline-block px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-black tracking-wide uppercase">
                        {doctor.specialty}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition active:scale-95">
                    Edit
                  </button>
                  <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition active:scale-95">
                    Deactivate Doctor Profile
                  </button>
                </div>
              </div>

              {doctor.bio && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 mb-2.5">Bio</p>
                  <p className="text-[12px] text-slate-600 font-medium leading-[1.8]">{doctor.bio}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                    activeTab === key ? "bg-[#1E293B] text-white" : "bg-white text-slate-500 border border-slate-100 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="min-h-[400px]">

              {/* ABOUT */}
              {activeTab === "about" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* Personal Details */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Personal Details</h3>
                    <div className="space-y-4">
                      {doctor.emiratesId && (
                        <DetailRow
                          label="Emirates ID"
                          value={
                            <div className="flex items-center gap-1.5">
                              {doctor.emiratesId}
                              <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          }
                        />
                      )}
                      <DetailRow label="Contact Number" value={doctor.phone} />
                      <DetailRow
                        label="Email ID"
                        value={<a href={`mailto:${doctor.email}`} className="text-[#6A8BFF] hover:underline">{doctor.email}</a>}
                        valueClass="font-bold"
                      />
                      <DetailRow label="Gender" value={doctor.gender} />
                      <DetailRow label="Date of Birth" value={doctor.dateOfBirth} />
                      <DetailRow label="Consultation Fees" value={doctor.fees} />
                      <DetailRow label="Languages" value={doctor.languages} />
                      {doctor.height && <DetailRow label="Height (cm)" value={doctor.height} />}
                      {doctor.weight && <DetailRow label="Weight (kg)" value={doctor.weight} />}
                      {doctor.address && <DetailRow label="Address" value={doctor.address} />}
                      {doctor.postalCode && <DetailRow label="Postal Code" value={doctor.postalCode} />}
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Consultation Fee</h3>
                    <div className="space-y-4">
                      {["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al-Quwain", "Ras Al Khaimah", "Fujairah"].map(emirate => {
                        const fee = doctor.feesPerEmirate?.[emirate] ?? doctor.fees ?? "—";
                        return <DetailRow key={emirate} label={emirate} value={fee ? `AED ${fee}` : "—"} labelClass="font-medium text-slate-500" />;
                      })}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Documents</h3>
                    <div className="space-y-6">
                      {doctor.degreeFileUrl
                        ? <DocLink title="Medical Degree Certificate" filename={doctor.degreeFileUrl.split("/").pop() || "Med_certificate.pdf"} href={doctor.degreeFileUrl} />
                        : <p className="text-[11px] text-slate-400">No degree certificate uploaded</p>
                      }
                      {doctor.specFileUrl
                        ? <DocLink title="Specialization Certificate" filename={doctor.specFileUrl.split("/").pop() || "Spec_certificate.pdf"} href={doctor.specFileUrl} />
                        : <p className="text-[11px] text-slate-400">No specialization certificate uploaded</p>
                      }
                      {doctor.otherFileUrl
                        ? <DocLink title="Other Certificates" filename={doctor.otherFileUrl.split("/").pop() || "Certificate.pdf"} href={doctor.otherFileUrl} />
                        : null
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* DIAGNOSIS */}
              {activeTab === "diagnosis" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {tabLoading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6A8BFF]" /></div>
                  ) : diagnosis.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-[13px] font-medium">
                      No appointment data yet. Diagnosis breakdown will appear once patients start booking.
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] text-slate-700 font-bold max-w-2xl leading-relaxed">
                        Top {diagnosis.length} reason{diagnosis.length !== 1 ? "s" : ""} patients booked with this doctor
                        {diagTotal > 0 && <span className="text-slate-400 font-medium"> · {diagTotal} total appointments</span>}
                      </p>
                      <div className="grid grid-cols-4 gap-3 pt-4">
                        {diagnosis.slice(0, 4).map((_, i) => (
                          <div key={i} className="w-full h-0 border-b-[4px] border-dotted" style={{ borderColor: PALETTE[i] }} />
                        ))}
                      </div>
                      <div className={`grid gap-5 ${diagnosis.length >= 4 ? "grid-cols-4" : `grid-cols-${diagnosis.length}`}`}>
                        {diagnosis.map((d, i) => (
                          <DiagnosisCard key={d.reason} title={d.reason} count={d.count} colorHex={PALETTE[i % PALETTE.length]} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* REVIEWS */}
              {activeTab === "reviews" && (
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {tabLoading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6A8BFF]" /></div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-[13px] font-medium">
                      No reviews yet. Patient feedback will appear here after consultations.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-7">
                        <h3 className="text-[14px] font-black text-slate-800">All Ratings</h3>
                        {avgRating !== null && (
                          <div className="flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                            <svg className="w-4 h-4 text-[#6A8BFF] fill-[#6A8BFF]" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {avgRating}
                            <span className="text-slate-400 font-medium ml-1 text-[13px]">({reviewsTotal} Rating{reviewsTotal !== 1 ? "s" : ""})</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {reviews.map((r) => (
                          <ReviewCard
                            key={r.id}
                            name={r.reviewer?.name || "Anonymous"}
                            rating={r.rating ?? 0}
                            review={r.comment || ""}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right — Availability */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 sticky top-6">
              <div className="flex items-center justify-between mb-7">
                <h3 className="text-[16px] font-black text-slate-800">Availability</h3>
                <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-800 transition">
                  This Week
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Notice */}
              {doctor.slotsPending && (
                <div className="bg-[#FFF8EA] rounded-[1.5rem] p-5 mb-7">
                  <div className="flex items-start gap-2.5">
                    <svg className="w-[18px] h-[18px] text-[#F59E0B] shrink-0 mt-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed pr-2">
                      This doctor has updated their availability slots. Please review and verify the changes.
                    </p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleVerifySlots}
                      disabled={verifying}
                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white px-6 py-2.5 rounded-xl text-[11px] font-bold shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition active:scale-95 disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify Now"}
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="space-y-5 px-1">
                {[
                  { label: "Monday",    dow: 1 },
                  { label: "Tuesday",   dow: 2 },
                  { label: "Wednesday", dow: 3 },
                  { label: "Thursday",  dow: 4 },
                  { label: "Friday",    dow: 5 },
                  { label: "Saturday",  dow: 6 },
                  { label: "Sunday",    dow: 0 },
                ].map(({ label, dow }) => {
                  const slotsToUse = doctor.slotsPending ? (doctor.tempSlots ?? []) : (doctor.slots ?? []);
                  const activeSlots = slotsToUse.filter(s => s.dayOfWeek === dow && s.isActive);
                  const sortedSlots = [...activeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const formatT = (t: string) => {
                    const [h, m] = t.split(":").map(Number);
                    const ampm = h >= 12 ? "PM" : "AM";
                    return `${h % 12 || 12}${m ? `:${m.toString().padStart(2,"0")}` : ""}${ampm}`;
                  };
                  const slotsText = sortedSlots.length > 0
                    ? sortedSlots.map(s => `${formatT(s.startTime)} – ${formatT(s.endTime)}`).join(", ")
                    : "Off";
                  return (
                    <div key={label} className="flex justify-between items-center text-[12px] pb-5 border-b border-slate-50 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">{label}</span>
                      <span
                        className={`font-bold ${sortedSlots.length > 0 ? "text-slate-800" : "text-slate-300"} text-right max-w-[70%] truncate`}
                        title={slotsText}
                      >
                        {slotsText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
