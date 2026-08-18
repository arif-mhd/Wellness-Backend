"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { useClinicPermissions } from "@/lib/useClinicPermissions";

interface Appointment {
  id: string;
  patientName: string;
  patientAge: number | null;
  patientAvatarUrl: string | null;
  reason: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

// scheduledAt is stored as a naive local wall-clock time with a cosmetic
// trailing "Z" — must not be handed to `new Date()` as-is, or hour/minute
// reads and display formatting silently shift by the browser's timezone.
function parseLocalTime(isoString: string): Date {
  if (!isoString) return new Date();
  const clean = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
  return new Date(clean);
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-semibold shrink-0 text-sm">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

// Doctor-portal's Reschedule flow already lives on /clinic/appointments (its
// own modal + PUT /api/appointments/:id/reschedule) — this tab deep-links
// there with the appointment pre-selected instead of duplicating that flow.
export default function AppointmentsTimingTab({ qs = "" }: { qs?: string }) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "week">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const { can } = useClinicPermissions();
  const canManage = can("manage_appointments");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/clinics/appointments${qs}`)
      .then((r) => r.json())
      .then((data) => setAppointments(Array.isArray(data.appointments) ? data.appointments : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [qs]);

  const filtered = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => a.status !== "cancelled")
      .filter((a) => {
        const d = parseLocalTime(a.scheduledAt);
        if (quickFilter === "today" && d.toDateString() !== now.toDateString()) return false;
        if (quickFilter === "week") {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          if (d < weekStart || d >= weekEnd) return false;
        }
        if (fromDate && d < new Date(`${fromDate}T00:00:00`)) return false;
        if (toDate && d > new Date(`${toDate}T23:59:59`)) return false;
        if (fromTime) {
          const [h, m] = fromTime.split(":").map(Number);
          if (d.getHours() * 60 + d.getMinutes() < h * 60 + m) return false;
        }
        if (toTime) {
          const [h, m] = toTime.split(":").map(Number);
          if (d.getHours() * 60 + d.getMinutes() > h * 60 + m) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments, quickFilter, fromDate, toDate, fromTime, toTime]);

  const goToAppointment = (id: string) => router.push(`/clinic/appointments?apptId=${id}${qs ? `&${qs.slice(1)}` : ""}`);

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* ── Left: Date & Time filter ─────────────────────────────────── */}
      <div className="w-full lg:w-[300px] shrink-0 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-6 h-fit">
        <div className="flex items-center gap-2">
          {(["all", "today", "week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setQuickFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${quickFilter === f ? "bg-black text-white" : "bg-[#F1F3F7] text-[#676E76] hover:bg-[#E5E8EE]"}`}
            >
              {f === "all" ? "All" : f === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>

        <div>
          <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Select date</h3>
          <div className="flex flex-col gap-2">
            <input
              type="date"
              max="9999-12-31"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-[13px] text-gray-700 outline-none focus:border-[#5476FC] transition-colors"
            />
            <input
              type="date"
              max="9999-12-31"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-[13px] text-gray-700 outline-none focus:border-[#5476FC] transition-colors"
            />
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Select Time</h3>
          <div className="flex flex-col gap-2">
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-[13px] text-gray-700 outline-none focus:border-[#5476FC] transition-colors"
            />
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-full h-[42px] border border-gray-200 rounded-xl px-3 text-[13px] text-gray-700 outline-none focus:border-[#5476FC] transition-colors"
            />
          </div>
        </div>

        {(fromDate || toDate || fromTime || toTime) && (
          <button
            onClick={() => { setFromDate(""); setToDate(""); setFromTime(""); setToTime(""); }}
            className="text-[12px] font-medium text-[#5476FC] hover:underline self-start"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Right: Appointment and tasks ─────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-[15px] font-semibold text-gray-800 mb-4">Appointment and tasks</h3>

        {loading ? (
          <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-[#A0A8B0] py-12">No appointments in this range.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-3 p-4 sm:p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                {/* Patient Info Column */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 sm:basis-1/3">
                  <Avatar name={a.patientName} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] sm:text-[13px] font-semibold text-gray-800 truncate">
                      {a.patientName}{a.patientAge ? `, ${a.patientAge}` : ""}
                    </span>
                    <span className="text-[12px] sm:text-[11px] text-gray-400 truncate">Reason: {a.reason || "—"}</span>
                    <span className="text-[12px] text-gray-500 sm:hidden mt-1 font-medium">
                      {parseLocalTime(a.scheduledAt).toLocaleDateString("en-GB")}, {parseLocalTime(a.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Date/Time Column */}
                <div className="hidden sm:flex justify-center flex-1 sm:basis-1/3 shrink-0">
                  <span className="text-[12px] text-gray-500 whitespace-nowrap">
                    {parseLocalTime(a.scheduledAt).toLocaleDateString("en-GB")}, {parseLocalTime(a.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Actions Column */}
                <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto sm:basis-1/3 flex-1 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 mt-1 sm:mt-0">
                  {canManage && (
                    <button
                      onClick={() => goToAppointment(a.id)}
                      disabled={a.status === "completed"}
                      className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] hover:opacity-90 text-white text-[13px] sm:text-[12px] font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-center shadow-sm hover:shadow"
                    >
                      Reschedule
                    </button>
                  )}
                  <button
                    onClick={() => goToAppointment(a.id)}
                    className="flex-1 sm:flex-none px-4 py-2 sm:py-1.5 border border-gray-200 text-gray-700 text-[13px] sm:text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
