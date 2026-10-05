"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface BookingItem {
  vaccineId: string;
  vaccineName: string;
  manufacturer?: string | null;
  price: number;
  forPatientId?: string;
  visitMode: "Laboratory" | "Home";
  scheduledAt?: string | null;
}

interface PendingBooking {
  id: string;
  patientId: string;
  patientName: string;
  items: BookingItem[];
  payment_amount?: number;
  createdAt: string;
}

// Shared claim queue: every doctor their clinic has nominated for vaccination
// sign-off sees the same list, and whoever acts first wins — the backend
// (POST /approve, /reject) enforces this with an ETag-guarded conditional
// write, so a 409 here just means someone else got there first.
export default function VaccinationApprovalsPage() {
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/vaccines/bookings/pending-approval");
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch {
      // transient network failure — keep whatever list is already shown
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const handleApprove = async (bookingId: string) => {
    setBusyId(bookingId);
    setActionError("");
    try {
      const res = await apiFetch(`/api/vaccines/bookings/${bookingId}/approve`, { method: "POST" });
      if (res.status === 409) {
        setActionError("Someone else already reviewed this booking.");
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error ?? "Failed to approve this booking.");
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = window.prompt("Reason for declining this vaccination (shown to the patient):") ?? "";
    setBusyId(bookingId);
    setActionError("");
    try {
      const res = await apiFetch(`/api/vaccines/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.status === 409) {
        setActionError("Someone else already reviewed this booking.");
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error ?? "Failed to decline this booking.");
      }
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-4 md:px-8 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex flex-col gap-1 mb-6 mt-2">
        <h1 className="text-[#383F45] text-[28px] font-normal tracking-[-0.56px]">Vaccination Approvals</h1>
        <p className="text-[#676E76] text-sm">
          Vaccination bookings that need a doctor&apos;s sign-off before they&apos;re confirmed. Any doctor your clinic
          has assigned can act — whoever gets to one first handles it.
        </p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-5">{actionError}</div>
      )}

      {!loaded ? (
        <p className="text-sm text-[#A0A8B0] py-12 text-center">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-sm text-[#676E76]">
          No vaccinations waiting on your review right now.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 border border-transparent hover:border-gray-100 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[#24292E] text-[15px] font-medium">{booking.patientName}</span>
                  <span className="text-[#9EA5AD] text-xs">
                    Requested {new Date(booking.createdAt).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                {booking.items[0]?.scheduledAt && (
                  <span className="text-[#5476FC] text-xs font-medium">
                    Preferred: {new Date(booking.items[0].scheduledAt).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {booking.items.map((item, i) => (
                  <span key={`${item.vaccineId}-${i}`} className="px-2.5 py-1 rounded-full bg-[#E2EAFE] text-[#213159] text-xs">
                    {item.vaccineName}
                    {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                    {` · ${item.visitMode}`}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApprove(booking.id)}
                  disabled={busyId === booking.id}
                  className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {busyId === booking.id ? "Working..." : "Approve"}
                </button>
                <button
                  onClick={() => handleReject(booking.id)}
                  disabled={busyId === booking.id}
                  className="flex-1 border border-red-200 text-red-600 text-[13px] font-medium py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
