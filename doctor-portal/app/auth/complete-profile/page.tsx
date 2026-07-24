"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/apiFetch";
import logoImg from "@/assets/images/wellness_logo.png";
import ProfileCompletionSidebar from "@/components/profile/ProfileCompletionSidebar";
import OwnersPersonalInfoForm from "@/components/profile/OwnersPersonalInfoForm";
import InsurancesForm from "@/components/profile/InsurancesForm";
import ClinicCompanyInfoForm from "@/components/profile/ClinicCompanyInfoForm";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";
import BranchCountForm from "@/components/profile/BranchCountForm";
import ProfileVerificationModal from "@/components/profile/ProfileVerificationModal";
import MultiBranchPopup from "@/components/profile/MultiBranchPopup";

// Upload files to blob via the backend and return { fieldName: sasUrl } map.
// branchIndex namespaces the blob path for a multi-branch loop iteration so
// each branch's files don't overwrite one another; omit it for org-level
// uploads (insurance SPC contract) and the single-branch path.
async function uploadFiles(
  files: Record<string, File | null>,
  branchIndex?: number
): Promise<Record<string, string>> {
  const form = new FormData();
  let hasFile = false;
  for (const [field, file] of Object.entries(files)) {
    if (file) { form.append(field, file); hasFile = true; }
  }
  if (!hasFile) return {};
  if (branchIndex !== undefined) form.append("branchIndex", String(branchIndex));

  const res = await apiFetch("/api/clinics/upload", {
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

type Phase = "owner" | "insurances" | "branchCount" | "companyInfo" | "availability";

function CompleteProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("owner");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showMultiBranchPopup, setShowMultiBranchPopup] = useState(false);

  // Additional-branch loop state — every clinic always fills in one
  // Company Info + Availability pair first (their main branch, collected
  // below via mainCompanyInfo/mainAvailabilityInfo); this loop only runs
  // for branches *beyond* that one, so isMultiBranch/branchIndex/branchCount
  // here always describe "how many extra locations", never the main one.
  const [isMultiBranch, setIsMultiBranch] = useState(false);
  const [branchCount, setBranchCount] = useState(0);
  const [branchIndex, setBranchIndex] = useState(0);
  const [branchDrafts, setBranchDrafts] = useState<any[]>([]);
  const [currentBranchName, setCurrentBranchName] = useState("");

  const emailParam      = searchParams.get("email")      || "";

  const [ownerInfo, setOwnerInfo] = useState<any>(null);
  const [insuranceInfo, setInsuranceInfo] = useState<any>(null);
  // The main branch's own company info/availability — every clinic has
  // this, whether or not they go on to add more branches.
  const [mainCompanyInfo, setMainCompanyInfo] = useState<any>(null);
  const [mainAvailabilityInfo, setMainAvailabilityInfo] = useState<any>(null);

  const ownerPayloadFields = () => ({
    fullName:             ownerInfo?.fullName || null,
    phone:                ownerInfo?.contactNumber || null,
    emiratesIdOrPassport: ownerInfo?.emiratesIdOrPassport || null,
    email:                ownerInfo?.email || null,
    gender:               ownerInfo?.gender || null,
    dateOfBirth:          ownerInfo?.dateOfBirth || null,
    positionInClinic:     ownerInfo?.positionInClinic || null,
    bloodGroup:           ownerInfo?.bloodGroup || null,
    maritalStatus:        ownerInfo?.maritalStatus || null,
    height:               ownerInfo?.height || null,
    weight:               ownerInfo?.weight || null,
    languages:            Array.isArray(ownerInfo?.languages) ? ownerInfo.languages.join(", ") : null,
    otherInfo:            ownerInfo?.otherInfo ?? [],
  });

  const handleStep1Submit = (formData: any) => { setOwnerInfo(formData); setPhase("insurances"); };

  // Insurances is always followed directly by the main branch's own Company
  // Info + Availability — every clinic fills these in once, regardless of
  // whether it turns out to have extra branches. The "do you operate
  // additional branches?" popup only appears *after* that, once there's
  // already a main branch established to compare "additional" against.
  const handleStep2Submit = (formData: any) => {
    setInsuranceInfo(formData);
    setPhase("companyInfo");
  };

  const handleNoBranches = () => {
    setShowMultiBranchPopup(false);
    submitSingleBranch();
  };

  const handleYesBranches = () => {
    setShowMultiBranchPopup(false);
    setPhase("branchCount");
  };

  const handleBranchCountSubmit = (n: number) => {
    setIsMultiBranch(true);
    setBranchCount(n);
    setBranchIndex(0);
    setBranchDrafts([]);
    setCurrentBranchName("");
    setPhase("companyInfo");
  };

  const handleCompanyInfoGoBack = () => {
    if (!isMultiBranch) { setPhase("insurances"); return; }
    if (branchIndex === 0) { setPhase("branchCount"); return; }
    setBranchIndex((i) => i - 1);
    setPhase("availability");
  };

  const handleCompanyInfoSubmit = (formData: any) => {
    if (!isMultiBranch) {
      // Main branch — always collected exactly once.
      setMainCompanyInfo(formData);
      setPhase("availability");
      return;
    }
    setBranchDrafts((prev) => {
      const next = [...prev];
      next[branchIndex] = { ...next[branchIndex], ...formData };
      return next;
    });
    setPhase("availability");
  };

  // The org's own top-level fields ARE its main branch — no separate
  // branches[] entry for it, whether or not extra branches follow.
  const submitSingleBranch = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      const fileUrls = await uploadFiles({
        spcContract:   insuranceInfo?.spcContractFile   ?? null,
        addressProof:  mainCompanyInfo?.addressProofFile ?? null,
        logo:          mainCompanyInfo?.clinicImage       ?? null,
      }).catch(() => ({} as Record<string, string>));

      const slots = slotsFromKeys(mainAvailabilityInfo?.selectedSlots ?? []);

      const insurances = (insuranceInfo?.insurances ?? []).map((row: any) => ({
        ...row,
        spcContractFileUrl: fileUrls.spcContract || null,
        verified: !!insuranceInfo?.spcVerified,
      }));

      const payload: Record<string, any> = {
        ...ownerPayloadFields(),
        insurances,
        licenseNumber:        mainCompanyInfo?.licenseNumber || null,
        dohLicense:           mainCompanyInfo?.dohLicense || null,
        address:              mainCompanyInfo?.address || null,
        addressProofFileUrl:  fileUrls.addressProof || null,
        consultationRates:    mainCompanyInfo?.consultationRates ?? [],
        paymentSettings:      mainCompanyInfo?.paymentSettings || null,
        bio:                  mainCompanyInfo?.bio || null,
        clinicImageUrl:       fileUrls.logo || null,
        slots,
      };

      const res = await apiFetch("/api/clinics/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed to save profile (${res.status}).`);
      }

      setShowVerificationModal(true);
    } catch (err: any) {
      console.error("Profile submit error:", err);
      setSubmitError(err?.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitMultiBranch = async (drafts: any[]) => {
    setSubmitting(true);
    setSubmitError("");

    try {
      // Insurances and the main branch's own files are org-level uploads —
      // once each, not namespaced per branch.
      const mainFileUrls = await uploadFiles({
        spcContract:  insuranceInfo?.spcContractFile    ?? null,
        addressProof: mainCompanyInfo?.addressProofFile ?? null,
        logo:         mainCompanyInfo?.clinicImage       ?? null,
      }).catch(() => ({} as Record<string, string>));

      const insurances = (insuranceInfo?.insurances ?? []).map((row: any) => ({
        ...row,
        spcContractFileUrl: mainFileUrls.spcContract || null,
        verified: !!insuranceInfo?.spcVerified,
      }));

      const branches = await Promise.all(drafts.map(async (b, i) => {
        const fileUrls = await uploadFiles({
          addressProof: b.addressProofFile ?? null,
          logo:         b.clinicImage      ?? null,
        }, i).catch(() => ({} as Record<string, string>));

        return {
          id: "branch_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "_" + i,
          name:                 b.branchName || `Branch ${i + 1}`,
          licenseNumber:        b.licenseNumber || null,
          dohLicense:           b.dohLicense || null,
          address:              b.address || null,
          addressProofFileUrl:  fileUrls.addressProof || null,
          consultationRates:    b.consultationRates ?? [],
          paymentSettings:      b.paymentSettings || null,
          bio:                  b.bio || null,
          clinicImageUrl:       fileUrls.logo || null,
          slots:                slotsFromKeys(b.selectedSlots ?? []),
          status:               "pending_approval",
          requestedAt:          new Date().toISOString(),
        };
      }));

      const payload: Record<string, any> = {
        ...ownerPayloadFields(),
        insurances,
        licenseNumber:        mainCompanyInfo?.licenseNumber || null,
        dohLicense:           mainCompanyInfo?.dohLicense || null,
        address:              mainCompanyInfo?.address || null,
        addressProofFileUrl:  mainFileUrls.addressProof || null,
        consultationRates:    mainCompanyInfo?.consultationRates ?? [],
        paymentSettings:      mainCompanyInfo?.paymentSettings || null,
        bio:                  mainCompanyInfo?.bio || null,
        clinicImageUrl:       mainFileUrls.logo || null,
        slots:                slotsFromKeys(mainAvailabilityInfo?.selectedSlots ?? []),
        isMultiBranchOrg: true,
        branches,
      };

      const res = await apiFetch("/api/clinics/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed to save profile (${res.status}).`);
      }

      setShowVerificationModal(true);
    } catch (err: any) {
      console.error("Multi-branch profile submit error:", err);
      setSubmitError(err?.message ?? "Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvailabilitySubmit = (formData: any) => {
    if (!isMultiBranch) {
      // Main branch's availability is in — now ask whether there's more.
      // The Availability screen stays mounted underneath as the popup's
      // backdrop, matching the reference wireframe's floating-overlay look.
      setMainAvailabilityInfo(formData);
      setShowMultiBranchPopup(true);
      return;
    }

    const updatedDrafts = [...branchDrafts];
    updatedDrafts[branchIndex] = { ...updatedDrafts[branchIndex], selectedSlots: formData?.selectedSlots ?? [] };
    setBranchDrafts(updatedDrafts);

    if (branchIndex + 1 < branchCount) {
      setBranchIndex((i) => i + 1);
      setCurrentBranchName("");
      setPhase("companyInfo");
    } else {
      submitMultiBranch(updatedDrafts);
    }
  };

  const sidebarStep =
    phase === "owner" ? 1 :
    phase === "insurances" ? 2 :
    phase === "branchCount" || phase === "companyInfo" ? 3 :
    4;

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="relative z-10 w-full max-w-[1300px] mx-auto flex flex-col items-center flex-1 justify-start pt-4">
        <div className="mb-10 flex items-center gap-3 select-none">
          <Image src={logoImg} alt="Wellness Central Logo" width={160} height={50} className="object-contain hover:opacity-90 transition-opacity" priority />
          <span className="text-[0.7rem] font-semibold tracking-[0.15em] text-[#5476FC] uppercase pl-3 border-l border-indigo-100">
            Clinic
          </span>
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

        {showMultiBranchPopup && (
          <MultiBranchPopup onNo={handleNoBranches} onYes={handleYesBranches} />
        )}

        {showVerificationModal && (
          <ProfileVerificationModal onClose={() => router.push("/auth/login")} />
        )}

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          <div className="lg:col-span-4 h-full">
            <ProfileCompletionSidebar currentStep={sidebarStep} />
          </div>
          <div className="lg:col-span-8">
            {phase === "owner" && (
              <OwnersPersonalInfoForm
                initialEmail={emailParam}
                onSubmit={handleStep1Submit}
              />
            )}
            {phase === "insurances" && (
              <InsurancesForm onSubmit={handleStep2Submit} onGoBack={() => setPhase("owner")} />
            )}
            {phase === "branchCount" && (
              <BranchCountForm
                onSubmit={handleBranchCountSubmit}
                onGoBack={() => { setPhase("availability"); setShowMultiBranchPopup(true); }}
              />
            )}
            {phase === "companyInfo" && (
              isMultiBranch ? (
                <ClinicCompanyInfoForm
                  key={`ci-${branchIndex}`}
                  onSubmit={handleCompanyInfoSubmit}
                  onGoBack={handleCompanyInfoGoBack}
                  branchName={currentBranchName}
                  onBranchNameChange={setCurrentBranchName}
                  heading={`Branch ${branchIndex + 1} of ${branchCount} — Company Information`}
                />
              ) : (
                <ClinicCompanyInfoForm
                  key="ci-single"
                  onSubmit={handleCompanyInfoSubmit}
                  onGoBack={handleCompanyInfoGoBack}
                />
              )
            )}
            {phase === "availability" && (
              <SetAvailabilityForm
                key={isMultiBranch ? `av-${branchIndex}` : "av-single"}
                initialAvailability={isMultiBranch ? branchDrafts[branchIndex]?.selectedSlots : mainAvailabilityInfo?.selectedSlots}
                onSubmit={handleAvailabilitySubmit}
                onGoBack={() => setPhase("companyInfo")}
                heading={isMultiBranch ? `Branch ${branchIndex + 1} of ${branchCount} — Set Availability` : undefined}
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
