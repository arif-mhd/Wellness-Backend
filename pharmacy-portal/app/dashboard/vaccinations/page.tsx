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

// This page is the lab's vaccine CATALOGUE only. Approving a patient's
// vaccination booking is a clinical decision and belongs to a clinic-assigned
// doctor — see doctor-portal's /dashboard/vaccination-approvals.
export default function VaccinationsPage() {
  const { role, loading: roleLoading } = useAccountRole();
  const { currency } = useCountryConfig();
  const isLab = role === "lab";

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const res = await apiFetch("/api/lab/vaccines");
      if (res.ok) { const d = await res.json(); setVaccines(d.vaccines ?? []); }
    } catch {
      setError("Could not load the vaccine catalogue.");
    } finally {
      setLoading(false);
    }
  }, [isLab, roleLoading]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {vaccines.length} vaccine{vaccines.length !== 1 ? "s" : ""} available
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Vaccines
          </h1>
        </div>

        <button
          onClick={() => { setShowAddVaccine(true); setForm(EMPTY_VACCINE_FORM); setFormError(null); }}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-[#5476FC] rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap self-start"
        >
          + Add Vaccine
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
        {vaccines.length === 0 ? (
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
