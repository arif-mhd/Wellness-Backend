"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { Patient } from "@/app/appointments/types";
import PreVisitFormModal from "@/components/appointment/PreVisitFormModal";
import ConsultationRoom, { EhrVisit } from "./ConsultationRoom";

interface WaitingRoomProps {
  onClose: () => void;
}

// One row in the appointment lists — derived live from the doctor's real
// appointments for today, not mock data.
interface SlotAppointment {
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
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  patientWaitingSince: string | null;
  preVisitData: any | null;
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const year = new Date(dob).getFullYear();
  if (isNaN(year)) return null;
  return new Date().getFullYear() - year;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildSlotAppointment(a: any): SlotAppointment {
  return {
    id: a.id,
    patientId: a.familyMemberId || a.patientId,
    patientName: a.patientName ?? "Patient",
    patientEmail: a.patientEmail ?? "",
    patientAvatarUrl: a.patientAvatarUrl ?? null,
    patientAge: ageFromDob(a.patientDob),
    patientGender: a.patientGender ?? "",
    patientDob: a.patientDob ?? "",
    patientBloodGroup: a.patientBloodGroup ?? "",
    patientHeight: a.patientHeight ?? "",
    patientWeight: a.patientWeight ?? "",
    patientChronicIllnesses: a.patientChronicIllnesses ?? "None reported",
    patientCurrentMedications: a.patientCurrentMedications ?? "None",
    patientAllergies: a.patientAllergies ?? "None",
    reason: a.reason ?? "Consultation",
    status: a.status,
    patientWaitingSince: a.patientWaitingSince ?? null,
    preVisitData: a.preVisitData ?? null,
  };
}

// A consultation row that also carries which patient it belongs to — needed
// for the "doctor's recent consultations across all patients" fallback list,
// where each row may be a different patient.
interface RecentVisit {
  visit: EhrVisit;
  patientName: string;
  patientAvatarUrl: string | null;
}

export default function WaitingRoom({ onClose }: WaitingRoomProps) {
  const router = useRouter();

  const [appointments, setAppointments] = useState<SlotAppointment[]>([]);
  // Every appointment for this doctor (not just today's) — kept around so any
  // consultation opened from the doctor-wide recent list can be resolved to
  // its full patient record without a second fetch.
  const [allAppointmentsRaw, setAllAppointmentsRaw] = useState<any[]>([]);
  // This doctor's own recent consultations with saved EMRs, across all
  // patients — shown in the middle column as a fallback when no specific
  // patient's EMR history is selected.
  const [recentDoctorVisits, setRecentDoctorVisits] = useState<RecentVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // EMR history (visitHistory) for the currently selected patient's appointment
  const [visitHistory, setVisitHistory] = useState<EhrVisit[]>([]);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [activeVisit, setActiveVisit] = useState<EhrVisit | null>(null);
  // Full patient/appointment record for whichever consultation is open —
  // resolved from allAppointmentsRaw so the detail view always has real
  // demographics and pre-visit data, regardless of which list it was opened from.
  const [activeVisitPatient, setActiveVisitPatient] = useState<SlotAppointment | null>(null);

  const [preVisitPatient, setPreVisitPatient] = useState<Patient | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/appointments/doctor");
      if (!res.ok) return;
      const { appointments: all } = await res.json();
      setAllAppointmentsRaw(all ?? []);
      const today = new Date();
      const todays: SlotAppointment[] = (all ?? [])
        .filter((a: any) => a.status !== "cancelled" && isSameDay(new Date(a.scheduledAt), today))
        .map(buildSlotAppointment);
      setAppointments(todays);
      if (!selectedId && todays.length > 0) setSelectedId(todays[0].id);

      // Derive this doctor's recent EMRs across all patients, newest first —
      // no extra fetch needed, /doctor already embeds each appointment's emr.
      const withEmr: RecentVisit[] = (all ?? [])
        .filter((a: any) => a.emr)
        .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, 10)
        .map((a: any): RecentVisit => ({
          visit: {
            appointmentId: a.id,
            scheduledAt: a.scheduledAt,
            status: a.status,
            reason: a.reason ?? "Consultation",
            doctorId: a.doctorId,
            doctorName: "You",
            emr: a.emr ?? null,
          },
          patientName: a.patientName ?? "Patient",
          patientAvatarUrl: a.patientAvatarUrl ?? null,
        }));
      setRecentDoctorVisits(withEmr);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchAppointments();
    // Poll so "Online Now" reflects patients joining the waiting room in real time.
    const interval = setInterval(fetchAppointments, 10000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // "Online Now" = patient has signalled they're in the waiting room and the
  // visit isn't finished yet. "Other Appointments in This Slot" = today's
  // remaining scheduled/in-progress appointments without that signal.
  // Completed ones are still shown, just with a distinct badge.
  const onlinePatients = appointments.filter(a => a.patientWaitingSince && a.status !== "completed");
  const otherSlotPatients = appointments.filter(a => !a.patientWaitingSince || a.status === "completed");

  const selected = appointments.find(a => a.id === selectedId) ?? null;

  const fetchEhr = useCallback(async (appointmentId: string) => {
    setEhrLoading(true);
    setVisitHistory([]);
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}/ehr`);
      if (!res.ok) return;
      const data = await res.json();
      setVisitHistory(data.visitHistory ?? []);
    } finally {
      setEhrLoading(false);
    }
  }, []);

  // Also load EMR history whenever the selected patient changes — including
  // the initial auto-selection on first load, not just explicit clicks.
  useEffect(() => {
    if (selectedId) fetchEhr(selectedId);
  }, [selectedId, fetchEhr]);

  const handleOpenEmr = (apt: SlotAppointment) => {
    setSelectedId(apt.id);
  };

  // Resolves the full patient/appointment record for a given visit's
  // appointmentId from the already-fetched full list — no extra network call.
  const resolveVisitPatient = (appointmentId: string): SlotAppointment | null => {
    const raw = allAppointmentsRaw.find((a: any) => a.id === appointmentId);
    return raw ? buildSlotAppointment(raw) : null;
  };

  const handleConnectNow = (apt: SlotAppointment) => {
    router.push(`/appointments/consult?appointmentId=${apt.id}&patientName=${encodeURIComponent(apt.patientName)}`);
  };

  const mapToPatient = (apt: SlotAppointment): Patient => ({
    id: apt.patientId,
    name: apt.patientName,
    age: apt.patientAge ?? 0,
    email: apt.patientEmail,
    diagnosis: apt.reason,
    description: apt.reason,
    status: apt.status === "completed" ? "Completed" : "Waiting",
    dateTime: "Today",
    avatar: apt.patientAvatarUrl || "/default-avatar.svg",
    bio: apt.reason,
    gender: apt.patientGender,
    bloodGroup: apt.patientBloodGroup,
    height: apt.patientHeight,
    weight: apt.patientWeight,
    dob: apt.patientDob,
    preVisitForm: apt.preVisitData ? {
      isQuestionnaire: true,
      chronicIllnesses: apt.preVisitData.conditions || "None reported",
      currentMedications: apt.preVisitData.medications || "None",
      allergies: apt.preVisitData.allergies || "None",
      primaryConcern: apt.preVisitData.primaryReason || apt.reason || "Consultation",
      smokes: Array.isArray(apt.preVisitData.symptoms) ? apt.preVisitData.symptoms.join(", ") : (apt.preVisitData.symptoms || "None"),
      drinks: apt.preVisitData.additionalNotes || "None",
    } : {
      isQuestionnaire: false,
      chronicIllnesses: apt.patientChronicIllnesses,
      currentMedications: apt.patientCurrentMedications,
      allergies: apt.patientAllergies,
      primaryConcern: apt.reason,
      smokes: "No",
      drinks: "No",
    },
  });

  if (activeVisit && activeVisitPatient) {
    return (
      <ConsultationRoom
        patient={activeVisitPatient}
        visit={activeVisit}
        onBack={() => { setActiveVisit(null); setActiveVisitPatient(null); }}
        onViewProfile={() => router.push("/appointments/patient-details?id=" + activeVisitPatient.patientId)}
        onViewPreVisitForm={() => setPreVisitPatient(mapToPatient(activeVisitPatient))}
        onAddendumSaved={(emr) => {
          const appointmentId = activeVisit.appointmentId;
          setActiveVisit((prev) => (prev ? { ...prev, emr } : prev));
          setVisitHistory((prev) => prev.map((v) => (v.appointmentId === appointmentId ? { ...v, emr } : v)));
          setRecentDoctorVisits((prev) =>
            prev.map((rv) => (rv.visit.appointmentId === appointmentId ? { ...rv, visit: { ...rv.visit, emr } } : rv))
          );
          setAllAppointmentsRaw((prev) =>
            prev.map((a) => (a.id === appointmentId ? { ...a, emr } : a))
          );
        }}
      />
    );
  }

  function renderCard(apt: SlotAppointment) {
    const isSelected = selectedId === apt.id;
    const isOnline = !!apt.patientWaitingSince && apt.status !== "completed";
    const isCompleted = apt.status === "completed";
    return (
      <div
        key={apt.id}
        className={`flex flex-col gap-4 p-4 rounded-[8px] border transition-all duration-200 ${isSelected
            ? "bg-white border-[#5476FC] shadow-[0_4px_12px_rgba(84,118,252,0.08)]"
            : "bg-white/50 hover:bg-white border-transparent"
          }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={apt.patientAvatarUrl || "/default-avatar.svg"}
              alt={apt.patientName}
              className="w-9 h-9 rounded-full object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] font-medium text-[14px] leading-[1.5] tracking-[-0.28px] truncate">
                {apt.patientName}{apt.patientAge != null ? `, ${apt.patientAge} y/o` : ""}
              </span>
              <span className="text-[#9EA5AD] text-[12px] leading-[1.5] tracking-[-0.24px] truncate">
                {apt.patientEmail}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isCompleted ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#9EA5AD]" />
                <span className="text-[#9EA5AD] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                  Completed
                </span>
              </>
            ) : isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22A181] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22A181]"></span>
                </span>
                <span className="text-[#22A181] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                  Connected
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-[#F4A308]"></span>
                <span className="text-[#F4A308] text-[14px] font-normal leading-[1.23] tracking-[-0.28px]">
                  Waiting
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-[10px] py-[5px] rounded-full bg-[#E2EAFE] text-[#213159] text-[12px] font-light leading-[1] tracking-[-0.24px] shrink-0 truncate max-w-[140px]">
            {apt.reason}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => handleOpenEmr(apt)}
            className={`flex-1 py-1.5 rounded-[12px] font-medium text-[13px] leading-5 border transition-all duration-200 ${isSelected
                ? "bg-[#2E344E] text-white border-transparent"
                : "bg-white text-[#24292E] border-gray-200 hover:bg-gray-50"
              }`}
          >
            EMR
          </button>
          <button
            onClick={() => handleConnectNow(apt)}
            disabled={isCompleted}
            className="flex-1 py-1.5 rounded-[12px] text-white font-medium text-[13px] leading-5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
          >
            Connect Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-[#F7F9FC] font-outfit select-none flex flex-col p-4 md:p-6 lg:p-8 animate-fade-in relative">
      {preVisitPatient && (
        <PreVisitFormModal
          patient={preVisitPatient}
          onClose={() => setPreVisitPatient(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Waiting Room
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full flex-1">

        {/* Left Column: Waiting Lists */}
        <div className="w-full lg:w-[324px] flex flex-col gap-6 shrink-0">

          <div className="flex flex-col gap-3">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] px-1">
              Online Now
            </h2>
            <div className="flex flex-col gap-3">
              {loading ? (
                <p className="text-[#9EA5AD] text-[13px] px-1">Loading…</p>
              ) : onlinePatients.length === 0 ? (
                <p className="text-[#9EA5AD] text-[13px] px-1">No patients currently online.</p>
              ) : (
                onlinePatients.map(renderCard)
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] px-1">
              Other Appointments in This Slot
            </h2>
            <div className="flex flex-col gap-3">
              {loading ? null : otherSlotPatients.length === 0 ? (
                <p className="text-[#9EA5AD] text-[13px] px-1">No other appointments today.</p>
              ) : (
                otherSlotPatients.map(renderCard)
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Selected EMR History (falls back to this doctor's
            own recent consultations across all patients when nothing's
            selected, or the selected patient has no history yet) */}
        <div className="flex-1 min-w-0 bg-white rounded-[12px] border border-gray-100 p-8 flex flex-col gap-5">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px]">
              EMR
            </span>
            <div className="flex items-center gap-1.5 text-[#707070] text-[12px] font-medium tracking-[-0.24px]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="#707070" />
              </svg>
              <span>Recent</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto">
            {selected && ehrLoading ? (
              <p className="text-[#9EA5AD] text-[13px] py-6 text-center">Loading EMR history…</p>
            ) : selected && visitHistory.length > 0 ? (
              visitHistory.map((visit, idx) => (
                <div
                  key={visit.appointmentId}
                  onClick={() => { setActiveVisit(visit); setActiveVisitPatient(resolveVisitPatient(visit.appointmentId) ?? selected); }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[12px] cursor-pointer transition-all duration-200 ${idx === 0 ? "bg-[#EDF0FF]" : "bg-transparent hover:bg-gray-50"}`}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px]">
                      {visit.reason || "Consultation"}
                    </span>
                    <span className="text-[#777F86] text-[14px] font-normal leading-[1.5] tracking-[-0.28px]">
                      {visit.appointmentId}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[#24292E] text-[14px] font-normal leading-[1.5] tracking-[-0.28px] truncate">
                        Dr. {visit.doctorName}
                      </span>
                    </div>
                    <span className="text-[#9EA5AD] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] mt-1">
                      {new Date(visit.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex justify-end items-center shrink-0">
                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-all">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5.25 10.5L8.75 7L5.25 3.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : recentDoctorVisits.length === 0 ? (
              <p className="text-[#9EA5AD] text-[13px] py-6 text-center">
                {selected ? "No past consultations recorded for this patient." : "No recent consultations yet."}
              </p>
            ) : (
              <>
                {selected && (
                  <p className="text-[#9EA5AD] text-[12px] px-1 -mb-1">
                    No history for {selected.patientName} yet — showing your recent consultations
                  </p>
                )}
                {recentDoctorVisits.map(({ visit, patientName, patientAvatarUrl }, idx) => (
                  <div
                    key={visit.appointmentId}
                    onClick={() => {
                      setActiveVisit(visit);
                      const resolved = resolveVisitPatient(visit.appointmentId);
                      setActiveVisitPatient(resolved ?? {
                        id: visit.appointmentId, patientId: "", patientName, patientEmail: "",
                        patientAvatarUrl, patientAge: null, patientGender: "", patientDob: "",
                        patientBloodGroup: "", patientHeight: "", patientWeight: "",
                        patientChronicIllnesses: "None reported", patientCurrentMedications: "None",
                        patientAllergies: "None", reason: visit.reason, status: visit.status as any,
                        patientWaitingSince: null, preVisitData: null,
                      });
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[12px] cursor-pointer transition-all duration-200 ${idx === 0 ? "bg-[#EDF0FF]" : "bg-transparent hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={patientAvatarUrl || "/default-avatar.svg"}
                        alt={patientName}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                        }}
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[#24292E] text-[14px] font-medium leading-[1.5] tracking-[-0.28px] truncate">
                          {patientName}
                        </span>
                        <span className="text-[#777F86] text-[13px] font-normal leading-[1.4] tracking-[-0.26px] truncate">
                          {visit.reason || "Consultation"}
                        </span>
                        <span className="text-[#9EA5AD] text-[12px] font-normal leading-[1.5] tracking-[-0.24px] mt-1">
                          {new Date(visit.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end items-center shrink-0">
                      <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-all">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5.25 10.5L8.75 7L5.25 3.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Details Card */}
        <div className="w-full lg:w-[372px] shrink-0 bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-[#24292E] font-medium text-[20px] leading-[1.5] tracking-[-0.4px]">
              Patient Details
            </h3>
          </div>

          {!selected ? (
            <p className="text-[#9EA5AD] text-[13px]">Select a patient to view their details.</p>
          ) : (
            <>
              <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[12px] border border-white">
                <img
                  src={selected.patientAvatarUrl || "/default-avatar.svg"}
                  alt={selected.patientName}
                  className="w-11 h-11 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] truncate">
                    {selected.patientName}
                  </span>
                  {selected.patientAge != null && (
                    <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                      {selected.patientAge} Year Old
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => router.push("/appointments/patient-details?id=" + selected.patientId + "&from=waitingroom")}
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
                  <p className="text-[#676E76] text-[12px] leading-[16px] line-clamp-2">
                    {selected.reason}
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
                    onClick={() => setPreVisitPatient(mapToPatient(selected))}
                    className="flex items-center gap-2 text-[#182A6F] font-semibold text-[13px] hover:text-[#5476FC] transition-colors"
                  >
                    <span>Read Pre-visit form</span>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
