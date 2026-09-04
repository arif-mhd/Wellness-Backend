"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Organization {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  app_bundle_id: string | null;
  play_store_url: string | null;
  app_store_url: string | null;
  plan_tier: string;
  created_at: string;
}

interface FeatureRow {
  key: string;
  label: string;
  group: "clinical" | "commerce" | "wellness";
  enabled: boolean;
  config: Record<string, unknown> | null;
}

const GROUP_LABELS: Record<FeatureRow["group"], string> = {
  clinical: "Clinical",
  commerce: "Commerce",
  wellness: "Wellness",
};

const PRESETS = ["starter", "pro", "enterprise"] as const;

// ─── Small building blocks (mirrors the pattern in app/dashboard/roles) ────

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 ${checked ? "bg-emerald-500" : "bg-slate-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${checked ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

function OrgAvatar({ org, size = "md" }: { org: Organization; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-16 h-16 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-[11px]";
  if (org.logo_url) {
    return <img src={org.logo_url} alt={org.name} className={`${sz} rounded-full object-cover border border-slate-100 shrink-0`} />;
  }
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-medium shrink-0`}
      style={{ background: org.primary_color ? `linear-gradient(135deg, ${org.primary_color}, ${org.secondary_color ?? org.primary_color})` : undefined }}
    >
      <span className={org.primary_color ? "" : "bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] w-full h-full rounded-full flex items-center justify-center"}>
        {org.name.split(" ").slice(0, 2).map(n => n[0]).join("") || "?"}
      </span>
    </div>
  );
}

const PlanBadge = ({ tier }: { tier: string }) => {
  const styles: Record<string, string> = {
    starter: "bg-slate-100 text-slate-600",
    pro: "bg-indigo-50 text-indigo-600",
    enterprise: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[tier] ?? "bg-slate-100 text-slate-600"}`}>
      {tier}
    </span>
  );
};

// ─── Create-organization modal ─────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: (org: Organization) => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!slug.trim() || !name.trim()) {
      setError("Slug and name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), name: name.trim(), supportEmail: supportEmail.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Error ${res.status}`);
        return;
      }
      onCreated(body.organization);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 w-full max-w-md p-7 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-medium text-slate-800 mb-5">New organization</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Organization name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Acme Health"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="acme"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Used for branding lookups — cannot be changed later.</p>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Support email (optional)</label>
            <input
              value={supportEmail}
              onChange={e => setSupportEmail(e.target.value)}
              placeholder="support@acmehealth.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-500 font-medium mt-4">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[1rem] text-[13px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-3 rounded-[1rem] text-[13px] font-medium text-white bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] shadow-md shadow-blue-200/50 transition disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

function OrganizationsPageInner() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Branding draft (selected org)
  const [draftOrg, setDraftOrg] = useState<Organization | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgSaveMsg, setOrgSaveMsg] = useState("");

  // Feature entitlements (selected org)
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await apiFetch("/api/admin/organizations");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFetchError(b.error ?? `Error ${res.status}`);
        setOrgs([]);
        return;
      }
      const data = await res.json();
      setOrgs(data.organizations ?? []);
    } catch {
      setFetchError("Failed to load organizations.");
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const fetchFeatures = useCallback(async (orgId: string) => {
    setFeaturesLoading(true);
    try {
      const res = await apiFetch(`/api/admin/organizations/${orgId}/features`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.features ?? []);
      } else {
        setFeatures([]);
      }
    } catch {
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  }, []);

  function selectOrg(org: Organization) {
    setSelectedId(org.id);
    setDraftOrg({ ...org });
    setOrgSaveMsg("");
    fetchFeatures(org.id);
  }

  const selected = orgs.find(o => o.id === selectedId) ?? null;
  const hasOrgChanges = !!selected && !!draftOrg && JSON.stringify(selected) !== JSON.stringify(draftOrg);

  async function handleSaveOrg() {
    if (!draftOrg || !selected) return;
    setSavingOrg(true);
    setOrgSaveMsg("");
    try {
      const res = await apiFetch(`/api/admin/organizations/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftOrg.name,
          primaryColor: draftOrg.primary_color,
          secondaryColor: draftOrg.secondary_color,
          supportEmail: draftOrg.support_email,
          supportPhone: draftOrg.support_phone,
          appBundleId: draftOrg.app_bundle_id,
          playStoreUrl: draftOrg.play_store_url,
          appStoreUrl: draftOrg.app_store_url,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === selected.id ? body.organization : o));
        setOrgSaveMsg("Saved!");
        setTimeout(() => setOrgSaveMsg(""), 2500);
      } else {
        setOrgSaveMsg(body.error ?? "Save failed.");
      }
    } catch {
      setOrgSaveMsg("Network error.");
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!selected) return;
    const formData = new FormData();
    formData.append("logo", file);
    try {
      const res = await apiFetch(`/api/admin/organizations/${selected.id}/logo`, { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === selected.id ? body.organization : o));
        setDraftOrg(body.organization);
      }
    } catch {
      // best-effort; toggle grid/branding form remain usable either way
    }
  }

  async function handleToggleFeature(featureKey: string, enabled: boolean) {
    if (!selected) return;
    // Optimistic update
    setFeatures(prev => prev.map(f => f.key === featureKey ? { ...f, enabled } : f));
    setPendingFeature(featureKey);
    try {
      const res = await apiFetch(`/api/admin/organizations/${selected.id}/features/${featureKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        // Revert on failure
        setFeatures(prev => prev.map(f => f.key === featureKey ? { ...f, enabled: !enabled } : f));
      }
    } catch {
      setFeatures(prev => prev.map(f => f.key === featureKey ? { ...f, enabled: !enabled } : f));
    } finally {
      setPendingFeature(null);
    }
  }

  async function handleApplyPreset(tier: string) {
    if (!selected) return;
    setApplyingPreset(true);
    try {
      const res = await apiFetch(`/api/admin/organizations/${selected.id}/features/preset/${tier}`, { method: "PUT" });
      if (res.ok) {
        await fetchFeatures(selected.id);
        setOrgs(prev => prev.map(o => o.id === selected.id ? { ...o, plan_tier: tier } : o));
      }
    } finally {
      setApplyingPreset(false);
    }
  }

  function handleCreated(org: Organization) {
    setShowCreate(false);
    setOrgs(prev => [...prev, org]);
    selectOrg(org);
  }

  const featureGroups: FeatureRow["group"][] = ["clinical", "commerce", "wellness"];

  return (
    <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">

        {/* LEFT: Organizations list */}
        <div className={`${selected ? "xl:col-span-5" : "xl:col-span-12"} flex flex-col gap-5`}>
          <div className="flex items-center justify-between">
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Organizations</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-full text-[13px] font-medium text-white bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] shadow-md shadow-blue-200/50 transition active:scale-[0.98]"
            >
              + New organization
            </button>
          </div>
          <p className="text-[13px] text-slate-500 -mt-2">
            White-label tenants. Each organization's branding and enabled features control what its clinics, doctors, and patients see.
          </p>

          {fetchError && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{fetchError}</div>
          )}

          <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1 py-24 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#6A8BFF]/30 border-t-[#6A8BFF] rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-semibold">Loading organizations…</p>
              </div>
            ) : orgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-24 text-slate-400">
                <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} />
                </svg>
                <p className="text-sm font-semibold">No organizations found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {orgs.map(org => {
                  const isSelected = selectedId === org.id;
                  return (
                    <div
                      key={org.id}
                      onClick={() => selectOrg(org)}
                      className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors border ${
                        isSelected ? "border-[#6A8BFF]/40 bg-[#f8faff]" : "border-transparent hover:bg-slate-50/70"
                      }`}
                    >
                      <OrgAvatar org={org} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-800 truncate">{org.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{org.slug}</p>
                      </div>
                      <PlanBadge tier={org.plan_tier} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Branding + Feature entitlements */}
        {selected && draftOrg && (
          <div className="xl:col-span-7 flex flex-col gap-6">

            {/* Branding card */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
              <div className="flex items-center justify-between pb-5 border-b border-slate-50 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <OrgAvatar org={draftOrg} size="lg" />
                    <label className="absolute inset-0 rounded-full bg-slate-900/0 group-hover:bg-slate-900/40 flex items-center justify-center cursor-pointer transition-colors">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">{selected.name}</h2>
                    <p className="text-[12px] text-slate-400 font-mono">{selected.slug}</p>
                  </div>
                </div>
                {orgSaveMsg && (
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${orgSaveMsg === "Saved!" ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
                    {orgSaveMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Display name</label>
                  <input
                    value={draftOrg.name}
                    onChange={e => setDraftOrg({ ...draftOrg, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Support email</label>
                  <input
                    value={draftOrg.support_email ?? ""}
                    onChange={e => setDraftOrg({ ...draftOrg, support_email: e.target.value })}
                    placeholder="support@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Support phone</label>
                  <input
                    value={draftOrg.support_phone ?? ""}
                    onChange={e => setDraftOrg({ ...draftOrg, support_phone: e.target.value })}
                    placeholder="+971 4 000 0000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Primary color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={draftOrg.primary_color ?? "#6A8BFF"}
                        onChange={e => setDraftOrg({ ...draftOrg, primary_color: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                      />
                      <input
                        value={draftOrg.primary_color ?? ""}
                        onChange={e => setDraftOrg({ ...draftOrg, primary_color: e.target.value })}
                        placeholder="#6A8BFF"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 border-t border-slate-50 pt-4 mt-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">App store presence</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Android package / iOS bundle ID</label>
                  <input
                    value={draftOrg.app_bundle_id ?? ""}
                    onChange={e => setDraftOrg({ ...draftOrg, app_bundle_id: e.target.value })}
                    placeholder="com.acmehealth.wellness"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Play Store URL</label>
                  <input
                    value={draftOrg.play_store_url ?? ""}
                    onChange={e => setDraftOrg({ ...draftOrg, play_store_url: e.target.value })}
                    placeholder="https://play.google.com/store/apps/details?id=…"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">App Store URL</label>
                  <input
                    value={draftOrg.app_store_url ?? ""}
                    onChange={e => setDraftOrg({ ...draftOrg, app_store_url: e.target.value })}
                    placeholder="https://apps.apple.com/app/…"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveOrg}
                disabled={savingOrg || !hasOrgChanges}
                className={`w-full py-3.5 mt-6 rounded-[1rem] text-[13px] font-medium shadow-md transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasOrgChanges
                    ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white shadow-blue-200/50"
                    : "bg-slate-100 text-slate-400 shadow-none"
                }`}
              >
                {savingOrg ? "Saving…" : hasOrgChanges ? "Save Changes" : "No Changes"}
              </button>
            </div>

            {/* Feature entitlements card */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
              <div className="flex items-center justify-between pb-5 border-b border-slate-50 mb-6">
                <h3 className="text-[15px] font-medium text-slate-800">Feature entitlements</h3>
                <div className="flex items-center gap-2">
                  {PRESETS.map(tier => (
                    <button
                      key={tier}
                      onClick={() => handleApplyPreset(tier)}
                      disabled={applyingPreset}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-medium capitalize transition disabled:opacity-50 ${
                        selected.plan_tier === tier
                          ? "bg-[#1E293B] text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {featuresLoading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <div className="w-6 h-6 border-[3px] border-[#6A8BFF]/30 border-t-[#6A8BFF] rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 font-semibold">Loading features…</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {featureGroups.map(group => {
                    const rows = features.filter(f => f.group === group);
                    if (rows.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{GROUP_LABELS[group]}</p>
                        <div className="flex flex-col gap-2">
                          {rows.map(f => (
                            <div
                              key={f.key}
                              className={`flex items-center justify-between gap-4 p-4 rounded-[1.25rem] border transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.01)] ${
                                f.enabled ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800">{f.label}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{f.key}</p>
                              </div>
                              <ToggleSwitch
                                checked={f.enabled}
                                disabled={pendingFeature === f.key}
                                onChange={v => handleToggleFeature(f.key, v)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <ProtectedRoute>
      <OrganizationsPageInner />
    </ProtectedRoute>
  );
}
