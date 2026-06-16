"use client";

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

export default function EhrPanel({ open, onClose, loading, data }: EhrPanelProps) {
  if (!open) return null;

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

              {/* Visit history timeline */}
              <div className="px-6 py-4">
                <p className="text-[#24292e] font-bold text-xs uppercase tracking-wide text-gray-400 mb-3">Visit History</p>
                {data.visitHistory.length === 0 ? (
                  <p className="text-xs text-gray-400">No past visits on record.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.visitHistory.map((v) => (
                      <div key={v.appointmentId} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#24292e]">{fmtDate(v.scheduledAt)}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${v.status === "completed" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{v.status}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">Dr. {v.doctorName} · {v.reason}</p>
                        {v.emr?.medicines?.length > 0 && (
                          <p className="text-[10px] text-[#5476fc] mt-1.5">
                            Rx: {v.emr.medicines.map((m: any) => m.name).join(", ")}
                          </p>
                        )}
                        {v.emr?.labs?.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Labs: {v.emr.labs.map((l: any) => l.name).join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
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
