"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import ClinicCompanyInfoForm from "@/components/profile/ClinicCompanyInfoForm";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";

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
      const endTime = `${String(block[block.length - 1] + 1).padStart(2, "0")}:00`;
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

interface Branch {
  id: string;
  name: string;
  address: string;
  licenseNumber: string | null;
  dohLicense: string | null;
  status: string;
}

type Phase = "loading" | "notReady" | "companyInfo" | "availability" | "submitting" | "done";

export default function CompleteBranchSetupPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);
  const router = useRouter();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    apiFetch(`/api/clinics/branches/${branchId}`)
      .then((r) => r.json())
      .then((data) => {
        const b = data.branch ?? null;
        setBranch(b);
        setPhase(b?.status === "details_pending" ? "companyInfo" : "notReady");
      })
      .catch(() => setPhase("notReady"));
  }, [branchId]);

  const handleCompanyInfoSubmit = (data: any) => {
    setCompanyInfo(data);
    setPhase("availability");
  };

  const handleAvailabilitySubmit = async (data: any) => {
    setPhase("submitting");
    setSubmitError("");
    try {
      const fileUrls: Record<string, string> = {};
      if (companyInfo?.addressProofFile || companyInfo?.clinicImage) {
        const form = new FormData();
        if (companyInfo.addressProofFile) form.append("addressProofFile", companyInfo.addressProofFile);
        if (companyInfo.clinicImage) form.append("clinicImage", companyInfo.clinicImage);
        const uploadRes = await apiFetch(`/api/clinics/branches/${branchId}/upload`, { method: "POST", body: form });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          Object.assign(fileUrls, uploadData.urls ?? {});
        }
      }

      const res = await apiFetch(`/api/clinics/branches/${branchId}/submit-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseNumber: companyInfo?.licenseNumber || null,
          dohLicense: companyInfo?.dohLicense || null,
          address: companyInfo?.address || null,
          addressProofFileUrl: fileUrls.addressProofFile || null,
          consultationRates: companyInfo?.consultationRates ?? [],
          paymentSettings: companyInfo?.paymentSettings || null,
          bio: companyInfo?.bio || null,
          clinicImageUrl: fileUrls.clinicImage || null,
          slots: slotsFromKeys(data?.selectedSlots ?? []),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to submit branch details.");
      }
      setPhase("done");
    } catch (err: any) {
      setSubmitError(err.message ?? "Failed to submit branch details.");
      setPhase("availability");
    }
  };

  if (phase === "loading") {
    return <div className="px-8 py-12 text-center text-sm text-[#A0A8B0]">Loading...</div>;
  }

  if (phase === "notReady") {
    return (
      <div className="px-8 py-12 text-center flex flex-col items-center gap-4">
        <p className="text-sm text-[#676E76]">
          {branch
            ? "This branch isn't awaiting details submission right now."
            : "Branch not found."}
        </p>
        <button
          onClick={() => router.push("/clinic/branches")}
          className="bg-[#1E293B] text-white text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0f172a] transition-colors"
        >
          Back to Branches
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="px-8 py-16 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#E2F8EB] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#179353" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h1 className="text-[#24292E] text-xl font-medium">Details Submitted</h1>
        <p className="text-sm text-[#676E76]">
          {branch?.name}&apos;s full profile and schedule have been sent to the platform admin for final approval. You&apos;ll be able to manage it here once it goes live.
        </p>
        <button
          onClick={() => router.push("/clinic/branches")}
          className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-sm font-medium px-6 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          Back to Branches
        </button>
      </div>
    );
  }

  return (
    <div className="px-8 pb-12" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex items-center gap-3 mb-6 mt-2">
        <button
          onClick={() => router.push("/clinic/branches")}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
            Complete Setup — {branch?.name}
          </h1>
          <p className="text-[#676E76] text-[13px] mt-0.5">
            Your platform admin approved this branch request. Fill in the rest of its profile and schedule to send it for final approval.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-6 text-sm text-center">
          {submitError}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {phase === "companyInfo" && (
          <ClinicCompanyInfoForm
            heading="Branch / Company Information"
            initialLicenseNumber={branch?.licenseNumber ?? ""}
            initialDohLicense={branch?.dohLicense ?? ""}
            initialAddress={branch?.address ?? ""}
            onSubmit={handleCompanyInfoSubmit}
            onGoBack={() => router.push("/clinic/branches")}
          />
        )}
        {(phase === "availability" || phase === "submitting") && (
          <SetAvailabilityForm
            heading="Timing and Schedules"
            onSubmit={handleAvailabilitySubmit}
            onGoBack={() => setPhase("companyInfo")}
          />
        )}
      </div>
    </div>
  );
}
