"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Slot { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; }

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  license?: string | null;
  emiratesId?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  height?: string | null;
  weight?: string | null;
  specialty?: string | null;
  specializations?: { name: string }[];
  qualification?: string | null;
  address?: string | null;
  languages?: string[] | string | null;
  fees?: number | null;
  isOnline?: boolean;
  avatarUrl?: string | null;
  slots?: Slot[];
  bio?: string | null;
  eligibility?: string | null;
  consultations?: number;
  consultationsOnline?: number;
  prescriptions?: number;
  rating?: number;
  avgConsultation?: number;
}

interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl: string | null;
  patientAge: number | null;
  reason: string;
  primaryDiagnosis: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledAt: string;
  patientWaitingSince: string | null;
  hasReport: boolean;
  preVisitData: any;
}

interface Review {
  rating: number;
  comment?: string;
  reviewer?: { name?: string };
  createdAt: string;
}

const TAB_PARAM_MAP: Record<string, string> = {
  about: "About",
  consultations: "Consultations",
  rating: "Rating and Performance",
};

const TIMING_DAYS = [
  { label: "Sunday", dow: 0 }, { label: "Monday", dow: 1 }, { label: "Tuesday", dow: 2 },
  { label: "Wednesday", dow: 3 }, { label: "Thursday", dow: 4 }, { label: "Friday", dow: 5 }, { label: "Saturday", dow: 6 },
];

const STATUS_LABEL: Record<Consultation["status"], string> = {
  scheduled: "Scheduled", in_progress: "Consulting", completed: "Done", cancelled: "Cancelled",
};

function statusLabel(c: Consultation) {
  if (c.status === "scheduled" && c.patientWaitingSince) return "Waiting...";
  if (c.status === "completed" && !c.hasReport) return "EMR Pending";
  return STATUS_LABEL[c.status];
}
function statusColor(c: Consultation) {
  if (c.status === "scheduled" && c.patientWaitingSince) return "text-[#D92D20]";
  if (c.status === "completed" && !c.hasReport) return "text-[#F59E0B]";
  if (c.status === "cancelled") return "text-[#D92D20]";
  if (c.status === "completed") return "text-[#179353]";
  return "text-[#5476FC]";
}
function isActiveNow(c: Consultation) {
  return c.status === "in_progress" || (c.status === "scheduled" && new Date(c.scheduledAt).getTime() >= Date.now());
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr12 = h % 12 || 12;
  return m === 0 ? `${hr12} ${ampm}` : `${hr12}.${String(m).padStart(2, "0")} ${ampm}`;
}

function formatLanguages(languages: string[] | string | null | undefined) {
  if (Array.isArray(languages)) return languages.join(", ") || "—";
  if (typeof languages === "string") return languages.trim() || "—";
  return "—";
}

function AvatarPlaceholder({ name, avatarUrl, size = "w-10 h-10" }: { name?: string; avatarUrl?: string | null; size?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name ?? ""} className={`${size} rounded-full object-cover shrink-0 border border-gray-200`} />;
  }
  return (
    <div className={`${size} rounded-full bg-[#E4E8F0] overflow-hidden flex items-center justify-center shrink-0 border border-gray-200`}>
      <svg className="w-full h-full text-gray-400 mt-2" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    </div>
  );
}

function ToggleSwitch({ isOn, onClick, disabled }: { isOn: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors disabled:opacity-50 ${isOn ? "bg-[#179353]" : "bg-gray-300"}`}
    >
      <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isOn ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center text-[#5476FC]">
      {[1, 2, 3, 4, 5].map((i) => (
        i <= rounded ? (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        ) : (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        )
      ))}
    </div>
  );
}

const inputCls = "h-8 border border-[#D6D9E0] text-[11px] font-medium text-center text-[#24292E] outline-none focus:border-[#5476FC] rounded-sm px-2 bg-white";

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [activeTab, setActiveTab] = useState(TAB_PARAM_MAP[searchParams.get("tab") ?? ""] ?? "About");
  const tabs = ["About", "Consultations", "Rating and Performance"];

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [togglingOnline, setTogglingOnline] = useState(false);

  const [editing, setEditing] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Edit-mode field state
  const [eFullName, setEFullName] = useState("");
  const [eGender, setEGender] = useState("");
  const [eDob, setEDob] = useState("");
  const [eBloodGroup, setEBloodGroup] = useState("");
  const [eHeight, setEHeight] = useState("");
  const [eWeight, setEWeight] = useState("");
  const [eBio, setEBio] = useState("");
  const [eEligibility, setEEligibility] = useState("");
  const [eLicense, setELicense] = useState("");
  const [eSpecialty, setESpecialty] = useState("");
  const [eQualification, setEQualification] = useState("");
  const [eAddress, setEAddress] = useState("");
  const [eFees, setEFees] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eLanguages, setELanguages] = useState("");

  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [slotDraft, setSlotDraft] = useState<Slot[]>([]);
  const [savingSlots, setSavingSlots] = useState(false);

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultationsLoaded, setConsultationsLoaded] = useState(false);
  const [consultFilter, setConsultFilter] = useState("All");
  const [consultSearch, setConsultSearch] = useState("");
  const [selectedConsultId, setSelectedConsultId] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewTotal, setReviewTotal] = useState(0);

  const loadDoctor = () => {
    apiFetch(`/api/clinics/doctors/${id}${qs}`)
      .then(async (r) => {
        if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error ?? "Failed to load doctor."); }
        return r.json();
      })
      .then((data) => setDoctor(data.doctor ?? null))
      .catch((err) => setLoadError(err.message ?? "Failed to load doctor."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDoctor(); }, [id, qs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "Consultations" && !consultationsLoaded) {
      apiFetch(`/api/clinics/doctors/${id}/consultations${qs}`)
        .then((r) => r.json())
        .then((data) => setConsultations(Array.isArray(data.consultations) ? data.consultations : []))
        .catch(() => setConsultations([]))
        .finally(() => setConsultationsLoaded(true));
    }
    if (activeTab === "Rating and Performance" && !reviewsLoaded) {
      apiFetch(`/api/clinics/doctors/${id}/reviews${qs}`)
        .then((r) => r.json())
        .then((data) => {
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
          setAvgRating(data.avgRating ?? null);
          setReviewTotal(data.total ?? 0);
        })
        .catch(() => setReviews([]))
        .finally(() => setReviewsLoaded(true));
    }
  }, [activeTab, consultationsLoaded, reviewsLoaded, id, qs]);

  const startEditing = () => {
    if (!doctor) return;
    setEFullName(doctor.fullName ?? "");
    setEGender(doctor.gender ?? "");
    setEDob(doctor.dateOfBirth ?? "");
    setEBloodGroup(doctor.bloodGroup ?? "");
    setEHeight(doctor.height ?? "");
    setEWeight(doctor.weight ?? "");
    setEBio(doctor.bio ?? "");
    setEEligibility(doctor.eligibility ?? "");
    setELicense(doctor.license ?? "");
    setESpecialty(doctor.specialty ?? "");
    setEQualification(doctor.qualification ?? "");
    setEAddress(doctor.address ?? "");
    setEFees(doctor.fees != null ? String(doctor.fees) : "");
    setEPhone(doctor.phone ?? "");
    setELanguages(formatLanguages(doctor.languages) === "—" ? "" : formatLanguages(doctor.languages));
    setSaveError("");
    setEditing(true);
  };

  const handleSave = async () => {
    setSavingDoc(true);
    setSaveError("");
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: eFullName, gender: eGender || null, dateOfBirth: eDob || null,
          bloodGroup: eBloodGroup || null, height: eHeight || null, weight: eWeight || null,
          bio: eBio || null, eligibility: eEligibility || null,
          license: eLicense || null, specialty: eSpecialty || null, qualification: eQualification || null,
          address: eAddress || null, fees: eFees ? Number(eFees) : null, phone: ePhone || null,
          languages: eLanguages || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? "Failed to save changes."); }
      setEditing(false);
      loadDoctor();
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save changes.");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDelete = async () => {
    if (!doctor) return;
    if (!window.confirm(`Remove Dr. ${doctor.fullName} from your clinic? Their appointment history is preserved but they will no longer be able to log in.`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.href = `/clinic/doctors${qs}`;
    } catch {
      window.alert("Failed to remove doctor.");
      setDeleting(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!doctor) return;
    const next = !doctor.isOnline;
    setTogglingOnline(true);
    setDoctor({ ...doctor, isOnline: next });
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/online-status${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setDoctor((prev) => (prev ? { ...prev, isOnline: !next } : prev));
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleResetPassword = async () => {
    const password = window.prompt("New password for this doctor (min 8 characters):");
    if (!password) return;
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/reset-password${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      window.alert("Credentials reset.");
    } catch {
      window.alert("Failed to reset credentials.");
    }
  };

  const openSlotEditor = () => {
    setSlotDraft(doctor?.slots ? doctor.slots.map((s) => ({ ...s })) : []);
    setShowSlotEditor(true);
  };

  const addSlot = (dow: number) => {
    setSlotDraft((prev) => [...prev, { dayOfWeek: dow, startTime: "09:00", endTime: "17:00", isActive: true }]);
  };
  const removeSlot = (idx: number) => setSlotDraft((prev) => prev.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, field: "startTime" | "endTime", val: string) =>
    setSlotDraft((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  const handleSaveSlots = async () => {
    setSavingSlots(true);
    try {
      const res = await apiFetch(`/api/clinics/doctors/${id}/slots${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slotDraft }),
      });
      if (!res.ok) throw new Error();
      setShowSlotEditor(false);
      loadDoctor();
    } catch {
      window.alert("Failed to save timing.");
    } finally {
      setSavingSlots(false);
    }
  };

  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      if (consultFilter === "Upcoming" && !isActiveNow(c)) return false;
      if (consultFilter === "Past" && (isActiveNow(c) || (c.status !== "completed" && c.status !== "cancelled"))) return false;
      if (consultSearch.trim()) {
        const q = consultSearch.trim().toLowerCase();
        if (!c.patientName.toLowerCase().includes(q) && !c.patientEmail.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [consultations, consultFilter, consultSearch]);

  const newConsults = useMemo(() => filteredConsultations.filter(isActiveNow), [filteredConsultations]);
  const allConsults = filteredConsultations;
  const selectedConsult = consultations.find((c) => c.id === selectedConsultId) ?? filteredConsultations[0] ?? null;

  useEffect(() => {
    if (!selectedConsultId && filteredConsultations.length > 0) setSelectedConsultId(filteredConsultations[0].id);
  }, [filteredConsultations, selectedConsultId]);

  if (loading) {
    return <div className="px-8 py-16 text-center text-sm text-[#A0A8B0]">Loading...</div>;
  }
  if (loadError || !doctor) {
    return <div className="px-8 py-16 text-center text-sm text-red-600">{loadError || "Doctor not found."}</div>;
  }

  const displayName = doctor.fullName?.startsWith("Dr.") ? doctor.fullName : `Dr. ${doctor.fullName}`;

  return (
    <div className="px-8 py-8 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/clinic/doctors${qs}`}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Manage Doctors &gt; doctor details
        </h1>
      </div>

      {/* ── Top Profile Card ── */}
      <div className="bg-[#EEF0F6] rounded-2xl p-7 relative w-full flex flex-col lg:flex-row gap-12 lg:gap-24 mb-6 shadow-sm border border-[#E4E8F0]">

        <button onClick={editing ? undefined : startEditing} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-[#24292E] hover:text-[#5476FC] bg-white rounded-lg shadow-sm border border-[#E4E8F0] transition-colors">
          <EditIcon />
        </button>

        {/* Column 1: Identity */}
        <div className="flex items-center gap-5">
          <AvatarPlaceholder name={displayName} avatarUrl={doctor.avatarUrl} size="w-24 h-24" />
          <div className="flex flex-col">
            <h2 className="text-[#24292E] text-[18px] font-semibold">{displayName}</h2>
            <span className="text-[#676E76] text-[13px] mb-3">{doctor.email}</span>
            <div className="flex items-center gap-3">
              <span className="text-[#24292E] text-[14px] font-medium">{doctor.isOnline ? "Available" : "Not Available"}</span>
              <ToggleSwitch isOn={!!doctor.isOnline} onClick={handleToggleOnline} disabled={togglingOnline} />
            </div>
          </div>
        </div>

        {/* Column 2: Personal Details */}
        <div className="flex flex-col flex-1">
          <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Personal Details</h3>
          {editing ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <select value={eGender} onChange={(e) => setEGender(e.target.value)} className={inputCls}>
                <option value="">Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </select>
              <input type="date" value={eDob} onChange={(e) => setEDob(e.target.value)} className={inputCls} />
              <select value={eBloodGroup} onChange={(e) => setEBloodGroup(e.target.value)} className={inputCls}>
                <option value="">Blood Group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
              <input placeholder="Height" value={eHeight} onChange={(e) => setEHeight(e.target.value)} className={inputCls} />
              <input placeholder="Weight" value={eWeight} onChange={(e) => setEWeight(e.target.value)} className={inputCls} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-12 gap-y-3">
              {[
                { label: "Gender", val: doctor.gender ?? "—" },
                { label: "Date of Birth", val: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
                { label: "Blood Group", val: doctor.bloodGroup ?? "—" },
                { label: "Height", val: doctor.height ?? "—" },
                { label: "Weight", val: doctor.weight ?? "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-[12px]">
                  <span className="text-[#676E76]">{item.label}</span>
                  <span className="text-[#24292E] font-bold">{item.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Credentials */}
        <div className="flex flex-col flex-1">
          <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Credentials</h3>
          <div className="flex flex-col gap-3 pr-8">
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-[#676E76]">Name</span>
              <div className="flex items-center gap-2">
                {editing ? (
                  <input value={eFullName} onChange={(e) => setEFullName(e.target.value)} className={inputCls} />
                ) : (
                  <span className="text-[#24292E] font-bold">{doctor.fullName}</span>
                )}
                {!editing && <button onClick={startEditing} className="text-gray-400 hover:text-black"><EditIcon /></button>}
              </div>
            </div>
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-[#676E76]">Username</span>
              <span className="text-[#24292E] font-bold">{doctor.email}</span>
            </div>
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-[#676E76]">Password</span>
              <button onClick={handleResetPassword} className="text-[#5476FC] font-bold hover:underline">Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#EBEEF5] pb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md scale-[1.02]"
                : "bg-white text-[#676E76] border border-[#E4E8F0] hover:border-[#5476FC] hover:text-[#5476FC] shadow-sm"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── ABOUT Tab ── */}
      {activeTab === "About" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10 mb-20 bg-white p-6 rounded-xl border border-[#E4E8F0] shadow-sm">

          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-3">About</h3>
              {editing ? (
                <textarea value={eBio} onChange={(e) => setEBio(e.target.value)} rows={5} placeholder="Bio" className="w-full border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm outline-none focus:border-[#5476FC]" />
              ) : (
                <div className="border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm min-h-[80px]">
                  {doctor.bio || "No bio added yet."}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Gender", val: doctor.gender ?? "—" },
                    { label: "License Number", val: editing ? null : (doctor.license ?? "—"), edit: editing ? <input value={eLicense} onChange={(e) => setELicense(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                    { label: "Emirates ID", val: doctor.emiratesId ?? "—" },
                    { label: "Specialization", val: editing ? null : (doctor.specialty ?? "—"), edit: editing ? <input value={eSpecialty} onChange={(e) => setESpecialty(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                    { label: "Qualification", val: editing ? null : (doctor.qualification ?? "—"), edit: editing ? <input value={eQualification} onChange={(e) => setEQualification(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[11px] font-medium">{f.label}</span>
                      {f.edit ?? <input type="text" readOnly value={f.val ?? ""} className={`w-[120px] ${inputCls} border-none`} />}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { label: "Location", val: editing ? null : (doctor.address ?? "—"), edit: editing ? <input value={eAddress} onChange={(e) => setEAddress(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                    { label: "Consultation Fees", val: editing ? null : (doctor.fees != null ? `$${doctor.fees}` : "—"), edit: editing ? <input value={eFees} onChange={(e) => setEFees(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                    { label: "Contact Number", val: editing ? null : (doctor.phone ?? "—"), edit: editing ? <input value={ePhone} onChange={(e) => setEPhone(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                    { label: "Office Phone", val: "—" },
                    { label: "Languages", val: editing ? null : formatLanguages(doctor.languages), edit: editing ? <input value={eLanguages} onChange={(e) => setELanguages(e.target.value)} className={`${inputCls} w-[120px]`} /> : null },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[11px] font-medium">{f.label}</span>
                      {f.edit ?? <input type="text" readOnly value={f.val ?? ""} className={`w-[120px] ${inputCls} border-none text-[#676E76]`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <h3 className="text-[#24292E] text-[14px] font-bold mb-3">Eligibility</h3>
              {editing ? (
                <textarea value={eEligibility} onChange={(e) => setEEligibility(e.target.value)} rows={5} placeholder="Eligibility" className="w-full border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm outline-none focus:border-[#5476FC]" />
              ) : (
                <div className="border border-[#D6D9E0] p-4 text-[12px] text-[#676E76] leading-relaxed rounded-sm min-h-[80px]">
                  {doctor.eligibility || "No eligibility information added yet."}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[#24292E] text-[14px] font-bold">Time slots</h3>
                <button onClick={openSlotEditor} className="text-[#676E76] hover:text-[#24292E]">
                  <EditIcon />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TIMING_DAYS.map(({ label, dow }) => {
                  const daySlots = (doctor.slots ?? []).filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  return (
                    <div key={label} className="border border-[#D6D9E0] h-8 flex items-center justify-center text-[11px] text-[#676E76] font-medium px-1 text-center">
                      {label.slice(0, 3)} : {daySlots.length > 0 ? daySlots.map((s) => `${fmt12(s.startTime)}-${fmt12(s.endTime)}`).join(", ") : "Closed"}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {saveError && <div className="col-span-1 xl:col-span-2 text-xs text-red-600 text-center">{saveError}</div>}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 col-span-1 xl:col-span-2">
            <button onClick={handleDelete} disabled={deleting} className="px-8 py-2.5 rounded-lg bg-[#A7AAB4] text-white text-[12px] font-bold tracking-widest hover:bg-gray-500 transition-colors disabled:opacity-50">
              {deleting ? "REMOVING..." : "DELETE"}
            </button>
            {editing ? (
              <button onClick={() => setEditing(false)} className="px-8 py-2.5 rounded-lg bg-[#A7AAB4] text-white text-[12px] font-bold tracking-widest hover:bg-gray-500 transition-colors">
                CANCEL
              </button>
            ) : (
              <button onClick={startEditing} className="px-8 py-2.5 rounded-lg bg-[#A7AAB4] text-white text-[12px] font-bold tracking-widest hover:bg-gray-500 transition-colors">
                EDIT
              </button>
            )}
            <button
              onClick={editing ? handleSave : undefined}
              disabled={!editing || savingDoc}
              className="px-10 py-2.5 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] shadow-sm text-white text-[12px] font-bold tracking-widest hover:shadow-md transition-all disabled:opacity-50"
            >
              {savingDoc ? "SAVING..." : "SAVE"}
            </button>
          </div>

        </div>
      )}

      {/* ── CONSULTATIONS Tab ── */}
      {activeTab === "Consultations" && (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["All", "Upcoming", "Past"].map((t) => (
                  <button key={t} onClick={() => setConsultFilter(t)} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${consultFilter === t ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>{t}</button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text" placeholder="Search all" value={consultSearch} onChange={(e) => setConsultSearch(e.target.value)}
                  className="w-56 h-9 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-sm outline-none focus:border-[#5476FC] text-[#24292E]"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
            </div>

            {!consultationsLoaded ? (
              <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
            ) : filteredConsultations.length === 0 ? (
              <div className="text-center text-sm text-[#A0A8B0] py-12">No consultations found.</div>
            ) : (
              <>
                <h2 className="text-[#24292E] text-sm font-bold">New</h2>
                <div className="flex flex-col gap-2">
                  {newConsults.length === 0 ? (
                    <div className="text-[#A0A8B0] text-xs py-2">No upcoming or in-progress consultations.</div>
                  ) : (
                    newConsults.map((c) => (
                      <div key={c.id} onClick={() => setSelectedConsultId(c.id)} className={`bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedConsultId === c.id ? "border-[#5476FC]" : "border-[#E4E8F0]"}`}>
                        <div className="flex items-center gap-3 w-[180px] shrink-0">
                          <AvatarPlaceholder name={c.patientName} avatarUrl={c.patientAvatarUrl} size="w-10 h-10" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold text-[#24292E] truncate">{c.patientName}</span>
                            <span className="text-[11px] text-[#676E76] truncate">{c.patientEmail}</span>
                          </div>
                        </div>
                        <span className="text-[12px] font-medium text-[#24292E] w-[40px] shrink-0">{c.patientAge ?? "—"}</span>
                        <span className="text-[11px] font-medium text-[#676E76] w-[120px] truncate shrink-0" title={c.primaryDiagnosis}>{c.primaryDiagnosis}</span>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <span className="text-[11px] font-medium text-[#24292E]">Time - <span className="text-[#5476FC]">{new Date(c.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></span>
                          <span className="text-[11px] text-[#676E76]">{new Date(c.scheduledAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
                        </div>
                        <span className={`text-[12px] font-medium shrink-0 ${statusColor(c)}`}>{statusLabel(c)}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedConsultId(c.id); }} className="flex items-center gap-1 text-[12px] font-medium text-[#24292E] hover:text-[#5476FC] transition-colors">
                            View <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="h-px bg-[#EBEEF5] my-3" />

                <h2 className="text-[#24292E] text-sm font-bold">All</h2>
                <div className="flex flex-col gap-2 mb-6">
                  {allConsults.map((c) => (
                    <div key={c.id} onClick={() => setSelectedConsultId(c.id)} className={`bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedConsultId === c.id ? "border-[#5476FC]" : "border-[#E4E8F0]"}`}>
                      <div className="flex items-center gap-3 w-[180px] shrink-0">
                        <AvatarPlaceholder name={c.patientName} avatarUrl={c.patientAvatarUrl} size="w-10 h-10" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-[#24292E] truncate">{c.patientName}</span>
                          <span className="text-[11px] text-[#676E76] truncate">{c.patientEmail}</span>
                        </div>
                      </div>
                      <span className="text-[12px] font-medium text-[#24292E] w-[40px] shrink-0">{c.patientAge ?? "—"}</span>
                      <span className="text-[11px] font-medium text-[#676E76] w-[120px] truncate shrink-0" title={c.primaryDiagnosis}>{c.primaryDiagnosis}</span>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <span className="text-[11px] font-medium text-[#24292E]">Time - <span className="text-[#5476FC]">{new Date(c.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span></span>
                        <span className="text-[11px] text-[#676E76]">{new Date(c.scheduledAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}</span>
                      </div>
                      <span className={`text-[12px] font-medium shrink-0 ${statusColor(c)}`}>{statusLabel(c)}</span>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedConsultId(c.id); }} className="flex items-center gap-1 text-[12px] font-medium text-[#24292E] hover:text-[#5476FC] transition-colors shrink-0">
                        View <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Appointment Details */}
          {selectedConsult && (
            <div className="w-full xl:w-[300px] bg-white rounded-2xl p-5 flex flex-col gap-4 shrink-0 border border-[#E4E8F0] shadow-sm">
              <h2 className="text-[#24292E] text-[15px] font-semibold">Appointment Details</h2>
              <div className="h-px bg-[#EBEEF5]" />
              <div className="flex items-center gap-3">
                <AvatarPlaceholder name={selectedConsult.patientName} avatarUrl={selectedConsult.patientAvatarUrl} size="w-11 h-11" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[#24292E] text-[13px] font-semibold truncate">{selectedConsult.patientName}</span>
                  <span className="text-[#9EA5AD] text-[11px] truncate">{selectedConsult.patientEmail}</span>
                </div>
              </div>
              <Link href={`/clinic/patients/${selectedConsult.patientId}${qs}`} className="w-full text-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] transition-all">
                View Profile
              </Link>
              <div className="h-px bg-[#EBEEF5]" />
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] text-[12px] font-semibold">Reason for visit</span>
                <p className="text-[#9EA5AD] text-[11px] leading-relaxed">{selectedConsult.reason}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] text-[12px] font-semibold">Pre-visit form</span>
                <p className="text-[11px] mt-0.5">
                  {selectedConsult.preVisitData ? (
                    <span className="text-[#5476FC] font-medium">Filled by patient</span>
                  ) : (
                    <span className="text-[#D92D20] font-medium">Didn&apos;t Check</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RATING AND PERFORMANCE Tab ── */}
      {activeTab === "Rating and Performance" && (
        <div className="bg-[#EEF0F6] border border-[#E4E8F0] rounded-2xl p-8 mb-10 shadow-sm">
          <h3 className="text-[16px] font-bold text-[#24292E] mb-6">Rating and Reviews</h3>

          {!reviewsLoaded ? (
            <div className="text-center text-sm text-[#A0A8B0] py-8">Loading...</div>
          ) : (
            <>
              <div className="flex items-end gap-3 mb-8">
                <StarRating rating={avgRating ?? 0} size={22} />
                <span className="text-[24px] font-bold text-[#676E76] leading-none">{avgRating ?? "—"}</span>
                <span className="text-[11px] font-medium text-[#A7AAB4] leading-none mb-1">{reviewTotal}</span>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center text-sm text-[#A0A8B0] py-8">No reviews yet.</div>
              ) : (
                <div className="flex flex-col">
                  {reviews.map((rv, i) => (
                    <div key={i} className="flex items-start justify-between py-6 border-b border-[#D6DEFF] last:border-0">
                      <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-12 w-full">
                        <div className="flex flex-col gap-1 w-24 shrink-0">
                          <span className="text-[13px] font-bold text-[#24292E]">{rv.reviewer?.name ?? "Patient"}</span>
                          <StarRating rating={rv.rating} />
                        </div>
                        <p className="text-[12px] text-[#A7AAB4] leading-relaxed flex-1 sm:pr-10">{rv.comment || "No comment left."}</p>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-[#A7AAB4]">
                          <span>{new Date(rv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span>{new Date(rv.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Time Slots Editor Modal */}
      {showSlotEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[560px] rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4">
            <h2 className="text-[#111827] text-[16px] font-bold">Edit Time Slots</h2>
            <div className="flex flex-col gap-3">
              {TIMING_DAYS.map(({ label, dow }) => {
                const daySlots = slotDraft.map((s, idx) => ({ ...s, idx })).filter((s) => s.dayOfWeek === dow);
                return (
                  <div key={dow} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="w-20 text-[12px] font-semibold text-[#676E76] shrink-0">{label}</span>
                    <div className="flex items-center flex-wrap gap-2">
                      {daySlots.map((s) => (
                        <div key={s.idx} className="flex items-center gap-2 bg-[#F4F7FF] border border-[#D6DEFF] rounded-full px-3 py-1.5">
                          <input type="time" value={s.startTime} onChange={(e) => updateSlot(s.idx, "startTime", e.target.value)} className="text-[11px] font-bold text-[#5476FC] bg-transparent outline-none w-[70px]" />
                          <span className="text-[10px] text-[#838B95]">to</span>
                          <input type="time" value={s.endTime} onChange={(e) => updateSlot(s.idx, "endTime", e.target.value)} className="text-[11px] font-bold text-[#5476FC] bg-transparent outline-none w-[70px]" />
                          <button onClick={() => removeSlot(s.idx)} className="w-4 h-4 rounded-full bg-[#FFE5E5] text-[#D92D20] flex items-center justify-center hover:bg-[#FFD1D1] transition-colors text-[11px] leading-none font-bold">-</button>
                        </div>
                      ))}
                      <button onClick={() => addSlot(dow)} className="w-6 h-6 rounded-full bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white flex items-center justify-center hover:shadow-md transition-all text-[14px] leading-none font-medium">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2 pt-3 border-t border-[#E4E8F0]">
              <button onClick={() => setShowSlotEditor(false)} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveSlots} disabled={savingSlots} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md disabled:opacity-50">
                {savingSlots ? "Saving..." : "Save Timing"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
