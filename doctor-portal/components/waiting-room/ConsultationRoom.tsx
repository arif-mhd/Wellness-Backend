"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export interface EhrAddendum {
  text: string;
  doctorId: string;
  doctorName: string;
  createdAt: string;
}

export interface EhrVisitInfo {
  visitType?: string;
  accompaniedBy?: string;
  sourceOfHistory?: string;
  referralSource?: string;
  historyLimitation?: string;
}

export interface EhrVisit {
  appointmentId: string;
  scheduledAt: string;
  status: string;
  reason: string;
  doctorId: string;
  doctorName: string;
  emr: {
    sections?: {
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
    };
    visitInfo?: EhrVisitInfo | null;
    medicines?: { name: string; dosage: string; timing: string; frequency: string; instructions: string }[];
    labs?: { name: string; notes: string }[];
    addenda?: EhrAddendum[];
    savedAt?: string;
  } | null;
}

// Matches WaitingRoom's SlotAppointment shape — the full real patient/
// appointment record, however the consultation was opened (selected patient's
// own history, or the doctor-wide recent-consultations fallback).
export interface ConsultationPatientInfo {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl: string | null;
  patientAge: number | null;
  patientGender: string;
  patientDob: string;
  patientBloodGroup: string;
  patientHeight: string;
  patientWeight: string;
  patientChronicIllnesses: string;
  patientCurrentMedications: string;
  patientAllergies: string;
  reason: string;
  status: string;
  preVisitData: any | null;
}

interface ConsultationRoomProps {
  patient: ConsultationPatientInfo;
  visit: EhrVisit;
  onBack: () => void;
  onViewProfile: () => void;
  onViewPreVisitForm: () => void;
  onAddendumSaved?: (emr: EhrVisit["emr"]) => void;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <strong className="text-[#383F45] font-medium">{label}:</strong> {value}
    </div>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ConsultationRoom({
  patient,
  visit,
  onBack,
  onViewProfile,
  onViewPreVisitForm,
  onAddendumSaved,
}: ConsultationRoomProps) {
  const sections = visit.emr?.sections;
  const medicines = visit.emr?.medicines ?? [];
  const labs = visit.emr?.labs ?? [];
  const addenda = visit.emr?.addenda ?? [];
  const hasNotes = !!(
    sections?.reasonForVisit || sections?.historyOfPresentIllness ||
    sections?.reviewSystem || sections?.healthStatus || sections?.histories ||
    sections?.physicalExamination || sections?.medicalDecisionMaking ||
    sections?.procedure || sections?.impressionAndPlan || sections?.professionalServices ||
    sections?.subjective || sections?.objective || sections?.assessment || sections?.plan
  );

  const [showAddendumBox, setShowAddendumBox] = useState(false);
  const [addendumText, setAddendumText] = useState("");
  const [savingAddendum, setSavingAddendum] = useState(false);
  const [addendumError, setAddendumError] = useState<string | null>(null);

  const saveAddendum = async () => {
    if (!addendumText.trim()) return;
    setSavingAddendum(true);
    setAddendumError(null);
    try {
      const res = await apiFetch(`/api/appointments/${visit.appointmentId}/emr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addendum: addendumText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save addendum");
      const { emr } = await res.json();
      onAddendumSaved?.(emr);
      setAddendumText("");
      setShowAddendumBox(false);
    } catch (err) {
      console.error("Save addendum error:", err);
      setAddendumError("Could not save addendum. Please try again.");
    } finally {
      setSavingAddendum(false);
    }
  };

  return (
    <div className="w-full min-h-full bg-[#F7F9FC] font-outfit select-none flex flex-col p-4 md:p-6 lg:p-8 animate-fade-in relative">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          aria-label="Back to waiting room"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-[#9EA5AD] text-[12px] uppercase tracking-wider font-semibold">Consultation Room</span>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-tight tracking-[-0.72px]">
            Waiting Room
          </h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full flex-1">

        {/* Left Column: EMR Detail */}
        <div className="flex-1 min-w-0 bg-white rounded-[12px] border border-gray-100 p-6 md:p-8 flex flex-col gap-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EDF0FF] flex items-center justify-center text-[#5476FC]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.3359 4.66797H2.66927C1.93289 4.66797 1.33594 5.26492 1.33594 6.0013V12.668C1.33594 13.4043 1.93289 14.0013 2.66927 14.0013H13.3359C14.0723 14.0013 14.6693 13.4043 14.6693 12.668V6.0013C14.6693 5.26492 14.0723 4.66797 13.3359 4.66797Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.6693 14V3.33333C10.6693 2.97971 10.5288 2.64057 10.2787 2.39052C10.0287 2.14048 9.68956 2 9.33594 2H6.66927C6.31565 2 5.97651 2.14048 5.72646 2.39052C5.47641 2.64057 5.33594 2.97971 5.33594 3.33333V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[#24292E] font-medium text-[16px] leading-tight tracking-[-0.28px]">
                  {patient.patientName} / {visit.reason || "Consultation"}
                </span>
                <span className="text-[#9EA5AD] text-[12px]">
                  {formatDateTime(visit.scheduledAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddendumBox((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-medium transition-colors"
                style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M8 3.33V12.67M3.33 8H12.67" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Add Addendum</span>
              </button>
              <button
                onClick={() => window.open(`/appointments/patient-details/lab-reports?id=${patient.id}`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-[#F5F6FA] hover:bg-gray-100 rounded-xl text-[#707070] text-[13px] font-medium transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                  <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="currentColor"/>
                </svg>
                <span>Lab Reports</span>
              </button>
            </div>
          </div>

          {showAddendumBox && (
            <div className="flex flex-col gap-3 bg-[#F8FAFC] border border-gray-100 rounded-2xl p-5 -mt-2">
              <span className="text-[#24292E] font-semibold text-[13px]">Add Addendum</span>
              <textarea
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                placeholder="Add a follow-up note to this consultation's record..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#383F45] placeholder:text-[#9EA5AD] focus:outline-none focus:ring-2 focus:ring-[#5476FC]/30 resize-none"
              />
              {addendumError && <span className="text-red-500 text-[12px]">{addendumError}</span>}
              <div className="flex items-center gap-3 self-end">
                <button
                  onClick={() => { setShowAddendumBox(false); setAddendumText(""); setAddendumError(null); }}
                  className="px-4 py-2 rounded-xl text-[#676E76] text-[13px] font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAddendum}
                  disabled={!addendumText.trim() || savingAddendum}
                  className="px-4 py-2 rounded-xl text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
                >
                  {savingAddendum ? "Saving..." : "Save Addendum"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <h3 className="text-[#24292E] text-[14px] font-bold tracking-[-0.24px] uppercase border-l-4 border-[#5476FC] pl-2.5">
              Electronic Medical Record (EMR)
            </h3>

            <div className="flex flex-col gap-5 bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100">

              {/* Patient Information */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                  <span>Patient Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#676E76] text-[13px] pl-5 leading-[1.6]">
                  <Field label="Name" value={patient.patientName} />
                  <Field label="Date of Birth" value={patient.patientDob ? new Date(patient.patientDob).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                  <Field label="Gender" value={patient.patientGender} />
                  <Field label="Blood Group" value={patient.patientBloodGroup} />
                  <Field label="Email" value={patient.patientEmail} />
                  <Field label="Chronic Conditions" value={patient.patientChronicIllnesses} />
                  <Field label="Current Medications" value={patient.patientCurrentMedications} />
                  <Field label="Known Allergies" value={patient.patientAllergies} />
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Provider Information */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Provider Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#676E76] text-[13px] pl-5 leading-[1.6]">
                  <Field label="Provider Name" value={`Dr. ${visit.doctorName}`} />
                  <Field label="Status" value={visit.status} />
                  <Field label="Date of Encounter" value={formatDateTime(visit.scheduledAt)} />
                </div>
              </div>

              {visit.emr?.visitInfo && (visit.emr.visitInfo.visitType || visit.emr.visitInfo.accompaniedBy || visit.emr.visitInfo.sourceOfHistory || visit.emr.visitInfo.referralSource || visit.emr.visitInfo.historyLimitation) && (
                <>
                  <div className="w-full h-px bg-gray-200/60" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                      <span>Visit Information</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#676E76] text-[13px] pl-5 leading-[1.6]">
                      <Field label="Visit Type" value={visit.emr.visitInfo.visitType} />
                      <Field label="Accompanied By" value={visit.emr.visitInfo.accompaniedBy} />
                      <Field label="Source of History" value={visit.emr.visitInfo.sourceOfHistory} />
                      <Field label="Referral Source" value={visit.emr.visitInfo.referralSource} />
                      <Field label="History Limitation" value={visit.emr.visitInfo.historyLimitation} />
                    </div>
                  </div>
                </>
              )}

              {hasNotes && (
                <>
                  <div className="w-full h-px bg-gray-200/60" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                      <span>Clinical Notes</span>
                    </div>
                    <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                      <Field label="Reason for Visit" value={sections?.reasonForVisit} />
                      <Field label="History of Present Illness" value={sections?.historyOfPresentIllness} />
                      <Field label="Review System" value={sections?.reviewSystem} />
                      <Field label="Health Status" value={sections?.healthStatus} />
                      <Field label="Histories" value={sections?.histories} />
                      <Field label="Physical Examination" value={sections?.physicalExamination} />
                      <Field label="Medical Decision Making" value={sections?.medicalDecisionMaking} />
                      <Field label="Procedure" value={sections?.procedure} />
                      <Field label="Impression and Plan" value={sections?.impressionAndPlan} />
                      <Field label="Professional Services" value={sections?.professionalServices} />
                      {/* Legacy SOAP fields from older appointments saved before this format change */}
                      <Field label="Subjective" value={sections?.subjective} />
                      <Field label="Objective" value={sections?.objective} />
                      <Field label="Assessment" value={sections?.assessment} />
                      <Field label="Plan" value={sections?.plan} />
                    </div>
                  </div>
                </>
              )}

              <div className="w-full h-px bg-gray-200/60" />

              {/* Medicines */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Medicines</span>
                </div>
                {medicines.length === 0 ? (
                  <p className="text-[#9EA5AD] text-[13px] pl-5">No medicines prescribed for this consultation.</p>
                ) : (
                  <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                    {medicines.map((med, i) => (
                      <div key={i}>
                        <strong className="text-[#383F45] font-medium">{med.name}</strong>
                        {med.dosage ? ` — ${med.dosage}` : ""}
                        {med.timing || med.frequency ? ` (${[med.timing, med.frequency].filter(Boolean).join(" · ")})` : ""}
                        {med.instructions ? ` — ${med.instructions}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Lab Tests */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Lab Tests</span>
                </div>
                {labs.length === 0 ? (
                  <p className="text-[#9EA5AD] text-[13px] pl-5">No lab tests recommended for this consultation.</p>
                ) : (
                  <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                    {labs.map((lab, i) => (
                      <div key={i}>
                        <strong className="text-[#383F45] font-medium">{lab.name}</strong>
                        {lab.notes ? ` — ${lab.notes}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Documentation */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Documentation</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-1 leading-[1.6]">
                  <Field label="Electronic Signature" value={`Dr. ${visit.doctorName}`} />
                  <Field label="Saved At" value={visit.emr?.savedAt ? formatDateTime(visit.emr.savedAt) : null} />
                </div>
              </div>

              {addenda.length > 0 && (
                <>
                  <div className="w-full h-px bg-gray-200/60" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                      <span>Addenda</span>
                    </div>
                    <div className="flex flex-col gap-3 pl-5">
                      {addenda.map((a, i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                          <p className="text-[#383F45] text-[13px] leading-[1.6] whitespace-pre-line">{a.text}</p>
                          <p className="text-[#9EA5AD] text-[11px] mt-1">
                            Dr. {a.doctorName} &middot; {formatDateTime(a.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Patient Details */}
        <div className="w-full lg:w-[372px] shrink-0 bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-[#24292E] font-medium text-[20px] leading-[1.5] tracking-[-0.4px]">
              Patient Details
            </h3>
          </div>

          <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[12px] border border-white">
            <img
              src={patient.patientAvatarUrl || "/default-avatar.svg"}
              alt={patient.patientName}
              className="w-11 h-11 rounded-full object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] truncate">
                {patient.patientName}
              </span>
              {patient.patientAge != null && (
                <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                  {patient.patientAge} Year Old
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onViewProfile}
            className="flex w-full justify-center items-center py-2.5 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-semibold text-[13px] transition-all duration-200"
          >
            View Profile
          </button>

          <div className="w-full h-px bg-[#EBEEF5]" />

          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                Reason for visit
              </span>
              <p className="text-[#676E76] text-[12px] leading-[16px]">
                {patient.reason || "Not specified"}
              </p>
            </div>

            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                  Pre-visit Form
                </span>
                <p className="text-[#676E76] text-[12px] leading-[16px]">
                  Review the patient&apos;s pre-visit form to understand their medical history and reason for the appointment.
                </p>
              </div>

              <button
                onClick={onViewPreVisitForm}
                className="flex items-center gap-2 text-[#182A6F] font-semibold text-[13px] hover:text-[#5476FC] transition-colors"
              >
                <span>Read Pre-visit form</span>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
