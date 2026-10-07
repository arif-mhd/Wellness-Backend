"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import { useCountryConfig } from "@/components/CountryConfigContext";

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
  labId?: string | null;
  catalogVaccineId?: string | null;
  name: string;
  manufacturer?: string | null;
  vaccineType?: string | null;
  category?: string | null;
  description?: string | null;
  ageRange?: string | null;
  doses_required?: number;
  price: number;
  is_active?: boolean;
  status?: string | null;
  rejectedReason?: string | null;
}

// Detail + edit + delete for a vaccine this provider owns. Mirrors the lab
// test equivalent at /dashboard/inventory/[id].
export default function VaccineDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vaccineId = params?.id ?? "";
  const { currency } = useCountryConfig();

  const [vaccine, setVaccine] = useState<Vaccine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Only the fields a provider owns are editable. A catalogue vaccine's
  // clinical details belong to the Wellness catalogue and are read-only here.
  const [price, setPrice] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!vaccineId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/lab/vaccines/${vaccineId}`);
      if (!res.ok) { setError("Vaccine not found."); return; }
      const d = await res.json();
      const v: Vaccine = d.vaccine;
      setVaccine(v);
      setPrice(String(v.price ?? ""));
      setManufacturer(v.manufacturer ?? "");
      setIsActive(v.is_active !== false);
    } catch {
      setError("Could not load this vaccine.");
    } finally {
      setLoading(false);
    }
  }, [vaccineId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/lab/vaccines/${vaccineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: p, manufacturer: manufacturer.trim() || null, is_active: isActive }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Could not save changes.");
        return;
      }
      setSaved(true);
      await load();
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/lab/vaccines/${vaccineId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Could not delete this vaccine.");
        setDeleting(false);
        return;
      }
      router.push("/dashboard/vaccinations");
    } catch {
      setError("Could not delete this vaccine.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
      </div>
    );
  }

  if (!vaccine) {
    return (
      <div className="px-8 pb-12 font-outfit">
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm py-20 flex flex-col items-center text-center mt-8">
          <p className="font-semibold text-[#24292E] mb-1 text-base">Vaccine not found</p>
          <button onClick={() => router.push("/dashboard/vaccinations")} className="mt-3 text-xs font-semibold text-[#5476FC]">
            Back to Vaccines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      <button
        onClick={() => router.push("/dashboard/vaccinations")}
        className="text-xs font-medium text-[#676E76] hover:text-[#24292E] mb-4 mt-2"
      >
        ← Back to Vaccines
      </button>

      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">{vaccine.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          {vaccine.catalogVaccineId ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
              Wellness catalogue
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-600 border-gray-200">
              Custom vaccine
            </span>
          )}
          {vaccine.status === "pending_approval" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-100">
              Pending admin approval
            </span>
          )}
          {vaccine.status === "rejected" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 text-red-600 border-red-100">
              Rejected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}
      {saved && !error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">Changes saved.</div>
      )}
      {vaccine.status === "rejected" && vaccine.rejectedReason && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <span className="font-semibold">Rejected:</span> {vaccine.rejectedReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editable — what the provider owns */}
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#24292E] mb-4">Your offering</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#676E76]">Price ({currency.symbol})</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => { setPrice(e.target.value); setSaved(false); }}
                className="w-full rounded-xl border border-[#EBEEF5] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#24292E] outline-none focus:border-[#5476FC]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#676E76]">Manufacturer</label>
              <input
                value={manufacturer}
                onChange={(e) => { setManufacturer(e.target.value); setSaved(false); }}
                placeholder="e.g. Sanofi"
                className="w-full rounded-xl border border-[#EBEEF5] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#24292E] outline-none focus:border-[#5476FC]"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="accent-[#5476FC]"
                checked={isActive}
                onChange={(e) => { setIsActive(e.target.checked); setSaved(false); }}
              />
              <span className="text-[12px] text-[#344054]">Available for patients to book</span>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5476FC] rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={remove}
                    disabled={deleting}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2.5 text-xs font-medium text-[#676E76] border border-[#EBEEF5] rounded-xl hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2.5 text-xs font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Read-only clinical details */}
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6">
          <h2 className="text-sm font-semibold text-[#24292E] mb-1">Vaccine details</h2>
          <p className="text-[11px] text-[#A0A8B0] mb-4">
            {vaccine.catalogVaccineId
              ? "Managed by the Wellness catalogue — the same for every provider."
              : "From your own custom entry."}
          </p>
          <dl className="flex flex-col gap-3">
            <Row label="Category" value={vaccine.category} />
            <Row label="Type" value={vaccine.vaccineType} />
            <Row label="Age range" value={vaccine.ageRange} />
            <Row label="Doses required" value={String(vaccine.doses_required ?? 1)} />
            <Row label="Description" value={vaccine.description} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium text-[#676E76]">{label}</dt>
      <dd className="text-[13px] text-[#24292E] leading-relaxed">{value || "—"}</dd>
    </div>
  );
}
