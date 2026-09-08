"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Lab {
  id: string;
  name: string;
  director: string;
  email: string;
  contactNumber: string;
  labLicense: string;
  location: string | null;
  status: "pending_approval" | "approved" | "rejected";
  affiliation: "owned" | "linked" | null;
  rejectedReason?: string | null;
}

interface PendingLinkRequest {
  name: string;
  email: string;
  linkRequest: { fromClinicId: string; fromClinicName: string; requestedAt: string };
}

interface BranchOption { id: string; name: string; status: string; isMain?: boolean; }

const STATUS_LABEL: Record<Lab["status"], string> = {
  pending_approval: "Pending Admin Approval",
  approved: "Active",
  rejected: "Rejected",
};
const STATUS_COLOR: Record<Lab["status"], string> = {
  pending_approval: "text-[#F59E0B]",
  approved: "text-[#1FAF65]",
  rejected: "text-[#D92D20]",
};

function ClinicLabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchIdParam = searchParams.get("branchId");

  // Branch dropdown (same pattern as the Schedules/Pharmacy pages) — only
  // ever populated for an org owner (GET /api/clinics/branches is owner-only;
  // a branch/senior-staff account just gets an empty list here and manages
  // their own branch's lab directly, no picker needed). A clinic with no real
  // sub-branches only ever has this one array entry (its own main branch), so
  // the dropdown stays hidden and the whole branchId concept never enters the
  // request — same single-lab behavior as before.
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    apiFetch("/api/clinics/branches")
      .then((r) => r.json())
      .then((data) => setBranches(Array.isArray(data.branches) ? data.branches.filter((b: BranchOption) => b.status === "active") : []))
      .catch(() => setBranches([]))
      .finally(() => setBranchesLoaded(true));
  }, []);

  const hasBranches = branches.length > 1;
  // Default to the main branch until the owner explicitly picks another one
  // from the dropdown — there's no "All branches" view for a lab since it's
  // inherently one-per-branch, unlike Schedules' aggregate option.
  const effectiveBranchId = hasBranches ? (branchIdParam ?? branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? null) : null;
  const activeBranchName = effectiveBranchId ? branches.find((b) => b.id === effectiveBranchId)?.name ?? "Branch" : null;
  const qs = effectiveBranchId ? `?branchId=${effectiveBranchId}` : "";

  const [loading, setLoading] = useState(true);
  const [lab, setLab] = useState<Lab | null>(null);
  const [pendingLinkRequest, setPendingLinkRequest] = useState<PendingLinkRequest | null>(null);

  const [mode, setMode] = useState<"none" | "create" | "link">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Create form
  const [labName, setLabName] = useState("");
  const [director, setDirector] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [labLicense, setLabLicense] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [location, setLocation] = useState("");

  // Link form
  const [linkEmail, setLinkEmail] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch(`/api/clinics/labs/me${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setLab(data.lab ?? null);
        setPendingLinkRequest(data.pendingLinkRequest ?? null);
      })
      .catch(() => { setLab(null); setPendingLinkRequest(null); })
      .finally(() => setLoading(false));
  };

  // Wait for the branch list to resolve first (for an org owner) so the
  // very first fetch already carries the right default branchId instead of
  // firing once unscoped and again once branches load.
  useEffect(() => {
    if (!branchesLoaded) return;
    setMode("none");
    setError("");
    load();
  }, [branchesLoaded, effectiveBranchId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/clinics/labs${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, director, name: labName, labLicense, location: location || null, contactNumber }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create lab.");
      }
      setMode("none");
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to create lab.");
    } finally {
      setBusy(false);
    }
  };

  const handleLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch(`/api/clinics/labs/link-request${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labEmail: linkEmail }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to send link request.");
      }
      setMode("none");
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to send link request.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/clinics/labs/link-request${qs}`, { method: "DELETE" });
      load();
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm(`Unlink this lab from ${activeBranchName ?? "this branch"}? Its doctors will fall back to the full cross-lab catalogue.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/clinics/labs/me${qs}`, { method: "DELETE" });
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 md:px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="max-w-[560px] flex flex-col gap-5">
        <h1 className="text-[#24292E] text-[26px] font-medium tracking-tight">Lab</h1>
        <p className="text-[#676E76] text-[13px] -mt-2">
          Affiliate one lab with {hasBranches ? "each branch" : "your clinic"}. Once linked, a branch's doctors'
          "Add/ Recommend Labs" search during consultations only shows that lab's own tests, and orders patients place
          afterward route straight to it.
        </p>

        {hasBranches && (
          <div className="relative self-start">
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
                      onClick={() => { router.push(`/clinic/lab?branchId=${b.id}`); setShowBranchDropdown(false); }}
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

        {loading ? (
          <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
        ) : lab ? (
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[#24292E] text-[15px] font-semibold">{lab.name}</span>
                <p className="text-[#9EA5AD] text-[11px] mt-0.5">{lab.director} · {lab.email}</p>
              </div>
              <span className={`text-[12px] font-medium ${STATUS_COLOR[lab.status]}`}>
                {STATUS_LABEL[lab.status]}
              </span>
            </div>
            <div className="h-px bg-[#EBEEF5]" />
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex flex-col">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">License</span>
                <span className="text-[#24292E] text-[12px]">{lab.labLicense}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Phone</span>
                <span className="text-[#24292E] text-[12px]">{lab.contactNumber}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Affiliation</span>
                <span className="text-[#24292E] text-[12px]">
                  {lab.affiliation === "owned" ? `Created by ${activeBranchName ?? "your clinic"}` : "Linked from an existing independent lab"}
                </span>
              </div>
            </div>
            {lab.status === "pending_approval" && (
              <p className="text-[11px] text-[#9EA5AD]">Awaiting platform admin review before it goes live.</p>
            )}
            {lab.status === "rejected" && (
              <p className="text-[11px] text-[#D92D20]">{lab.rejectedReason ?? "This lab's registration was rejected."}</p>
            )}
            <button
              onClick={handleUnlink}
              disabled={busy}
              className="self-start text-[12px] font-medium text-[#D92D20] hover:underline disabled:opacity-50"
            >
              Unlink lab
            </button>
          </div>
        ) : pendingLinkRequest ? (
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-[#24292E] text-[14px] font-semibold">Link request sent</span>
            <p className="text-[#676E76] text-[12px]">
              Waiting for <strong>{pendingLinkRequest.name}</strong> ({pendingLinkRequest.email}) to accept your invitation.
            </p>
            <button
              onClick={handleCancelRequest}
              disabled={busy}
              className="self-start text-[12px] font-medium text-[#D92D20] hover:underline disabled:opacity-50"
            >
              Cancel request
            </button>
          </div>
        ) : mode === "none" ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setMode("create"); setError(""); }}
              className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium px-5 py-3 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Create New Lab
            </button>
            <button
              onClick={() => { setMode("link"); setError(""); }}
              className="flex-1 border border-[#D6DEFF] text-[#5476FC] text-[13px] font-medium px-5 py-3 rounded-xl hover:bg-[#EEF2FF] transition-all"
            >
              Link Existing Lab
            </button>
          </div>
        ) : mode === "create" ? (
          <form onSubmit={handleCreate} className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Create New Lab{activeBranchName ? ` for ${activeBranchName}` : ""}</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Lab Name</label>
              <input required value={labName} onChange={(e) => setLabName(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Director Name</label>
              <input required value={director} onChange={(e) => setDirector(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#24292E]">Login Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#24292E]">Login Password</label>
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#24292E]">License Number</label>
                <input required value={labLicense} onChange={(e) => setLabLicense(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#24292E]">Phone</label>
                <input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Location / Address</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button type="button" onClick={() => setMode("none")} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md disabled:opacity-50">
                {busy ? "Creating..." : "Create Lab"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkRequest} className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Link Existing Lab{activeBranchName ? ` to ${activeBranchName}` : ""}</h2>
            <p className="text-[#676E76] text-[12px]">
              Enter the email address the lab uses to log into the pharmacy portal. They'll need to accept the
              invitation from their own dashboard before the link takes effect.
            </p>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Lab Email</label>
              <input required type="email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button type="button" onClick={() => setMode("none")} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md disabled:opacity-50">
                {busy ? "Sending..." : "Send Link Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ClinicLabPage() {
  return (
    <Suspense fallback={null}>
      <ClinicLabContent />
    </Suspense>
  );
}
