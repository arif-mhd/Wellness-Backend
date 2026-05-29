"use client";

import { useState, useEffect } from "react";

const EMIRATES_MAP = [
  { key: "AUH", city: "Abu Dhabi" },
  { key: "DXB", city: "Dubai" },
  { key: "SHJ", city: "Sharjah" },
  { key: "AJM", city: "Ajman" },
  { key: "UAQ", city: "Umm Al-Quwain" },
  { key: "RAK", city: "Ras Al Khaimah" },
  { key: "FUJ", city: "Fujairah" },
];

function EditBtn() {
  return (
    <button className="text-[#596066] hover:text-[#5476FC] transition-colors p-0.5">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.75 9a6.75 6.75 0 1 1-6.75-6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.335 9.788 8.25 9.75V7.665l4.822-4.822a.563.563 0 0 1 .796 0l1.065 1.065a.563.563 0 0 1 0 .795L10.335 9.788Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function InfoCard({ label, value, editable = false, children }: { label: string; value?: string; editable?: boolean; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between">
        <span className="text-[#676E76] text-xs font-normal tracking-tight">{label}</span>
        {editable && <EditBtn />}
      </div>
      {value && <span className="text-[#24292E] text-xs font-bold leading-relaxed">{value}</span>}
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("doctor_onboarding_profile");
      if (stored) {
        try {
          setProfileData(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse onboarding profile:", e);
        }
      }
    }
  }, []);

  const currentFees = EMIRATES_MAP.map((em) => {
    const feeVal = profileData?.medical?.fees?.[em.key];
    return {
      city: em.city,
      fee: feeVal ? `AED ${feeVal}.00` : "AED 200.00",
    };
  });

  const currentDocs = [
    { 
      label: "Medical Degree Certificate", 
      file: profileData?.certifications?.degreeFile || "Med_certificate.pdf" 
    },
    { 
      label: "Specialization Certificates", 
      file: profileData?.certifications?.specFile || "Spec_certificate.pdf" 
    },
    { 
      label: "Other Certificates", 
      file: profileData?.certifications?.addFile || "Certificate.pdf" 
    },
  ];

  return (
    <>
      {/* Doctor hero */}
      <div className="flex items-start gap-5">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/0b0a50ed977ef30d1bbd9b3c2dd92f3ab9134d66?width=132"
          alt={profileData?.personal?.name || "Dr. Jordan Anderson"}
          className="w-[66px] h-[66px] rounded-full border-2 border-white/74 shadow-[0_0_0_4px_rgba(255,255,255,0.25)] object-cover shrink-0"
        />
        <div className="flex flex-col gap-2 justify-center">
          <h1 className="text-[#383F45] text-[32px] font-normal leading-none tracking-tight">
            {profileData?.personal?.name || "Dr. Jordan Anderson"}
          </h1>
          <p className="text-xs tracking-tight">
            <span className="text-[#676E76]">LICENSE NUMBER </span>
            <span className="text-[#5476FC] font-bold">{profileData?.medical?.licenseNumber || "DHA-12345678"}</span>
          </p>
          <span 
            className="inline-flex items-center justify-center bg-[#D6DEFF] text-[#182A6E] text-xs font-semibold leading-none shrink-0"
            style={{
              width: "98px",
              height: "34px",
              borderRadius: "8px",
              paddingTop: "12px",
              paddingBottom: "12px",
              paddingLeft: "16px",
              paddingRight: "16px",
              gap: "10px",
              opacity: 1,
              transform: "rotate(0deg)"
            }}
          >
            {profileData?.medical?.specialization || "Cardiology"}
          </span>
        </div>
      </div>

      {/* Personal Details */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[#24292E] text-base font-medium tracking-tight">Personal Details</h2>
        <div className="flex gap-5">
          <InfoCard label="License Info" value={profileData?.medical?.licenseNumber || "DHA-12345678"} editable />
          <InfoCard label="Languages Known" value={profileData?.personal?.languages || "English, Arabic"} editable />
          <InfoCard label="Consultation Time Limit" editable>
            <div className="flex items-center gap-1.5 text-xs text-[#24292E] font-bold">
              <span>15 Minutes</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </InfoCard>
        </div>
        <InfoCard 
          label="Bio" 
          editable 
          value={profileData?.personal?.bio || "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I have published multiple articles in peer-reviewed journals and received the Excellence in Patient Care Award in 2022. My commitment to ongoing education allows me to provide the highest standard of care to my patients."} 
        />
        <div className="flex gap-6">
          <div className="bg-white rounded-xl p-6 flex flex-col gap-5 flex-1">
            {[
              { label: "Emirates ID",    value: profileData?.personal?.emiratesId || "784-1234-5678" },
              { label: "Contact Number", value: profileData?.personal?.phone || "+971 50 123 4567" },
              { label: "Email ID",       value: profileData?.personal?.email || "john@example.com" },
              { label: "Gender",         value: profileData?.personal?.gender || "Male" },
              { label: "Marital Status", value: profileData?.personal?.maritalStatus || "Married" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-[#676E76] text-xs">{label}</span>
                <span className="text-[#24292E] text-xs font-bold">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 flex flex-col gap-5 flex-1">
            {[
              { label: "Date of Birth", value: profileData?.personal?.dob || "02 January 1990" },
              { label: "Blood Group",   value: profileData?.personal?.bloodGroup || "O +ve" },
              { label: "Height (cm)",   value: profileData?.personal?.height || "176" },
              { label: "Weight (kg)",   value: profileData?.personal?.weight || "86" },
              { label: "Location",      value: profileData?.personal?.address ? `${profileData.personal.address}${profileData.personal.postalCode ? `, Postal Code: ${profileData.personal.postalCode}` : ""}` : "1234 Al Zahra Street, Postal Code: 12345" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span className="text-[#676E76] text-xs">{label}</span>
                <span className="text-[#24292E] text-xs font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Configuration */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[#24292E] text-base font-medium tracking-tight">Fee Configuration</h2>
          <EditBtn />
        </div>
        <div className="flex gap-8">
          <div className="bg-white rounded-xl p-8 flex flex-col gap-6 flex-1 border border-white">
            <span className="text-[#24292E] text-sm font-medium">Consultation Fee</span>
            <div className="flex flex-col gap-2">
              {currentFees.map(({ city, fee }) => (
                <div key={city} className="flex justify-between items-center">
                  <span className="text-[#676E76] text-xs">{city}</span>
                  <span className="text-[#24292E] text-xs font-bold">{fee}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 flex flex-col gap-5 w-[280px] shrink-0 border border-white">
            <span className="text-[#24292E] text-sm font-medium">Documents</span>
            <div className="flex flex-col gap-3">
              {currentDocs.map(({ label, file }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[#596066] text-xs">{label}</span>
                  <a href="#" className="text-[#5476FC] text-sm font-bold underline underline-offset-2">{file}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
