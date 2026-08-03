"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import MiniTrendChart from "@/components/clinic/MiniTrendChart";

interface TrendPoint { label: string; count: number; }

type BranchStatus = "requested" | "details_pending" | "pending_approval" | "active" | "rejected";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  licenseNumber?: string | null;
  dohLicense?: string | null;
  bio?: string | null;
  isOnline?: boolean;
  status: BranchStatus;
  isMain?: boolean;
  doctorCount: number;
  userCount: number;
  firstUser: { id: string; fullName: string } | null;
  consultationsToday: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  todayHours: string;
  patientsTrend: TrendPoint[];
}

const STATUS_LABEL: Record<BranchStatus, string> = {
  active: "Online",
  requested: "Request Pending Review",
  details_pending: "Awaiting Your Details",
  pending_approval: "Pending Final Approval",
  rejected: "Rejected",
};
const STATUS_COLOR: Record<BranchStatus, string> = {
  active: "text-[#1FAF65]",
  requested: "text-[#F59E0B]",
  details_pending: "text-[#5476FC]",
  pending_approval: "text-[#F59E0B]",
  rejected: "text-[#D92D20]",
};

const AVATAR_COLORS = [
  "from-[#5EA3FF] to-[#3B7DE0]",
  "from-[#8AA0FF] to-[#5476FC]",
  "from-[#C084FC] to-[#9333EA]",
  "from-[#F472B6] to-[#DB2777]",
  "from-[#F87171] to-[#DC2626]",
  "from-[#FB923C] to-[#EA580C]",
  "from-[#A3E635] to-[#65A30D]",
];

function Avatar({ name, idx = 0, size = "w-10 h-10" }: { name: string; idx?: number; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ClinicBranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLicenseNumber, setAddLicenseNumber] = useState("");
  const [addDohLicense, setAddDohLicense] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  const load = () => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches : []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedId && branches.length > 0) setSelectedId(branches[0].id);
  }, [branches, selectedId]);

  const selected = branches.find((b) => b.id === selectedId) ?? null;
  const selectedIdx = branches.findIndex((b) => b.id === selectedId);

  const filteredBranches = branches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q);
  });

  const goToDash = (b: Branch) => {
    if (b.isMain) { router.push("/clinic"); return; }
    if (b.userCount > 0) router.push(`/clinic?branchId=${b.id}`);
    else router.push(`/clinic/branches/${b.id}`);
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusy(true);
    setAddError("");
    try {
      const res = await apiFetch("/api/clinics/branches/add-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName, address: addAddress, phone: addPhone || null,
          licenseNumber: addLicenseNumber || null, dohLicense: addDohLicense || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit request.");
      }
      setAddSuccess(true);
      setAddName(""); setAddAddress(""); setAddPhone(""); setAddLicenseNumber(""); setAddDohLicense("");
      load();
    } catch (err: any) {
      setAddError(err.message ?? "Failed to submit request.");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="px-4 md:px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex flex-col xl:flex-row gap-6 xl:items-start w-full">
        {/* ── Left: Main Content ───────────────────────────── */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-[#24292E] text-[26px] font-medium tracking-tight">Your Branches</h1>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-60 h-9 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-sm outline-none focus:border-[#5476FC] text-[#24292E]"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
          </div>

          {/* Table */}
          <div className="w-full">
            <div className="w-full">
              {loading ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
              ) : filteredBranches.length === 0 ? (
                <div className="text-center text-sm text-[#A0A8B0] py-12">No branches yet — request one to get started.</div>
              ) : (
                <>
                  {/* Grid header — hidden below xl */}
                  <div
                    className="hidden xl:grid items-center px-4 py-2 text-[12px] font-medium text-[#9EA5AD] border-b border-[#EBEEF5]"
                    style={{ gridTemplateColumns: "2fr 1.5fr 1.2fr 1fr 0.8fr 1fr 1.1fr", gap: "12px" }}
                  >
                    <div className="text-left pl-[44px]">Name</div>
                    <div className="text-left">Location</div>
                    <div className="text-left">Manager/User</div>
                    <div className="text-center">Time</div>
                    <div className="text-center">Status</div>
                    <div className="text-center">No. of Appointments</div>
                    <div></div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    {filteredBranches.map((b) => {
                      const idx = branches.findIndex((x) => x.id === b.id);
                      const isSelected = selectedId === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className={`rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
                            }`}
                        >
                          {/* Desktop: grid row matching header */}
                          <div
                            className="hidden xl:grid items-center px-4 py-3"
                            style={{ gridTemplateColumns: "2fr 1.5fr 1.2fr 1fr 0.8fr 1fr 1.1fr", gap: "12px" }}
                          >
                            {/* Name */}
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={b.name} idx={idx} size="w-9 h-9 text-sm" />
                              <span className="text-[#24292E] text-[13px] font-medium truncate">{b.name}</span>
                            </div>
                            {/* Location */}
                            <div className="flex items-center min-w-0">
                              <span className="text-[#676E76] text-[12px] truncate">{b.address}</span>
                            </div>
                            {/* Manager */}
                            <div className="flex items-center min-w-0">
                              <span className="text-[#24292E] text-[12px] truncate">
                                {b.firstUser?.fullName ?? (b.isMain ? "You (Owner)" : "Unassigned")}
                              </span>
                            </div>
                            {/* Time */}
                            <div className="flex justify-center min-w-0">
                              <span className="text-[#5476FC] text-[12px] font-medium truncate">
                                {b.status === "active" ? b.todayHours : "—"}
                              </span>
                            </div>
                            {/* Status */}
                            <div className="flex justify-center min-w-0">
                              <span className={`text-[12px] font-medium whitespace-nowrap ${STATUS_COLOR[b.status]}`}>
                                {b.status === "active" ? (b.isOnline !== false ? "Online" : "Offline") : STATUS_LABEL[b.status]}
                              </span>
                            </div>
                            {/* No. of Appointments */}
                            <div className="flex justify-center min-w-0">
                              <span className="text-[#24292E] text-[13px] font-medium">
                                {b.status === "active" ? b.consultationsToday : "—"}
                              </span>
                            </div>
                            {/* Action */}
                            <div className="flex justify-end pr-2">
                              {b.status === "active" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); goToDash(b); }}
                                  className="w-[90px] h-[30px] rounded-xl font-medium text-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:shadow-[0_4px_12px_rgba(84,118,252,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                                >
                                  {b.isMain || b.userCount > 0 ? "Dashboard" : "Add Account"}
                                </button>
                              )}
                              {b.status === "details_pending" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/clinic/branches/${b.id}/complete-setup`); }}
                                  className="w-[90px] h-[30px] rounded-xl font-medium text-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:shadow-[0_4px_12px_rgba(84,118,252,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
                                >
                                  Complete Setup
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mobile: stacked card layout */}
                          <div className="xl:hidden px-4 py-3 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={b.name} idx={idx} size="w-9 h-9 text-sm" />
                              <span className="text-[#24292E] text-[13px] font-medium">{b.name}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 pt-3 border-t border-gray-100">
                              <div className="flex flex-col">
                                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Location</span>
                                <span className="text-[#676E76] text-[12px] truncate">{b.address}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Manager</span>
                                <span className="text-[#24292E] text-[12px] truncate">
                                  {b.firstUser?.fullName ?? (b.isMain ? "You (Owner)" : "Unassigned")}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Time</span>
                                <span className="text-[#5476FC] text-[12px] font-medium">
                                  {b.status === "active" ? b.todayHours : "—"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Status</span>
                                <span className={`text-[12px] font-medium ${STATUS_COLOR[b.status]}`}>
                                  {b.status === "active" ? (b.isOnline !== false ? "Online" : "Offline") : STATUS_LABEL[b.status]}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">No. of Appointments</span>
                                <span className="text-[#24292E] text-[13px] font-medium">
                                  {b.status === "active" ? b.consultationsToday : "—"}
                                </span>
                              </div>
                            </div>
                            {(b.status === "active" || b.status === "details_pending") && (
                              <div className="pt-2">
                                {b.status === "active" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); goToDash(b); }}
                                    className="h-[30px] px-4 rounded-xl font-medium text-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:shadow-[0_4px_12px_rgba(84,118,252,0.4)] transition-all"
                                  >
                                    {b.isMain || b.userCount > 0 ? "Dashboard" : "Add Account"}
                                  </button>
                                )}
                                {b.status === "details_pending" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); router.push(`/clinic/branches/${b.id}/complete-setup`); }}
                                    className="h-[30px] px-4 rounded-xl font-medium text-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:shadow-[0_4px_12px_rgba(84,118,252,0.4)] transition-all"
                                  >
                                    Complete Setup
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => { setShowAddModal(true); setAddSuccess(false); setAddError(""); }}
            className="self-start mt-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Add Branch Request
          </button>
        </div>

        {/* ── Right: Branch Details panel ──────────────── */}
        {selected && (
          <div className="w-full xl:w-[300px] bg-white rounded-2xl p-5 flex flex-col gap-4 shrink-0 border border-[#E4E8F0] shadow-sm">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Branch Details</h2>
            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex items-center gap-3">
              <Avatar name={selected.name} idx={selectedIdx} size="w-11 h-11 text-sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[13px] font-semibold truncate">{selected.name}</span>
                <span className="text-[#9EA5AD] text-[11px] truncate">{selected.address}</span>
              </div>
            </div>

            <p className="text-[#9EA5AD] text-[11px] text-center">
              ID: {selected.id}
            </p>

            {selected.bio && (
              <p className="text-[#676E76] text-[12px] leading-relaxed">{selected.bio}</p>
            )}

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex flex-col gap-2">
              <span className="text-[#24292E] text-[12px] font-semibold">Users</span>
              {selected.userCount === 0 ? (
                <span className="text-[#9EA5AD] text-[11px]">
                  {selected.isMain ? "You manage this branch directly — add a senior staff account if needed." : "No users assigned yet."}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {selected.firstUser && (
                    <div className="flex items-center gap-2">
                      <Avatar name={selected.firstUser.fullName} idx={selectedIdx} size="w-7 h-7 text-[11px]" />
                      <span className="text-[#24292E] text-[12px]">{selected.firstUser.fullName}</span>
                    </div>
                  )}
                  {selected.userCount > 1 && (
                    <span className="text-[#9EA5AD] text-[11px]">+{selected.userCount - 1} more</span>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[#24292E] text-[12px] font-semibold">Timing</span>
              <span className="text-[#676E76] text-[11px]">Today: {selected.status === "active" ? selected.todayHours : "—"}</span>
            </div>

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex items-center justify-between">
              <span className="text-[#24292E] text-[12px] font-semibold">Appointments Today</span>
              <span className="text-[#5476FC] text-[15px] font-semibold">{selected.status === "active" ? selected.consultationsToday : "—"}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#24292E] text-[12px] font-semibold">Patients</span>
                <span className="text-[#9EA5AD] text-[11px]">Last 8 Days</span>
              </div>
              <MiniTrendChart data={selected.patientsTrend ?? []} height={110} />
            </div>

            {selected.status === "active" ? (
              <button
                onClick={() => router.push(`/clinic/branches/${selected.id}`)}
                className="w-full mt-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                View Profile
              </button>
            ) : selected.status === "details_pending" ? (
              <button
                onClick={() => router.push(`/clinic/branches/${selected.id}/complete-setup`)}
                className="w-full mt-2 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Complete Setup
              </button>
            ) : (
              <p className="text-[11px] text-[#9EA5AD] text-center mt-2">
                {selected.status === "requested" && "Awaiting platform admin review."}
                {selected.status === "pending_approval" && "Details submitted — awaiting final approval."}
                {selected.status === "rejected" && "This branch request was rejected."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Branch Request modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[440px] rounded-2xl p-8 shadow-2xl flex flex-col gap-4">
            {addSuccess ? (
              <>
                <h2 className="text-[#111827] text-[18px] font-bold">Request Submitted</h2>
                <p className="text-[#676E76] text-[13px]">
                  Your new branch request has been sent to the platform admin for review. Once approved, you&apos;ll be prompted to fill in the branch&apos;s full profile and schedule before it goes live.
                </p>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-3 rounded-lg mt-2"
                >
                  Got it
                </button>
              </>
            ) : (
              <form onSubmit={handleAddRequest} className="flex flex-col gap-4">
                <h2 className="text-[#111827] text-[18px] font-bold">Add Branch Request</h2>
                <p className="text-[#676E76] text-[12px]">
                  Send the platform admin the core details for this branch. Once they approve the request, you&apos;ll be prompted to complete its full company profile and schedule.
                </p>
                {addError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{addError}</div>}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#24292E]">Branch Name</label>
                  <input required value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#24292E]">License Number</label>
                    <input value={addLicenseNumber} onChange={(e) => setAddLicenseNumber(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-[#24292E]">DOH License</label>
                    <input value={addDohLicense} onChange={(e) => setAddDohLicense(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#24292E]">Location / Address</label>
                  <input required value={addAddress} onChange={(e) => setAddAddress(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-[#24292E]">Phone</label>
                  <input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={addBusy} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md disabled:opacity-50">
                    {addBusy ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}