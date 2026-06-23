"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";
import { apiFetch } from "@/lib/apiFetch";
import IntakePlan, { EmrSections, EMPTY_EMR_SECTIONS, VisitInfo, EMPTY_VISIT_INFO } from "@/components/video-call/IntakePlan";
import AddMedicines, { Medicine } from "@/components/video-call/AddMedicines";
import AddLabs, { LabRecommendation } from "@/components/video-call/AddLabs";

function CompleteEmrForm() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const appointmentId = searchParams.get("appointmentId") ?? "";
  const patientName   = searchParams.get("patientName")   ?? "Patient";

  const [emrSections, setEmrSections] = useState<EmrSections>(EMPTY_EMR_SECTIONS);
  const [visitInfo, setVisitInfo] = useState<VisitInfo>(EMPTY_VISIT_INFO);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labs, setLabs] = useState<LabRecommendation[]>([]);
  const [patientProfile, setPatientProfile] = useState<any | null>(null);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingEmr, setSavingEmr] = useState(false);
  const [emrSaved, setEmrSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("reasonForVisit");

  useEffect(() => {
    Session.getUserId().then((id) => setCurrentDoctorId(id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!appointmentId) return;
    (async () => {
      setLoading(true);
      try {
        const [emrRes, ehrRes] = await Promise.all([
          apiFetch(`/api/appointments/${appointmentId}/emr`),
          apiFetch(`/api/appointments/${appointmentId}/ehr`),
        ]);

        if (emrRes.ok) {
          const { emr } = await emrRes.json();
          if (emr) {
            if (emr.sections) setEmrSections({ ...EMPTY_EMR_SECTIONS, ...emr.sections });
            if (emr.visitInfo) setVisitInfo({ ...EMPTY_VISIT_INFO, ...emr.visitInfo });
            setMedicines(emr.medicines ?? []);
            setLabs(emr.labs ?? []);
          }
        }

        if (ehrRes.ok) {
          const { profile } = await ehrRes.json();
          setPatientProfile(profile ?? null);
        }
      } catch {
        // ignore — start with a blank EMR
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  const saveEmr = async () => {
    setSavingEmr(true);
    try {
      await apiFetch(`/api/appointments/${appointmentId}/emr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: emrSections, visitInfo, medicines, labs }),
      });
      setEmrSaved(true);
      setTimeout(() => setEmrSaved(false), 2500);
    } catch {} finally { setSavingEmr(false); }
  };

  if (!appointmentId) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-96px)] text-[#676e76] text-sm">
        Missing appointment ID.
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white" style={{ height: "calc(100vh - 96px)" }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={() => router.push("/dashboard/prescriptions")}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex flex-col">
          <p className="text-[#24292e] text-xs font-semibold">Complete EMR — {patientName}</p>
          <p className="text-gray-400 text-[10px]">This consultation has already ended. Fill in and save the clinical record below.</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="px-6 py-4 flex flex-col gap-5 max-w-[1100px] mx-auto">
              <IntakePlan
                sections={emrSections}
                onChange={setEmrSections}
                openSection={expandedSection}
                onToggleSection={setExpandedSection}
                patientProfile={patientProfile}
                visitInfo={visitInfo}
                onVisitInfoChange={setVisitInfo}
              />

              <div className="grid grid-cols-2 gap-4">
                <AddMedicines medicines={medicines} onChange={setMedicines} currentDoctorId={currentDoctorId ?? undefined} />
                <AddLabs labs={labs} onChange={setLabs} currentDoctorId={currentDoctorId ?? undefined} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom save bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => router.push("/dashboard/prescriptions")}
            className="h-9 px-5 rounded-full border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={saveEmr} disabled={savingEmr}
            className={`h-9 px-6 rounded-xl text-white text-xs font-bold transition-all ${emrSaved ? "bg-green-500" : "bg-[#5476fc] hover:bg-[#4466ec] shadow-[0_2px_8px_rgba(84,118,252,0.3)]"}`}>
            {savingEmr ? "Saving…" : emrSaved ? "Saved ✓" : "Save EMR"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompleteEmrPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-96px)] items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#5476fc] border-t-transparent rounded-full animate-spin"/>
      </div>
    }>
      <CompleteEmrForm />
    </Suspense>
  );
}
