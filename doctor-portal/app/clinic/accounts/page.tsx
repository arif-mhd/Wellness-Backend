"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import type { PermissionKey } from "@/lib/useClinicPermissions";
import type { DoctorPermissionKey } from "@/lib/useDoctorPermissions";

// ─────────────────────────────────────────────────────────────────────────
// Branches/Doctors/Staff tabs list real accounts (existing endpoints). The
// right-hand "Access" panel manages each account's granular permissions via
// /api/clinics/permissions — a branch-staff or clinic-managed doctor account
// with no `permissions` field (or a key simply not present) is fully allowed;
// a toggle switched off explicitly restricts that one action. Selecting a
// branch itself (rather than one of its users) applies the change to every
// staff account currently in that branch at once.
// ─────────────────────────────────────────────────────────────────────────

interface BranchItem { id: string; name: string; userCount: number; }
interface AccountUser { id: string; fullName: string; email: string; avatarUrl?: string | null; branchId?: string; branchName?: string; }
interface DoctorItem { id: string; fullName: string; email: string; specialty?: string; avatarUrl?: string | null; }

// Applies to branches (bulk) and individual staff (branch-user) accounts —
// restricts what that account can do on the CLINIC's own portal pages.
const STAFF_ACCESS_ITEMS: { key: PermissionKey; label: string; description: string }[] = [
  { key: "manage_doctors", label: "Manage Doctors", description: "Add, edit, verify slots for, or remove doctor accounts." },
  { key: "manage_patients", label: "Manage Patients", description: "View the clinic's patient records." },
  { key: "manage_appointments", label: "Manage Appointments", description: "Cancel or reschedule patient appointments." },
  { key: "manage_schedules", label: "Manage Schedules", description: "Edit clinic timing, doctor slots, and absences." },
  { key: "view_analytics", label: "View Analytics", description: "Access the clinic's analytics and reports dashboard." },
  { key: "manage_insurance", label: "Manage Insurance", description: "Add, edit, or remove accepted insurance policies." },
  { key: "manage_payment", label: "Manage Payment & Fees", description: "View and update payment settings and fee structures." },
];

// Applies to an individual doctor account — restricts what that doctor can
// do in their OWN dashboard (a different app context from the clinic
// portal). Deliberately smaller: a doctor's dashboard is mostly view-only or
// core clinical work (consultations, EMR) that can't be restricted without
// blocking them from doing their job.
const DOCTOR_ACCESS_ITEMS: { key: DoctorPermissionKey; label: string; description: string }[] = [
  { key: "manage_own_schedule", label: "Manage Own Schedule", description: "Request availability changes and mark their own absences." },
  { key: "manage_own_profile", label: "Manage Own Profile", description: "Edit their own bio, specialty, fees, and contact info." },
  { key: "view_analytics", label: "View Analytics", description: "Access their own analytics and earnings dashboard." },
  { key: "manage_account_settings", label: "Manage Account Settings", description: "Change password, two-factor settings, or deactivate their account." },
];

type Selected = { type: "branch" | "user" | "doctor"; id: string; label: string } | null;

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url && url.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100" />;
  }
  return <div className="w-9 h-9 rounded-full bg-[#F1F3F7] border border-gray-100 shrink-0" />;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-5 rounded-full flex items-center transition-colors shrink-0 ${on ? "bg-black justify-end" : "bg-[#D0D5DD] justify-start"}`}
    >
      <span className="w-4 h-4 rounded-full bg-white mx-0.5 shadow-sm" />
    </button>
  );
}

export default function ClinicAccountsPage() {
  const [activeTab, setActiveTab] = useState<"branches" | "doctors" | "staff">("branches");
  const [searchQuery, setSearchQuery] = useState("");

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [branchUsersById, setBranchUsersById] = useState<Record<string, AccountUser[]>>({});
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [restricted, setRestricted] = useState(false);

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [staff, setStaff] = useState<AccountUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const [selected, setSelected] = useState<Selected>(null);
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then(async (r) => {
        if (r.status === 403) { setRestricted(true); return { branches: [] }; }
        return r.json();
      })
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches : []))
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false));

    apiFetch("/api/clinics/doctors")
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data.doctors) ? data.doctors : []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  // Staff tab = the same branch-login accounts shown under Branches, just
  // flattened across every branch instead of grouped — loaded lazily the
  // first time that tab is opened.
  useEffect(() => {
    if (activeTab !== "staff" || staffLoaded || restricted || branches.length === 0) return;
    setLoadingStaff(true);
    Promise.all(
      branches.map((b) =>
        apiFetch(`/api/clinics/branches/${b.id}/users`)
          .then((r) => (r.ok ? r.json() : { users: [] }))
          .then((data) => (Array.isArray(data.users) ? data.users : []).map((u: any) => ({ ...u, branchId: b.id, branchName: b.name })))
          .catch(() => [])
      )
    )
      .then((lists) => setStaff(lists.flat()))
      .finally(() => { setLoadingStaff(false); setStaffLoaded(true); });
  }, [activeTab, staffLoaded, restricted, branches]);

  const toggleBranch = async (branch: BranchItem) => {
    if (expandedBranchId === branch.id) { setExpandedBranchId(null); return; }
    setExpandedBranchId(branch.id);
    if (!branchUsersById[branch.id]) {
      const res = await apiFetch(`/api/clinics/branches/${branch.id}/users`);
      if (res.ok) {
        const data = await res.json();
        setBranchUsersById((prev) => ({ ...prev, [branch.id]: data.users ?? [] }));
      }
    }
  };

  const selectEntity = (next: Selected) => {
    setSelected(next);
    setAccess({});
    setSaveNote("");
    // A branch itself has no single permissions doc — it's a bulk-apply
    // target, not an account — so there's nothing to fetch for it. Every
    // toggle starts "on" (default-allow) until Save for all users overwrites.
    if (next && next.type !== "branch") {
      setLoadingAccess(true);
      apiFetch(`/api/clinics/permissions/${next.id}`)
        .then((r) => (r.ok ? r.json() : { permissions: {} }))
        .then((data) => setAccess(data.permissions ?? {}))
        .catch(() => setAccess({}))
        .finally(() => setLoadingAccess(false));
    }
  };

  const toggleAccess = (key: string) =>
    setAccess((prev) => ({ ...prev, [key]: prev[key] === false }));

  const save = async (scope: "one" | "all") => {
    if (!selected) return;
    setSavingAccess(true);
    setSaveNote("");
    try {
      const url =
        scope === "all"
          ? `/api/clinics/permissions/branch/${selected.id}/all`
          : `/api/clinics/permissions/${selected.id}`;
      const res = await apiFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: access }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save access.");
      }
      setSaveNote(scope === "all" ? "Applied to every user in this branch." : "Saved.");
    } catch (err: any) {
      setSaveNote(err.message ?? "Failed to save access.");
    } finally {
      setSavingAccess(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredBranches = q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches;
  const filteredDoctors = q ? doctors.filter((d) => d.fullName.toLowerCase().includes(q)) : doctors;
  const filteredStaff = q ? staff.filter((s) => s.fullName.toLowerCase().includes(q)) : staff;

  return (
    <div className="flex flex-col lg:flex-row h-full w-full font-sans select-none px-4 md:px-5 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Left */}
      <div className="flex-1 flex flex-col min-w-0 lg:pr-8">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px] mb-6">
          User roles
        </h1>

        <div className="flex gap-2 mb-6">
          {(["branches", "doctors", "staff"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                selectEntity(null);
              }}
              className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide capitalize transition-all ${activeTab === t ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="flex-1 h-[40px] border border-[#EBEEF5] rounded-xl px-4 bg-white text-[13px] text-[#24292E] outline-none focus:border-[#5476FC] transition-colors max-w-sm"
          />
        </div>

        {restricted ? (
          <div className="text-center py-10 text-[#838B95] text-sm">
            User role management is available to the clinic owner account.
          </div>
        ) : activeTab === "branches" ? (
          loadingBranches ? (
            <div className="text-center py-10 text-[#838B95] text-sm">Loading…</div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-10 text-[#838B95] text-sm">No branches found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden sm:flex items-center justify-between px-6 py-2 border-b border-[#EBEEF5] mb-1">
                <div className="text-left text-[12px] font-medium text-[#9EA5AD] pl-[48px]">Branch Name</div>
                <div className="text-center w-[80px] text-[12px] font-medium text-[#9EA5AD]">Users</div>
              </div>
              {filteredBranches.map((b) => (
                <div key={b.id}>
                  <div
                    onClick={() => selectEntity({ type: "branch", id: b.id, label: b.name })}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "branch" && selected.id === b.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={b.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-semibold text-[#24292E] truncate">{b.name}</span>
                        <span className="text-[11px] text-[#9EA5AD] truncate">{b.id}</span>
                      </div>
                    </div>
                    <span className="w-[80px] text-center text-[12px] text-[#676E76] whitespace-nowrap">{b.userCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "doctors" ? (
          loadingDoctors ? (
            <div className="text-center py-10 text-[#838B95] text-sm">Loading…</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="text-center py-10 text-[#838B95] text-sm">No doctors found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden sm:flex items-center px-6 py-2 border-b border-[#EBEEF5] mb-1">
                <div className="text-left text-[12px] font-medium text-[#9EA5AD] pl-[48px]">Doctor Name</div>
              </div>
              {filteredDoctors.map((d) => (
                <div
                  key={d.id}
                  onClick={() => selectEntity({ type: "doctor", id: d.id, label: d.fullName })}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "doctor" && selected.id === d.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar name={d.fullName} url={d.avatarUrl} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-semibold text-[#24292E] truncate">{d.fullName}</span>
                      <span className="text-[11px] text-[#9EA5AD] truncate">{d.specialty || d.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loadingStaff ? (
          <div className="text-center py-10 text-[#838B95] text-sm">Loading…</div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-10 text-[#838B95] text-sm">No staff accounts found.</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="hidden sm:flex items-center px-6 py-2 border-b border-[#EBEEF5] mb-1">
              <div className="text-left text-[12px] font-medium text-[#9EA5AD] pl-[48px]">Staff Name</div>
            </div>
            {filteredStaff.map((u) => (
              <div
                key={u.id}
                onClick={() => selectEntity({ type: "user", id: u.id, label: u.fullName })}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "user" && selected.id === u.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={u.fullName} url={u.avatarUrl} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-semibold text-[#24292E] truncate">{u.fullName}</span>
                    <span className="text-[11px] text-[#9EA5AD] truncate">{u.branchName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Access panel */}
      <div className="w-full lg:w-[420px] lg:shrink-0 mt-6 lg:mt-0">
        <div className="bg-[#EEF0FC] rounded-[24px] p-5 md:p-7 shadow-sm flex flex-col gap-6 lg:sticky lg:top-4">
          {!selected ? (
            <p className="text-[#838B95] text-sm text-center py-16">Select a branch, doctor, or staff account to manage access.</p>
          ) : (
            <>
              <h2 className="text-[#24292E] text-[15px] font-semibold">{selected.label}</h2>
              {selected.type === "branch" && (
                <p className="text-[11px] text-[#9EA5AD] -mt-4">Applies to every staff account in this branch.</p>
              )}
              {selected.type === "doctor" && (
                <p className="text-[11px] text-[#9EA5AD] -mt-4">Applies to this doctor's own dashboard, not the clinic portal.</p>
              )}

              {loadingAccess ? (
                <p className="text-[#838B95] text-sm text-center py-10">Loading access…</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {(selected.type === "doctor" ? DOCTOR_ACCESS_ITEMS : STAFF_ACCESS_ITEMS).map((a) => (
                    <div key={a.key} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-[#24292E] block mb-0.5">{a.label}</span>
                        <span className="text-[10.5px] text-[#9EA5AD] leading-snug block">{a.description}</span>
                      </div>
                      <Toggle on={access[a.key] !== false} onClick={() => toggleAccess(a.key)} />
                    </div>
                  ))}
                </div>
              )}

              {saveNote && <p className="text-[11px] text-[#5476FC] leading-relaxed">{saveNote}</p>}

              <div className="flex items-center gap-3 mt-2">
                {selected.type === "branch" ? (
                  <button
                    onClick={() => save("all")}
                    disabled={savingAccess || loadingAccess}
                    className="flex-1 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {savingAccess ? "Saving…" : "Save for all users"}
                  </button>
                ) : (
                  <button
                    onClick={() => save("one")}
                    disabled={savingAccess || loadingAccess}
                    className="flex-1 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {savingAccess ? "Saving…" : "Save"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
