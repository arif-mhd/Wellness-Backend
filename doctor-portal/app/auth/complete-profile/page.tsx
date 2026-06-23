"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/apiFetch";
import logoImg from "@/assets/images/wellness_logo.png";
import ProfileCompletionSidebar from "@/components/profile/ProfileCompletionSidebar";
import PersonalInformationForm from "@/components/profile/PersonalInformationForm";
import MedicalCareerForm from "@/components/profile/MedicalCareerForm";
import CertificationDocumentsForm from "@/components/profile/CertificationDocumentsForm";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";
import PaymentSettingsForm from "@/components/profile/PaymentSettingsForm";

// Upload files to blob via the backend and return { fieldName: sasUrl } map
async function uploadFiles(
  files: Record<string, File | null>
): Promise<Record<string, string>> {
  const form = new FormData();
  let hasFile = false;
  for (const [field, file] of Object.entries(files)) {
    if (file) { form.append(field, file); hasFile = true; }
  }
  if (!hasFile) return {};

  const res = await apiFetch("/api/doctors/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("File upload failed");
  const { urls } = await res.json();
  return urls ?? {};
}

// Convert the SetAvailabilityForm's selected slot keys to backend slot objects.
// Keys look like "MON-09:00", "MON-10:00", "TUE-14:00" …
// We group by day, find min startTime and max endTime+1h, mark each active day.
const DAY_KEY_TO_DOW: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

function slotsFromKeys(selectedSlots: string[]) {
  // Group hours by weekday
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
    // Split into contiguous blocks
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

function CompleteProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const nameParam      = searchParams.get("name")       || "";
  const emailParam     = searchParams.get("email")      || "";
  const phoneParam     = searchParams.get("phone")      || "";
  const dobParam       = searchParams.get("dob")        || "";
  const genderParam    = searchParams.get("gender")     || "";
  const emiratesIdParam = searchParams.get("emiratesId") || "";

  const [personalInfo, setPersonalInfo] = useState<any>({
    name: nameParam, email: emailParam, phone: phoneParam,
    dob: dobParam, gender: genderParam, emiratesId: emiratesIdParam,
    bio: "", businessEmail: "", bloodGroup: "", height: "", weight: "",
    maritalStatus: "", address: "", postalCode: "", languages: [],
    profilePic: null, emiratesIdFile: null,
  });
  const [medicalCareerInfo, setMedicalCareerInfo]   = useState<any>(null);
  const [certDocumentsInfo, setCertDocumentsInfo]   = useState<any>(null);
  const [availabilityInfo, setAvailabilityInfo]     = useState<any>(null);

  const handleStep1Submit = (formData: any) => {
    setPersonalInfo({
      name: nameParam,
      email: formData.email,
      phone: formData.contactNumber,
      dob: formData.dob,
      gender: formData.gender,
      emiratesId: formData.emiratesId,
      bio: formData.bio,
      businessEmail: formData.businessEmail,
      bloodGroup: formData.bloodGroup,
      height: formData.height,
      weight: formData.weight,
      maritalStatus: formData.maritalStatus,
      address: formData.address,
      postalCode: formData.postalCode,
      languages: formData.languages,   // now an array
      profilePic: formData.profilePic,
      emiratesIdFile: formData.emiratesIdFile,
    });
    setStep(2);
  };

  const handleStep2Submit = (formData: any) => { setMedicalCareerInfo(formData); setStep(3); };
  const handleStep3Submit = (formData: any) => { setCertDocumentsInfo(formData); setStep(4); };
  const handleStep4Submit = (formData: any) => { setAvailabilityInfo(formData);  setStep(5); };

  const handleStep5Submit = async (formData: any) => {
    setSubmitting(true);
    setSubmitError("");

    try {
      // 1. Upload files to blob storage
      const fileUrls = await uploadFiles({
        avatar:     personalInfo.profilePic    ?? null,
        emiratesId: personalInfo.emiratesIdFile ?? null,
        degree:     certDocumentsInfo?.degreeFile ?? null,
        spec:       certDocumentsInfo?.specFile   ?? null,
        other:      certDocumentsInfo?.addFile    ?? null,
      }).catch(() => ({} as Record<string, string>));

      // 2. Convert availability slot keys → backend slot objects
      const slots = slotsFromKeys(availabilityInfo?.selectedSlots ?? []);

      // 3. Build profile payload
      const payload: Record<string, any> = {
        bio:           personalInfo.bio           || null,
        businessEmail: personalInfo.businessEmail || null,
        bloodGroup:    personalInfo.bloodGroup     || null,
        height:        personalInfo.height         || null,
        weight:        personalInfo.weight         || null,
        maritalStatus: personalInfo.maritalStatus  || null,
        address:       personalInfo.address        || null,
        postalCode:    personalInfo.postalCode      || null,
        // Store languages as comma-separated string for backend compatibility
        languages:     Array.isArray(personalInfo.languages)
                         ? personalInfo.languages.join(", ")
                         : personalInfo.languages || null,
        avatarUrl:         fileUrls.avatar      || null,
        emiratesIdFileUrl: fileUrls.emiratesId  || null,
        specialty:     medicalCareerInfo?.specialty    || null,
        license:       medicalCareerInfo?.license      || null,
        experience:    medicalCareerInfo?.experience   || null,
        medicalSchool: medicalCareerInfo?.medicalSchool|| null,
        residency:     medicalCareerInfo?.residency    || null,
        fees:          formData?.consultationFee || formData?.fees || null,
        feesPerEmirate: formData?.feesPerEmirate || null,
        slots,
        degreeFileUrl: fileUrls.degree || null,
        specFileUrl:   fileUrls.spec   || null,
        otherFileUrl:  fileUrls.other  || null,
      };

      // 4. Save profile
      await apiFetch("/api/doctors/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      router.push("/auth/pending");
    } catch (err: any) {
      console.error("Profile submit error:", err);
      setSubmitError("Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="relative z-10 w-full max-w-[1300px] mx-auto flex flex-col items-center flex-1 justify-start pt-4">
        <div className="mb-10 select-none">
          <Image src={logoImg} alt="Wellness Central Logo" width={160} height={50} className="object-contain hover:opacity-90 transition-opacity" priority />
        </div>

        {submitError && (
          <div className="w-full max-w-xl bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center">
            {submitError}
          </div>
        )}

        {submitting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Saving your profile…</p>
          </div>
        )}

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          <div className="lg:col-span-4 h-full">
            <ProfileCompletionSidebar currentStep={step} />
          </div>
          <div className="lg:col-span-8">
            {step === 1 && (
              <PersonalInformationForm
                initialName={personalInfo.name}
                initialEmail={personalInfo.email}
                initialPhone={personalInfo.phone}
                initialDob={personalInfo.dob}
                initialGender={personalInfo.gender}
                initialEmiratesId={personalInfo.emiratesId}
                initialLanguages={personalInfo.languages}
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
                initialBankData={undefined}
                onSubmit={handleStep5Submit}
                onGoBack={() => setStep(4)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1300px] mx-auto flex justify-center gap-3 text-[0.75rem] text-gray-400 font-light pt-8 select-none z-10 border-t border-gray-100">
        <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
        <span>|</span>
        <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-outfit">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
          <span className="text-gray-500 text-sm font-light">Loading Onboarding…</span>
        </div>
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  );
}
