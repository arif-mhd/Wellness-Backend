"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface Pharmacy {
  id: string;
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  location: string | null;
  status: "pending_approval" | "approved" | "rejected";
  affiliation: "owned" | "linked" | null;
  rejectedReason?: string | null;
}

interface PendingLinkRequest {
  pharmacyName: string;
  email: string;
  linkRequest: { fromOrgId: string; fromOrgName: string; requestedAt: string };
}

const STATUS_LABEL: Record<Pharmacy["status"], string> = {
  pending_approval: "Pending Admin Approval",
  approved: "Active",
  rejected: "Rejected",
};
const STATUS_COLOR: Record<Pharmacy["status"], string> = {
  pending_approval: "text-[#F59E0B]",
  approved: "text-[#1FAF65]",
  rejected: "text-[#D92D20]",
};

export default function ClinicPharmacyPage() {
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [pendingLinkRequest, setPendingLinkRequest] = useState<PendingLinkRequest | null>(null);

  const [mode, setMode] = useState<"none" | "create" | "link">("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Create form
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Link form
  const [linkEmail, setLinkEmail] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch("/api/clinics/pharmacies/me")
      .then((r) => r.json())
      .then((data) => {
        setPharmacy(data.pharmacy ?? null);
        setPendingLinkRequest(data.pendingLinkRequest ?? null);
      })
      .catch(() => { setPharmacy(null); setPendingLinkRequest(null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/clinics/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ownerName, pharmacyName, licenseNumber, phone, location: location || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create pharmacy.");
      }
      setMode("none");
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to create pharmacy.");
    } finally {
      setBusy(false);
    }
  };

  const handleLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/clinics/pharmacies/link-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyEmail: linkEmail }),
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
      await apiFetch("/api/clinics/pharmacies/link-request", { method: "DELETE" });
      load();
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Unlink this pharmacy from your clinic? Your doctors will fall back to the full cross-pharmacy catalogue.")) return;
    setBusy(true);
    try {
      await apiFetch("/api/clinics/pharmacies/me", { method: "DELETE" });
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 md:px-6 py-6 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="max-w-[560px] flex flex-col gap-5">
        <h1 className="text-[#24292E] text-[26px] font-medium tracking-tight">Pharmacy</h1>
        <p className="text-[#676E76] text-[13px] -mt-2">
          Affiliate one pharmacy with your clinic. Once linked, your doctors' "Add Medicines" search during
          consultations only shows that pharmacy's own stock, and orders patients place afterward route straight to it.
        </p>

        {loading ? (
          <div className="text-center text-sm text-[#A0A8B0] py-12">Loading...</div>
        ) : pharmacy ? (
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[#24292E] text-[15px] font-semibold">{pharmacy.pharmacyName}</span>
                <p className="text-[#9EA5AD] text-[11px] mt-0.5">{pharmacy.ownerName} · {pharmacy.email}</p>
              </div>
              <span className={`text-[12px] font-medium ${STATUS_COLOR[pharmacy.status]}`}>
                {STATUS_LABEL[pharmacy.status]}
              </span>
            </div>
            <div className="h-px bg-[#EBEEF5]" />
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex flex-col">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">License</span>
                <span className="text-[#24292E] text-[12px]">{pharmacy.licenseNumber}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Phone</span>
                <span className="text-[#24292E] text-[12px]">{pharmacy.phone}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-[#9EA5AD] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Affiliation</span>
                <span className="text-[#24292E] text-[12px]">
                  {pharmacy.affiliation === "owned" ? "Created by your clinic" : "Linked from an existing independent pharmacy"}
                </span>
              </div>
            </div>
            {pharmacy.status === "pending_approval" && (
              <p className="text-[11px] text-[#9EA5AD]">Awaiting platform admin review before it goes live.</p>
            )}
            {pharmacy.status === "rejected" && (
              <p className="text-[11px] text-[#D92D20]">{pharmacy.rejectedReason ?? "This pharmacy's registration was rejected."}</p>
            )}
            <button
              onClick={handleUnlink}
              disabled={busy}
              className="self-start text-[12px] font-medium text-[#D92D20] hover:underline disabled:opacity-50"
            >
              Unlink pharmacy
            </button>
          </div>
        ) : pendingLinkRequest ? (
          <div className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-[#24292E] text-[14px] font-semibold">Link request sent</span>
            <p className="text-[#676E76] text-[12px]">
              Waiting for <strong>{pendingLinkRequest.pharmacyName}</strong> ({pendingLinkRequest.email}) to accept your invitation.
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
              Create New Pharmacy
            </button>
            <button
              onClick={() => { setMode("link"); setError(""); }}
              className="flex-1 border border-[#D6DEFF] text-[#5476FC] text-[13px] font-medium px-5 py-3 rounded-xl hover:bg-[#EEF2FF] transition-all"
            >
              Link Existing Pharmacy
            </button>
          </div>
        ) : mode === "create" ? (
          <form onSubmit={handleCreate} className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Create New Pharmacy</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Pharmacy Name</label>
              <input required value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Owner Name</label>
              <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
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
                <input required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-[#24292E]">Phone</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
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
                {busy ? "Creating..." : "Create Pharmacy"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkRequest} className="bg-white border border-[#E4E8F0] rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-[#24292E] text-[15px] font-semibold">Link Existing Pharmacy</h2>
            <p className="text-[#676E76] text-[12px]">
              Enter the email address the pharmacy uses to log into the pharmacy portal. They'll need to accept the
              invitation from their own dashboard before the link takes effect.
            </p>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-[#24292E]">Pharmacy Email</label>
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
