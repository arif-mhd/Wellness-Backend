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

interface Vaccine {
  id: string;
  name: string;
  manufacturer?: string | null;
  vaccineType?: string | null;
  category?: string | null;
  ageRange?: string | null;
  doses_required?: number;
  price: number;
  // Absent on the shared admin catalogue; set on vaccines this lab added.
  labId?: string | null;
  status?: string | null;
  is_active?: boolean;
  rejectedReason?: string | null;
}

const EMPTY_VACCINE_FORM = {
  name: "",
  manufacturer: "",
  vaccineType: "",
  category: "",
  ageRange: "",
  doses_required: "1",
  price: "",
  description: "",
};
type VaccineForm = typeof EMPTY_VACCINE_FORM;

interface BookingItem {
  vaccineId: string;
  vaccineName: string;
  manufacturer?: string | null;
  price: number;
  forPatientId: string;
  visitMode: "Laboratory" | "Home";
  scheduledAt?: string | null;
}

interface VaccinationBooking {
  id: string;
  patientId: string;
  items: BookingItem[];
  status: string;
  payment_amount?: number;
  createdAt: string;
  updatedAt?: string;
  approvedByLabName?: string | null;
  rejectedReason?: string | null;
}

// Bookings predating this workflow have status "confirmed" and no approval
// fields — still actionable, same rule the backend enforces.
const ACTIONABLE = ["pending_approval", "confirmed"];

const STATUS_STYLE: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-100",
  confirmed: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-green-50 text-green-700 border-green-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function statusLabel(status: string) {
  if (status === "pending_approval" || status === "confirmed") return "Pending Approval";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function VaccinationsPage() {
  const { role, loading: roleLoading } = useAccountRole();
  const { currency } = useCountryConfig();
  const isLab = role === "lab";

  const [tab, setTab] = useState<"bookings" | "catalogue">("bookings");
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [bookings, setBookings] = useState<VaccinationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reject needs a reason — it's shown to the patient verbatim.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Add-vaccine form
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [form, setForm] = useState<VaccineForm>(EMPTY_VACCINE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = (k: keyof VaccineForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    // Wait for the role to resolve before deciding — on first render it's
    // still null, and bailing early there would strand the page on "loading".
    if (roleLoading) return;
    if (!isLab) { setLoading(false); return; }
    try {
      const [bRes, vRes] = await Promise.all([
        apiFetch("/api/lab/vaccination-bookings"),
        apiFetch("/api/lab/vaccines"),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBookings(d.bookings ?? []); }
      if (vRes.ok) { const d = await vRes.json(); setVaccines(d.vaccines ?? []); }
    } catch {
      setError("Could not load vaccination data.");
    } finally {
      setLoading(false);
    }
  }, [isLab, roleLoading]);

  useEffect(() => { load(); }, [load]);

  const approve = async (bookingId: string) => {
    setUpdating(bookingId);
    setError(null);
    try {
      const res = await apiFetch(`/api/lab/vaccination-bookings/${bookingId}/approve`, { method: "PATCH" });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        // 409 = another lab already decided it; refresh so the queue is honest.
        setError(d.error ?? "Could not approve this booking.");
        if (res.status === 409) await load();
      }
    } catch {
      setError("Could not approve this booking.");
    } finally {
      setUpdating(null);
    }
  };

  const reject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setUpdating(rejectingId);
    setError(null);
    try {
      const res = await apiFetch(`/api/lab/vaccination-bookings/${rejectingId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setRejectingId(null);
        setRejectReason("");
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Could not reject this booking.");
        if (res.status === 409) { setRejectingId(null); setRejectReason(""); await load(); }
      }
    } catch {
      setError("Could not reject this booking.");
    } finally {
      setUpdating(null);
    }
  };

  const submitVaccine = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      setFormError("Name and price are required.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Price must be a valid non-negative number.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/lab/vaccines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          manufacturer: form.manufacturer.trim() || null,
          vaccineType: form.vaccineType.trim() || null,
          category: form.category.trim() || null,
          ageRange: form.ageRange.trim() || null,
          description: form.description.trim() || null,
          doses_required: Number(form.doses_required) || 1,
          price,
        }),
      });
      if (res.ok) {
        setShowAddVaccine(false);
        setForm(EMPTY_VACCINE_FORM);
        setTab("catalogue");
        await load();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error ?? "Could not add this vaccine.");
      }
    } catch {
      setFormError("Could not add this vaccine.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
      </div>
    );
  }

  // Pharmacy accounts share this portal but vaccinations are a lab function.
  if (!isLab) {
    return (
      <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm py-20 flex flex-col items-center text-center mt-8">
          <p className="font-semibold text-[#24292E] mb-1 text-base">Not available</p>
          <p className="text-sm text-[#676E76]">Vaccinations are managed by lab accounts.</p>
        </div>
      </div>
    );
  }

  const pendingCount = bookings.filter((b) => ACTIONABLE.includes(b.status)).length;

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {pendingCount} awaiting approval
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Vaccinations
          </h1>
        </div>

        <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#EBEEF5] rounded-xl p-1">
          <button
            onClick={() => setTab("bookings")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === "bookings" ? "bg-white text-[#24292E] shadow-sm" : "text-[#676E76] hover:text-[#24292E]"
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setTab("catalogue")}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === "catalogue" ? "bg-white text-[#24292E] shadow-sm" : "text-[#676E76] hover:text-[#24292E]"
            }`}
          >
            Available Vaccines ({vaccines.length})
          </button>
        </div>

        <button
          onClick={() => { setShowAddVaccine(true); setForm(EMPTY_VACCINE_FORM); setFormError(null); }}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-[#5476FC] rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          + Add Vaccine
        </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
        {tab === "bookings" ? (
          bookings.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-semibold text-[#24292E] mb-1 text-base">No vaccination bookings yet</p>
              <p className="text-sm text-[#676E76]">Patient vaccination bookings will appear here for approval</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Booking Details</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Vaccine(s)</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Visit Mode / Scheduled</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                    <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEEF5]">
                  {bookings.map((booking) => {
                    const actionable = ACTIONABLE.includes(booking.status);
                    return (
                      <tr key={booking.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-[#24292E]">Booking #{booking.id.slice(0, 8)}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLE[booking.status] ?? "bg-blue-50 text-blue-700 border-blue-100"}`}>
                                {statusLabel(booking.status)}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#676E76]">Booked on {new Date(booking.createdAt).toLocaleDateString()}</span>
                            {booking.status === "approved" && booking.approvedByLabName && (
                              <span className="text-[10px] text-[#0ABC49]">Approved by {booking.approvedByLabName}</span>
                            )}
                            {booking.status === "rejected" && booking.rejectedReason && (
                              <span className="text-[10px] text-red-500">Reason: {booking.rejectedReason}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#383F45]">
                          <ul className="flex flex-col gap-1">
                            {booking.items.map((item, idx) => (
                              <li key={idx} className="flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs">{item.vaccineName}</span>
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
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {actionable ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approve(booking.id)}
                                disabled={updating === booking.id}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {updating === booking.id ? "Saving..." : "Approve"}
                              </button>
                              <button
                                onClick={() => { setRejectingId(booking.id); setRejectReason(""); setError(null); }}
                                disabled={updating === booking.id}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#A0A8B0]">No action needed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : vaccines.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center">
            <p className="font-semibold text-[#24292E] mb-1 text-base">No vaccines available</p>
            <p className="text-sm text-[#676E76]">Add your own, or wait for the Wellness catalogue to be populated</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Vaccine</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Type / Category</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Age Range</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Doses</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEEF5]">
                {vaccines.map((v) => (
                  <tr key={v.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm text-[#24292E]">{v.name}</span>
                        {v.manufacturer && <span className="text-[11px] text-[#676E76]">{v.manufacturer}</span>}
                        {v.status === "rejected" && v.rejectedReason && (
                          <span className="text-[10px] text-red-500">Rejected: {v.rejectedReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {v.labId ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                            Added by you
                          </span>
                          {v.status === "pending_approval" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-100">
                              Pending admin approval
                            </span>
                          )}
                          {v.status === "rejected" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 text-red-600 border-red-100">
                              Rejected
                            </span>
                          )}
                          {v.is_active === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-500 border-gray-200">
                              Inactive
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#A0A8B0]">Wellness catalogue</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#383F45]">
                      {[v.vaccineType, v.category].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#383F45]">{v.ageRange || "—"}</td>
                    <td className="px-6 py-4 text-right text-xs text-[#383F45]">{v.doses_required ?? 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5476FC]">
                      {formatCurrency(v.price.toFixed(2), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add vaccine modal */}
      {showAddVaccine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-auto">
            <h2 className="text-lg font-semibold text-[#24292E] mb-1">Add a vaccine</h2>
            <p className="text-sm text-[#676E76] mb-5">
              This vaccine is added to your own catalogue and becomes bookable by patients once approved.
            </p>

            {formError && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" required value={form.name} onChange={(v) => setField("name", v)} placeholder="e.g. Influenza (Quadrivalent)" span2 />
              <Field label="Manufacturer" value={form.manufacturer} onChange={(v) => setField("manufacturer", v)} placeholder="e.g. Sanofi" />
              <Field label="Type" value={form.vaccineType} onChange={(v) => setField("vaccineType", v)} placeholder="e.g. Inactivated" />
              <Field label="Category" value={form.category} onChange={(v) => setField("category", v)} placeholder="e.g. Seasonal" />
              <Field label="Age range" value={form.ageRange} onChange={(v) => setField("ageRange", v)} placeholder="e.g. 6 months+" />
              <Field label="Doses required" type="number" value={form.doses_required} onChange={(v) => setField("doses_required", v)} />
              <Field label={`Price (${currency.symbol})`} required type="number" value={form.price} onChange={(v) => setField("price", v)} placeholder="0.00" />
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-[#676E76]">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  placeholder="What this vaccine protects against, and anything the patient should know"
                  className="w-full rounded-xl border border-[#EBEEF5] bg-[#F8FAFC] px-4 py-3 text-sm text-[#24292E] outline-none focus:border-[#5476FC] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowAddVaccine(false); setFormError(null); }}
                className="px-4 py-2 text-xs font-medium text-[#676E76] border border-[#EBEEF5] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitVaccine}
                disabled={saving || !form.name.trim() || !form.price.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-[#5476FC] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Adding..." : "Add Vaccine"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-[#24292E] mb-1">Reject booking</h2>
            <p className="text-sm text-[#676E76] mb-4">
              The patient sees this reason on their booking, so be specific.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="e.g. This vaccine is out of stock until 15 Oct"
              className="w-full rounded-xl border border-[#EBEEF5] bg-[#F8FAFC] px-4 py-3 text-sm text-[#24292E] outline-none focus:border-[#5476FC] resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="px-4 py-2 text-xs font-medium text-[#676E76] border border-[#EBEEF5] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim() || updating === rejectingId}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {updating === rejectingId ? "Rejecting..." : "Reject Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", required = false, span2 = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span2 ? "col-span-2" : ""}`}>
      <label className="text-[11px] font-medium text-[#676E76]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        className="w-full rounded-xl border border-[#EBEEF5] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#24292E] outline-none focus:border-[#5476FC]"
      />
    </div>
  );
}
