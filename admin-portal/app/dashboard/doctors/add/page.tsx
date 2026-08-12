"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";
import PersonalInformationForm from "@/components/profile/PersonalInformationForm";
import MedicalCareerForm from "@/components/profile/MedicalCareerForm";
import CertificationDocumentsForm from "@/components/profile/CertificationDocumentsForm";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";
import PaymentSettingsForm from "@/components/profile/PaymentSettingsForm";
import Step4CreatePassword from "@/components/auth/Step4CreatePassword";

// Upload files to blob via the backend (admin-scoped) and return { fieldName: sasUrl }.
async function uploadFiles(
  draftId: string,
  files: Record<string, File | null>
): Promise<Record<string, string>> {
  const form = new FormData();
  let hasFile = false;
  for (const [field, file] of Object.entries(files)) {
    if (file) { form.append(field, file); hasFile = true; }
  }
  if (!hasFile) return {};
  form.append("draftId", draftId);

  const res = await apiFetch("/api/admin/doctors/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("File upload failed");
  const { urls } = await res.json();
  return urls ?? {};
}

// Convert the SetAvailabilityForm's selected slot keys to backend slot objects.
const DAY_KEY_TO_DOW: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

function slotsFromKeys(selectedSlots: string[]) {
  const byDay: Record<string, number[]> = {};
  for (const key of selectedSlots) {
    const parts = key.split("-");
    const day = parts[0];
    const hour = parseInt(parts[1]);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(hour);
  }

  const result: any[] = [];
  for (const [day, hours] of Object.entries(byDay)) {
    const sorted = [...new Set(hours)].sort((a, b) => a - b);
    const blocks: number[][] = [];
    let current: number[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        current.push(sorted[i]);
      } else {
        blocks.push(current);
        current = [sorted[i]];
      }
    }
    blocks.push(current);

    for (const block of blocks) {
      const startTime = `${String(block[0]).padStart(2, "0")}:00`;
      const endTime  = `${String(block[block.length - 1] + 1).padStart(2, "0")}:00`;
      result.push({
        dayOfWeek: DAY_KEY_TO_DOW[day] ?? 0,
        startTime,
        endTime,
        slotDurationMins: 60,
        isActive: true,
      });
    }
  }
  return result;
}

const STEPS = [
  { key: 1, label: "Personal Information" },
  { key: 2, label: "Medical/ Career Information" },
  { key: 3, label: "Certification Documents" },
  { key: 4, label: "Set Availability" },
  { key: 5, label: "Payment Settings" },
  { key: 6, label: "Set Password" },
];

export default function AddDoctorPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [personalInfo, setPersonalInfo] = useState<any>(null);
  const [medicalCareerInfo, setMedicalCareerInfo] = useState<any>(null);
  const [certDocumentsInfo, setCertDocumentsInfo] = useState<any>(null);
  const [availabilityInfo, setAvailabilityInfo] = useState<any>(null);
  const [bankInfo, setBankInfo] = useState<any>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleStep1Submit = (formData: any) => { setPersonalInfo(formData); setStep(2); };
  const handleStep2Submit = (formData: any) => { setMedicalCareerInfo(formData); setStep(3); };
  const handleStep3Submit = (formData: any) => { setCertDocumentsInfo(formData); setStep(4); };
  const handleStep4Submit = (formData: any) => { setAvailabilityInfo(formData); setStep(5); };
  const handleStep5Submit = (formData: any) => { setBankInfo(formData); setStep(6); };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      // 1. Upload files to blob storage under a temp draft id
      const draftId = `draft_${Date.now()}`;
      const fileUrls = await uploadFiles(draftId, {
        avatar:     personalInfo?.profilePic     ?? null,
        emiratesId: personalInfo?.emiratesIdFile  ?? null,
        degree:     certDocumentsInfo?.degreeFile ?? null,
        spec:       certDocumentsInfo?.specFile   ?? null,
        other:      certDocumentsInfo?.addFile    ?? null,
      }).catch(() => ({} as Record<string, string>));

      // 2. Convert availability slot keys → backend slot objects
      const slots = slotsFromKeys(availabilityInfo?.selectedSlots ?? []);

      // 3. Build the full doctor-creation payload
      const payload = {
        email:         personalInfo?.email,
        password,
        fullName:      personalInfo?.fullName,
        phone:         personalInfo?.contactNumber,
        dateOfBirth:   personalInfo?.dob || null,
        gender:        personalInfo?.gender || null,
        emiratesId:    personalInfo?.emiratesId || null,
        bio:           personalInfo?.bio || null,
        businessEmail: personalInfo?.businessEmail || null,
        bloodGroup:    personalInfo?.bloodGroup || null,
        height:        personalInfo?.height || null,
        weight:        personalInfo?.weight || null,
        maritalStatus: personalInfo?.maritalStatus || null,
        address:       personalInfo?.address || null,
        postalCode:    personalInfo?.postalCode || null,
        languages:     Array.isArray(personalInfo?.languages)
                         ? personalInfo.languages.join(", ")
                         : personalInfo?.languages || null,
        avatarUrl:         fileUrls.avatar      || null,
        emiratesIdFileUrl: fileUrls.emiratesId  || null,
        specialty:     medicalCareerInfo?.specialization || null,
        license:       Array.isArray(medicalCareerInfo?.licenses)
                         ? medicalCareerInfo.licenses
                             .filter((l: any) => l.authority && l.number)
                             .map((l: any) => `${l.authority}: ${l.number}`)
                             .join("; ")
                         : null,
        fees:          medicalCareerInfo?.fees ?? null,
        feesPerEmirate: medicalCareerInfo?.fees ?? null,
        slots,
        degreeFileUrl: fileUrls.degree || null,
        specFileUrl:   fileUrls.spec   || null,
        otherFileUrl:  fileUrls.other  || null,
        bankDetails:   bankInfo ?? null,
      };

      const res = await apiFetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create doctor.");
      }

      router.push("/dashboard/doctors");
    } catch (err: any) {
      console.error("Add doctor submit error:", err);
      setSubmitError(err?.message ?? "Failed to create doctor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto space-y-7 pb-12 font-sans px-1 animate-in fade-in duration-300">

        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/doctors")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight">Add Doctor</h1>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between px-2 w-full max-w-5xl pt-2 mb-2 flex-wrap gap-y-3">
          {STEPS.map((s) => {
            const isActive = step === s.key;
            const isDone = step > s.key;
            return (
              <div key={s.key} className={`flex items-center gap-3 ${isActive ? "" : "opacity-60"}`}>
                <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-[12px] font-medium shadow-sm ${
                  isActive ? "bg-[#6A8BFF] shadow-blue-200" : isDone ? "bg-[#6A8BFF]" : "bg-slate-300"
                }`}>
                  {isDone ? "✓" : s.key}
                </div>
                <span className={`text-[13px] font-medium tracking-tight ${isActive ? "text-slate-800" : "text-slate-500"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {submitError && (
          <div className="w-full max-w-3xl bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
            {submitError}
          </div>
        )}

        {submitting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Creating doctor account…</p>
          </div>
        )}

        {/* Step content */}
        <div className="max-w-5xl">
          {step === 1 && (
            <PersonalInformationForm
              initialName={personalInfo?.fullName}
              initialEmail={personalInfo?.email}
              initialPhone={personalInfo?.contactNumber}
              initialDob={personalInfo?.dob}
              initialGender={personalInfo?.gender}
              initialEmiratesId={personalInfo?.emiratesId}
              initialLanguages={personalInfo?.languages}
              onSubmit={handleStep1Submit}
            />
          )}
          {step === 2 && (
            <MedicalCareerForm onSubmit={handleStep2Submit} onGoBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <CertificationDocumentsForm
              initialDegreeFile={certDocumentsInfo?.degreeFile}
              initialSpecFile={certDocumentsInfo?.specFile}
              initialAddFile={certDocumentsInfo?.addFile}
              onSubmit={handleStep3Submit}
              onGoBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <SetAvailabilityForm
              initialAvailability={availabilityInfo?.selectedSlots}
              onSubmit={handleStep4Submit}
              onGoBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <PaymentSettingsForm
              initialBankData={bankInfo}
              onSubmit={handleStep5Submit}
              onGoBack={() => setStep(4)}
            />
          )}
          {step === 6 && (
            <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit max-w-xl mx-auto">
              <Step4CreatePassword
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                loading={submitting}
                onSubmit={handleFinalSubmit}
                onGoBack={() => setStep(5)}
              />
            </div>
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}
