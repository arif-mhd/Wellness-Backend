"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import DoctorPersonalInfoForm from "@/components/doctors/DoctorPersonalInfoForm";
import DoctorMedicalCareerForm from "@/components/doctors/DoctorMedicalCareerForm";
import Step4CreatePassword from "@/components/auth/Step4CreatePassword";

async function uploadFiles(
  draftId: string,
  singleFiles: Record<string, File | null>,
  specCertFiles: File[]
): Promise<{ urls: Record<string, string>; specCertUrls: string[] }> {
  const form = new FormData();
  let hasFile = false;
  for (const [field, file] of Object.entries(singleFiles)) {
    if (file) { form.append(field, file); hasFile = true; }
  }
  for (const file of specCertFiles) {
    form.append("specCert", file);
    hasFile = true;
  }
  if (!hasFile) return { urls: {}, specCertUrls: [] };
  form.append("draftId", draftId);

  const res = await apiFetch("/api/clinics/doctors/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("File upload failed");
  const { urls } = await res.json();
  const { specCert, ...rest } = urls ?? {};
  return { urls: rest, specCertUrls: Array.isArray(specCert) ? specCert : specCert ? [specCert] : [] };
}

const STEPS = [
  { key: 1, label: "Personal Information" },
  { key: 2, label: "Medical / Career Information" },
  { key: 3, label: "Set Credentials" },
];

export default function AddDoctorPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [personalInfo, setPersonalInfo] = useState<any>(null);
  const [careerInfo, setCareerInfo] = useState<any>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleStep1Submit = (formData: any) => { setPersonalInfo(formData); setStep(2); };
  const handleStep2Submit = (formData: any) => { setCareerInfo(formData); setStep(3); };

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
      const draftId = `draft_${Date.now()}`;
      const specCertFiles: File[] = (careerInfo?.specializations ?? [])
        .map((s: any) => s.certFile)
        .filter(Boolean);

      const { urls, specCertUrls } = await uploadFiles(
        draftId,
        { avatar: careerInfo?.profilePic ?? null, resume: careerInfo?.resumeFile ?? null },
        specCertFiles
      ).catch(() => ({ urls: {} as Record<string, string>, specCertUrls: [] as string[] }));

      let certIdx = 0;
      const specializations = (careerInfo?.specializations ?? []).map((s: any) => ({
        name: s.name,
        certFileUrl: s.certFile ? specCertUrls[certIdx++] ?? null : null,
      }));

      const payload = {
        email: personalInfo?.email,
        password,
        fullName: personalInfo?.fullName,
        phone: personalInfo?.phone,
        dateOfBirth: personalInfo?.dateOfBirth || null,
        gender: personalInfo?.gender || null,
        emiratesId: personalInfo?.emiratesId || null,
        bloodGroup: personalInfo?.bloodGroup || null,
        address: personalInfo?.location || null,
        languages: Array.isArray(personalInfo?.languages) ? personalInfo.languages.join(", ") : null,
        otherInfo: personalInfo?.otherInfo ?? [],
        avatarUrl: urls.avatar || null,
        license: careerInfo?.licenseNumber || null,
        specializations,
        specialty: careerInfo?.specialty || null,
        consultationRates: careerInfo?.consultationRates ?? [],
        paymentSettings: careerInfo?.paymentSettings || null,
        resumeFileUrl: urls.resume || null,
        bio: careerInfo?.bio || null,
      };

      const res = await apiFetch("/api/clinics/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add doctor.");
      }

      router.push("/clinic/doctors");
    } catch (err: any) {
      console.error("Add doctor submit error:", err);
      setSubmitError(err?.message ?? "Failed to add doctor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-10 lg:px-[40px] py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/clinic/doctors")}
          className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight font-outfit">Add Doctor</h1>
      </div>

      <div className="flex items-center justify-between px-2 w-full pt-2 mb-6 flex-wrap gap-y-3">
        {STEPS.map((s) => {
          const isActive = step === s.key;
          const isDone = step > s.key;
          return (
            <div key={s.key} className={`flex items-center gap-3 ${isActive ? "" : "opacity-60"}`}>
              <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-[12px] font-medium shadow-sm ${
                isActive ? "bg-[#5476FC] shadow-blue-200" : isDone ? "bg-[#5476FC]" : "bg-slate-300"
              }`}>
                {isDone ? "✓" : s.key}
              </div>
              <span className={`text-[13px] font-medium tracking-tight font-outfit ${isActive ? "text-slate-800" : "text-slate-500"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {submitError && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center mb-4">
          {submitError}
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Creating doctor account…</p>
        </div>
      )}

      {step === 1 && <DoctorPersonalInfoForm onSubmit={handleStep1Submit} />}
      {step === 2 && <DoctorMedicalCareerForm onSubmit={handleStep2Submit} onGoBack={() => setStep(1)} />}
      {step === 3 && (
        <div className="w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.04)] border border-indigo-50/40 p-8 md:p-10 font-outfit max-w-xl mx-auto">
          <p className="text-center text-gray-500 text-sm mb-6 -mt-2">
            Create credentials for <span className="font-semibold text-gray-700">Dr. {personalInfo?.fullName}</span>
          </p>
          <Step4CreatePassword
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            loading={submitting}
            onSubmit={handleFinalSubmit}
            onGoBack={() => setStep(2)}
            usernameValue={personalInfo?.email}
            submitLabel="Save Credentials"
            loadingLabel="Saving…"
          />
        </div>
      )}
    </div>
  );
}
