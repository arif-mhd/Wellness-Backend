"use client";

import Pagination from "@/components/Pagination";
import { useState, useEffect, useCallback } from "react";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

interface Permissions {
  medicalRecords: boolean;
  prescription:   boolean;
  emrUpdates:     boolean;
  systemConfig:   boolean;
}

interface RoleUser {
  id:          string;
  name:        string;
  email:       string;
  avatarUrl:   string | null;
  dateJoined:  string;
  emiratesId:  string | null;
  specialty:   string | null;
  license:     string | null;
  rating:      number | null;
  bio:         string | null;
  permissions: Permissions;
}

type Tab = "Doctors" | "Patients" | "Admin";

const ROLE_ENDPOINT: Record<Tab, string> = {
  Doctors:  "doctors",
  Patients: "patients",
  Admin:    "admins",
};

const PERMISSION_LABELS: { key: keyof Permissions; title: string; description: string }[] = [
  {
    key:         "medicalRecords",
    title:       "Patient Medical Records Access",
    description: "Can view and update the medical records of their assigned patients, including diagnoses, treatments, and history.",
  },
  {
    key:         "prescription",
    title:       "Prescription Management",
    description: "Can prescribe medication, adjust dosages, and send prescriptions directly to pharmacies.",
  },
  {
    key:         "emrUpdates",
    title:       "EMR System Updates",
    description: "Can input updates in Electronic Medical Records (EMR), including notes, treatment plans, and follow-up reminders.",
  },
  {
    key:         "systemConfig",
    title:       "System-Wide Configuration",
    description: "Can modify platform-wide settings, manage integrations, and configure system parameters.",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

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

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1 mt-1">
    {[1, 2, 3, 4, 5].map(star => (
      <svg key={star} className={`w-3.5 h-3.5 ${star <= rating ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#dce5fe] fill-[#dce5fe]"}`} viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

function UserAvatar({ user, size = "md" }: { user: RoleUser; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-14 h-14 text-base" : "w-10 h-10 text-[11px]";
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name ?? ""} className={`${sz} rounded-full object-cover border border-slate-100 shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white font-medium shrink-0`}>
      {(user.name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("") || "?"}
    </div>
  );
}

export default function RolesPage() {
  const [activeTab, setActiveTab]   = useState<Tab>("Doctors");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [users, setUsers]           = useState<RoleUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Draft permissions for the selected user (local until Save is clicked)
  const [draftPerms, setDraftPerms] = useState<Permissions | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchUsers = useCallback(async (tab: Tab) => {
    setLoading(true);
    setFetchError("");
    setSelectedId(null);
    setDraftPerms(null);
    try {
      const res = await adminFetch(`/api/admin/roles/${ROLE_ENDPOINT[tab]}`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFetchError(b.error ?? `Error ${res.status}`);
        setUsers([]);
        return;
      }
      const data = await res.json();
      const list: RoleUser[] = data.users ?? [];
      setUsers(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        setDraftPerms({ ...list[0].permissions });
      }
    } catch {
      setFetchError("Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(activeTab); setSearch(""); setSearchOpen(false); }, [activeTab, fetchUsers]);

  function selectUser(user: RoleUser) {
    setSelectedId(user.id);
    setDraftPerms({ ...user.permissions });
    setSaveMsg("");
  }

  async function handleSave() {
    if (!selectedId || !draftPerms) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await adminFetch(
        `/api/admin/roles/${ROLE_ENDPOINT[activeTab]}/${selectedId}/permissions`,
        { method: "PATCH", body: JSON.stringify({ permissions: draftPerms }) }
      );
      if (res.ok) {
        // Update in local list
        setUsers(prev => prev.map(u => u.id === selectedId ? { ...u, permissions: draftPerms } : u));
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(""), 2500);
      } else {
        const b = await res.json().catch(() => ({}));
        setSaveMsg(b.error ?? "Save failed.");
      }
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const selected = users.find(u => u.id === selectedId) ?? null;

  // True when draftPerms differs from what's stored on the selected user
  const hasChanges = !!selected && !!draftPerms &&
    Object.keys(draftPerms).some(
      k => draftPerms[k as keyof Permissions] !== selected.permissions[k as keyof Permissions]
    );

  function selectUserWithGuard(user: RoleUser) {
    if (hasChanges) {
      if (!confirm(`You have unsaved changes for ${selected?.name ?? "this user"}. Discard and switch?`)) return;
    }
    selectUser(user);
  }

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.specialty ?? "").toLowerCase().includes(q) ||
      (u.emiratesId ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">

          {/* LEFT COLUMN */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>

            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">User Roles</h1>

            {/* Tabs row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["Doctors", "Patients", "Admin"] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                      activeTab === tab ? "bg-[#1E293B] text-white shadow-md" : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <div className="ml-2 flex items-center gap-2">
                  {searchOpen && (
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={`Search ${activeTab.toLowerCase()}…`}
                      className="w-44 pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm transition-all"
                    />
                  )}
                  <button
                    onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearch(""); }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition ${searchOpen ? "bg-[#6A8BFF] text-white border-[#6A8BFF]" : "bg-white text-slate-400 hover:text-slate-700 border-slate-100"}`}
                  >
                    {searchOpen
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    }
                  </button>
                </div>
              </div>
              <button className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                Today
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>

            {/* Column labels */}
            <div className="flex items-center justify-between text-[13px] font-medium text-[#64748B] select-none mt-1">
              <div className="flex items-center gap-10 flex-1">
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Name <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
                <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                  Date <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" /></svg>
              </button>
            </div>

            {/* Error */}
            {fetchError && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{fetchError}</div>
            )}

            {/* Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 flex flex-col justify-between min-h-[550px]">

              {loading ? (
                <div className="flex flex-col items-center justify-center flex-1 py-24 gap-3">
                  <div className="w-8 h-8 border-[3px] border-[#6A8BFF]/30 border-t-[#6A8BFF] rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 font-semibold">Loading {activeTab.toLowerCase()}…</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-24 text-slate-400">
                  <svg className="w-12 h-12 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-semibold">{search ? `No results for "${search}"` : `No ${activeTab.toLowerCase()} found`}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-700">
                          <th className="pb-4 pt-1 font-medium pl-2 w-[35%]">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Name <DoubleCaret /></div>
                          </th>
                          <th className="pb-4 pt-1 font-medium w-[25%]">
                            <div className="flex items-center gap-2 cursor-pointer hover:text-slate-500">Date Joined <DoubleCaret /></div>
                          </th>
                          <th className="pb-4 pt-1 font-medium w-[25%]">Emirates ID</th>
                          {activeTab === "Doctors" && (
                            <th className="pb-4 pt-1 font-medium w-[15%]">Speciality</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                      {filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(user => {
                          const isSelected = selectedId === user.id;
                          return (
                            <tr
                              key={user.id}
                              onClick={() => selectUserWithGuard(user)}
                              className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/50`}
                            >
                              <td className="py-4 pl-2">
                                <div className="flex items-center gap-3">
                                  <div className="relative shrink-0">
                                    <UserAvatar user={user} size="md" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-slate-800 truncate">{user.name}</p>
                                    <p className="text-[11px] text-slate-400 font-medium truncate">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 text-[12px] text-slate-500 font-medium">{formatDate(user.dateJoined)}</td>
                              <td className="py-4 text-[12px] text-slate-500 font-medium">{user.emiratesId ?? "—"}</td>
                              {activeTab === "Doctors" && (
                                <td className="py-4 text-[12px] text-slate-500 font-medium">{user.specialty ?? "—"}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
              {filteredUsers.length > 0 && (
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={Math.ceil(filteredUsers.length / itemsPerPage)} 
                  onPageChange={setCurrentPage} 
                />
              )}</>
              )}
            </div>
          </div>

          {/* RIGHT: Details + Access Controls */}
          {selected && draftPerms && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              <div className="flex items-center justify-between pb-5 border-b border-slate-50">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">
                  {activeTab === "Doctors" ? "Doctor" : activeTab === "Patients" ? "Patient" : "Admin"} Details
                </h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Profile block */}
              <div className="flex items-center gap-4 mt-6 mb-5">
                <div className="relative shrink-0">
                  <UserAvatar user={selected} size="lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-slate-800 truncate">{selected.name}</p>
                  {selected.license && (
                    <p className="text-[10px] text-[#6A8BFF] font-medium uppercase tracking-wider mt-0.5">
                      LICENSE {selected.license}
                    </p>
                  )}
                  {selected.rating != null && <StarRating rating={selected.rating} />}
                </div>
              </div>

              {/* Specialty pills */}
              {selected.specialty && (
                <div className="flex gap-2 mb-5 flex-wrap">
                  <span className="px-4 py-1.5 bg-[#eef2ff] text-[#6A8BFF] text-[11px] font-medium rounded-full">
                    {selected.specialty}
                  </span>
                </div>
              )}

              {/* Bio */}
              {selected.bio && (
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">
                  {selected.bio}
                </p>
              )}

              {/* Access Controls */}
              <div className="border-t border-slate-50 pt-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[13px] font-medium text-slate-800">Access Controls</h3>
                  {hasChanges && (
                    <span className="text-[10px] font-medium text-amber-500 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      Unsaved changes
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {PERMISSION_LABELS.map(({ key, title, description }) => {
                    const changed = draftPerms[key] !== selected.permissions[key];
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-4 p-4 rounded-[1.25rem] border transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.01)] ${
                          changed
                            ? "border-amber-200 bg-amber-50/40"
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-medium text-slate-800 mb-1">{title}</p>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">{description}</p>
                        </div>
                        <ToggleSwitch
                          checked={draftPerms[key]}
                          onChange={v => setDraftPerms(prev => prev ? { ...prev, [key]: v } : prev)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save CTA */}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`w-full py-4 mt-6 rounded-[1rem] text-[13px] font-medium shadow-md transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasChanges
                    ? "bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white shadow-blue-200/50"
                    : "bg-slate-100 text-slate-400 shadow-none"
                }`}
              >
                {saving ? "Saving…" : hasChanges ? "Save Changes" : "No Changes"}
              </button>

              {saveMsg && (
                <p className={`text-center text-[12px] font-semibold mt-3 ${saveMsg === "Saved!" ? "text-emerald-500" : "text-red-500"}`}>
                  {saveMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
