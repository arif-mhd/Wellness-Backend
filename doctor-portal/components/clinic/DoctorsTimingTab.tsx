"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";

const DOW_TO_DAY_KEY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_KEY_TO_DOW: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function keysFromSlots(slots: any[]): string[] {
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

  const result: any[] = [];
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

function formatWorkingDays(slots: any[]) {
  if (!slots || slots.length === 0) return "No slots";
  const days = Array.from(new Set(slots.map(s => s.dayOfWeek))).sort();
  if (days.length === 5 && days[0] === 1 && days[4] === 5) return "Mon - Fri";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map(d => dayNames[d as number]).join(", ");
}

export default function DoctorsTimingTab({ qs = "" }: { qs?: string }) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, [qs]);

  const loadDoctors = () => {
    setLoading(true);
    apiFetch(`/api/clinics/doctors${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setDoctors(data.doctors || []);
        setSelectedDoctorId((prev) => {
          if (prev && (data.doctors || []).some((d: any) => d.id === prev)) return prev;
          return data.doctors && data.doctors.length > 0 ? data.doctors[0].id : null;
        });
      })
      .catch((err) => setError("Failed to load doctors"))
      .finally(() => setLoading(false));
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  const handleSubmit = async (formData: any) => {
    if (!selectedDoctorId) return;
    setSaving(true);
    setError("");
    try {
      const slots = slotsFromKeys(formData?.selectedSlots ?? []);
      const res = await apiFetch(`/api/clinics/doctors/${selectedDoctorId}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save availability.");
      }
      await loadDoctors(); // Refresh
      alert("Doctor availability saved successfully.");
    } catch (err: any) {
      setError(err.message ?? "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAbsence = async (absenceId: string) => {
    if (!selectedDoctorId) return;
    try {
      const res = await apiFetch(`/api/clinics/doctors/${selectedDoctorId}/absences/${absenceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve absence");
      await loadDoctors();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center text-sm text-[#A0A8B0] py-12">Loading doctors...</div>;
  if (doctors.length === 0) return <div className="text-center text-sm text-[#A0A8B0] py-12">No doctors found in this clinic.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full font-outfit">
      {/* Left Column: Doctor List */}
      <div className="w-full md:w-1/3 flex flex-col gap-3">
        {doctors.map(doctor => {
          const isSelected = selectedDoctorId === doctor.id;
          return (
            <div 
              key={doctor.id} 
              onClick={() => setSelectedDoctorId(doctor.id)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected 
                  ? "bg-white border-[#5476FC] shadow-[0_0_0_2px_rgba(84,118,252,0.2)]" 
                  : "bg-gray-50 border-gray-200 hover:border-[#8AA0FF]"
              }`}
            >
              <div className="flex items-center gap-3">
                {doctor.avatarUrl ? (
                  <img src={doctor.avatarUrl} alt={doctor.fullName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold">
                    {(doctor.fullName || "?").slice(0,1).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-semibold text-gray-800 truncate">{doctor.fullName}</span>
                  <span className="text-[12px] text-gray-400 truncate">{doctor.email}</span>
                </div>
              </div>
              <span className="text-[12px] font-medium text-gray-500 whitespace-nowrap">
                {formatWorkingDays(doctor.slots)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right Column: Schedule and Absences */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        {selectedDoctor && (
          <>
            <div className="bg-indigo-50/30 rounded-3xl p-6 border border-indigo-50/50">
              <SetAvailabilityForm
                key={selectedDoctor.id} // re-mount when doctor changes
                initialAvailability={keysFromSlots(selectedDoctor.slots || [])}
                onSubmit={handleSubmit}
                onGoBack={() => {}} // Not really needed if hideButtonsIfUnchanged is used, but required by type
                hideButtonsIfUnchanged={false}
                heading={`Availability for ${selectedDoctor.fullName}`}
              />
              {saving && <div className="text-center text-xs text-[#A0A8B0] mt-4">Saving...</div>}
              {error && <div className="text-center text-xs text-red-600 mt-2">{error}</div>}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-[18px] font-semibold text-gray-800 mb-4">Absents Marked</h3>
              {(!selectedDoctor.absences || selectedDoctor.absences.length === 0) ? (
                <p className="text-[13px] text-gray-400">No absences recorded.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedDoctor.absences.map((abs: any) => (
                    <div key={abs.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-semibold text-gray-800">
                          {new Date(abs.startDate).toLocaleDateString()}
                        </span>
                        <span className="text-[12px] font-medium text-gray-500">
                          {abs.duration} · {abs.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {abs.status === "pending" ? (
                          <>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full">Pending</span>
                            <button 
                              onClick={() => handleApproveAbsence(abs.id)}
                              className="px-4 py-1.5 bg-black text-white text-[12px] font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              APPROVE
                            </button>
                          </>
                        ) : abs.status === "rejected" ? (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-[11px] font-bold rounded-full">Rejected</span>
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-bold rounded-full">Approved</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
