"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

interface CatalogVaccine {
  id: string;
  name: string;
  category: string;
  description?: string;
  ageRange?: string;
  doses_required?: number;
  recommendedFor?: string;
  howAdministered?: string;
  sideEffects?: string;
  patientInstructions?: string;
  is_active: boolean;
  labCount?: number;
}

interface UnlinkedVaccine {
  id: string;
  labId: string;
  labName: string | null;
  name: string;
  category: string | null;
  price: number;
}

const EMPTY = {
  name: "", category: "", description: "", ageRange: "", doses_required: "1",
  recommendedFor: "", howAdministered: "", sideEffects: "", patientInstructions: "",
};

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100";

// Mirrors the Lab Test Catalog page: one entry per vaccine, no price. Labs
// pick from this list and set only their own price.
export default function VaccineCatalogPage() {
  const [catalog, setCatalog] = useState<CatalogVaccine[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedVaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // unlinked vaccine id -> chosen catalog id
  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [c, u] = await Promise.all([
        adminFetch("/api/admin/vaccine-catalog").then((r) => r.json()),
        adminFetch("/api/admin/vaccine-catalog/unlinked-vaccines").then((r) => r.json()),
      ]);
      setCatalog(Array.isArray(c) ? c : []);
      setUnlinked(Array.isArray(u) ? u : []);
    } catch {
      setCatalog([]);
      setUnlinked([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (v: CatalogVaccine) => {
    setForm({
      name: v.name, category: v.category, description: v.description ?? "", ageRange: v.ageRange ?? "",
      doses_required: String(v.doses_required ?? 1), recommendedFor: v.recommendedFor ?? "",
      howAdministered: v.howAdministered ?? "", sideEffects: v.sideEffects ?? "", patientInstructions: v.patientInstructions ?? "",
    });
    setEditingId(v.id); setError(""); setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const doses = Number(form.doses_required);
    if (!Number.isInteger(doses) || doses < 1) {
      setError("Doses must be a whole number of at least 1.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminFetch(editingId ? `/api/admin/vaccine-catalog/${editingId}` : "/api/admin/vaccine-catalog", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, doses_required: doses }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save.");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    await adminFetch(`/api/admin/vaccine-catalog/${id}/toggle`, { method: "PATCH" });
    load();
  };

  const link = async (v: UnlinkedVaccine) => {
    const catalogVaccineId = linkChoice[v.id];
    if (!catalogVaccineId) return;
    const res = await adminFetch(`/api/admin/vaccine-catalog/vaccines/${v.id}/link`, {
      method: "PATCH",
      body: JSON.stringify({ catalogVaccineId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to link.");
      return;
    }
    load();
  };

  const filtered = catalog.filter((v) => `${v.name} ${v.category}`.toLowerCase().includes(search.toLowerCase()));
  const activeCatalog = catalog.filter((v) => v.is_active);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans flex flex-col gap-6">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Vaccine Catalog</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              One entry per vaccine. Labs pick from this list and set only their own price, so patients see a single
              vaccine with every lab that offers it.
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl whitespace-nowrap shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
          >
            Add Vaccine
          </button>
        </div>

        <input
          type="text"
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-4 pr-4 py-2.5 rounded-full border border-slate-100 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
        />

        <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-12">No catalog vaccines yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800">
                    <th className="pb-4 pl-2">Vaccine</th>
                    <th className="pb-4 text-center">Category</th>
                    <th className="pb-4 text-center">Age range</th>
                    <th className="pb-4 text-center">Doses</th>
                    <th className="pb-4 text-center">Labs</th>
                    <th className="pb-4 text-center">Status</th>
                    <th className="pb-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-4 pl-2 text-[13px] font-semibold text-slate-800">{v.name}</td>
                      <td className="py-4 text-[12px] text-slate-500 text-center">{v.category}</td>
                      <td className="py-4 text-[12px] text-slate-500 text-center">{v.ageRange || "—"}</td>
                      <td className="py-4 text-[12px] text-slate-500 text-center">{v.doses_required ?? 1}</td>
                      <td className="py-4 text-[12px] text-slate-500 text-center">{v.labCount ?? 0}</td>
                      <td className={`py-4 text-[12px] font-medium text-center ${v.is_active ? "text-[#1FAF65]" : "text-slate-400"}`}>
                        {v.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="py-4 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(v)} className="text-[12px] font-medium text-[#5476FC] hover:underline mr-4">Edit</button>
                        <button onClick={() => toggle(v.id)} className="text-[12px] font-medium text-slate-500 hover:underline">
                          {v.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
          <h2 className="text-[18px] font-medium text-[#1e293b]">Unlinked lab vaccines</h2>
          <p className="text-[12px] text-slate-500 mt-1 mb-5">
            Custom vaccines added by labs. Link one to a catalog vaccine to group it with the others — it takes on the
            catalog&apos;s name and details.
          </p>
          {unlinked.length === 0 ? (
            <p className="text-[13px] text-slate-400 py-4">Nothing to link.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {unlinked.map((v) => (
                <div key={v.id} className="flex flex-col md:flex-row md:items-center gap-3 border border-slate-100 rounded-xl p-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{v.name}</p>
                    <p className="text-[11px] text-slate-400">{v.labName ?? "Lab"}{v.category ? ` · ${v.category}` : ""} · {v.price}</p>
                  </div>
                  <select
                    value={linkChoice[v.id] ?? ""}
                    onChange={(e) => setLinkChoice((p) => ({ ...p, [v.id]: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-[12px] md:w-64"
                  >
                    <option value="">Select catalog vaccine...</option>
                    {activeCatalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    onClick={() => link(v)}
                    disabled={!linkChoice[v.id]}
                    className="bg-[#5476FC] text-white text-[12px] font-semibold px-5 py-2 rounded-lg disabled:opacity-40"
                  >
                    Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <form
              onSubmit={save}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto flex flex-col gap-3"
            >
              <h2 className="text-[16px] font-semibold text-slate-800">{editingId ? "Edit Catalog Vaccine" : "Add Catalog Vaccine"}</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}
              <input required placeholder="Vaccine name (e.g. Influenza (Quadrivalent))" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              <input required placeholder="Category (e.g. Seasonal)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Age range (e.g. 6 months+)" value={form.ageRange} onChange={(e) => setForm({ ...form, ageRange: e.target.value })} className={inputCls} />
                <input type="number" min={1} step={1} placeholder="Doses" value={form.doses_required} onChange={(e) => setForm({ ...form, doses_required: e.target.value })} className={inputCls} />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} />
              <textarea placeholder="Recommended for" value={form.recommendedFor} onChange={(e) => setForm({ ...form, recommendedFor: e.target.value })} className={inputCls} rows={2} />
              <textarea placeholder="How it's administered" value={form.howAdministered} onChange={(e) => setForm({ ...form, howAdministered: e.target.value })} className={inputCls} rows={2} />
              <textarea placeholder="Side effects" value={form.sideEffects} onChange={(e) => setForm({ ...form, sideEffects: e.target.value })} className={inputCls} rows={2} />
              <textarea placeholder="Patient instructions" value={form.patientInstructions} onChange={(e) => setForm({ ...form, patientInstructions: e.target.value })} className={inputCls} rows={2} />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 text-[13px] font-medium py-2.5 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
