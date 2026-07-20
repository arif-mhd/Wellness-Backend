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
    <div className="px-8 py-8 overflow-y-auto h-full w-full bg-[#F9FAFB]" style={{ fontFamily: "Outfit, sans-serif" }}>
      
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-10 max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/clinic/doctors")}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          Add Doctor
        </h1>
      </div>

      {/* ── Wizard Progress ── */}
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-12 relative px-4">
        <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-[#E4E8F0] -z-10 -translate-y-1/2" />
        <div 
          className="absolute top-1/2 left-4 h-[2px] bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] -z-10 -translate-y-1/2 transition-all duration-500 ease-out" 
          style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : 'calc(100% - 32px)' }} 
        />
        
        {STEPS.map(s => (
          <div key={s.key} className="flex flex-col items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold transition-all duration-300 ${step >= s.key ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md scale-110" : "bg-white border-2 border-[#E4E8F0] text-[#A7AAB4]"}`}>
              {step > s.key ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> : s.key}
            </div>
            <span className={`text-[12px] font-bold whitespace-nowrap absolute top-12 transition-colors ${step >= s.key ? "text-[#24292E]" : "text-[#A7AAB4]"}`}>{s.label}</span>
          </div>
        ))}
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

      <div className="max-w-4xl mx-auto">
        {step === 1 && <DoctorPersonalInfoForm onSubmit={handleStep1Submit} />}
        {step === 2 && <DoctorMedicalCareerForm onSubmit={handleStep2Submit} onGoBack={() => setStep(1)} />}
        {step === 3 && (
          <div className="w-full bg-white rounded-3xl shadow-sm border border-[#E4E8F0] p-8 md:p-12 font-outfit animate-fade-in max-w-xl mx-auto">
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
    </div>
  );
}
