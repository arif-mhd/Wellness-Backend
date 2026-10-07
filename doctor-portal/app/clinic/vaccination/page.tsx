"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface ClinicDoctor {
  id: string;
  fullName: string;
  specialty?: string | null;
}

interface BranchOption { id: string; name: string; status: string; isMain?: boolean; }

// Vaccines are a global catalogue with no owning lab, so unlike lab tests
// (where sign-off is assigned on the lab document) the vaccination reviewers
// are assigned on the clinic itself — see backend
// PUT /api/clinics/vaccination-doctors. Like the Lab page, it's one list per
// branch, so a multi-branch org owner always works on one picked branch.
function ClinicVaccinationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchIdParam = searchParams.get("branchId");

  // Same branch picker as the Lab page — only populated for an org owner
  // (GET /api/clinics/branches is owner-only); a branch/staff account and a
  // single-location clinic get an empty list and never send a branchId.
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => (r.ok ? r.json() : { branches: [] }))
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoaded(true));
  }, []);

  const hasBranches = branches.length > 1;
  // Default to the main branch — there's no "All branches" view, since each
  // branch keeps its own reviewer list.
  const effectiveBranchId = hasBranches ? (branchIdParam ?? branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? null) : null;
  const activeBranchName = effectiveBranchId ? branches.find((b) => b.id === effectiveBranchId)?.name ?? "Branch" : null;
  const qs = effectiveBranchId ? `?branchId=${effectiveBranchId}` : "";

  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const getJson = async (path: string) => {
      const r = await apiFetch(path);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not load vaccination reviewers.");
      }
      return r.json();
    };
    Promise.all([
      getJson(`/api/clinics/vaccination-doctors${qs}`),
      getJson(`/api/clinics/doctors${qs}`),
    ])
      .then(([assigned, roster]) => {
        setAssignedIds(new Set(assigned.doctorIds ?? []));
        setDoctors(Array.isArray(roster.doctors) ? roster.doctors : []);
      })
      // Don't fall back to "nobody assigned" — saving that would wipe the
      // real list.
      .catch((err: any) => {
        setAssignedIds(new Set());
        setDoctors([]);
        setError(err.message ?? "Could not load vaccination reviewers.");
      })
      .finally(() => setLoading(false));
  }, [qs]);

  // Wait for the branch list first so the very first fetch already carries
  // the right default branchId.
  useEffect(() => {
    if (!branchesLoaded) return;
    setSaved(false);
    load();
  }, [branchesLoaded, load]);

  const toggle = (id: string) => {
    setSaved(false);
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`/api/clinics/vaccination-doctors${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorIds: Array.from(assignedIds) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update vaccination reviewers.");
      }
      setSaved(true);
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to update vaccination reviewers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 md:px-8 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex flex-col gap-1 mb-6 mt-2">
        <h1 className="text-[#383F45] text-[28px] font-normal tracking-[-0.56px]">Vaccination Approvals</h1>
        <p className="text-[#676E76] text-sm">
          Choose which of your doctors can sign off on patient vaccination bookings. Assigned doctors get a
          Vaccinations tab in their portal, and any of them can approve or decline a booking.
          {hasBranches && " Each branch has its own reviewers."}
        </p>
      </div>

      {hasBranches && (
        <div className="relative w-fit mb-5">
          <button
            onClick={() => setShowBranchDropdown((v) => !v)}
            className="px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all flex items-center gap-1.5 bg-[#5476FC] text-white"
          >
            {activeBranchName ?? "Select Branch"}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          </button>
          {showBranchDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowBranchDropdown(false)} />
              <div className="absolute left-0 top-9 bg-white rounded-xl shadow-lg border border-slate-100 p-1.5 w-56 z-20">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { router.push(`/clinic/vaccination?branchId=${b.id}`); setShowBranchDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${effectiveBranchId === b.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {b.name}{b.isMain ? " (Main)" : ""}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-5">{error}</div>
      )}
      {saved && !error && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-5">
          Vaccination reviewers updated.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        {loading ? (
          <p className="text-sm text-[#A0A8B0] py-8 text-center">Loading...</p>
        ) : error && doctors.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <p className="text-sm text-[#676E76]">Reviewers couldn&apos;t be loaded.</p>
            <button type="button" onClick={load} className="text-[13px] font-medium text-[#5476FC] hover:underline">
              Try again
            </button>
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-[#676E76] py-8 text-center">No doctors found for this clinic yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-5">
              {doctors.map((doc) => (
                <label key={doc.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-[#5476FC]"
                    checked={assignedIds.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                  />
                  <span className="text-[13px] text-[#344054]">
                    {doc.fullName}{doc.specialty ? ` · ${doc.specialty}` : ""}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 px-6 rounded-lg shadow-md disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClinicVaccinationPage() {
  return (
    <Suspense fallback={null}>
      <ClinicVaccinationContent />
    </Suspense>
  );
}
