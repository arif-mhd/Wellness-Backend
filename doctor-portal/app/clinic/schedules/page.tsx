"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";

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
  const [initialAvailability, setInitialAvailability] = useState<string[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    <div className="px-8 py-8 max-w-4xl">
      <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px] mb-6" style={{ fontFamily: "Outfit, sans-serif" }}>
        Clinic Schedules
      </h1>

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
        />
      )}

      {saving && <div className="text-center text-xs text-[#A0A8B0] mt-4">Saving...</div>}
    </div>
  );
}
