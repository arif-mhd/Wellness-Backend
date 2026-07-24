"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

// ─────────────────────────────────────────────────────────────────────────
// Branches/Doctors/Staff tabs list real accounts (existing endpoints). The
// right-hand "Access" panel has no defined permission model yet (placeholder
// labels in the reference design) — toggles work visually but Save/Save for
// all users don't persist anywhere until a real permission set exists.
// ─────────────────────────────────────────────────────────────────────────

interface BranchItem { id: string; name: string; userCount: number; }
interface AccountUser { id: string; fullName: string; email: string; avatarUrl?: string | null; branchId?: string; branchName?: string; }
interface DoctorItem { id: string; fullName: string; email: string; specialty?: string; avatarUrl?: string | null; }

const ACCESS_ITEMS = [
  { key: "access1", label: "Access 1" },
  { key: "access2", label: "Access 2" },
  { key: "access3", label: "Access 3" },
  { key: "access4", label: "Access 4" },
  { key: "access5", label: "Access 5" },
  { key: "access6", label: "Access 6" },
  { key: "access7", label: "Access 7" },
];
const ACCESS_DESCRIPTION = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";

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
  };

  const toggleAccess = (key: string) => setAccess((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = (scope: "one" | "all") => {
    setSaveNote(
      scope === "one"
        ? "Saved locally — permissions aren't wired to the backend yet."
        : "Applied locally to every user in this branch — not yet wired to the backend."
    );
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredBranches = q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches;
  const filteredDoctors = q ? doctors.filter((d) => d.fullName.toLowerCase().includes(q)) : doctors;
  const filteredStaff = q ? staff.filter((s) => s.fullName.toLowerCase().includes(q)) : staff;

  return (
    <div className="flex h-full w-full font-sans select-none px-5 pb-12 pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Left */}
      <div className="flex-1 flex flex-col min-w-0 pr-8">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px] mb-6">
          User roles
        </h1>

        <div className="flex gap-2 mb-6">
          {(["branches", "doctors", "staff"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-8 py-2 rounded-xl text-[13px] font-medium tracking-wide capitalize transition-all ${activeTab === t ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}
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
              {filteredBranches.map((b) => (
                <div key={b.id}>
                  <div
                    onClick={() => selectEntity({ type: "branch", id: b.id, label: b.name })}
                    className={`flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "branch" && selected.id === b.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={b.name} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-semibold text-[#24292E] truncate">{b.name}</span>
                        <span className="text-[11px] text-[#9EA5AD] truncate">{b.id}</span>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#676E76] whitespace-nowrap">{b.userCount} User{b.userCount !== 1 ? "s" : ""}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBranch(b); }}
                      className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                    >
                      View
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${expandedBranchId === b.id ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>

                  {expandedBranchId === b.id && (
                    <div className="flex flex-col gap-2 mt-2 ml-6">
                      {!branchUsersById[b.id] ? (
                        <div className="text-[12px] text-[#9EA5AD] px-4 py-2">Loading users…</div>
                      ) : branchUsersById[b.id].length === 0 ? (
                        <div className="text-[12px] text-[#9EA5AD] px-4 py-2">No users added to this branch yet.</div>
                      ) : (
                        branchUsersById[b.id].map((u) => (
                          <div
                            key={u.id}
                            onClick={() => selectEntity({ type: "user", id: u.id, label: u.fullName })}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${selected?.type === "user" && selected.id === u.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-[#F7F9FC] hover:bg-white"}`}
                          >
                            <span className="text-[12.5px] font-medium text-[#24292E]">{u.fullName}</span>
                            <span className="text-[11px] text-[#9EA5AD]">{u.id.slice(0, 8)}…</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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
              {filteredDoctors.map((d) => (
                <div
                  key={d.id}
                  onClick={() => selectEntity({ type: "doctor", id: d.id, label: d.fullName })}
                  className={`flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "doctor" && selected.id === d.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={d.fullName} url={d.avatarUrl} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-semibold text-[#24292E] truncate">{d.fullName}</span>
                      <span className="text-[11px] text-[#9EA5AD] truncate">{d.specialty || d.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); selectEntity({ type: "doctor", id: d.id, label: d.fullName }); }}
                    className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                  >
                    View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                  </button>
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
            {filteredStaff.map((u) => (
              <div
                key={u.id}
                onClick={() => selectEntity({ type: "user", id: u.id, label: u.fullName })}
                className={`flex items-center justify-between gap-4 px-6 py-4 rounded-2xl border cursor-pointer transition-all ${selected?.type === "user" && selected.id === u.id ? "border-[#5476FC] bg-[#EEF2FF]" : "border-[#EBEEF5] bg-white hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.fullName} url={u.avatarUrl} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-semibold text-[#24292E] truncate">{u.fullName}</span>
                    <span className="text-[11px] text-[#9EA5AD] truncate">{u.branchName}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); selectEntity({ type: "user", id: u.id, label: u.fullName }); }}
                  className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 text-[#24292E] text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                >
                  View
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Access panel */}
      <div className="w-[420px] shrink-0">
        <div className="bg-[#EEF0FC] rounded-[24px] p-7 shadow-sm flex flex-col gap-6 sticky top-4">
          {!selected ? (
            <p className="text-[#838B95] text-sm text-center py-16">Select a branch, doctor, or staff account to manage access.</p>
          ) : (
            <>
              <h2 className="text-[#24292E] text-[15px] font-semibold">{selected.label}</h2>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {ACCESS_ITEMS.map((a) => (
                  <div key={a.key} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#24292E] block mb-0.5">{a.label}</span>
                      <span className="text-[10.5px] text-[#9EA5AD] leading-snug block">{ACCESS_DESCRIPTION}</span>
                    </div>
                    <Toggle on={!!access[a.key]} onClick={() => toggleAccess(a.key)} />
                  </div>
                ))}
              </div>

              {saveNote && <p className="text-[11px] text-[#5476FC] leading-relaxed">{saveNote}</p>}

              <div className="flex items-center gap-3 mt-2">
                {selected.type === "branch" && (
                  <button
                    onClick={() => save("all")}
                    className="px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4] transition-colors whitespace-nowrap"
                  >
                    Save for all users
                  </button>
                )}
                <button
                  onClick={() => save("one")}
                  className="flex-1 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
