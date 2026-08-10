"use client";

import React, { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";
import { apiFetch } from "@/lib/apiFetch";

// "YYYY-MM-DD" built from local getters — the caller's scheduledAt is already
// a genuine UTC ISO string (see ScheduleItem in ScheduleListView), so plain
// local getters here are safe, unlike the raw naive-local-with-fake-Z fields
// stored elsewhere in the app.
function toLocalDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHHMM(timeStr: string) {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`} ${ampm}`;
}

function formatPillDate(date: Date) {
  try {
    const day = date.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hour = date.getHours() % 12 || 12;
    const minute = date.getMinutes();
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    const padH = date.getHours() >= 12 ? String(hour).padStart(2, "0") : String(hour);
    const padM = String(minute).padStart(2, "0");
    return `${day} ${month}, ${year}, ${padH}:${padM} ${ampm}`;
  } catch {
    return "";
  }
}

export interface RescheduleTarget {
  id: string | number;
  patientName: string;
  scheduledAt: string;
}

interface RescheduleModalProps {
  appointment: RescheduleTarget;
  onClose: () => void;
  onRescheduled: (appointmentId: string | number, newScheduledAt: string) => void;
}

export default function RescheduleModal({ appointment, onClose, onRescheduled }: RescheduleModalProps) {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toLocalDateInputValue(new Date(appointment.scheduledAt)));
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Session.getUserId().then((id) => setDoctorId(id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    setTime("");
    (async () => {
      try {
        const res = await apiFetch(`/api/doctors/${doctorId}/available-slots?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.available ?? []);
        } else {
          setSlots([]);
        }
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    })();
  }, [doctorId, date]);

  const handleConfirm = async () => {
    if (!date || !time) return;
    setSaving(true);
    setError("");
    try {
      const scheduledAt = new Date(`${date}T${time}:00.000Z`).toISOString();
      const res = await apiFetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      if (res.ok) {
        onRescheduled(appointment.id, scheduledAt);
        onClose();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to reschedule appointment.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Error rescheduling appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-[#EBEEF5] rounded-[24px] p-6 shadow-[0_12px_50px_rgba(0,0,0,0.15)] w-full max-w-[420px] mx-4 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-[#24292E] font-semibold text-[16px] tracking-[-0.32px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Reschedule {appointment.patientName}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[#F5F6FA] flex items-center justify-center text-[#9EA5AD] hover:text-[#383F45] transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 10.5l9-9M1.5 1.5l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-[#9EA5AD] text-[11px] -mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          Currently: {formatPillDate(new Date(appointment.scheduledAt))}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl px-3.5 py-2.5">{error}</div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            New Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#F9FAFC] border border-[#EBEEF5] rounded-[12px] p-3 text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[#9EA5AD] text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
            New Time
          </span>
          {slotsLoading ? (
            <span className="text-xs text-[#9EA5AD] py-2">Loading available slots...</span>
          ) : slots.length === 0 ? (
            <span className="text-xs text-[#9EA5AD] py-2">No available slots on this date.</span>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTime(slot)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                    time === slot ? "bg-[#5476FC] text-white" : "bg-[#F5F6FA] text-[#676E76] hover:bg-[#EBEEF5]"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {formatHHMM(slot)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[14px] bg-[#EEF2FF] text-[#243D7F] hover:bg-[#E4EAFF] font-bold text-[13px] tracking-[-0.26px] transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!time || saving}
            className="flex-1 py-3 rounded-[14px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] text-white font-bold text-[13px] tracking-[-0.26px] transition-all duration-200 disabled:opacity-50"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {saving ? "Saving..." : "Confirm New Time"}
          </button>
        </div>
      </div>
    </div>
  );
}
