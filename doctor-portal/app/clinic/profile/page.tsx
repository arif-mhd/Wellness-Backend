"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { signOut } from "supertokens-web-js/recipe/session";

// ── Small helpers ──────────────────────────────────────────────────────────────

function EditBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[#596066] hover:text-[#5476FC] transition-colors p-0.5 shrink-0">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.75 9a6.75 6.75 0 1 1-6.75-6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.335 9.788 8.25 9.75V7.665l4.822-4.822a.563.563 0 0 1 .796 0l1.065 1.065a.563.563 0 0 1 0 .795L10.335 9.788Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function SectionCard({ title, children, onEdit, editLabel }: { title: string, children: React.ReactNode, onEdit?: () => void, editLabel?: string }) {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[#24292E] text-sm font-medium tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</span>
        {onEdit && (
          editLabel ? (
            <button onClick={onEdit} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[11px] font-medium px-4 py-1.5 rounded-lg shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none">
              {editLabel}
            </button>
          ) : (
            <EditBtn onClick={onEdit} />
          )
        )}
      </div>
      <div className="h-[1px] bg-[#EBEEF5] w-full" />
      <div className="text-[#676E76] text-[13px] font-normal leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, bold }: { label: string, value: string, bold?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#676E76] text-xs" style={{ fontFamily: "Outfit, sans-serif" }}>{label}</span>
      <span className={`text-[#24292E] text-[13px] ${bold ? 'font-medium' : 'font-normal'}`} style={{ fontFamily: "Outfit, sans-serif" }}>{value || "—"}</span>
    </div>
  );
}

export default function ClinicProfilePage() {
  const router = useRouter();
  const [clinic, setClinic] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/clinics/me")
      .then((r) => r.json())
      .then((data) => {
        setClinic(data.clinic ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try { await signOut(); } catch { /* ignore */ }
    router.replace("/auth/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#5476FC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 overflow-y-auto h-full w-full">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
          
          {/* Hero Section */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-5">
              <div className="w-[84px] h-[84px] rounded-full border-2 border-[#EBEEF5] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {clinic.clinicImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.clinicImageUrl} alt="Clinic Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#5476FC] text-2xl font-bold">{clinic.fullName?.[0]?.toUpperCase() || "C"}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-[#24292E] text-[28px] font-medium leading-none tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {clinic.fullName || "Your Clinic Name"}
                </h1>
                <span className="text-[#676E76] text-sm" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Lic number {clinic.licenseNumber || "123456789"}
                </span>
              </div>
            </div>
            <button onClick={handleLogout} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-6 py-2 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              LOGOUT
            </button>
          </div>

          <div className="h-[1px] bg-[#EBEEF5] w-full" />

          {/* Time slots */}
          <SectionCard title="Time slots" onEdit={() => {}} editLabel="EDIT TIMESLOTS">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {["Mon", "Tue", "Wed"].map(day => (
                <div key={day} className="min-w-[140px]">
                  {day} : 09 am to 05 pm
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Bio */}
          <SectionCard title="Bio" onEdit={() => {}}>
            {clinic.bio || "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."}
          </SectionCard>

          {/* Speciality */}
          <SectionCard title="Speciality" onEdit={() => {}}>
            {clinic.specialty || "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."}
          </SectionCard>

          {/* Licenses */}
          <SectionCard title="Licenses" onEdit={() => {}}>
            {clinic.licensesInfo || "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s."}
          </SectionCard>

          {/* Locations */}
          <SectionCard title="Locations" onEdit={() => {}}>
            {clinic.location || "Lorem ipsum"}
          </SectionCard>

          {/* Insurances */}
          <SectionCard title="Insurances" onEdit={() => {}}>
            <ul className="flex flex-col gap-1">
              <li>1 - Insurance 1</li>
              <li>2 - Insurance 2</li>
              <li>3 - Insurance 3</li>
              <li>4 - Insurance 4</li>
            </ul>
          </SectionCard>

          <div className="h-[1px] bg-[#EBEEF5] w-full my-2" />

          {/* Owner Details */}
          <SectionCard title="Owner Details" onEdit={() => {}}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
              <Field label="Contact Number" value={clinic.ownerPhone || "+971 50 123 4567"} bold />
              <Field label="Height" value={clinic.ownerHeight || "175 cm"} bold />
              <Field label="Weight" value={clinic.ownerWeight || "70 kg"} bold />
              
              <Field label="Emirates ID" value={clinic.ownerEmiratesId || "784-1234-5678901-2"} bold />
              <Field label="Location" value={clinic.ownerLocation || "Dubai"} bold />
              <div className="hidden lg:block"></div>
              
              <Field label="Email ID" value={clinic.ownerEmail || clinic.email || "owner@clinic.com"} bold />
              <Field label="Languages" value={clinic.ownerLanguages || "English, Arabic"} bold />
              <div className="hidden lg:block"></div>
              
              <Field label="Gender" value={clinic.ownerGender || "Male"} bold />
              <div className="col-span-1 lg:col-span-2 row-span-4 bg-gray-50/50 rounded-lg p-3">
                <span className="text-[#24292E] text-[13px] font-medium block mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Medical informations</span>
                <ul className="flex flex-col gap-1.5 text-xs text-[#676E76]">
                  <li>• No known allergies</li>
                  <li>• Blood pressure: Normal</li>
                  <li>• Diabetic: No</li>
                </ul>
              </div>
              
              <Field label="Date of Birth" value={clinic.ownerDob || "15 Jan 1980"} bold />
              <Field label="Blood Group" value={clinic.ownerBloodGroup || "O+"} bold />
              <Field label="Marital Status" value={clinic.ownerMaritalStatus || "Married"} bold />
            </div>
          </SectionCard>
          
        </div>

        {/* Right Sidebar - Reviews & Ratings */}
        <div className="w-full lg:w-[340px] xl:w-[380px] bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all p-6 flex flex-col gap-6 shrink-0">
          <h2 className="text-[#24292E] text-base font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Rating and Reviews</h2>
        
        <div className="flex gap-2">
          <button className="flex-1 bg-[#A0A8B0] text-white py-2 rounded text-xs font-medium uppercase tracking-wider">Patient (200)</button>
          <button className="flex-1 bg-[#C4C9CF] text-white py-2 rounded text-xs font-medium uppercase tracking-wider hover:bg-[#A0A8B0] transition-colors">Peer (53)</button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#24292E] text-[28px] font-medium leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>4.5</span>
          <div className="flex items-center gap-1">
            {[1,2,3,4].map(i => (
              <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            ))}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#A0A8B0" stroke="#A0A8B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex flex-col gap-1.5 pb-4 border-b border-[#D6DEFF] last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[#24292E] text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>Patient Name</span>
                <div className="flex items-center">
                  {[1,2,3,4,5].map(star => (
                    <svg key={star} width="10" height="10" viewBox="0 0 24 24" fill={star <= 4 ? "#3B82F6" : "#A0A8B0"} stroke={star <= 4 ? "#3B82F6" : "#A0A8B0"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  ))}
                </div>
              </div>
              <p className="text-[#676E76] text-[11px] leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
}
