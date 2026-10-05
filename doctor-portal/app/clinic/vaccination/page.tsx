"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface ClinicDoctor {
  id: string;
  fullName: string;
  specialty?: string | null;
}

// Vaccines are a global catalogue with no owning lab, so unlike lab tests
// (where sign-off is assigned on the lab document) the vaccination reviewers
// are assigned on the clinic itself — see backend
// PUT /api/clinics/vaccination-doctors.
function ClinicVaccinationContent() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams.get("branchId");
  const qs = branchIdParam ? `?branchId=${branchIdParam}` : "";

  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/api/clinics/vaccination-doctors${qs}`).then((r) => (r.ok ? r.json() : { doctorIds: [] })),
      apiFetch(`/api/clinics/doctors${qs}`).then((r) => (r.ok ? r.json() : { doctors: [] })),
    ])
      .then(([assigned, roster]) => {
        setAssignedIds(new Set(assigned.doctorIds ?? []));
        setDoctors(Array.isArray(roster.doctors) ? roster.doctors : []);
      })
      .catch(() => setError("Could not load vaccination reviewers."))
      .finally(() => setLoading(false));
  }, [qs]);

  useEffect(() => { load(); }, [load]);

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
        </p>
      </div>

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
