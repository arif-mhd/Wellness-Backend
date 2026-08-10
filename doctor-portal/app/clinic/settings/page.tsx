"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";

// ── Small helpers ──────────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[#9EA5AD] hover:text-[#5476FC] transition-colors p-1 shrink-0 rounded-md hover:bg-[#F5F6FA]">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.75 9a6.75 6.75 0 1 1-6.75-6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.335 9.788 8.25 9.75V7.665l4.822-4.822a.563.563 0 0 1 .796 0l1.065 1.065a.563.563 0 0 1 0 .795L10.335 9.788Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function InlineEditBtns({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 mt-2 w-full">
      <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium hover:bg-gray-50 transition-all">Cancel</button>
      <button onClick={onSave} className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-wide">Save</button>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#676E76] text-[12px] font-medium">{label}</span>
      <span className="text-[#24292E] text-[13px] font-semibold">{value || "—"}</span>
    </div>
  );
}

function EditableFieldRow({ label, value, onChange, disabled = false, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[#24292E] text-[13px] font-bold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`text-[#24292E] text-[13px] h-11 bg-white rounded-xl px-4 outline-none border transition-all ${disabled ? "border-[#EBEEF5] bg-[#F9FAFC] opacity-70 cursor-not-allowed" : "border-[#D6DEFF] focus:border-[#5476FC] shadow-sm"}`}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Clinic = Record<string, any>;

type FormData = {
  description: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  website: string;
  yearEstablished: string;
};

function buildFormData(clinic: Clinic): FormData {
  return {
    description: clinic.description ?? "",
    phone: clinic.phone ?? "",
    address: clinic.address ?? "",
    city: clinic.city ?? "",
    postalCode: clinic.postalCode ?? "",
    country: clinic.country ?? "",
    website: clinic.website ?? "",
    yearEstablished: clinic.yearEstablished ?? "",
  };
}

export default function ClinicSettingsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);
  
  // draft copies per section for cancel support
  const [draftDesc, setDraftDesc] = useState("");
  const [draftContact, setDraftContact] = useState({ phone: "" });
  const [draftLocation, setDraftLocation] = useState({ address: "", city: "", postalCode: "", country: "" });
  const [draftOperational, setDraftOperational] = useState({ website: "", yearEstablished: "" });

  const [editDesc, setEditDesc] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [editLocation, setEditLocation] = useState(false);
  const [editOperational, setEditOperational] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadClinic = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiFetch("/api/clinics/me");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setLoadError(body.error ?? `Failed to load clinic profile (${res.status}).`);
        return;
      }
      const data = await res.json();
      const cli = data.clinic ?? data;
      setClinic(cli);
      setFormData(buildFormData(cli));
    } catch (e: any) {
      setLoadError(e?.message ?? "Network error — could not load clinic profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClinic(); }, [loadClinic]);

  // Returns whether the save actually succeeded — callers use this to decide
  // whether to close the edit panel (keep it open with the draft + error
  // visible on failure, so nothing the clinic typed is silently lost).
  const saveSection = async (patch: Partial<FormData>): Promise<boolean> => {
    if (!formData) return false;
    setSaving(true);
    setSaveError("");
    const merged = { ...formData, ...patch };
    try {
      const res = await apiFetch("/api/clinics/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(body.error ?? `Failed to save changes (${res.status}).`);
        return false;
      }
      const savedClinic = body.clinic ?? body;
      setClinic(prev => (prev ? { ...prev, ...savedClinic } : savedClinic));
      setFormData(buildFormData(savedClinic));
      return true;
    } catch (e: any) {
      setSaveError(e?.message ?? "Network error — changes were not saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogoClick = () => fileInputRef.current?.click();

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await apiFetch("/api/clinics/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status}).`);
      }
      const data = await res.json();
      const logoUrl = data.urls?.logo || data.urls?.avatar;
      if (!logoUrl) throw new Error("Upload succeeded but no logo URL was returned.");

      const saveRes = await apiFetch("/api/clinics/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to save logo (${saveRes.status}).`);
      }
      setClinic((prev) => prev ? { ...prev, logoUrl } : prev);
    } catch (e: any) {
      alert(e?.message ?? "Logo upload failed.");
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 h-full">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && !clinic) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 h-full text-center px-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <p className="text-[#24292E] text-[14px] font-medium max-w-[360px]">{loadError}</p>
        <button
          onClick={() => loadClinic()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const cli = clinic ?? {};
  const fd = formData ?? buildFormData(cli);

  return (
    <div className="px-5 pb-12 pt-2 max-w-[900px] mx-auto w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3 mb-4">{saveError}</div>
      )}

      {/* Hidden logo file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />

      <h1 className="text-[#383F45] font-semibold text-[28px] leading-none tracking-[-0.5px] mb-8">
        Settings
      </h1>

      {/* Clinic hero */}
      <div className="flex items-center gap-6 mb-10">
        <div className="relative shrink-0 group">
          {cli.logoUrl ? (
            <img
              src={cli.logoUrl}
              alt={cli.name || "Clinic"}
              className="w-[84px] h-[84px] rounded-2xl border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] object-cover bg-white"
            />
          ) : (
            <div className="w-[84px] h-[84px] rounded-2xl border-4 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-3xl font-bold select-none">
              {cli.name?.[0]?.toUpperCase() ?? "C"}
            </div>
          )}
          <button
            onClick={handleLogoClick}
            disabled={logoUploading}
            className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {logoUploading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex flex-col gap-1.5 justify-center py-1">
          <h2 className="text-[#24292E] text-[26px] font-semibold leading-none tracking-tight">
            {cli.name || "Clinic Profile"}
          </h2>
          <p className="text-[12px] tracking-tight">
            <span className="text-[#676E76]">REGISTRATION NO: </span>
            <span className="text-[#5476FC] font-semibold">{cli.registrationNumber || "—"}</span>
          </p>
          <div className="flex gap-2 mt-1">
            <span className="inline-flex items-center justify-center bg-[#E8EEFF] text-[#182A6E] text-[10px] font-bold shrink-0 px-3 py-1 rounded-md tracking-wide uppercase">
              Primary Clinic
            </span>
            <span className="inline-flex items-center justify-center bg-[#ECFDF5] text-[#047857] text-[10px] font-bold shrink-0 px-3 py-1 rounded-md tracking-wide uppercase">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div className="flex flex-col gap-6">
        
        {/* Description / Bio */}
        <div className="bg-white rounded-[20px] p-7 flex flex-col gap-5 border border-[#E4E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#111827] text-[15px] font-bold tracking-tight">About Clinic</span>
            {!editDesc && <EditBtn onClick={() => { setDraftDesc(fd.description); setEditDesc(true); }} />}
          </div>
          {editDesc ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={draftDesc}
                onChange={e => setDraftDesc(e.target.value)}
                rows={4}
                placeholder="Write a short description about the clinic..."
                className="w-full text-[13px] bg-white border border-[#D6DEFF] rounded-xl p-4 outline-none focus:border-[#5476FC] resize-none transition-all shadow-sm"
              />
              <div className="w-[200px] ml-auto">
                <InlineEditBtns
                  onCancel={() => setEditDesc(false)}
                  onSave={async () => { if (await saveSection({ description: draftDesc })) setEditDesc(false); }}
                />
              </div>
            </div>
          ) : (
            <span className="text-[#676E76] text-[13px] font-medium leading-relaxed max-w-[800px]">{fd.description || "No description provided."}</span>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          
          {/* General & Contact Information */}
          <div className="bg-white rounded-[20px] p-7 flex flex-col gap-5 flex-1 border border-[#E4E8F0] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[#111827] text-[15px] font-bold tracking-tight">General Information</span>
              {!editContact && (
                <EditBtn onClick={() => {
                  setDraftContact({ phone: fd.phone });
                  setEditContact(true);
                }} />
              )}
            </div>
            
            {editContact ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-4 flex-1">
                  <EditableFieldRow label="Registration Number" value={cli.registrationNumber || ""} onChange={() => {}} disabled />
                  <EditableFieldRow label="Primary Email ID" value={cli.email || ""} onChange={() => {}} disabled />
                  <EditableFieldRow label="Contact Number" value={draftContact.phone} onChange={v => setDraftContact(p => ({ ...p, phone: v }))} placeholder="+971 50 123 4567" />
                </div>
                <div className="mt-auto pt-2">
                  <InlineEditBtns
                    onCancel={() => setEditContact(false)}
                    onSave={async () => { if (await saveSection(draftContact)) setEditContact(false); }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <FieldRow label="Registration Number" value={cli.registrationNumber || "—"} />
                <FieldRow label="Primary Email ID" value={cli.email || "—"} />
                <FieldRow label="Contact Number" value={fd.phone || "—"} />
              </div>
            )}
          </div>

          {/* Location Details */}
          <div className="bg-white rounded-[20px] p-7 flex flex-col gap-5 flex-1 border border-[#E4E8F0] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[#111827] text-[15px] font-bold tracking-tight">Location Details</span>
              {!editLocation && (
                <EditBtn onClick={() => {
                  setDraftLocation({
                    address: fd.address,
                    city: fd.city,
                    postalCode: fd.postalCode,
                    country: fd.country,
                  });
                  setEditLocation(true);
                }} />
              )}
            </div>
            {editLocation ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-4 flex-1">
                  <EditableFieldRow label="Street Address" value={draftLocation.address} onChange={v => setDraftLocation(p => ({ ...p, address: v }))} placeholder="Bldg No, Street" />
                  <div className="flex gap-4">
                    <div className="flex-1"><EditableFieldRow label="City" value={draftLocation.city} onChange={v => setDraftLocation(p => ({ ...p, city: v }))} placeholder="Dubai" /></div>
                    <div className="flex-1"><EditableFieldRow label="Postal Code" value={draftLocation.postalCode} onChange={v => setDraftLocation(p => ({ ...p, postalCode: v }))} placeholder="00000" /></div>
                  </div>
                  <EditableFieldRow label="Country" value={draftLocation.country} onChange={v => setDraftLocation(p => ({ ...p, country: v }))} placeholder="UAE" />
                </div>
                <div className="mt-auto pt-2">
                  <InlineEditBtns
                    onCancel={() => setEditLocation(false)}
                    onSave={async () => { if (await saveSection(draftLocation)) setEditLocation(false); }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <FieldRow label="Street Address" value={fd.address || "—"} />
                <div className="flex gap-4">
                  <div className="flex-1"><FieldRow label="City" value={fd.city || "—"} /></div>
                  <div className="flex-1"><FieldRow label="Postal Code" value={fd.postalCode || "—"} /></div>
                </div>
                <FieldRow label="Country" value={fd.country || "—"} />
              </div>
            )}
          </div>

        </div>

        {/* Operational Details */}
        <div className="bg-white rounded-[20px] p-7 flex flex-col gap-5 border border-[#E4E8F0] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[#111827] text-[15px] font-bold tracking-tight">Operational Details</span>
            {!editOperational && (
              <EditBtn onClick={() => {
                setDraftOperational({
                  website: fd.website,
                  yearEstablished: fd.yearEstablished,
                });
                setEditOperational(true);
              }} />
            )}
          </div>
          {editOperational ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-6">
                 <div className="flex-1"><EditableFieldRow label="Website URL" value={draftOperational.website} onChange={v => setDraftOperational(p => ({ ...p, website: v }))} placeholder="https://..." /></div>
                 <div className="flex-1"><EditableFieldRow label="Year Established" value={draftOperational.yearEstablished} onChange={v => setDraftOperational(p => ({ ...p, yearEstablished: v }))} placeholder="YYYY" /></div>
              </div>
              <div className="w-[200px] ml-auto mt-2">
                <InlineEditBtns
                  onCancel={() => setEditOperational(false)}
                  onSave={async () => { if (await saveSection(draftOperational)) setEditOperational(false); }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1"><FieldRow label="Website URL" value={fd.website || "—"} /></div>
              <div className="flex-1"><FieldRow label="Year Established" value={fd.yearEstablished || "—"} /></div>
            </div>
          )}
        </div>

      </div>

      {saving && (
        <div className="fixed bottom-6 right-6 bg-[#24292E] text-white px-5 py-3 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-3 text-[13px] font-medium z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Saving changes…
        </div>
      )}
    </div>
  );
}
