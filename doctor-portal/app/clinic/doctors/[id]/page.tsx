"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  license?: string | null;
  emiratesId?: string | null;
  specialty?: string | null;
  qualification?: string | null;
  address?: string | null;
  fees?: number | null;
  languages?: string | null;
  bio?: string | null;
  eligibility?: string | null;
  isOnline?: boolean;
  slots?: AvailabilitySlot[];
  absences?: Absence[];
  consultations?: number;
  prescriptions?: number;
  rating?: number;
  avgConsultation?: number;
}

interface AvailabilitySlot { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number; isActive: boolean; }
interface Absence { id: string; startDate: string; endDate: string; reason: string; duration: string; createdAt: string; }
interface Consultation { id: string; patientName: string; patientAvatarUrl?: string | null; reason: string; status: string; scheduledAt: string; hasReport: boolean; }
interface Review { id: string; rating: number; comment?: string; note?: string; provider?: { name?: string }; patientName?: string; createdAt: string; }

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_TO_DAY_KEY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_KEY_TO_DOW: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function slotsToKeys(slots: AvailabilitySlot[]): string[] {
  const keys: string[] = [];
  for (const s of slots ?? []) {
    if (!s.isActive || !s.startTime || !s.endTime) continue;
    const dayKey = DOW_TO_DAY_KEY[s.dayOfWeek] ?? "SUN";
    const [startH] = s.startTime.split(":").map(Number);
    const [endH] = s.endTime.split(":").map(Number);
    for (let h = startH; h < endH; h++) keys.push(`${dayKey}-${String(h).padStart(2, "0")}:00`);
  }
  return keys;
}

function slotsFromKeys(selectedSlots: string[]): AvailabilitySlot[] {
  const byDay: Record<string, number[]> = {};
  for (const key of selectedSlots) {
    const [day, time] = key.split("-");
    const hour = parseInt(time);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(hour);
  }
  const result: AvailabilitySlot[] = [];
  for (const [day, hours] of Object.entries(byDay)) {
    const sorted = [...new Set(hours)].sort((a, b) => a - b);
    const blocks: number[][] = [];
    let current: number[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) current.push(sorted[i]);
      else { blocks.push(current); current = [sorted[i]]; }
    }
    blocks.push(current);
    for (const block of blocks) {
      result.push({
        dayOfWeek: DAY_KEY_TO_DOW[day] ?? 0,
        startTime: `${String(block[0]).padStart(2, "0")}:00`,
        endTime: `${String(block[block.length - 1] + 1).padStart(2, "0")}:00`,
        slotDurationMins: 60,
        isActive: true,
      });
    }
  }
  return result;
}

function Avatar({ name, url, size = "w-9 h-9" }: { name: string; url?: string | null; size?: string }) {
  if (url) return <img src={url} alt={name} className={`${size} rounded-full object-cover border border-gray-100 shrink-0`} />;
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {name?.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

type Tab = "about" | "consultations" | "schedules" | "rating";

function DoctorDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("about");

  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultLoading, setConsultLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [absenceReason, setAbsenceReason] = useState("");
  const [absenceStart, setAbsenceStart] = useState("");
  const [absenceEnd, setAbsenceEnd] = useState("");
  const [absenceError, setAbsenceError] = useState("");
  const [savingSlots, setSavingSlots] = useState(false);

  const fetchDoctor = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setDoctor(data.doctor);
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDoctor(); }, [fetchDoctor]);

  useEffect(() => {
    if (tab === "consultations" && consultations.length === 0) {
      setConsultLoading(true);
      apiFetch(`/api/clinics/doctors/${id}/consultations`)
        .then((r) => r.json())
        .then((d) => setConsultations(d.consultations ?? []))
        .catch(() => {})
        .finally(() => setConsultLoading(false));
    }
    if (tab === "rating" && reviews.length === 0) {
      setReviewsLoading(true);
      apiFetch(`/api/clinics/doctors/${id}/reviews`)
        .then((r) => r.json())
        .then((d) => { setReviews(d.reviews ?? []); setAvgRating(d.avgRating ?? null); })
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [tab, id, consultations.length, reviews.length]);

  const toggleAvailable = async () => {
    if (!doctor) return;
    const next = !doctor.isOnline;
    setDoctor({ ...doctor, isOnline: next });
    try {
      await apiFetch(`/api/clinics/doctors/${id}/online-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
    } catch { fetchDoctor(); }
  };

  const startEdit = () => {
    if (!doctor) return;
    setEditFields({
      bio: doctor.bio ?? "",
      eligibility: doctor.eligibility ?? "",
      gender: doctor.gender ?? "",
      license: doctor.license ?? "",
      emiratesId: doctor.emiratesId ?? "",
      specialty: doctor.specialty ?? "",
      qualification: doctor.qualification ?? "",
      address: doctor.address ?? "",
      fees: doctor.fees != null ? String(doctor.fees) : "",
      phone: doctor.phone ?? "",
      languages: doctor.languages ?? "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editFields, fees: editFields.fees ? Number(editFields.fees) : null }),
      });
      if (!res.ok) throw new Error("Save failed");
      await fetchDoctor();
      setEditing(false);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove Dr. ${doctor?.fullName} from your clinic? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/clinic/doctors");
    } catch {
      setError("Failed to remove doctor.");
      setDeleting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { setResetError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setResetError("Password must be at least 8 characters."); return; }
    setResetting(true);
    setResetError("");
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Reset failed"); }
      setResetDone(true);
    } catch (err: any) {
      setResetError(err?.message ?? "Failed to reset credentials.");
    } finally {
      setResetting(false);
    }
  };

  const handleSaveSlots = async (formData: any) => {
    setSavingSlots(true);
    try {
      const slots = slotsFromKeys(formData?.selectedSlots ?? []);
      const res = await apiFetch(`/api/clinics/doctors/${id}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) throw new Error("Failed to save schedule");
      await fetchDoctor();
    } catch {
      setError("Failed to save schedule.");
    } finally {
      setSavingSlots(false);
    }
  };

  const handleAddAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceReason.trim() || !absenceStart || !absenceEnd) {
      setAbsenceError("Reason, start, and end are required.");
      return;
    }
    setAbsenceError("");
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/absences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: absenceReason, startDate: absenceStart, endDate: absenceEnd }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to add absence");
      }
      setAbsenceReason(""); setAbsenceStart(""); setAbsenceEnd("");
      await fetchDoctor();
    } catch (err: any) {
      setAbsenceError(err?.message ?? "Failed to add absence.");
    }
  };

  const handleDeleteAbsence = async (absenceId: string) => {
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/absences/${absenceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchDoctor();
    } catch {
      setError("Failed to remove absence.");
    }
  };

  if (loading) return <div className="px-10 py-24 text-center text-gray-400 text-sm">Loading doctor…</div>;
  if (error && !doctor) return <div className="px-10 py-8"><div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div></div>;
  if (!doctor) return null;

  return (
    <div className="px-10 lg:px-[40px] py-8 max-w-[1200px] mx-auto font-outfit">
      <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-5">
        <button onClick={() => router.push("/clinic/doctors")} className="hover:text-gray-700 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          Manage Doctors
        </button>
        <span>›</span>
        <span className="text-gray-700 font-medium">doctor details</span>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

      {/* Header card */}
      <div className="bg-indigo-50/60 rounded-[1.5rem] p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <Avatar name={doctor.fullName} url={doctor.avatarUrl} size="w-16 h-16" />
          <div>
            <h1 className="text-[17px] font-semibold text-gray-800">Dr. {doctor.fullName}</h1>
            <p className="text-[12px] text-gray-500">{doctor.email}</p>
            <button onClick={toggleAvailable} className="flex items-center gap-2 mt-2">
              <span className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${doctor.isOnline ? "bg-emerald-400 justify-end" : "bg-gray-300 justify-start"}`}>
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </span>
              <span className="text-[12px] font-semibold text-gray-600">{doctor.isOnline ? "Available" : "Unavailable"}</span>
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Personal Details</h4>
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-400">Gender</span><span className="font-medium text-gray-700">{doctor.gender ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Date of Birth</span><span className="font-medium text-gray-700">{doctor.dateOfBirth ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Blood Group</span><span className="font-medium text-gray-700">{doctor.bloodGroup ?? "—"}</span></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Credentials</h4>
          </div>
          <div className="space-y-1 text-[12px] mb-3">
            <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="font-medium text-gray-700">{doctor.fullName}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Username</span><span className="font-medium text-gray-700">{doctor.email}</span></div>
          </div>
          <button
            onClick={() => { setShowResetModal(true); setResetDone(false); setNewPassword(""); setConfirmNewPassword(""); setResetError(""); }}
            className="text-[11px] font-semibold text-[#5476FC] hover:underline"
          >
            Reset &amp; Resend Credentials
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {([["about", "About"], ["consultations", "Consultations"], ["schedules", "Schedules"], ["rating", "Rating and Performance"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all ${tab === key ? "bg-[#1E293B] text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ABOUT */}
      {tab === "about" && (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-[12px] font-bold text-gray-700 mb-2">About</h4>
              {editing ? (
                <textarea value={editFields.bio} onChange={(e) => setEditFields({ ...editFields, bio: e.target.value })} rows={4} className="w-full bg-[#F7F8FC] rounded-xl p-3 text-[12px] text-gray-700 resize-none" />
              ) : (
                <p className="text-[12px] text-gray-500 leading-relaxed">{doctor.bio || "No bio added yet."}</p>
              )}
            </div>
            <div>
              <h4 className="text-[12px] font-bold text-gray-700 mb-2">Eligibility</h4>
              {editing ? (
                <textarea value={editFields.eligibility} onChange={(e) => setEditFields({ ...editFields, eligibility: e.target.value })} rows={4} className="w-full bg-[#F7F8FC] rounded-xl p-3 text-[12px] text-gray-700 resize-none" />
              ) : (
                <p className="text-[12px] text-gray-500 leading-relaxed">{doctor.eligibility || "Not specified."}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-8">
            {[
              ["gender", "Gender"], ["license", "License Number"], ["emiratesId", "Emirates ID"],
              ["specialty", "Specialization"], ["qualification", "Qualification"], ["address", "Location"],
              ["fees", "Consultation Fees"], ["phone", "Contact Number"], ["languages", "Languages"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-[11px] text-gray-400 font-medium shrink-0 w-36">{label}</span>
                {editing ? (
                  <input value={editFields[key] ?? ""} onChange={(e) => setEditFields({ ...editFields, [key]: e.target.value })} className="flex-1 bg-[#F7F8FC] rounded-lg px-3 py-2 text-[12px] text-gray-700" />
                ) : (
                  <span className="text-[12px] text-gray-700 font-medium text-right">{(doctor as any)[key] ?? "—"}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={handleDelete} disabled={deleting} className="px-6 py-2.5 rounded-xl text-[12px] font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition disabled:opacity-50">
              {deleting ? "Removing…" : "Delete"}
            </button>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="px-6 py-2.5 rounded-xl text-[12px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="px-6 py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#1E293B] hover:bg-[#0f172a] transition disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="px-6 py-2.5 rounded-xl text-[12px] font-semibold text-white bg-[#1E293B] hover:bg-[#0f172a] transition">Edit</button>
            )}
          </div>
        </div>
      )}

      {/* CONSULTATIONS */}
      {tab === "consultations" && (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-7">
          {consultLoading ? (
            <p className="text-center text-gray-400 text-sm py-12">Loading…</p>
          ) : consultations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No consultations yet.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 p-4 bg-[#F7F8FC] rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={c.patientName} url={c.patientAvatarUrl} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 truncate">{c.patientName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{c.reason}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400 shrink-0 text-right">
                    <p>{new Date(c.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className={`font-semibold ${c.status === "completed" ? "text-emerald-500" : c.status === "cancelled" ? "text-red-400" : "text-amber-500"}`}>
                      {c.status === "completed" ? (c.hasReport ? "Completed" : "Pending report") : c.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULES */}
      {tab === "schedules" && (
        <div className="space-y-5">
          <SetAvailabilityForm
            initialAvailability={slotsToKeys(doctor.slots ?? [])}
            onSubmit={handleSaveSlots}
            onGoBack={() => setTab("about")}
          />
          {savingSlots && <p className="text-center text-[12px] text-gray-400">Saving schedule…</p>}

          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-7">
            <h4 className="text-[13px] font-bold text-gray-700 mb-4">Absences</h4>

            {absenceError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-600">{absenceError}</div>}

            <form onSubmit={handleAddAbsence} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
              <input type="text" placeholder="Reason" value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} className="bg-[#F7F8FC] rounded-xl px-4 py-3 text-[12px] md:col-span-1" />
              <input type="datetime-local" value={absenceStart} onChange={(e) => setAbsenceStart(e.target.value)} className="bg-[#F7F8FC] rounded-xl px-4 py-3 text-[12px]" />
              <input type="datetime-local" value={absenceEnd} onChange={(e) => setAbsenceEnd(e.target.value)} className="bg-[#F7F8FC] rounded-xl px-4 py-3 text-[12px]" />
              <button type="submit" className="bg-[#1E293B] hover:bg-[#0f172a] text-white rounded-xl text-[12px] font-semibold py-3 transition-colors">Add Absence</button>
            </form>

            {(doctor.absences ?? []).length === 0 ? (
              <p className="text-[12px] text-gray-400">No absences recorded.</p>
            ) : (
              <div className="space-y-2">
                {doctor.absences!.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-[#F7F8FC] rounded-xl">
                    <div>
                      <p className="text-[12px] font-medium text-gray-700">{a.reason}</p>
                      <p className="text-[11px] text-gray-400">{new Date(a.startDate).toLocaleDateString()} → {new Date(a.endDate).toLocaleDateString()} ({a.duration})</p>
                    </div>
                    <button onClick={() => handleDeleteAbsence(a.id)} className="text-red-400 hover:text-red-600 text-[11px] font-semibold">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RATING AND PERFORMANCE */}
      {tab === "rating" && (
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-7">
          {reviewsLoading ? (
            <p className="text-center text-gray-400 text-sm py-12">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-800">{avgRating != null ? avgRating.toFixed(1) : "—"}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${avgRating != null && i < Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[12px] text-gray-400">({reviews.length} reviews)</span>
              </div>
              {reviews.length === 0 ? (
                <p className="text-[12px] text-gray-400">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[12px] text-gray-600">{r.comment || r.note || "No comment left."}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reset & Resend Credentials modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowResetModal(false)} />
          <div className="relative w-full max-w-[420px] bg-white rounded-[1.75rem] shadow-xl p-8">
            <h3 className="text-[16px] font-semibold text-gray-800 mb-1">Reset &amp; Resend Credentials</h3>
            <p className="text-[12px] text-gray-500 mb-5">
              Set a new password for Dr. {doctor.fullName}. Share it with them directly — it's never stored or shown again after this.
            </p>
            {resetDone ? (
              <>
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-[12px] mb-5">
                  New password set. Share it with the doctor now.
                </div>
                <button onClick={() => setShowResetModal(false)} className="w-full py-3 bg-[#1E293B] hover:bg-[#0f172a] text-white rounded-xl text-[13px] font-semibold">Done</button>
              </>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                {resetError && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-[12px]">{resetError}</div>}
                <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-[13px]" />
                <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-[13px]" />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={resetting} className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white bg-[#1E293B] hover:bg-[#0f172a] disabled:opacity-50">
                    {resetting ? "Saving…" : "Set Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClinicDoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DoctorDetailInner id={id} />;
}
