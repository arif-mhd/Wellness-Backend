"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useOrgCurrency } from "@/components/OrgCurrencyContext";
import { formatCurrency } from "@/lib/currency";

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

interface InsuranceRow {
  insurance: string;
  network: string;
  discounts: string;
  spcContractFileUrl?: string | null;
  verified?: boolean;
}

interface RateRow {
  category: string;
  price: string;
}

interface OtherInfoRow {
  label: string;
  value: string;
}

interface LicenseDetails {
  licenseNumber: string | null;
  secondaryLicense: string | null;
  clinicName: string | null;
  address: string | null;
  region: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  ownerNames?: string[];
  specialties?: string[];
  verificationUrl: string | null;
}

interface LicenseCheck {
  level: "error" | "warning" | "ok";
  code: string;
  message: string;
}

/** Licence fields shared by the clinic itself and each of its branches. */
interface LicenseRecord {
  licenseNumber?: string | null;
  dohLicense?: string | null;
  licenseFileUrl?: string | null;
  licenseDetails?: LicenseDetails | null;
  licenseChecks?: LicenseCheck[];
  licenseVerified?: boolean;
  licenseVerifiedAt?: string | null;
  licenseVerificationNote?: string | null;
}

interface BranchRow extends LicenseRecord {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: "requested" | "details_pending" | "pending_approval" | "active" | "rejected";
  addressProofFileUrl?: string | null;
  consultationRates?: RateRow[];
  paymentSettings?: string | null;
  bio?: string | null;
  clinicImageUrl?: string | null;
}

interface Clinic extends LicenseRecord {
  // Which white-label organization this record belongs to. The admin API
  // already returns it (SELECT *); it drives which currency prices render in.
  tenantId?: string | null;
  id: string;
  clinicName?: string | null;
  fullName: string;
  email: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  emiratesIdOrPassport: string | null;
  positionInClinic: string | null;
  languages: string | null;
  otherInfo?: OtherInfoRow[];
  insurances?: InsuranceRow[];
  address: string | null;
  addressProofFileUrl?: string | null;
  consultationRates?: RateRow[];
  paymentSettings: string | null;
  bio: string | null;
  clinicImageUrl?: string | null;
  status: string;
  registeredAt: string;
  approvedAt: string | null;
  rejectedReason?: string | null;
  isMultiBranchOrg?: boolean;
  branches?: BranchRow[];
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className="text-[11px] text-slate-400 font-medium">{label}</span>
    <span className="text-[11px] text-slate-800 font-medium">{value ?? "—"}</span>
  </div>
);

const CHECK_STYLE: Record<LicenseCheck["level"], string> = {
  error:   "bg-red-50 border-red-100 text-red-600",
  warning: "bg-amber-50 border-amber-100 text-amber-700",
  ok:      "bg-emerald-50 border-emerald-100 text-emerald-700",
};

/** Licence review: the uploaded document, what was read from it, automatic
 *  checks, and the admin's verify / unverify action. */
function LicensePanel({
  clinicId, branchId, record, onChange,
}: {
  clinicId: string;
  branchId?: string;
  record: LicenseRecord;
  onChange: (fields: Partial<LicenseRecord>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const d = record.licenseDetails;
  const checks = record.licenseChecks ?? [];
  const hasError = checks.some((c) => c.level === "error");

  const setVerified = async (verified: boolean) => {
    if (verified && !confirm("Confirm you've checked this licence against the issuing authority's register (e.g. the TAMM licence lookup) and it is valid.")) return;
    setSaving(true); setErr("");
    try {
      const res = await adminFetch(`/api/admin/clinics/${clinicId}/license-verification`, {
        method: "PATCH",
        body: JSON.stringify({ verified, branchId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body.error ?? `Error ${res.status}`); return; }
      onChange({ licenseVerified: body.licenseVerified, licenseVerifiedAt: body.licenseVerifiedAt });
    } catch {
      setErr("Could not reach the backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-700">Licence verification</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${record.licenseVerified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            {record.licenseVerified ? "Verified" : "Not verified"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {record.licenseFileUrl && (
            <a href={record.licenseFileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#6A8BFF] font-medium hover:underline">View licence</a>
          )}
          {d?.verificationUrl && (
            <a href={d.verificationUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#6A8BFF] font-medium hover:underline">Check with issuer</a>
          )}
          {record.licenseVerified ? (
            <button onClick={() => setVerified(false)} disabled={saving} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50">
              {saving ? "Saving…" : "Unverify"}
            </button>
          ) : (
            <button onClick={() => setVerified(true)} disabled={saving || hasError || (!record.licenseNumber && !record.dohLicense)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#6A8BFF] text-white hover:bg-[#5476FC] disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Saving…" : "Mark verified"}
            </button>
          )}
        </div>
      </div>

      {err && <div className="text-[11px] text-red-600">{err}</div>}

      {checks.length > 0 && (
        <div className="space-y-1.5">
          {checks.map((c, i) => (
            <div key={i} className={`text-[11px] px-3 py-1.5 rounded-lg border ${CHECK_STYLE[c.level]}`}>{c.message}</div>
          ))}
        </div>
      )}

      {d ? (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Read from the uploaded licence</span>
          <DetailRow label="Licence No." value={[d.licenseNumber, d.secondaryLicense].filter((v, i, a) => v && a.indexOf(v) === i).join(" / ") || null} />
          <DetailRow label="Facility" value={d.clinicName} />
          <DetailRow label="Owners" value={d.ownerNames?.length ? d.ownerNames.join(", ") : null} />
          <DetailRow label="Issued by" value={d.issuingAuthority} />
          <DetailRow label="Region" value={d.region} />
          <DetailRow label="Issued" value={d.issueDate} />
          <DetailRow label="Expires" value={d.expiryDate} />
          {d.specialties && d.specialties.length > 0 && (
            <DetailRow label="Specialties" value={d.specialties.join(", ")} />
          )}
        </div>
      ) : !record.licenseFileUrl ? null : (
        <div className="text-[11px] text-slate-400">No details could be read from the document. Check it by hand.</div>
      )}

      {record.licenseVerified && record.licenseVerifiedAt && (
        <div className="text-[10px] text-slate-400">
          Verified {new Date(record.licenseVerifiedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

function ClinicDetailInner({ id }: { id: string }) {
  const { identityFieldsForOrg } = useOrgCurrency();
  const { currencyForOrg } = useOrgCurrency();
  const router = useRouter();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch(`/api/admin/clinics/${id}`);
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setError(b.error ?? `Error ${res.status}`);
          return;
        }
        const data = await res.json();
        setClinic(data.clinic);
      } catch {
        setError("Could not reach the backend.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading clinic…</div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error || "Clinic not found."}</div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-7 pb-12 font-sans px-1 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/clinics")}
          className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight">{clinic.clinicName || clinic.fullName}</h1>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${
          clinic.status === "approved" ? "bg-emerald-50 text-emerald-600" : clinic.status === "rejected" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
        }`}>
          {clinic.status.replace("_", " ")}
        </span>
      </div>

      {clinic.rejectedReason && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          Rejected: {clinic.rejectedReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4">
          <h2 className="text-[15px] font-medium text-slate-800 mb-2">Owner &amp; Contact</h2>
          <DetailRow label="Owner Name" value={clinic.fullName} />
          <DetailRow label="Email" value={clinic.email} />
          <DetailRow label="Phone" value={clinic.phone} />
          <DetailRow label="Position in Clinic" value={clinic.positionInClinic} />
          <DetailRow label="Gender" value={clinic.gender} />
          <DetailRow label="Date of Birth" value={clinic.dateOfBirth} />
          <DetailRow label={identityFieldsForOrg((clinic as any)?.tenantId, "clinic")[0]?.label ?? "ID"} value={clinic.emiratesIdOrPassport} />
          <DetailRow label="Languages" value={clinic.languages} />
          {clinic.otherInfo?.filter(o => o.label || o.value).map((o, i) => (
            <DetailRow key={i} label={o.label || "Other"} value={o.value} />
          ))}
        </div>

        <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4">
          <h2 className="text-[15px] font-medium text-slate-800 mb-2">Clinic / Company</h2>
          <DetailRow label="License Number" value={clinic.licenseNumber} />
          <DetailRow label={identityFieldsForOrg((clinic as any)?.tenantId, "clinic")[1]?.label ?? "License"} value={clinic.dohLicense} />
          <DetailRow label="Address" value={clinic.address} />
          <DetailRow label="Payment Settings" value={clinic.paymentSettings} />
          {clinic.addressProofFileUrl && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Address Proof</span>
              <a href={clinic.addressProofFileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#6A8BFF] font-medium hover:underline">View file</a>
            </div>
          )}
          {clinic.bio && (
            <div>
              <span className="text-[11px] text-slate-400 font-medium block mb-1">Bio</span>
              <p className="text-[12px] text-slate-700 leading-relaxed">{clinic.bio}</p>
            </div>
          )}
          <LicensePanel
            clinicId={clinic.id}
            record={clinic}
            onChange={(fields) => setClinic((c) => (c ? { ...c, ...fields } : c))}
          />
        </div>

        {clinic.consultationRates && clinic.consultationRates.length > 0 && (
          <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-3">
            <h2 className="text-[15px] font-medium text-slate-800 mb-2">Consultation Rates</h2>
            {clinic.consultationRates.map((r, i) => (
              <DetailRow key={i} label={r.category} value={formatCurrency(r.price, currencyForOrg(clinic?.tenantId))} />
            ))}
          </div>
        )}

        {clinic.insurances && clinic.insurances.length > 0 && (
          <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4">
            <h2 className="text-[15px] font-medium text-slate-800 mb-2">Insurances</h2>
            {clinic.insurances.map((row, i) => (
              <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0 space-y-1.5">
                <DetailRow label="Insurance" value={row.insurance} />
                <DetailRow label="Network" value={row.network} />
                <DetailRow label="Discounts" value={row.discounts} />
              </div>
            ))}
          </div>
        )}

        {clinic.isMultiBranchOrg && clinic.branches && clinic.branches.length > 0 && (
          <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4 lg:col-span-2">
            <h2 className="text-[15px] font-medium text-slate-800 mb-2">Branches</h2>
            {clinic.branches.map((b) => (
              <div key={b.id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0 space-y-1.5">
                {b.clinicImageUrl && (
                  <img src={b.clinicImageUrl} alt={b.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 mb-2" />
                )}
                <DetailRow label="Name" value={b.name} />
                <DetailRow label="Address" value={b.address} />
                <DetailRow label="Phone" value={b.phone} />
                <DetailRow label="License Number" value={b.licenseNumber} />
                <DetailRow label={identityFieldsForOrg((clinic as any)?.tenantId, "clinic")[1]?.label ?? "License"} value={b.dohLicense} />
                <DetailRow label="Payment Settings" value={b.paymentSettings} />
                <DetailRow label="Status" value={
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    b.status === "active" ? "bg-emerald-50 text-emerald-600" : b.status === "rejected" ? "bg-red-50 text-red-500" : b.status === "details_pending" ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-600"
                  }`}>
                    {{
                      active: "Active",
                      requested: "Request Awaiting Review",
                      details_pending: "Awaiting Clinic's Details",
                      pending_approval: "Pending Final Approval",
                      rejected: "Rejected",
                    }[b.status]}
                  </span>
                } />
                {b.addressProofFileUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Address Proof</span>
                    <a href={b.addressProofFileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#6A8BFF] font-medium hover:underline">View file</a>
                  </div>
                )}
                <LicensePanel
                  clinicId={clinic.id}
                  branchId={b.id}
                  record={b}
                  onChange={(fields) => setClinic((c) => (c ? {
                    ...c,
                    branches: c.branches?.map((x) => (x.id === b.id ? { ...x, ...fields } : x)),
                  } : c))}
                />
                {b.consultationRates && b.consultationRates.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium block">Consultation Rates</span>
                    {b.consultationRates.map((r, i) => (
                      <DetailRow key={i} label={r.category} value={formatCurrency(r.price, currencyForOrg(clinic?.tenantId))} />
                    ))}
                  </div>
                )}
                {b.bio && (
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 font-medium block mb-1">Bio</span>
                    <p className="text-[12px] text-slate-700 leading-relaxed">{b.bio}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4 lg:col-span-2">
          <h2 className="text-[15px] font-medium text-slate-800 mb-2">Timeline</h2>
          <DetailRow label="Registered" value={clinic.registeredAt ? new Date(clinic.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null} />
          <DetailRow label="Approved" value={clinic.approvedAt ? new Date(clinic.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null} />
        </div>
      </div>
    </div>
  );
}

export default function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
        <ClinicDetailInner id={id} />
    </ProtectedRoute>
  );
}
