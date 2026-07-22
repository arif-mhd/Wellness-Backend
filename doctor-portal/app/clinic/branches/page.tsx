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
    <div className="px-8 pb-12 select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex items-center justify-between gap-4 mb-6 mt-2">
        <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">Your Branches</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60 h-9 pl-4 pr-9 rounded-full border border-[#D6DEFF] bg-white text-sm outline-none focus:border-[#5476FC] text-[#24292E]"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: branches table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 flex flex-col gap-1">
          {loading ? (
            <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center text-sm text-[#A0A8B0] py-12">No branches yet — request one to get started.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div style={{ minWidth: "720px" }}>
                {/* Header */}
                <div className="flex items-center px-3 py-2 text-[10px] font-medium text-[#676E76] border-b border-[#EBEEF5] uppercase tracking-wide">
                  <div className="w-[210px] shrink-0">Name</div>
                  <div className="flex-1 min-w-[130px]">Location</div>
                  <div className="w-[120px] shrink-0">Manager/User</div>
                  <div className="w-[130px] shrink-0">Time</div>
                  <div className="w-[90px] shrink-0">Status</div>
                  <div className="w-[70px] shrink-0 text-center">No. of Appts</div>
                  <div className="w-[110px] shrink-0" />
                </div>

                <div className="flex flex-col gap-2 mt-3">
                  {filteredBranches.map((b) => {
                    const idx = branches.findIndex((x) => x.id === b.id);
                    const isSelected = selectedId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        className={`flex items-center px-3 py-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"
                        }`}
                      >
                        <div className="w-[210px] shrink-0 flex items-center gap-3 pr-2">
                          <Avatar name={b.name} idx={idx} />
                          <span className="text-[#24292E] text-[13px] font-medium truncate">{b.name}</span>
                        </div>
                        <div className="flex-1 min-w-[130px] pr-2">
                          <span className="text-[#676E76] text-[12px] truncate block">{b.address}</span>
                        </div>
                        <div className="w-[120px] shrink-0 pr-2">
                          <span className="text-[#24292E] text-[12px] truncate block">{b.firstUser?.fullName ?? "Unassigned"}</span>
                        </div>
                        <div className="w-[130px] shrink-0 pr-2">
                          <span className="text-[#5476FC] text-[12px] font-medium truncate block">{b.status === "active" ? b.todayHours : "—"}</span>
                        </div>
                        <div className="w-[90px] shrink-0">
                          <span className={`text-[12px] font-medium ${STATUS_COLOR[b.status]}`}>
                            {b.status === "active" ? (b.isOnline !== false ? "Online" : "Offline") : STATUS_LABEL[b.status]}
                          </span>
                        </div>
                        <div className="w-[70px] shrink-0 text-center text-[#24292E] text-[13px] font-medium">
                          {b.status === "active" ? b.consultationsToday : "—"}
                        </div>
                        <div className="w-[110px] shrink-0 flex justify-end">
                          {b.status === "active" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); goToDash(b); }}
                              className="h-[30px] px-3 rounded-lg font-medium text-[11px] bg-[#1E293B] text-white hover:bg-[#0f172a] transition-colors whitespace-nowrap"
                            >
                              {b.userCount > 0 ? "View Dash" : "Add Account"}
                            </button>
                          )}
                          {b.status === "details_pending" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/clinic/branches/${b.id}/complete-setup`); }}
                              className="h-[30px] px-3 rounded-lg font-medium text-[11px] bg-[#5476FC] text-white hover:bg-[#3B59E3] transition-colors whitespace-nowrap"
                            >
                              Complete Setup
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => { setShowAddModal(true); setAddSuccess(false); setAddError(""); }}
            className="self-start mt-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Add Branch Request
          </button>
        </div>

        {/* Right: Branch Details panel */}
        {selected && (
          <div className="bg-white rounded-xl p-6 border border-[#E4E8F0] shadow-sm flex flex-col gap-5">
            <h2 className="text-[#24292E] text-[15px] font-bold">Branch Details</h2>

            <div className="flex items-center gap-3">
              <Avatar name={selected.name} idx={selectedIdx} size="w-14 h-14" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#24292E] text-[15px] font-semibold truncate">{selected.name}</span>
                <span className="text-[#A0A8B0] text-[12px] truncate">{selected.address}</span>
                <span className="text-[#A0A8B0] text-[11px]">ID: {selected.id}</span>
              </div>
            </div>

            {selected.bio && (
              <p className="text-[#676E76] text-[12px] leading-relaxed">{selected.bio}</p>
            )}

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex flex-col gap-2">
              <span className="text-[#676E76] text-[12px] font-semibold">Users</span>
              {selected.userCount === 0 ? (
                <span className="text-[#A0A8B0] text-[12px]">No users assigned yet.</span>
              ) : (
                <div className="flex items-center gap-2">
                  {selected.firstUser && (
                    <div className="flex items-center gap-2">
                      <Avatar name={selected.firstUser.fullName} idx={selectedIdx} size="w-7 h-7" />
                      <span className="text-[#24292E] text-[12px]">{selected.firstUser.fullName}</span>
                    </div>
                  )}
                  {selected.userCount > 1 && (
                    <span className="text-[#A0A8B0] text-[11px]">+{selected.userCount - 1} more</span>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[#676E76] text-[12px] font-semibold">Timing</span>
              <span className="text-[#24292E] text-[12px]">Today: {selected.status === "active" ? selected.todayHours : "—"}</span>
            </div>

            <div className="h-px bg-[#EBEEF5]" />

            <div className="flex items-center justify-between">
              <span className="text-[#676E76] text-[12px] font-semibold">Appointments Today</span>
              <span className="text-[#5476FC] text-[16px] font-semibold">{selected.status === "active" ? selected.consultationsToday : "—"}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#24292E] text-[13px] font-semibold">Patients</span>
                <span className="text-[#707070] text-[11px]">Last 8 Days</span>
              </div>
              <MiniTrendChart data={selected.patientsTrend ?? []} height={110} />
            </div>

            {selected.status === "active" ? (
              <button
                onClick={() => router.push(`/clinic/branches/${selected.id}`)}
                className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                View Profile
              </button>
            ) : selected.status === "details_pending" ? (
              <button
                onClick={() => router.push(`/clinic/branches/${selected.id}/complete-setup`)}
                className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                Complete Setup
              </button>
            ) : (
              <p className="text-[12px] text-[#A0A8B0] text-center py-1">
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
