"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import logoImg from "@/assets/images/wellness_logo.png";
import ProfileCompletionSidebar from "@/components/profile/ProfileCompletionSidebar";
import PersonalInformationForm from "@/components/profile/PersonalInformationForm";
import MedicalCareerForm from "@/components/profile/MedicalCareerForm";
import CertificationDocumentsForm from "@/components/profile/CertificationDocumentsForm";
import SetAvailabilityForm from "@/components/profile/SetAvailabilityForm";
import PaymentSettingsForm from "@/components/profile/PaymentSettingsForm";

function CompleteProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Wizard Step State (1 to 5)
  const [step, setStep] = useState(1);

  // Initial values from signup URL parameters
  const nameParam = searchParams.get("name") || "";
  const emailParam = searchParams.get("email") || "";
  const phoneParam = searchParams.get("phone") || "";
  const dobParam = searchParams.get("dob") || "";
  const genderParam = searchParams.get("gender") || "";
  const emiratesIdParam = searchParams.get("emiratesId") || "";

  // Wizard States for each step (for backward navigation state preservation)
  const [personalInfo, setPersonalInfo] = useState<any>({
    name: nameParam,
    email: emailParam,
    phone: phoneParam,
    dob: dobParam,
    gender: genderParam,
    emiratesId: emiratesIdParam,
    bio: "",
    businessEmail: "",
    bloodGroup: "",
    height: "",
    weight: "",
    maritalStatus: "",
    address: "",
    postalCode: "",
    languages: "",
    profilePic: null,
    emiratesIdFile: null
  });

  const [medicalCareerInfo, setMedicalCareerInfo] = useState<any>(null);
  const [certDocumentsInfo, setCertDocumentsInfo] = useState<any>(null);
  const [availabilityInfo, setAvailabilityInfo] = useState<any>(null);
  const [paymentSettingsInfo, setPaymentSettingsInfo] = useState<any>(null);

  // Step 1 Submit: Personal Info -> Step 2
  const handleStep1Submit = (formData: any) => {
    console.log("Step 1 (Personal Info) Saved:", formData);
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
      languages: formData.languages,
      profilePic: formData.profilePic,
      emiratesIdFile: formData.emiratesIdFile
    });
    setStep(2);
  };

  // Step 2 Submit: Medical Specialties -> Step 3
  const handleStep2Submit = (formData: any) => {
    console.log("Step 2 (Medical Specialization) Saved:", formData);
    setMedicalCareerInfo(formData);
    setStep(3);
  };

  // Step 3 Submit: Certificates -> Step 4
  const handleStep3Submit = (formData: any) => {
    console.log("Step 3 (Certification Documents) Saved:", formData);
    setCertDocumentsInfo(formData);
    setStep(4);
  };

  // Step 4 Submit: Availability Calendar -> Step 5
  const handleStep4Submit = (formData: any) => {
    console.log("Step 4 (Set Availability) Saved:", formData);
    setAvailabilityInfo(formData);
    setStep(5);
  };

  // Step 5 Submit: Payment settings -> Final submission and redirect
  const handleStep5Submit = (formData: any) => {
    console.log("Step 5 (Payment Settings) Saved:", formData);
    setPaymentSettingsInfo(formData);

    // Transform raw File objects into serializable string names
    const serializablePersonal = {
      ...personalInfo,
      profilePic: personalInfo.profilePic ? personalInfo.profilePic.name : null,
      emiratesIdFile: personalInfo.emiratesIdFile ? personalInfo.emiratesIdFile.name : null,
    };

    const serializableCerts = {
      ...certDocumentsInfo,
      degreeFile: certDocumentsInfo?.degreeFile ? certDocumentsInfo.degreeFile.name : null,
      specFile: certDocumentsInfo?.specFile ? certDocumentsInfo.specFile.name : null,
      addFile: certDocumentsInfo?.addFile ? certDocumentsInfo.addFile.name : null,
    };

    const consolidatedData = {
      personal: serializablePersonal,
      medical: medicalCareerInfo,
      certifications: serializableCerts,
      availability: availabilityInfo,
      payment: formData
    };

    console.log("=== Profile Complete Process Successful ===");
    console.log(consolidatedData);

    // Save to localStorage so profile pages read the entered details
    if (typeof window !== "undefined") {
      localStorage.setItem("doctor_onboarding_profile", JSON.stringify(consolidatedData));
    }

    // Redirect to doctor profile page
    router.push("/dashboard/profile");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between py-12 px-4 md:px-8 overflow-hidden font-outfit">
      
      {/* Decorative Blurs */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none select-none" />
      <div className="absolute -top-24 -right-24 w-[350px] h-[350px] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <div className="relative z-10 w-full max-w-[1300px] mx-auto flex flex-col items-center flex-1 justify-start pt-4">
        
        {/* Wellness Logo at Top */}
        <div className="mb-10 select-none">
          <Image
            src={logoImg}
            alt="Wellness Central Logo"
            width={160}
            height={50}
            className="object-contain hover:opacity-90 transition-opacity"
            priority
          />
        </div>

        {/* Dual-Column Layout */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          
          {/* Left Column: Progress Stepper Sidebar (spans 4/12 cols) */}
          <div className="lg:col-span-4 h-full">
            <ProfileCompletionSidebar currentStep={step} />
          </div>

          {/* Right Column: Dynamic Form depending on Step (spans 8/12 cols) */}
          <div className="lg:col-span-8">
            {step === 1 && (
              <PersonalInformationForm 
                initialName={personalInfo.name}
                initialEmail={personalInfo.email}
                initialPhone={personalInfo.phone}
                initialDob={personalInfo.dob}
                initialGender={personalInfo.gender}
                initialEmiratesId={personalInfo.emiratesId}
                onSubmit={handleStep1Submit}
              />
            )}

            {step === 2 && (
              <MedicalCareerForm 
                onSubmit={handleStep2Submit}
                onGoBack={() => setStep(1)}
              />
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
                initialBankData={paymentSettingsInfo}
                onSubmit={handleStep5Submit}
                onGoBack={() => setStep(4)}
              />
            )}
          </div>

        </div>

      </div>

      {/* Footer links */}
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
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin"></div>
          <span className="text-gray-500 text-sm font-light">Loading Onboarding...</span>
        </div>
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  );
}
