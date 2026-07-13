"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";

const EMIRATES = [
  { key: "AUH", city: "Abu Dhabi" },
  { key: "DXB", city: "Dubai" },
  { key: "SHJ", city: "Sharjah" },
  { key: "AJM", city: "Ajman" },
  { key: "UAQ", city: "Umm Al-Quwain" },
  { key: "RAK", city: "Ras Al Khaimah" },
  { key: "FUJ", city: "Fujairah" },
];

const CONSULTATION_TIMES = [10, 15, 20, 30, 45, 60];

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

function InlineEditBtns({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 mt-2">
      <button onClick={onCancel} className="flex-1 py-1.5 rounded-lg bg-[#E8EEFF] text-[#182A6F] text-xs font-medium hover:bg-[#DBE5FF] transition-colors">Cancel</button>
      <button onClick={onSave} className="flex-1 py-1.5 rounded-lg bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-xs font-medium hover:shadow-md transition-all">Save</button>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#676E76] text-xs">{label}</span>
      <span className="text-[#24292E] text-xs font-medium">{value || "—"}</span>
    </div>
  );
}

function EditableFieldRow({ label, value, onChange, disabled = false, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#676E76] text-xs">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[#24292E] text-xs font-medium bg-[#F5F6FA] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC] transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Doctor = Record<string, any>;

type FormData = {
  languages: string;
  consultationTimeLimitMins: number;
  bio: string;
  phone: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  bloodGroup: string;
  height: string;
  weight: string;
  address: string;
  postalCode: string;
  feesPerEmirate: Record<string, string>;
};

function buildFormData(doc: Doctor): FormData {
  const fpe: Record<string, string> = {};
  for (const em of EMIRATES) {
    fpe[em.key] = doc.feesPerEmirate?.[em.key] ?? doc.fees ?? "";
  }
  return {
    languages:                doc.languages                ?? "",
    consultationTimeLimitMins: doc.consultationTimeLimitMins ?? 15,
    bio:                      doc.bio                      ?? "",
    phone:                    doc.phone                    ?? "",
    gender:                   doc.gender                   ?? "",
    maritalStatus:            doc.maritalStatus            ?? "",
    dateOfBirth:              doc.dateOfBirth              ?? "",
    bloodGroup:               doc.bloodGroup               ?? "",
    height:                   String(doc.height            ?? ""),
    weight:                   String(doc.weight            ?? ""),
    address:                  doc.address                  ?? "",
    postalCode:               doc.postalCode               ?? "",
    feesPerEmirate:           fpe,
  };
}

export default function ProfilePage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);
  // draft copies per section for cancel support
  const [draftLang, setDraftLang] = useState("");
  const [draftConsult, setDraftConsult] = useState(15);
  const [draftBio, setDraftBio] = useState("");
  const [draftPersonal, setDraftPersonal] = useState({ phone: "", gender: "", maritalStatus: "" });
  const [draftDetails, setDraftDetails] = useState({ dateOfBirth: "", bloodGroup: "", height: "", weight: "", address: "", postalCode: "" });
  const [draftFees, setDraftFees] = useState<Record<string, string>>({});

  const [editLang, setEditLang] = useState(false);
  const [editConsult, setEditConsult] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [editFees, setEditFees] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDoctor = useCallback(async () => {
    try {
      const res = await apiFetch("/api/doctors/me");
      const data = await res.json();
      const doc = data.doctor ?? data;
      setDoctor(doc);
      setFormData(buildFormData(doc));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDoctor(); }, [loadDoctor]);

  const saveSection = async (patch: Partial<FormData>) => {
    if (!formData) return;
    setSaving(true);
    setSaveError("");
    const merged = { ...formData, ...patch };
    try {
      const res = await apiFetch("/api/doctors/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      if (!res.ok) throw new Error("save failed");
      setFormData(merged);
      await loadDoctor();
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await apiFetch("/api/doctors/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.urls?.avatar) {
        await apiFetch("/api/doctors/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: data.urls.avatar }),
        });
        setDoctor((prev) => prev ? { ...prev, avatarUrl: data.urls.avatar } : prev);
      }
    } catch {
      alert("Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const doc = doctor ?? {};
  const fd = formData ?? buildFormData(doc);

  const displayFee = (key: string) => {
    const v = fd.feesPerEmirate[key];
    return v ? `AED ${v}.00` : "AED —";
  };

  return (
    <>
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-3">{saveError}</div>
      )}

      {/* Hidden avatar file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />

      {/* Doctor hero */}
      <div className="flex items-start gap-5">
        <div className="relative shrink-0 group">
          {doc.avatarUrl ? (
            <img
              src={doc.avatarUrl}
              alt={doc.fullName || "Doctor"}
              className="w-[66px] h-[66px] rounded-full border-2 border-white/74 shadow-[0_0_0_4px_rgba(255,255,255,0.25)] object-cover"
            />
          ) : (
            <div className="w-[66px] h-[66px] rounded-full border-2 border-white/40 shadow-[0_0_0_4px_rgba(255,255,255,0.25)] bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-2xl font-semibold select-none">
              {doc.fullName?.[0]?.toUpperCase() ?? doc.email?.[0]?.toUpperCase() ?? "D"}
            </div>
          )}
          <button
            onClick={handleAvatarClick}
            disabled={avatarUploading}
            className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {avatarUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex flex-col gap-2 justify-center">
          <h1 className="text-[#383F45] text-[32px] font-normal leading-none tracking-tight">
            {doc.fullName || "Doctor"}
          </h1>
          <p className="text-xs tracking-tight">
            <span className="text-[#676E76]">LICENSE NUMBER </span>
            <span className="text-[#5476FC] font-medium">{doc.license || "—"}</span>
          </p>
          {doc.specialty && (
            <span className="inline-flex items-center justify-center bg-[#D6DEFF] text-[#182A6E] text-xs font-semibold shrink-0 px-4 py-2 rounded-lg">
              {doc.specialty}
            </span>
          )}
        </div>
      </div>

      {/* Personal Details */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[#24292E] text-base font-medium tracking-tight">Personal Details</h2>

        {/* Row 1: License / Languages / Consult time */}
        <div className="flex gap-5">
          {/* License — read-only */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[#676E76] text-xs font-normal">License Info</span>
            </div>
            <span className="text-[#24292E] text-xs font-medium">{doc.license || "—"}</span>
          </div>

          {/* Languages — editable */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[#676E76] text-xs font-normal">Languages Known</span>
              {!editLang && <EditBtn onClick={() => { setDraftLang(fd.languages); setEditLang(true); }} />}
            </div>
            {editLang ? (
              <>
                <input
                  value={draftLang}
                  onChange={e => setDraftLang(e.target.value)}
                  placeholder="e.g. English, Arabic"
                  className="text-xs bg-[#F5F6FA] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC]"
                />
                <InlineEditBtns
                  onCancel={() => setEditLang(false)}
                  onSave={async () => { await saveSection({ languages: draftLang }); setEditLang(false); }}
                />
              </>
            ) : (
              <span className="text-[#24292E] text-xs font-medium">{fd.languages || "—"}</span>
            )}
          </div>

          {/* Consultation Time — editable */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[#676E76] text-xs font-normal">Consultation Time Limit</span>
              {!editConsult && <EditBtn onClick={() => { setDraftConsult(fd.consultationTimeLimitMins); setEditConsult(true); }} />}
            </div>
            {editConsult ? (
              <>
                <select
                  value={draftConsult}
                  onChange={e => setDraftConsult(Number(e.target.value))}
                  className="text-xs bg-[#F5F6FA] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC]"
                >
                  {CONSULTATION_TIMES.map(t => (
                    <option key={t} value={t}>{t} Minutes</option>
                  ))}
                </select>
                <InlineEditBtns
                  onCancel={() => setEditConsult(false)}
                  onSave={async () => { await saveSection({ consultationTimeLimitMins: draftConsult }); setEditConsult(false); }}
                />
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[#24292E] font-medium">
                <span>{fd.consultationTimeLimitMins} Minutes</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal">Bio</span>
            {!editBio && <EditBtn onClick={() => { setDraftBio(fd.bio); setEditBio(true); }} />}
          </div>
          {editBio ? (
            <>
              <textarea
                value={draftBio}
                onChange={e => setDraftBio(e.target.value)}
                rows={4}
                placeholder="Write a short bio..."
                className="text-xs bg-[#F5F6FA] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC] resize-none"
              />
              <InlineEditBtns
                onCancel={() => setEditBio(false)}
                onSave={async () => { await saveSection({ bio: draftBio }); setEditBio(false); }}
              />
            </>
          ) : (
            <span className="text-[#24292E] text-xs font-medium leading-relaxed">{fd.bio || "—"}</span>
          )}
        </div>

        {/* Two-column personal data */}
        <div className="flex gap-6">
          {/* Left: phone, email (RO), gender, marital, emirates ID (RO) */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[#24292E] text-xs font-medium">Contact & Identity</span>
              {!editPersonal && (
                <EditBtn onClick={() => {
                  setDraftPersonal({ phone: fd.phone, gender: fd.gender, maritalStatus: fd.maritalStatus });
                  setEditPersonal(true);
                }} />
              )}
            </div>
            {editPersonal ? (
              <>
                <div className="flex flex-col gap-3">
                  <EditableFieldRow label="Contact Number" value={draftPersonal.phone} onChange={v => setDraftPersonal(p => ({ ...p, phone: v }))} />
                  <EditableFieldRow label="Gender" value={draftPersonal.gender} onChange={v => setDraftPersonal(p => ({ ...p, gender: v }))} />
                  <EditableFieldRow label="Marital Status" value={draftPersonal.maritalStatus} onChange={v => setDraftPersonal(p => ({ ...p, maritalStatus: v }))} />
                  <EditableFieldRow label="Email ID (read-only)" value={doc.email || ""} onChange={() => {}} disabled />
                  <EditableFieldRow label="Emirates ID (read-only)" value={doc.emiratesId || ""} onChange={() => {}} disabled />
                </div>
                <InlineEditBtns
                  onCancel={() => setEditPersonal(false)}
                  onSave={async () => { await saveSection(draftPersonal); setEditPersonal(false); }}
                />
              </>
            ) : (
              <>
                <FieldRow label="Emirates ID" value={doc.emiratesId || "—"} />
                <FieldRow label="Contact Number" value={fd.phone || "—"} />
                <FieldRow label="Email ID" value={doc.email || "—"} />
                <FieldRow label="Gender" value={fd.gender || "—"} />
                <FieldRow label="Marital Status" value={fd.maritalStatus || "—"} />
              </>
            )}
          </div>

          {/* Right: DOB, blood group, height, weight, location */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[#24292E] text-xs font-medium">Physical & Location</span>
              {!editDetails && (
                <EditBtn onClick={() => {
                  setDraftDetails({
                    dateOfBirth: fd.dateOfBirth,
                    bloodGroup: fd.bloodGroup,
                    height: fd.height,
                    weight: fd.weight,
                    address: fd.address,
                    postalCode: fd.postalCode,
                  });
                  setEditDetails(true);
                }} />
              )}
            </div>
            {editDetails ? (
              <>
                <div className="flex flex-col gap-3">
                  <EditableFieldRow label="Date of Birth" value={draftDetails.dateOfBirth} onChange={v => setDraftDetails(p => ({ ...p, dateOfBirth: v }))} />
                  <EditableFieldRow label="Blood Group" value={draftDetails.bloodGroup} onChange={v => setDraftDetails(p => ({ ...p, bloodGroup: v }))} />
                  <EditableFieldRow label="Height (cm)" value={draftDetails.height} onChange={v => setDraftDetails(p => ({ ...p, height: v }))} />
                  <EditableFieldRow label="Weight (kg)" value={draftDetails.weight} onChange={v => setDraftDetails(p => ({ ...p, weight: v }))} />
                  <EditableFieldRow label="Address" value={draftDetails.address} onChange={v => setDraftDetails(p => ({ ...p, address: v }))} />
                  <EditableFieldRow label="Postal Code" value={draftDetails.postalCode} onChange={v => setDraftDetails(p => ({ ...p, postalCode: v }))} />
                </div>
                <InlineEditBtns
                  onCancel={() => setEditDetails(false)}
                  onSave={async () => { await saveSection(draftDetails); setEditDetails(false); }}
                />
              </>
            ) : (
              <>
                <FieldRow label="Date of Birth" value={fd.dateOfBirth || "—"} />
                <FieldRow label="Blood Group" value={fd.bloodGroup || "—"} />
                <FieldRow label="Height (cm)" value={fd.height || "—"} />
                <FieldRow label="Weight (kg)" value={fd.weight || "—"} />
                <FieldRow label="Location" value={fd.address ? `${fd.address}${fd.postalCode ? `, ${fd.postalCode}` : ""}` : "—"} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Fee Configuration */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#24292E] text-base font-medium tracking-tight">Fee Configuration</h2>
          {!editFees && <EditBtn onClick={() => { setDraftFees({ ...fd.feesPerEmirate }); setEditFees(true); }} />}
        </div>
        <div className="bg-white rounded-xl p-8 border border-white">
          <span className="text-[#24292E] text-sm font-medium block mb-4">Consultation Fee (AED)</span>
          {editFees ? (
            <>
              <div className="flex flex-col gap-3 max-w-xs">
                {EMIRATES.map(({ key, city }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-[#676E76] text-xs w-32 shrink-0">{city}</span>
                    <input
                      type="number"
                      value={draftFees[key] ?? ""}
                      onChange={e => setDraftFees(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-24 text-xs bg-[#F5F6FA] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#5476FC]/30 border border-transparent focus:border-[#5476FC] text-right"
                    />
                  </div>
                ))}
              </div>
              <InlineEditBtns
                onCancel={() => setEditFees(false)}
                onSave={async () => { await saveSection({ feesPerEmirate: draftFees }); setEditFees(false); }}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2 max-w-xs">
              {EMIRATES.map(({ key, city }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-[#676E76] text-xs">{city}</span>
                  <span className="text-[#24292E] text-xs font-medium">{displayFee(key)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {saving && (
        <div className="flex items-center gap-2 text-[#5476FC] text-xs">
          <div className="w-4 h-4 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
          Saving…
        </div>
      )}
    </>
  );
}
