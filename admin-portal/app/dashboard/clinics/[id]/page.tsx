"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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

interface BranchRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: "requested" | "details_pending" | "pending_approval" | "active" | "rejected";
  licenseNumber?: string | null;
  dohLicense?: string | null;
  addressProofFileUrl?: string | null;
  consultationRates?: RateRow[];
  paymentSettings?: string | null;
  bio?: string | null;
  clinicImageUrl?: string | null;
}

interface Clinic {
  id: string;
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
  licenseNumber: string | null;
  dohLicense: string | null;
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

function ClinicDetailInner({ id }: { id: string }) {
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
        <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight">{clinic.fullName}</h1>
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
          <DetailRow label="Email" value={clinic.email} />
          <DetailRow label="Phone" value={clinic.phone} />
          <DetailRow label="Position in Clinic" value={clinic.positionInClinic} />
          <DetailRow label="Gender" value={clinic.gender} />
          <DetailRow label="Date of Birth" value={clinic.dateOfBirth} />
          <DetailRow label="Emirates ID / Passport" value={clinic.emiratesIdOrPassport} />
          <DetailRow label="Languages" value={clinic.languages} />
          {clinic.otherInfo?.filter(o => o.label || o.value).map((o, i) => (
            <DetailRow key={i} label={o.label || "Other"} value={o.value} />
          ))}
        </div>

        <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-4">
          <h2 className="text-[15px] font-medium text-slate-800 mb-2">Clinic / Company</h2>
          <DetailRow label="License Number" value={clinic.licenseNumber} />
          <DetailRow label="DOH License" value={clinic.dohLicense} />
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
        </div>

        {clinic.consultationRates && clinic.consultationRates.length > 0 && (
          <div className="bg-white rounded-[1.75rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 space-y-3">
            <h2 className="text-[15px] font-medium text-slate-800 mb-2">Consultation Rates</h2>
            {clinic.consultationRates.map((r, i) => (
              <DetailRow key={i} label={r.category} value={`AED ${r.price}`} />
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
                <DetailRow label="DOH License" value={b.dohLicense} />
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
                {b.consultationRates && b.consultationRates.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium block">Consultation Rates</span>
                    {b.consultationRates.map((r, i) => (
                      <DetailRow key={i} label={r.category} value={`AED ${r.price}`} />
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
