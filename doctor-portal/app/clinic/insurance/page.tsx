"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface InsurancePolicy {
  id: string;
  clinicId: string;
  name: string;
  network: string;
  discounts: string;
  spcContractFileUrl: string | null;
  status: "active" | "inactive";
  renewDate: string | null;
}

interface BranchOption { id: string; name: string; status: string; }

const EMPTY_FORM = { name: "", network: "", discounts: "", spcContractFileUrl: null as string | null, renewDate: "" };

export default function ClinicInsurancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]));
  }, []);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/clinics/insurance-policies${qs}`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies ?? []);
      }
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const hasMultipleBranches = branches.length > 1;
  const activeBranchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? "Branch" : null;

  const displayedPolicies = policies.filter((p) => p.status === activeTab);
  const selected = policies.find((p) => p.id === selectedId) ?? null;

  function selectPolicy(p: InsurancePolicy) {
    setSelectedId(p.id);
    setEditing(false);
    setError("");
    setForm({ name: p.name, network: p.network, discounts: p.discounts, spcContractFileUrl: p.spcContractFileUrl, renewDate: p.renewDate ?? "" });
  }

  function startAdd() {
    setSelectedId(null);
    setEditing(true);
    setError("");
    setForm(EMPTY_FORM);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("spcContract", file);
      const res = await apiFetch("/api/clinics/upload", { method: "POST", body });
      if (!res.ok) throw new Error("File upload failed.");
      const { urls } = await res.json();
      setForm((f) => ({ ...f, spcContractFileUrl: urls?.spcContract ?? f.spcContractFileUrl }));
    } catch (err: any) {
      setError(err.message ?? "File upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(nextStatus?: "active" | "inactive") {
    if (!form.name.trim()) {
      setError("Insurance name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        network: form.network,
        discounts: form.discounts,
        spcContractFileUrl: form.spcContractFileUrl,
        renewDate: form.renewDate || null,
        ...(nextStatus ? { status: nextStatus } : {}),
      };

      const res = selectedId
        ? await apiFetch(`/api/clinics/insurance-policies/${selectedId}${qs}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/api/clinics/insurance-policies${qs}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save insurance.");
      }

      const data = await res.json();
      await fetchPolicies();
      setEditing(false);
      setSelectedId(data.policy?.id ?? selectedId);
    } catch (err: any) {
      setError(err.message ?? "Failed to save insurance.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Delete this insurance policy?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/clinics/insurance-policies/${selectedId}${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete insurance.");
      setSelectedId(null);
      setEditing(false);
      setForm(EMPTY_FORM);
      await fetchPolicies();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete insurance.");
    } finally {
      setSaving(false);
    }
  }

  const panelOpen = editing || !!selected;
  const fieldsDisabled = !editing;

  return (
    <div className="flex h-full w-full font-sans select-none px-5 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Left Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pr-8">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px] mb-8">
          Insurance
        </h1>

        {/* Top Actions Row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "active" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
              onClick={() => setActiveTab("active")}
            >
              Active
            </button>
            <button
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${activeTab === "inactive" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
              onClick={() => setActiveTab("inactive")}
            >
              Inactive
            </button>
          </div>
          <button
            onClick={startAdd}
            className="px-6 py-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Add Insurance
          </button>
        </div>

        {/* Branch selector — same ALL / Select Branch pattern used elsewhere in the portal */}
        {hasMultipleBranches && (
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => router.push("/clinic/insurance")}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${!branchId ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
            >
              All
            </button>
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown((v) => !v)}
                className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all flex items-center gap-1.5 ${branchId ? "bg-[#5476FC] text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
              >
                {activeBranchName ?? "Select Branch"}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
              </button>
              {showBranchDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
                  <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-48 z-20">
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { router.push(`/clinic/insurance?branchId=${b.id}`); setShowBranchDropdown(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${branchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Insurance List */}
        {loading ? (
          <div className="text-center py-10 text-[#838B95] text-sm">Loading…</div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedPolicies.map((p) => (
              <div
                key={p.id}
                onClick={() => selectPolicy(p)}
                className={`flex items-center justify-between px-6 py-5 rounded-[16px] border cursor-pointer transition-all ${selectedId === p.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white"} hover:shadow-md`}
              >
                <div className="flex items-center gap-10 w-full min-w-0">
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedId === p.id ? "border-[#5476FC] bg-[#5476FC]" : "border-[#D0D5DD]"}`} />
                  <div className="text-[15px] font-medium text-[#24292E] w-[150px] truncate">{p.name}</div>
                  <div className="text-[12px] font-medium text-[#676E76] w-[100px] truncate">{p.network || "—"}</div>
                  <div className="text-[12px] font-medium text-[#676E76] w-[100px] truncate">{p.discounts || "—"}</div>
                  <div className="text-[13px] font-normal text-[#24292E] flex-1 truncate">
                    Renew : {p.renewDate ? new Date(p.renewDate).toLocaleDateString("en-GB") : "—"}
                  </div>
                  <div className={`text-[12px] font-semibold shrink-0 ${p.status === "active" ? "text-[#179353]" : "text-[#838B95]"}`}>
                    {p.status === "active" ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            ))}
            {displayedPolicies.length === 0 && (
              <div className="text-center py-10 text-[#838B95] text-sm">
                No insurances found in this category.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Details Panel */}
      <div className="w-[380px] shrink-0">
        <div className="bg-white border border-[#EBEEF5] rounded-[24px] p-8 shadow-sm flex flex-col">
          {panelOpen ? (
            <>
              <h2 className="text-[18px] font-medium text-[#24292E] mb-6">
                {selected ? selected.name || "Insurance Provider" : "Add Insurance"}
              </h2>

              {error && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">{error}</div>
              )}

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Insurance</label>
                  <input
                    type="text"
                    disabled={fieldsDisabled}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm disabled:bg-[#F7F9FC] disabled:text-[#676E76]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Network</label>
                  <input
                    type="text"
                    disabled={fieldsDisabled}
                    value={form.network}
                    onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
                    className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm disabled:bg-[#F7F9FC] disabled:text-[#676E76]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Discounts</label>
                  <input
                    type="text"
                    disabled={fieldsDisabled}
                    value={form.discounts}
                    onChange={(e) => setForm((f) => ({ ...f, discounts: e.target.value }))}
                    className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm disabled:bg-[#F7F9FC] disabled:text-[#676E76]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Renewal Date</label>
                  <input
                    type="date"
                    disabled={fieldsDisabled}
                    value={form.renewDate ? form.renewDate.slice(0, 10) : ""}
                    onChange={(e) => setForm((f) => ({ ...f, renewDate: e.target.value }))}
                    className="w-full h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors shadow-sm disabled:bg-[#F7F9FC] disabled:text-[#676E76]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">SPC Contract attach</label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 h-[48px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[14px] text-[#24292E] flex items-center shadow-sm truncate">
                      {form.spcContractFileUrl ? (
                        <a href={form.spcContractFileUrl} target="_blank" rel="noreferrer" className="text-[#5476FC] hover:underline truncate">View attached proof</a>
                      ) : (
                        <span className="text-[#838B95]">{uploading ? "Uploading…" : "No file attached"}</span>
                      )}
                    </div>
                    {!fieldsDisabled && (
                      <label className="w-[48px] h-[48px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer">
                        <span className="text-white text-[24px] leading-none mb-1">+</span>
                        <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div>

                {selected && editing && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#3D4B5A] mb-2">Status</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("active")}
                        disabled={saving}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selected.status === "active" ? "bg-[#179353] text-white" : "bg-[#F1F3F7] text-[#676E76]"}`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => handleSave("inactive")}
                        disabled={saving}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selected.status === "inactive" ? "bg-[#676E76] text-white" : "bg-[#F1F3F7] text-[#676E76]"}`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="mt-8 flex items-center gap-3">
                {selected && (
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-red-500 border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
                {selected && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-[#3D4B5A] border border-[#EBEEF5] hover:bg-[#F7F9FC] transition-colors"
                  >
                    Edit
                  </button>
                )}
                {editing && (
                  <button
                    onClick={() => handleSave()}
                    disabled={saving || uploading}
                    className="flex-1 py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-[#838B95] text-sm mt-32 text-center">
              Select an insurance to view details, or add a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
