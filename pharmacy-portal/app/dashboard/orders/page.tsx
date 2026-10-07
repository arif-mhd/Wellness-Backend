"use client";

import { useCallback, useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useCountryConfig } from "@/components/CountryConfigContext";
import { formatCurrency } from "@/lib/currency";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers ?? {}) },
  });
}

interface OrderItem {
  medicine_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  pharmacyId: string;
}

interface Order {
  id: string;
  patientId: string;
  items: OrderItem[];
  delivery_address: string;
  status: string;
  createdAt: string;
  total_amount: number;
}

interface BookingItem {
  testId: string;
  testName: string;
  category: string;
  labId: string;
  labName: string;
  price: number;
  forPatientId?: string;
  visitMode: "Laboratory" | "Home";
  scheduledAt?: string;
  requires_doctor_approval?: boolean;
}

interface Booking {
  id: string;
  patientId: string;
  items: BookingItem[];
  consultationDate?: string;
  consultationSlot?: string;
  notes?: string;
  status: string;
  results?: { id: string; fileName: string; uploadedAt: string; url: string }[];
  payment_status?: string;
  payment_amount?: number;
  createdAt: string;
  updatedAt?: string;
}

const NEXT_BOOKING_STATUS: Record<string, { next: string; label: string } | undefined> = {
  awaiting:  { next: "confirmed", label: "Confirm Booking" },
  confirmed: { next: "analyzing", label: "Start Analyzing" },
  analyzing: { next: "results",   label: "Mark Results Ready" },
};

interface VaccinationBookingItem {
  vaccineId: string;
  vaccineName: string;
  manufacturer?: string | null;
  labId?: string | null;
  price: number;
  forPatientId?: string;
  visitMode: "Laboratory" | "Home";
  scheduledAt?: string | null;
}

interface VaccinationBooking {
  id: string;
  patientId: string;
  patientName?: string;
  items: VaccinationBookingItem[];
  status: string;
  payment_amount?: number;
  createdAt: string;
  rejectedReason?: string | null;
}

// The provider picks up where doctor approval leaves off, at "confirmed".
const NEXT_VACCINATION_STATUS: Record<string, { next: string; label: string } | undefined> = {
  confirmed:    { next: "scheduled",    label: "Mark Scheduled" },
  scheduled:    { next: "administered", label: "Mark Administered" },
  administered: { next: "completed",    label: "Mark Completed" },
};

const VACCINATION_STATUS_STYLE: Record<string, string> = {
  pending_doctor_approval: "bg-amber-50 text-amber-700 border-amber-100",
  confirmed:    "bg-blue-50 text-blue-700 border-blue-100",
  scheduled:    "bg-indigo-50 text-indigo-700 border-indigo-100",
  administered: "bg-purple-50 text-purple-700 border-purple-100",
  completed:    "bg-green-50 text-green-700 border-green-100",
  rejected:     "bg-red-50 text-red-600 border-red-100",
  cancelled:    "bg-gray-100 text-gray-500 border-gray-200",
};

function vaccinationStatusLabel(s: string) {
  if (s === "pending_doctor_approval") return "Awaiting Doctor";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function OrdersPage() {
  const { role } = useAccountRole();
  const { currency } = useCountryConfig();
  const isLab = role === "lab";

  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vaccinationBookings, setVaccinationBookings] = useState<VaccinationBooking[]>([]);
  const [labTab, setLabTab] = useState<"tests" | "vaccinations">("tests");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (isLab) {
        const [res, vRes] = await Promise.all([
          apiFetch("/api/lab/my-bookings"),
          apiFetch("/api/vaccines/my-bookings"),
        ]);
        if (res.ok) { const d = await res.json(); setBookings(d.bookings ?? []); }
        if (vRes.ok) { const d = await vRes.json(); setVaccinationBookings(d.bookings ?? []); }
      } else {
        const res = await apiFetch("/api/pharmacy/orders");
        if (res.ok) { const d = await res.json(); setOrders(d.orders); }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [isLab]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await apiFetch(`/api/pharmacy/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const updateVaccinationStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    try {
      const res = await apiFetch(`/api/vaccines/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const [bookingError, setBookingError] = useState("");

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdating(bookingId);
    setBookingError("");
    try {
      const res = await apiFetch(`/api/lab/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setBookingError(err.error ?? "Couldn't update this booking.");
      }
    } catch {
      setBookingError("Couldn't reach the server.");
    } finally {
      setUpdating(null);
    }
  };

  // The lab's own signed report for a booking (PDF). Mark Results Ready stays
  // disabled until at least one is uploaded.
  const uploadResult = async (bookingId: string, file: File) => {
    setUpdating(bookingId);
    setBookingError("");
    try {
      const form = new FormData();
      form.append("result", file);
      const res = await apiFetch(`/api/lab/bookings/${bookingId}/results`, { method: "POST", body: form });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setBookingError(err.error ?? "Upload failed.");
      }
    } catch {
      setBookingError("Couldn't reach the server.");
    } finally {
      setUpdating(null);
    }
  };

  const removeResult = async (bookingId: string, resultId: string) => {
    setUpdating(bookingId);
    setBookingError("");
    try {
      const res = await apiFetch(`/api/lab/bookings/${bookingId}/results/${resultId}`, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setBookingError(err.error ?? "Couldn't remove the file.");
      }
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
      </div>
    );
  }

  if (isLab) {
    return (
      <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
              {labTab === "tests"
                ? `${bookings.length} booking${bookings.length !== 1 ? "s" : ""} found`
                : `${vaccinationBookings.length} vaccination${vaccinationBookings.length !== 1 ? "s" : ""} found`}
            </span>
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
              Bookings
            </h1>
          </div>

          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#EBEEF5] rounded-xl p-1 self-start">
            <button
              onClick={() => setLabTab("tests")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                labTab === "tests" ? "bg-white text-[#24292E] shadow-sm" : "text-[#676E76] hover:text-[#24292E]"
              }`}
            >
              Lab Tests ({bookings.length})
            </button>
            <button
              onClick={() => setLabTab("vaccinations")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                labTab === "vaccinations" ? "bg-white text-[#24292E] shadow-sm" : "text-[#676E76] hover:text-[#24292E]"
              }`}
            >
              Vaccinations ({vaccinationBookings.length})
            </button>
          </div>
        </div>

        {labTab === "vaccinations" ? (
          <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
            {vaccinationBookings.length === 0 ? (
              <div className="py-20 flex flex-col items-center text-center">
                <p className="font-semibold text-[#24292E] mb-1 text-base">No vaccination bookings yet</p>
                <p className="text-sm text-[#676E76]">Approved vaccination bookings for your vaccines appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                      <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Booking</th>
                      <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Vaccine(s)</th>
                      <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Visit Mode / Scheduled</th>
                      <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEEF5]">
                    {vaccinationBookings.map((b) => {
                      const action = NEXT_VACCINATION_STATUS[b.status];
                      return (
                        <tr key={b.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-[#24292E]">{b.patientName ?? "Patient"}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${VACCINATION_STATUS_STYLE[b.status] ?? "bg-blue-50 text-blue-700 border-blue-100"}`}>
                                  {vaccinationStatusLabel(b.status)}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#676E76]">#{b.id.slice(0, 8)} · Booked {new Date(b.createdAt).toLocaleDateString()}</span>
                              {b.status === "rejected" && b.rejectedReason && (
                                <span className="text-[10px] text-red-500">Declined: {b.rejectedReason}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#383F45]">
                            <ul className="flex flex-col gap-1">
                              {b.items.map((item, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-4">
                                  <span className="text-xs">{item.vaccineName}</span>
                                  <span className="text-[11px] text-[#676E76]">{formatCurrency(item.price.toFixed(2), currency)}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#383F45] max-w-[220px]">
                            <ul className="flex flex-col gap-1">
                              {b.items.map((item, idx) => (
                                <li key={idx} className="flex flex-col">
                                  <span className="text-xs font-medium">{item.visitMode}</span>
                                  {item.scheduledAt && (
                                    <span className="text-[11px] text-[#676E76]">
                                      {new Date(item.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5476FC]">
                            {formatCurrency((b.payment_amount ?? 0).toFixed(2), currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {action ? (
                              <button
                                onClick={() => updateVaccinationStatus(b.id, action.next)}
                                disabled={updating === b.id}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {updating === b.id ? "Updating..." : action.label}
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#A0A8B0]">
                                {b.status === "pending_doctor_approval" ? "Awaiting doctor" : "No action needed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
          {bookingError && (
            <div className="m-4 px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#F25252] font-medium">{bookingError}</div>
          )}
          {bookings.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-semibold text-[#24292E] mb-1 text-base">No bookings yet</p>
              <p className="text-sm text-[#676E76]">Incoming patient bookings will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Booking Details</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Test(s)</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Visit Mode / Scheduled</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEEF5]">
                  {bookings.map((booking) => {
                    const action = NEXT_BOOKING_STATUS[booking.status];
                    return (
                      <tr key={booking.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-[#24292E]">Booking #{booking.id.slice(0, 8)}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#676E76]">Placed on {new Date(booking.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#383F45]">
                          <ul className="flex flex-col gap-1">
                            {booking.items.map((item, idx) => (
                              <li key={idx} className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs">{item.testName}</span>
                                  <span className="text-[11px] text-[#676E76]">{formatCurrency(item.price.toFixed(2), currency)}</span>
                                </div>
                                {item.forPatientId && (
                                  <span className="text-[10px] text-[#A0A8B0]">For patient: {item.forPatientId.slice(0, 8)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#383F45] max-w-[220px]">
                          <ul className="flex flex-col gap-1">
                            {booking.items.map((item, idx) => (
                              <li key={idx} className="flex flex-col">
                                <span className="text-xs font-medium">{item.visitMode}</span>
                                {item.scheduledAt && (
                                  <span className="text-[11px] text-[#676E76]">
                                    {new Date(item.scheduledAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5476FC]">
                          {formatCurrency((booking.payment_amount ?? 0).toFixed(2), currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-2">
                            {(booking.status === "analyzing" || booking.status === "results") && (booking.results?.length ?? 0) > 0 && (
                              <ul className="flex flex-col gap-1 items-end">
                                {booking.results!.map((r) => (
                                  <li key={r.id} className="flex items-center gap-2 text-[11px] text-[#383F45]">
                                    <a href={r.url} target="_blank" rel="noreferrer" className="text-[#5476FC] hover:underline max-w-[160px] truncate">{r.fileName}</a>
                                    {booking.status === "analyzing" && (
                                      <button onClick={() => removeResult(booking.id, r.id)} disabled={updating === booking.id} className="text-[#F25252] hover:underline disabled:opacity-50">Remove</button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {booking.status === "analyzing" && (
                              <label className="px-3 py-1.5 text-xs font-medium text-[#5476FC] border border-[#C7D2FE] rounded-lg hover:bg-[#EEF2FF] cursor-pointer transition-colors">
                                {updating === booking.id ? "Working..." : "Upload result PDF"}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  className="hidden"
                                  disabled={updating === booking.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    if (f) uploadResult(booking.id, f);
                                  }}
                                />
                              </label>
                            )}
                            {action && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, action.next)}
                                disabled={updating === booking.id || (booking.status === "analyzing" && (booking.results?.length ?? 0) === 0)}
                                title={booking.status === "analyzing" && (booking.results?.length ?? 0) === 0 ? "Upload the result PDF first" : undefined}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {updating === booking.id ? "Updating..." : action.label}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Incoming Orders
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-[#24292E] mb-1 text-base">No orders yet</p>
            <p className="text-sm text-[#676E76]">Incoming patient orders will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Order Details</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Delivery Address</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEEF5]">
                {orders.map((order) => (
                  <tr key={order.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[#24292E]">Order #{order.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#676E76]">Placed on {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45]">
                      <ul className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-4">
                            <span className="text-xs">{item.quantity}x {item.name}</span>
                            <span className="text-[11px] text-[#676E76]">{formatCurrency((item.quantity * item.unit_price).toFixed(2), currency)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45] max-w-[250px]">
                      {order.delivery_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5476FC]">
                      {formatCurrency(order.total_amount.toFixed(2), currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {order.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(order.id, "shipped")}
                          disabled={updating === order.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {updating === order.id ? "Updating..." : "Mark Shipped"}
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          disabled={updating === order.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {updating === order.id ? "Updating..." : "Mark Delivered"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
