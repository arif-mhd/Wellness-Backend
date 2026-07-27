"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";
import DoctorsTimingTab from "@/components/clinic/DoctorsTimingTab";
import AppointmentsTimingTab from "@/components/clinic/AppointmentsTimingTab";

interface BranchOption { id: string; name: string; status: string; }

const DAY_KEY_TO_DOW: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const DOW_TO_DAY_KEY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function keysFromSlots(slots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]): string[] {
  const keys: string[] = [];
  for (const s of slots) {
    if (!s.isActive) continue;
    const day = DOW_TO_DAY_KEY[s.dayOfWeek];
    if (!day) continue;
    const startH = parseInt(s.startTime.split(":")[0], 10);
    const endH = parseInt(s.endTime.split(":")[0], 10);
    for (let h = startH; h < endH; h++) keys.push(`${day}-${String(h).padStart(2, "0")}:00`);
  }
  return keys;
}

function slotsFromKeys(selectedSlots: string[]) {
  const byDay: Record<string, number[]> = {};
  for (const key of selectedSlots) {
    const [day, timeVal] = key.split("-");
    const hour = parseInt(timeVal, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(hour);
  }

  const result: { dayOfWeek: number; startTime: string; endTime: string; slotDurationMins: number; isActive: boolean }[] = [];
  for (const [day, hours] of Object.entries(byDay)) {
    const sorted = [...new Set(hours)].sort((a, b) => a - b);
    const blocks: number[][] = [];
    let current: number[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        current.push(sorted[i]);
      } else {
        blocks.push(current);
        current = [sorted[i]];
      }
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

export default function ClinicSchedulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const [activeTab, setActiveTab] = useState<"appointments" | "clinic-timing" | "doctors-timing">("clinic-timing");
  const [initialAvailability, setInitialAvailability] = useState<string[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Every org owner's own account is at least its own main branch, so this
  // always succeeds with >= 1 entry for them (empty/403 for a branch-user
  // login, who doesn't need the switcher anyway) — same pattern used on
  // Appointments/Doctors/Analytics. Note: this only scopes the Appointments
  // and Doctors Timing tabs' data; Clinic Timing keeps editing whatever the
  // logged-in caller's own account already resolves to, unchanged.
  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, []);

  const hasMultipleBranches = branches.length > 1;
  const activeBranchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? "Branch" : null;

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => {
        const slots = Array.isArray(data.clinic?.slots) ? data.clinic.slots : [];
        setInitialAvailability(keysFromSlots(slots));
      })
      .catch(() => setInitialAvailability([]))
      .finally(() => setLoaded(true));
  }, []);

  const handleSubmit = async (formData: any) => {
    setSaving(true);
    setError("");
    try {
      const slots = slotsFromKeys(formData?.selectedSlots ?? []);
      const res = await apiFetch("/api/clinics/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save availability.");
      }
      router.push("/clinic");
    } catch (err: any) {
      setError(err.message ?? "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-8 py-8 w-full">
      <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px] mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>
        Schedules & Timing
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "appointments" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"
            }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Appointments
        </button>
        <button
          onClick={() => setActiveTab("clinic-timing")}
          className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "clinic-timing" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"
            }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Clinic Timing
        </button>
        <button
          onClick={() => setActiveTab("doctors-timing")}
          className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "doctors-timing" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"
            }`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Doctors Timing
        </button>
      </div>

      {hasMultipleBranches && (
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => router.push("/clinic/schedules")}
            className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${!branchId ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
          >
            All
          </button>
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown((v) => !v)}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all flex items-center gap-1.5 ${branchId ? "bg-[#5476FC] text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
            >
              {activeBranchName ?? "Select Branch"}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-48 z-20">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { router.push(`/clinic/schedules?branchId=${b.id}`); setShowBranchDropdown(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${branchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "clinic-timing" && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center">
              {error}
            </div>
          )}

          {!loaded ? (
            <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
          ) : (
            <SetAvailabilityForm
              initialAvailability={initialAvailability}
              onSubmit={handleSubmit}
              onGoBack={() => router.push("/clinic")}
              hideButtonsIfUnchanged={true}
            />
          )}

          {saving && <div className="text-center text-xs text-[#A0A8B0] mt-4">Saving...</div>}
        </>
      )}

      {activeTab === "appointments" && (
        <AppointmentsTimingTab qs={qs} />
      )}

      {activeTab === "doctors-timing" && (
        <DoctorsTimingTab qs={qs} />
      )}
    </div>
  );
}
