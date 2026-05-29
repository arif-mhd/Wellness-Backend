"use client";

import { useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  emiratesId?: string;
  bloodGroup?: string;
  avatarUrl?: string;
  status: string;
  createdAt: string;
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function ManagePatientsPage() {
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function fetchPatients() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminFetch(`${API}/api/admin/patients`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFetchError(
          res.status === 403
            ? "Access denied — make sure your account has the 'admin' role."
            : `Failed to load patients (${res.status}): ${body.error ?? "unknown error"}`
        );
        return;
      }
      setPatients(body.patients ?? []);
    } catch (err: any) {
      setFetchError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPatients(); }, []);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50/40 font-outfit">

      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[1.65rem] font-normal tracking-tight text-slate-800 font-marcellus">
            Manage Patients
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            All registered patients in the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full border border-blue-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="9" r="4" strokeWidth={1.75} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchPatients}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition shadow-sm"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {fetchError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={1.75} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4m0 4h.01" />
          </svg>
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !fetchError && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading patients…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !fetchError && patients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
            <svg className="w-9 h-9 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <circle cx="9" cy="9" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M18 4v8M15 7h6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-600 font-marcellus mb-2">No patients yet</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            Patients will appear here once they complete registration in the patient app.
          </p>
        </div>
      )}

      {/* ── Patients Table ── */}
      {!loading && !fetchError && patients.length > 0 && (
        <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Demographics</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Emirates ID</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient, idx) => (
                <tr
                  key={patient.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx === patients.length - 1 ? "border-b-0" : ""}`}
                >
                  {/* Patient name + avatar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {patient.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={patient.avatarUrl}
                          alt={patient.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {(patient.fullName ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{patient.fullName ?? "—"}</p>
                        <p className="text-xs text-slate-400 font-mono">{patient.id.slice(0, 12)}…</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{patient.email}</p>
                    <p className="text-xs text-slate-400">{patient.phone || "—"}</p>
                  </td>

                  {/* Demographics */}
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{patient.gender || "—"}</p>
                    <p className="text-xs text-slate-400">{patient.dateOfBirth || "—"}</p>
                  </td>

                  {/* Emirates ID */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-600 text-xs">
                      {patient.emiratesId || "—"}
                    </span>
                  </td>

                  {/* Registered date */}
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(patient.createdAt)}
                  </td>

                  {/* Status badge */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
