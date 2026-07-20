"use client";

import { useState } from "react";

interface EhrProfile {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  height: string;
  weight: string;
  emiratesId: string;
  maritalStatus: string;
  location: string;
  allergies: any[];
  medications: { current: any[]; past: any[] };
  chronicDiseases: string[];
  insurance: any[];
  fhirPatientId?: string | null;
}

interface FhirEncounter {
  fhirId: string;
  status: string;
  type: string | null;
  reason: string | null;
  start: string | null;
  end: string | null;
  practitioner: string | null;
}

interface FhirNote {
  fhirId: string;
  resourceType: "DocumentReference" | "Composition";
  title: string;
  date: string | null;
  status: string;
  text: string;
}

interface FhirObservation {
  fhirId: string;
  status: string;
  code: string;
  value: string;
  date: string | null;
}

interface FhirData {
  encounters: FhirEncounter[];
  notes: FhirNote[];
  observations: FhirObservation[];
}

interface EhrVisit {
  appointmentId: string;
  scheduledAt: string;
  status: string;
  reason: string;
  doctorId: string;
  doctorName: string;
  emr: any | null;
}

interface EhrData {
  profile: EhrProfile;
  visitHistory: EhrVisit[];
  preVisitData: any | null;
}

interface EhrPanelProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  data: EhrData | null;
  fhirLoading?: boolean;
  fhirData?: FhirData | null;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatAllergies(allergies: any[]) {
  if (!allergies || allergies.length === 0) return "None reported";
  return allergies
    .map((a) => (typeof a === "string" ? a : `${a.category ?? ""}: ${Array.isArray(a.selected) ? a.selected.join(", ") : a.selected ?? ""}`))
    .join("; ");
}

function formatMedications(current: any[]) {
  if (!current || current.length === 0) return "None reported";
  return current.map((m) => (typeof m === "string" ? m : `${m.name ?? ""} ${m.dosage ?? ""}`.trim())).join(", ");
}

/** Renders the expanded EMR detail for a past visit */
function VisitDetail({ emr }: { emr: any }) {
  if (!emr) {
    return (
      <div className="px-3 pb-3 pt-2">
        <p className="text-[11px] text-gray-400 italic">No clinical record for this visit.</p>
      </div>
    );
  }

  const sections: { label: string; value: string }[] = [
    // ── New SOAP + HPI format (used for new appointments) ──
    { label: "Reason for Visit",            value: emr.sections?.reasonForVisit },
    { label: "History of Present Illness",  value: emr.sections?.historyOfPresentIllness },
    { label: "Subjective",                  value: emr.sections?.subjective },
    { label: "Objective",                   value: emr.sections?.objective },
    { label: "Assessment",                  value: emr.sections?.assessment },
    { label: "Plan",                        value: emr.sections?.plan },
    // ── Legacy intake-plan fields (kept for old appointments) ──
    { label: "Review System",              value: emr.sections?.reviewSystem },
    { label: "Health Status",              value: emr.sections?.healthStatus },
    { label: "Histories",                  value: emr.sections?.histories },
    { label: "Physical Examination",       value: emr.sections?.physicalExamination },
    { label: "Medical Decision Making",    value: emr.sections?.medicalDecisionMaking },
    { label: "Procedure",                  value: emr.sections?.procedure },
    { label: "Impression and Plan",        value: emr.sections?.impressionAndPlan },
    { label: "Professional Services",      value: emr.sections?.professionalServices },
  ].filter((s) => s.value && s.value.trim() !== "");

  const medicines: any[] = Array.isArray(emr.medicines) ? emr.medicines : [];
  const labs: any[] = Array.isArray(emr.labs) ? emr.labs : [];

  const hasContent = sections.length > 0 || medicines.length > 0 || labs.length > 0;

  if (!hasContent) {
    return (
      <div className="px-3 pb-3 pt-2">
        <p className="text-[11px] text-gray-400 italic">No details recorded for this visit.</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 pt-2 flex flex-col gap-3 border-t border-gray-100 bg-[#f8fafc] rounded-b-xl">
      {/* Clinical Notes */}
      {sections.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Clinical Notes</p>
          {sections.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold text-[#5476fc]">{s.label}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Medicines */}
      {medicines.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Prescribed Medicines ({medicines.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {medicines.map((med: any, idx: number) => (
              <div
                key={med.id ?? idx}
                className="flex items-start justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-[12px] font-bold text-[#24292e] truncate">
                    {med.name}{med.dosage ? ` — ${med.dosage}` : ""}
                  </p>
                  <p className="text-[10px] text-[#5476fc] font-semibold">
                    {med.timing}{med.frequency ? ` · ${med.frequency}` : ""}
                  </p>
                  {med.instructions && (
                    <p className="text-[10px] text-gray-400">{med.instructions}</p>
                  )}
                  {med.contributorName && (
                    <p className="text-[10px] text-gray-400 italic">By Dr. {med.contributorName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Labs */}
      {labs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            Lab Recommendations ({labs.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {labs.map((lab: any, idx: number) => (
              <div
                key={lab.id ?? idx}
                className="flex items-start justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-[12px] font-bold text-[#24292e] truncate">{lab.name}</p>
                  {lab.notes && (
                    <p className="text-[10px] text-gray-400">{lab.notes}</p>
                  )}
                  {lab.contributorName && (
                    <p className="text-[10px] text-gray-400 italic">By Dr. {lab.contributorName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** External EMR (FHIR) records — read-only, fetched live from the outside EMR (Cortex/HAPI sandbox). */
function ExternalRecords({ fhirPatientId, loading, fhirData }: { fhirPatientId?: string | null; loading?: boolean; fhirData?: FhirData | null }) {
  if (!fhirPatientId) return null;

  return (
    <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-[#24292e] font-bold text-xs uppercase tracking-wide text-gray-400">External EMR Records</p>
        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live · FHIR</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3.5 h-3.5 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-gray-400">Fetching from external EMR…</p>
        </div>
      ) : !fhirData ? (
        <p className="text-[11px] text-gray-400 italic">Could not reach external EMR.</p>
      ) : (
        <>
          {/* Encounters */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Prior Encounters ({fhirData.encounters.length})</p>
            {fhirData.encounters.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">None found.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {fhirData.encounters.map((e) => (
                  <div key={e.fhirId} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#24292e]">{fmtDate(e.start ?? undefined)} — {e.reason || e.type || "Encounter"}</p>
                    <p className="text-[10px] text-gray-400">{e.practitioner ? `${e.practitioner} · ` : ""}{e.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes (DocumentReference / Composition) */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Doctor Notes ({fhirData.notes.length})</p>
            {fhirData.notes.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">None found.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {fhirData.notes.map((n) => (
                  <div key={n.fhirId} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#24292e]">{n.title}</p>
                    <p className="text-[10px] text-gray-400 mb-1">{fmtDate(n.date ?? undefined)} · {n.resourceType}</p>
                    {n.text && <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{n.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Observations ({fhirData.observations.length})</p>
            {fhirData.observations.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">None found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {fhirData.observations.map((o) => (
                  <div key={o.fhirId} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400">{o.code}</p>
                    <p className="text-[11px] font-semibold text-[#24292e]">{o.value || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function EhrPanel({ open, onClose, loading, data, fhirLoading, fhirData }: EhrPanelProps) {
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  if (!open) return null;

  const toggleVisit = (appointmentId: string) => {
    setExpandedVisitId((prev) => (prev === appointmentId ? null : appointmentId));
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-[480px] h-full shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out] overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `@keyframes slideIn{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}` }} />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="text-[#24292e] font-bold text-sm">Patient Electronic Health Record</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-gray-400 text-xs">Could not load patient record.</div>
          ) : (
            <>
              {/* Demographics */}
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-[#24292e] font-bold text-base">{data.profile.fullName}</p>
                <p className="text-gray-400 text-xs mt-0.5">{data.profile.email} {data.profile.phone && `· ${data.profile.phone}`}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Gender</p><p className="text-xs text-[#24292e] font-semibold">{data.profile.gender || "—"}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">DOB</p><p className="text-xs text-[#24292e] font-semibold">{fmtDate(data.profile.dateOfBirth)}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Blood Group</p><p className="text-xs text-[#24292e] font-semibold">{data.profile.bloodGroup || "—"}</p></div>
                  <div><p className="text-[10px] text-gray-400 uppercase font-bold">Height / Weight</p><p className="text-xs text-[#24292e] font-semibold">{data.profile.height || "—"} / {data.profile.weight || "—"}</p></div>
                </div>
              </div>

              {/* Standing medical profile */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
                <p className="text-[#24292e] font-bold text-xs uppercase tracking-wide text-gray-400">Medical Profile</p>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Chronic Conditions</p>
                  <p className="text-xs text-[#24292e]">{data.profile.chronicDiseases?.length ? data.profile.chronicDiseases.join(", ") : "None reported"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Allergies</p>
                  <p className="text-xs text-[#24292e]">{formatAllergies(data.profile.allergies)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Current Medications</p>
                  <p className="text-xs text-[#24292e]">{formatMedications(data.profile.medications?.current ?? [])}</p>
                </div>
              </div>

              {/* External EMR (FHIR) records — only shown if this patient is linked to an external EMR record */}
              <ExternalRecords fhirPatientId={data.profile.fhirPatientId} loading={fhirLoading} fhirData={fhirData} />

              {/* Pre-visit questionnaire for this appointment */}
              {data.preVisitData && (
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-2">
                  <p className="text-[#24292e] font-bold text-xs uppercase tracking-wide text-gray-400">Pre-Visit Questionnaire</p>
                  {data.preVisitData.primaryReason && (
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Primary Reason</p><p className="text-xs text-[#24292e]">{data.preVisitData.primaryReason}</p></div>
                  )}
                  {Array.isArray(data.preVisitData.symptoms) && data.preVisitData.symptoms.length > 0 && (
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Symptoms</p><p className="text-xs text-[#24292e]">{data.preVisitData.symptoms.join(", ")}</p></div>
                  )}
                  {data.preVisitData.severity && (
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Severity</p><p className="text-xs text-[#24292e]">{data.preVisitData.severity}</p></div>
                  )}
                  {data.preVisitData.additionalNotes && (
                    <div><p className="text-[10px] text-gray-400 uppercase font-bold">Additional Notes</p><p className="text-xs text-[#24292e]">{data.preVisitData.additionalNotes}</p></div>
                  )}
                </div>
              )}

              {/* Visit history timeline — now expandable */}
              <div className="px-6 py-4">
                <p className="text-[#24292e] font-bold text-xs uppercase tracking-wide text-gray-400 mb-3">Visit History</p>
                {data.visitHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">No past visits on record.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.visitHistory.map((v) => {
                      const isExpanded = expandedVisitId === v.appointmentId;
                      const medCount = v.emr?.medicines?.length ?? 0;
                      const labCount = v.emr?.labs?.length ?? 0;

                      return (
                        <div
                          key={v.appointmentId}
                          className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                            isExpanded ? "border-[#5476fc]/40 shadow-sm" : "border-gray-100"
                          }`}
                        >
                          {/* Clickable header row */}
                          <button
                            type="button"
                            onClick={() => toggleVisit(v.appointmentId)}
                            className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-start justify-between gap-2"
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[#24292e]">{fmtDate(v.scheduledAt)}</p>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    v.status === "completed"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500">Dr. {v.doctorName} · {v.reason}</p>
                              {/* Quick summary badges */}
                              <div className="flex items-center gap-2 mt-0.5">
                                {medCount > 0 && (
                                  <span className="text-[9px] font-semibold text-[#5476fc] bg-blue-50 px-2 py-0.5 rounded-full">
                                    {medCount} medicine{medCount > 1 ? "s" : ""}
                                  </span>
                                )}
                                {labCount > 0 && (
                                  <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {labCount} lab{labCount > 1 ? "s" : ""}
                                  </span>
                                )}
                                {!v.emr && (
                                  <span className="text-[9px] text-gray-400 italic">No EMR recorded</span>
                                )}
                              </div>
                            </div>

                            {/* Chevron icon */}
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className={`flex-shrink-0 text-gray-400 mt-0.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && <VisitDetail emr={v.emr} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
