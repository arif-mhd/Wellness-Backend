"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useDoctorPermissions } from "@/lib/useDoctorPermissions";

const TIMEZONES = [
  "(UTC-12:00) International Date Line West",
  "(UTC-08:00) US/Pacific",
  "(UTC-07:00) US/Mountain",
  "(UTC-06:00) US/Central",
  "(UTC-05:00) US/Eastern",
  "(UTC-04:00) US/Eastern (EDT)",
  "(UTC+00:00) UTC",
  "(UTC+04:00) Gulf Standard Time",
  "(UTC+05:30) India Standard Time",
  "(UTC+08:00) China Standard Time",
];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-[36px] h-[20px] rounded-full shrink-0 transition-all duration-200 outline-none disabled:opacity-50 ${on ? "bg-[#1FAF65]" : "bg-[#D1D5EB]"}`}
    >
      <span
        className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-[2px]"}`}
      />
    </button>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[#24292E] text-xs font-normal">{title}</span>
        {description && <p className="text-[#676E76] text-xs leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
// Credentials (password, 2FA) and account deletion are clinic-managed only —
// see the doctor's Credentials panel on the clinic portal's Doctor Detail
// page. This screen only covers settings a doctor genuinely self-manages.
export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(true);

  // Time zone
  const [timezone, setTimezone] = useState("(UTC+04:00) Gulf Standard Time");
  const [tzOpen, setTzOpen] = useState(false);
  const [savingTz, setSavingTz] = useState(false);
  const [tzSaved, setTzSaved] = useState(false);

  // Specialist networking (independent doctors only — clinic-affiliated
  // doctors' cross-branch access is controlled by their clinic admin instead)
  const [isIndependent, setIsIndependent] = useState(false);
  const [openToNetworking, setOpenToNetworking] = useState(false);
  const [savingNetworking, setSavingNetworking] = useState(false);

  const { can } = useDoctorPermissions();

  useEffect(() => {
    apiFetch("/api/doctors/me")
      .then(r => r.json())
      .then(data => {
        const doc = data.doctor;
        if (doc?.timezone) setTimezone(doc.timezone);
        setIsIndependent(!doc?.clinicId);
        setOpenToNetworking(!!doc?.openToNetworking);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggleNetworking = async () => {
    const next = !openToNetworking;
    setSavingNetworking(true);
    setOpenToNetworking(next);
    try {
      const res = await apiFetch("/api/doctors/networking-status", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openToNetworking: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("Failed to update specialist networking setting.");
      setOpenToNetworking(!next);
    } finally {
      setSavingNetworking(false);
    }
  };

  const handleSaveTimezone = async () => {
    setSavingTz(true); setTzSaved(false);
    try {
      const res = await apiFetch("/api/doctors/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (!res.ok) throw new Error();
      setTzSaved(true);
      setTimeout(() => setTzSaved(false), 3000);
    } catch { alert("Failed to save timezone."); }
    finally { setSavingTz(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h2 className="text-[#24292E] text-base font-medium tracking-tight">Account Settings</h2>

      {/* ── Time Zone ─────────────────────────────────────────── */}
      <SectionCard title="Time Zone" description="Selecting the correct time zone is essential for ensuring your schedule and notifications match your local time.">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="relative w-full max-w-full sm:max-w-[440px]">
            <button onClick={() => setTzOpen(o => !o)}
              className="w-full h-[66px] px-6 rounded-xl bg-[#F5F6FA] flex items-center justify-between gap-4">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[#9EA5AD] text-sm font-medium">Current Time Zone</span>
                <span className="text-[#383F45] text-sm font-medium">{timezone}</span>
              </div>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={`shrink-0 transition-transform ${tzOpen ? "rotate-180" : ""}`}>
                <path d="M4.8125 7.90625L11 14.0938L17.1875 7.90625" stroke="#6D7885" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {tzOpen && (
              <div className="absolute top-full mt-1 w-full bg-white border border-[#EBEEF5] rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                {TIMEZONES.map(tz => (
                  <button key={tz} onClick={() => { setTimezone(tz); setTzOpen(false); }}
                    className={`w-full text-left px-5 py-3 text-xs hover:bg-[#F5F7FF] transition-colors ${tz === timezone ? "text-[#5476FC] font-medium" : "text-[#383F45]"}`}>
                    {tz}
                  </button>
                ))}
              </div>
            )}
          </div>
          {can("manage_own_profile") && (
            <button onClick={handleSaveTimezone} disabled={savingTz}
              className="h-[66px] px-6 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium shrink-0 hover:shadow-md transition-all disabled:opacity-70 flex items-center gap-2">
              {savingTz && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {tzSaved ? "Saved ✓" : "Save"}
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── Specialist Networking (independent doctors only) ─── */}
      {isIndependent && (
        <SectionCard
          title="Specialist Networking"
          description="Open this to be discoverable by other independent doctors, and to add them as a specialist during a video call yourself. Both doctors must have this on for either to see the other — it won't work one-sided."
        >
          <div className="flex items-center gap-3">
            <Toggle on={openToNetworking} onChange={handleToggleNetworking} disabled={savingNetworking} />
            <span className="text-[#383F45] text-sm font-medium">
              {openToNetworking ? "Open to connecting with other independent doctors" : "Not open to connecting with other independent doctors"}
            </span>
          </div>
        </SectionCard>
      )}

      {/* ── Credentials & account deletion ───────────────────── */}
      <SectionCard title="Credentials & Account">
        <p className="text-[#676E76] text-xs leading-relaxed">
          Password changes, two-factor authentication, and account deletion are managed by your clinic. Contact your clinic administrator to update your credentials or request account removal.
        </p>
      </SectionCard>
    </>
  );
}
