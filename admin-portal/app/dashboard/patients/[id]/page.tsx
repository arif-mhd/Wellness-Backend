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
  address?: string;
  postalCode?: string;
  height?: string;
  weight?: string;
  bio?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  allergies?: string[];
  medications?: { name: string; dosage?: string; notes?: string }[];
  chronicDiseases?: string[];
}

interface EmrMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
  instructions?: string;
}

interface EmrLab {
  name: string;
  notes?: string;
}

interface EmrVisitInfo {
  visitType?: string;
  accompaniedBy?: string;
  sourceOfHistory?: string;
  referralSource?: string;
  historyLimitation?: string;
}

interface EmrAddendum {
  text: string;
  doctorName: string;
  createdAt: string;
}

interface EmrSections {
  reasonForVisit?: string;
  historyOfPresentIllness?: string;
  reviewSystem?: string;
  healthStatus?: string;
  histories?: string;
  physicalExamination?: string;
  medicalDecisionMaking?: string;
  procedure?: string;
  impressionAndPlan?: string;
  professionalServices?: string;
  // Legacy SOAP fields — kept for read-only display of older appointments
  // saved before this format change; never written by the current UI.
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface VisitHistoryEntry {
  appointmentId: string;
  scheduledAt: string;
  status: string;
  reason: string;
  doctorId: string;
  doctorName: string;
  emr: {
    sections?: EmrSections;
    medicines?: EmrMedicine[];
    labs?: EmrLab[];
    visitInfo?: EmrVisitInfo | null;
    addenda?: EmrAddendum[];
  } | null;
  profileId?: string;
  profileName?: string;
  profileRelationship?: string;
}

type Tab = "about" | "consultations" | "diagnostics" | "surgeries" | "medications" | "vaccinations" | "allergies";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return `${Math.floor((Date.now() - d.getTime()) / 31557600000)} y/o`;
}

// Hides the row entirely when there's no value — used in the consultation
// detail panel where blank fields shouldn't show as "—" clutter.
const EmrField = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <strong className="text-slate-800 font-semibold">{label}:</strong> {value}
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  valueClass = "text-slate-800 font-medium",
  labelClass = "text-slate-400 font-medium",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  labelClass?: string;
}) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value ?? "—"}</span>
  </div>
);

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [visitHistory, setVisitHistory] = useState<VisitHistoryEntry[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function fetchPatient() {
      setLoading(true);
      setError("");
      try {
        const res = await adminFetch(`/api/admin/patients/${id}`);
        if (res.ok) {
          const d = await res.json();
          setPatient(d.patient);
        } else {
          setError("Patient not found.");
        }
      } catch {
        setError("Failed to load patient data.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, [id]);

  useEffect(() => {
    async function fetchEhr() {
      setVisitsLoading(true);
      try {
        const res = await adminFetch(`/api/admin/patients/${id}/ehr`);
        if (res.ok) {
          const d = await res.json();
          const visits: VisitHistoryEntry[] = d.visitHistory ?? [];
          setVisitHistory(visits);
          setSelectedVisitId(visits[0]?.appointmentId ?? null);
        }
      } catch {
        // leave visitHistory empty — UI shows "no consultations" state
      } finally {
        setVisitsLoading(false);
      }
    }
    fetchEhr();
  }, [id]);

  const selectedVisit = visitHistory.find((v) => v.appointmentId === selectedVisitId) ?? null;

  const isDeactivated = patient?.status === "deactivated";

  async function handleToggleStatus() {
    if (!patient) return;
    const nextStatus = isDeactivated ? "active" : "deactivated";
    const confirmMsg = isDeactivated
      ? `Reactivate ${patient.fullName}'s account? They will be able to log in again.`
      : `Deactivate ${patient.fullName}'s account? They will be unable to log in until reactivated.`;
    if (!window.confirm(confirmMsg)) return;

    setStatusUpdating(true);
    try {
      const res = await adminFetch(`/api/admin/patients/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const d = await res.json();
        setPatient(d.patient);
      } else {
        window.alert("Failed to update patient status.");
      }
    } catch {
      window.alert("Failed to update patient status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) return (
    <ProtectedRoute>
      <div className="w-full flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6A8BFF]" />
      </div>
    </ProtectedRoute>
  );

  if (error || !patient) return (
    <ProtectedRoute>
      <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-red-500 font-semibold text-sm">{error || "Patient not found."}</p>
        <button onClick={() => router.push("/dashboard/patients")} className="text-[#6A8BFF] text-sm font-medium hover:underline">
          Back to Patients
        </button>
      </div>
    </ProtectedRoute>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "about", label: "About" },
    { key: "consultations", label: "Consultations" },
    { key: "diagnostics", label: "Diagnostics" },
    { key: "surgeries", label: "Surgeries" },
    { key: "medications", label: "Medications" },
    { key: "vaccinations", label: "Vaccinations" },
    { key: "allergies", label: "Allergies" },
  ];

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans animate-in fade-in duration-300">

        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/patients")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight">Patient Profile</h1>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              {patient.avatarUrl ? (
                <img src={patient.avatarUrl} alt={patient.fullName} className="w-[84px] h-[84px] rounded-full object-cover border-[3px] border-slate-50 shadow-sm shrink-0" />
              ) : (
                <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium text-3xl shrink-0 border-[3px] border-slate-50 shadow-sm">
                  {patient.fullName[0].toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-[19px] font-medium text-slate-800 tracking-tight flex items-center gap-2">
                  {patient.fullName}
                  {age(patient.dateOfBirth) && (
                    <span className="text-[15px] font-semibold text-slate-400 ml-2">{age(patient.dateOfBirth)}</span>
                  )}
                  {isDeactivated && (
                    <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[11px] font-semibold">
                      Deactivated
                    </span>
                  )}
                </h2>
                <p className="text-[12px] font-medium text-slate-500 mt-1">{patient.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleToggleStatus}
                disabled={statusUpdating}
                className={`px-7 py-3 rounded-[1rem] text-[12px] font-medium transition active:scale-95 disabled:opacity-50 ${
                  isDeactivated
                    ? "bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF]"
                    : "bg-red-50 hover:bg-red-100 text-red-600"
                }`}
              >
                {statusUpdating ? "Updating…" : isDeactivated ? "Activate Patient Profile" : "Deactivate Patient Profile"}
              </button>
            </div>
          </div>

          {patient.bio && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[12px] text-slate-600 font-medium leading-[1.8]">{patient.bio}</p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-7 py-3 rounded-full text-[13px] font-medium transition-all shadow-sm ${
                activeTab === key
                  ? "bg-[#1E293B] text-white"
                  : "bg-white text-slate-500 border border-slate-100 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">

          {/* ABOUT */}
          {activeTab === "about" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Personal Details */}
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                <h3 className="text-[14px] font-medium text-slate-800 mb-6">Personal Details</h3>
                <div className="space-y-4 max-w-sm">
                  {patient.emiratesId && (
                    <DetailRow
                      label="Emirates ID"
                      value={
                        <div className="flex items-center gap-1.5">
                          {patient.emiratesId}
                          <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      }
                    />
                  )}
                  <DetailRow label="Contact Number" value={patient.phone} />
                  <DetailRow
                    label="Email ID"
                    value={<a href={`mailto:${patient.email}`} className="text-[#6A8BFF] hover:underline">{patient.email}</a>}
                    valueClass="font-medium"
                  />
                  <DetailRow label="Gender" value={patient.gender} />
                  {patient.bloodGroup && <DetailRow label="Blood Group" value={patient.bloodGroup} />}
                </div>
              </div>

              {/* Other Details */}
              <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                <h3 className="text-[14px] font-medium text-slate-800 mb-6">Other Details</h3>
                <div className="space-y-4 max-w-sm">
                  <DetailRow label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                  {patient.height && <DetailRow label="Height (cm)" value={patient.height} />}
                  {patient.weight && <DetailRow label="Weight (kg)" value={patient.weight} />}
                  {patient.address && <DetailRow label="Address" value={patient.address} />}
                  {patient.postalCode && <DetailRow label="Postal Code" value={patient.postalCode} />}
                  <DetailRow label="Registered" value={formatDate(patient.createdAt)} />
                </div>
              </div>
            </div>
          )}

          {/* CONSULTATIONS */}
          {activeTab === "consultations" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* List */}
              <div className="xl:col-span-4 bg-white rounded-[2rem] p-5 shadow-sm border border-slate-50 self-start">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-[12px] font-medium text-slate-800">Recent</span>
                </div>
                {visitsLoading ? (
                  <p className="text-[12px] font-medium text-slate-400 px-2 py-4">Loading consultations…</p>
                ) : visitHistory.length === 0 ? (
                  <p className="text-[12px] font-medium text-slate-400 px-2 py-4">No consultations recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {visitHistory.map((visit) => {
                      const isSelected = visit.appointmentId === selectedVisitId;
                      return (
                        <div
                          key={visit.appointmentId}
                          onClick={() => setSelectedVisitId(visit.appointmentId)}
                          className={`rounded-[1rem] p-4 flex items-center justify-between cursor-pointer transition ${
                            isSelected ? "bg-[#E5EDFF]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <h4 className="text-[13px] font-medium text-slate-800">Dr. {visit.doctorName}</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-1">{formatDateTime(visit.scheduledAt)}</p>
                            {visit.profileId && visit.profileId !== patient?.id && (
                              <p className="text-[11px] font-medium text-[#5476FC] mt-1">
                                For: {visit.profileName} ({visit.profileRelationship ?? "Family Member"})
                              </p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="xl:col-span-8 bg-transparent">
                <h3 className="text-[16px] font-medium text-slate-800 mb-6 px-1">Consultation Details</h3>

                {!selectedVisit ? (
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-7 shadow-sm">
                    <p className="text-[12px] font-medium text-slate-400">Select a consultation to view details.</p>
                  </div>
                ) : !selectedVisit.emr ? (
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-7 shadow-sm flex flex-col items-center justify-center gap-2 py-16">
                    <p className="text-[12px] font-medium text-slate-400 text-center">No consultation notes recorded for this visit.</p>
                    <p className="text-[11px] font-medium text-slate-300 text-center max-w-[260px]">
                      Notes filled during the video call will appear here after the doctor saves them.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6">

                    {/* Sub-column 1: Patient/Provider/Visit Info + Reason + HPI + Medicines + Labs */}
                    <div className="flex-1 bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm flex flex-col gap-6">

                      {/* Patient Information */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold text-[13px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                          <span>Patient Information</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-500 text-[12px] pl-5 leading-[1.6]">
                          <EmrField label="Name" value={patient.fullName} />
                          <EmrField label="Date of Birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
                          <EmrField label="Gender" value={patient.gender} />
                          <EmrField label="Blood Group" value={patient.bloodGroup} />
                          <EmrField label="Email" value={patient.email} />
                        </div>
                      </div>

                      <div className="w-full h-px bg-slate-50" />

                      {/* Provider Information */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold text-[13px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                          <span>Provider Information</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-500 text-[12px] pl-5 leading-[1.6]">
                          <EmrField label="Provider Name" value={`Dr. ${selectedVisit.doctorName}`} />
                          <EmrField label="Date of Encounter" value={formatDateTime(selectedVisit.scheduledAt)} />
                        </div>
                      </div>

                      {/* Visit Information */}
                      {selectedVisit.emr.visitInfo && (selectedVisit.emr.visitInfo.visitType || selectedVisit.emr.visitInfo.accompaniedBy || selectedVisit.emr.visitInfo.sourceOfHistory || selectedVisit.emr.visitInfo.referralSource || selectedVisit.emr.visitInfo.historyLimitation) && (
                        <>
                          <div className="w-full h-px bg-slate-50" />
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-800 font-semibold text-[13px]">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                              <span>Visit Information</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-500 text-[12px] pl-5 leading-[1.6]">
                              <EmrField label="Visit Type" value={selectedVisit.emr.visitInfo.visitType} />
                              <EmrField label="Accompanied By" value={selectedVisit.emr.visitInfo.accompaniedBy} />
                              <EmrField label="Source of History" value={selectedVisit.emr.visitInfo.sourceOfHistory} />
                              <EmrField label="Referral Source" value={selectedVisit.emr.visitInfo.referralSource} />
                              <EmrField label="History Limitation" value={selectedVisit.emr.visitInfo.historyLimitation} />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Reason for visit */}
                      {(selectedVisit.emr.sections?.reasonForVisit || selectedVisit.reason) && (
                        <>
                          <div className="w-full h-px bg-slate-50" />
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-800 text-[12px] font-medium">Reason for visit</span>
                            <div className="bg-slate-50 rounded-[1rem] px-4 py-4 flex items-start gap-2">
                              <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[11px] font-medium shrink-0">
                                Visit
                              </span>
                              <span className="text-slate-500 text-[12px] leading-[1.5]">
                                {selectedVisit.emr.sections?.reasonForVisit || selectedVisit.reason}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* History of Present Illness */}
                      {selectedVisit.emr.sections?.historyOfPresentIllness && (
                        <>
                          <div className="w-full h-px bg-slate-50" />
                          <div className="flex flex-col gap-2">
                            <span className="text-slate-800 text-[12px] font-medium">History of Present Illness</span>
                            <div className="bg-slate-50 rounded-[1rem] px-4 py-4">
                              <p className="text-slate-500 text-[12px] leading-[1.6] whitespace-pre-line">
                                {selectedVisit.emr.sections.historyOfPresentIllness}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Medicines */}
                      <div className="w-full h-px bg-slate-50" />
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-800 text-[12px] font-medium">Medicines</span>
                        {!selectedVisit.emr.medicines || selectedVisit.emr.medicines.length === 0 ? (
                          <p className="text-[12px] font-medium text-slate-400 pl-1">No medicines prescribed for this consultation.</p>
                        ) : (
                          <div className="bg-slate-50 rounded-[1rem] px-4 py-4 flex flex-col gap-4">
                            {selectedVisit.emr.medicines.map((med, i) => (
                              <div key={`${med.name}-${i}`} className={i < selectedVisit.emr!.medicines!.length - 1 ? "pb-4 border-b border-white" : ""}>
                                <h5 className="text-[12px] font-semibold text-slate-800">
                                  {med.name}{med.dosage ? ` — ${med.dosage}` : ""}
                                </h5>
                                {(med.timing || med.frequency) && (
                                  <p className="text-[12px] mt-0.5">
                                    <span className="text-[#5476FC]">{med.timing}</span>
                                    {med.frequency && <span className="text-slate-500"> · {med.frequency}</span>}
                                  </p>
                                )}
                                {med.instructions && (
                                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">Notes: {med.instructions}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lab Tests */}
                      <div className="w-full h-px bg-slate-50" />
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-800 text-[12px] font-medium">Lab Tests</span>
                        {!selectedVisit.emr.labs || selectedVisit.emr.labs.length === 0 ? (
                          <p className="text-[12px] font-medium text-slate-400 pl-1">No lab tests recommended for this consultation.</p>
                        ) : (
                          <div className="bg-slate-50 rounded-[1rem] px-4 py-4 flex flex-col gap-4">
                            {selectedVisit.emr.labs.map((lab, i) => (
                              <div key={`${lab.name}-${i}`} className={i < selectedVisit.emr!.labs!.length - 1 ? "pb-4 border-b border-white" : ""}>
                                <h5 className="text-[12px] font-semibold text-slate-800">{lab.name}</h5>
                                {lab.notes && <p className="text-[12px] font-medium text-slate-500 mt-0.5">Notes: {lab.notes}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-column 2: Clinical notes + Addenda */}
                    <div className="flex-1 bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm flex flex-col gap-6">
                      {([
                        { title: "Review System", text: selectedVisit.emr.sections?.reviewSystem },
                        { title: "Health Status", text: selectedVisit.emr.sections?.healthStatus },
                        { title: "Histories", text: selectedVisit.emr.sections?.histories },
                        { title: "Physical Examination", text: selectedVisit.emr.sections?.physicalExamination },
                        { title: "Medical Decision Making", text: selectedVisit.emr.sections?.medicalDecisionMaking },
                        { title: "Procedure", text: selectedVisit.emr.sections?.procedure },
                        { title: "Impression and Plan", text: selectedVisit.emr.sections?.impressionAndPlan },
                        { title: "Professional Services", text: selectedVisit.emr.sections?.professionalServices },
                        // Legacy SOAP fields from older appointments saved before this format change
                        { title: "Subjective", text: selectedVisit.emr.sections?.subjective },
                        { title: "Objective", text: selectedVisit.emr.sections?.objective },
                        { title: "Assessment", text: selectedVisit.emr.sections?.assessment },
                        { title: "Plan", text: selectedVisit.emr.sections?.plan },
                      ] as { title: string; text?: string }[])
                        .filter(({ text }) => !!text)
                        .map(({ title, text }, i, arr) => (
                          <div key={title} className={i < arr.length - 1 ? "pb-4 border-b border-slate-50" : ""}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-[#6A8BFF] rotate-45 shrink-0" />
                              <span className="text-[12px] font-medium text-slate-800">{title}</span>
                            </div>
                            <p className="text-[12px] font-medium text-slate-500 leading-relaxed pl-4 border-l-2 border-slate-50 ml-1 whitespace-pre-line">{text}</p>
                          </div>
                        ))}
                      {!selectedVisit.emr.sections?.reviewSystem &&
                        !selectedVisit.emr.sections?.healthStatus &&
                        !selectedVisit.emr.sections?.histories &&
                        !selectedVisit.emr.sections?.physicalExamination &&
                        !selectedVisit.emr.sections?.medicalDecisionMaking &&
                        !selectedVisit.emr.sections?.procedure &&
                        !selectedVisit.emr.sections?.impressionAndPlan &&
                        !selectedVisit.emr.sections?.professionalServices &&
                        !selectedVisit.emr.sections?.subjective &&
                        !selectedVisit.emr.sections?.objective &&
                        !selectedVisit.emr.sections?.assessment &&
                        !selectedVisit.emr.sections?.plan && (
                          <p className="text-[12px] font-medium text-slate-400 text-center py-4">No clinical notes recorded for this consultation.</p>
                        )}

                      {selectedVisit.emr.addenda && selectedVisit.emr.addenda.length > 0 && (
                        <>
                          <div className="w-full h-px bg-slate-50" />
                          <div className="flex flex-col gap-3">
                            <span className="text-[12px] font-medium text-slate-800">Addenda</span>
                            {selectedVisit.emr.addenda.map((a, i) => (
                              <div key={i} className="bg-slate-50 rounded-[1rem] px-4 py-3">
                                <p className="text-[12px] font-medium text-slate-500 leading-relaxed whitespace-pre-line">{a.text}</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Dr. {a.doctorName} &middot; {formatDateTime(a.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEDICATIONS */}
          {activeTab === "medications" && (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[14px] font-medium text-slate-800 mb-6">Current Medications</h3>
              {patient.medications && patient.medications.length > 0 ? (
                <div className="space-y-4">
                  {patient.medications.map((med, i) => (
                    <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                      <div className="w-6 h-6 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-medium">{i + 1}</div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">{typeof med === "string" ? med : med.name}</p>
                        {typeof med !== "string" && med.dosage && <p className="text-[11px] text-slate-400 mt-0.5">Dosage: {med.dosage}</p>}
                        {typeof med !== "string" && med.notes && <p className="text-[11px] text-slate-500 mt-0.5">{med.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 font-semibold">No medications recorded.</p>
              )}
            </div>
          )}

          {/* ALLERGIES */}
          {activeTab === "allergies" && (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[14px] font-medium text-slate-800 mb-6">Known Allergies</h3>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a, i) => (
                    <span key={i} className="bg-red-50 text-red-600 border border-red-100 text-[12px] font-medium px-4 py-2 rounded-full">{a}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400 font-semibold">No allergies recorded.</p>
              )}
            </div>
          )}

          {/* PLACEHOLDER TABS */}
          {(activeTab === "diagnostics" || activeTab === "surgeries" || activeTab === "vaccinations") && (
            <div className="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-slate-400">No {activeTab} data available for this patient.</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
