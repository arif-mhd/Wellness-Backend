"use client";

import React, { useState } from "react";
import { WaitingPatient, PastConsultation } from "./types";
import PatientProfileModal from "@/components/appointment/PatientProfileModal";
import PreVisitFormModal from "@/components/appointment/PreVisitFormModal";
import { Patient } from "@/app/appointments/types";

interface ConsultationRoomProps {
  patient: WaitingPatient;
  consultation: PastConsultation;
  onBack: () => void;
}

export default function ConsultationRoom({
  patient,
  consultation,
  onBack,
}: ConsultationRoomProps) {
  const [addendumText, setAddendumText] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  );
  
  const [noteText, setNoteText] = useState(
    "Documentation used by providers to input notes into patients' medical records. Documentation used by providers to input notes into patients' medical records."
  );

  // Profile & pre-visit modal states inside the Consultation Room
  const [profilePatient, setProfilePatient] = useState<Patient | null>(null);
  const [preVisitPatient, setPreVisitPatient] = useState<Patient | null>(null);

  // Helper to map WaitingPatient to Patient type
  const mapToPatient = (wp: WaitingPatient): Patient => ({
    id: wp.id,
    name: wp.name,
    age: wp.age,
    email: wp.email,
    diagnosis: wp.reasonForVisit,
    description: wp.description,
    status: wp.status === "Connected" ? "Waiting" : "Waiting",
    dateTime: "Today",
    avatar: wp.avatar,
    bio: wp.description,
    preVisitForm: {
      chronicIllnesses: "None reported",
      currentMedications: "None",
      allergies: "None",
      primaryConcern: wp.reasonDescription,
      smokes: "No",
      drinks: "No"
    }
  });

  return (
    <div className="w-full min-h-full bg-[#F7F9FC] font-outfit select-none flex flex-col p-4 md:p-6 lg:p-8 animate-fade-in relative">
      {/* Modals */}
      {profilePatient && (
        <PatientProfileModal
          patient={profilePatient}
          onClose={() => setProfilePatient(null)}
        />
      )}

      {preVisitPatient && (
        <PreVisitFormModal
          patient={preVisitPatient}
          onClose={() => setPreVisitPatient(null)}
        />
      )}

      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all"
          aria-label="Back to waiting room"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-[#9EA5AD] text-[12px] uppercase tracking-wider font-semibold">Consultation Room</span>
          <h1 className="text-[#383F45] font-medium text-[24px] leading-tight tracking-[-0.72px]">
            Waiting Room
          </h1>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full flex-1">
        
        {/* Left Column: EMR Detail Forms */}
        <div className="flex-1 min-w-0 bg-white rounded-[12px] border border-gray-100 p-6 md:p-8 flex flex-col gap-6">
          
          {/* EMR Sub-Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EDF0FF] flex items-center justify-center text-[#5476FC]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.3359 4.66797H2.66927C1.93289 4.66797 1.33594 5.26492 1.33594 6.0013V12.668C1.33594 13.4043 1.93289 14.0013 2.66927 14.0013H13.3359C14.0723 14.0013 14.6693 13.4043 14.6693 12.668V6.0013C14.6693 5.26492 14.0723 4.66797 13.3359 4.66797Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.6693 14V3.33333C10.6693 2.97971 10.5288 2.64057 10.2787 2.39052C10.0287 2.14048 9.68956 2 9.33594 2H6.66927C6.31565 2 5.97651 2.14048 5.72646 2.39052C5.47641 2.64057 5.33594 2.97971 5.33594 3.33333V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[#24292E] font-medium text-[16px] leading-tight tracking-[-0.28px]">
                  {patient.name} / {consultation.title}
                </span>
                <span className="text-[#9EA5AD] text-[12px]">Ref: {consultation.ref}</span>
              </div>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-[#F5F6FA] hover:bg-gray-100 rounded-xl text-[#707070] text-[13px] font-medium transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="currentColor"/>
              </svg>
              <span>Lab Reports</span>
            </button>
          </div>

          {/* EMR Content Sheets */}
          <div className="flex flex-col gap-6">
            <h3 className="text-[#24292E] text-[14px] font-bold tracking-[-0.24px] uppercase border-l-4 border-[#5476FC] pl-2.5">
              Electronic Medical Record (EMR)
            </h3>

            {/* Grid of EMR details */}
            <div className="flex flex-col gap-5 bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100">
              
              {/* Patient Information */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]" />
                  <span>Patient Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#676E76] text-[13px] pl-5 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Name:</strong> {patient.name}</div>
                  <div><strong className="text-[#383F45] font-medium">Date of Birth:</strong> {patient.dob}</div>
                  <div><strong className="text-[#383F45] font-medium">Gender:</strong> {patient.gender}</div>
                  <div><strong className="text-[#383F45] font-medium">Emirates ID:</strong> E123456789</div>
                  <div><strong className="text-[#383F45] font-medium">Address:</strong> Villa 23, Al Wasl Road, Dubai, UAE</div>
                  <div><strong className="text-[#383F45] font-medium">Contact Number:</strong> +971 50 123 4567</div>
                  <div><strong className="text-[#383F45] font-medium">Email:</strong> {patient.email}</div>
                  <div><strong className="text-[#383F45] font-medium">Medical Record Number:</strong> MRN123456</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Provider Information */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Provider Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[#676E76] text-[13px] pl-5 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Healthcare Facility:</strong> Dubai Health Authority (DHA) Clinic</div>
                  <div><strong className="text-[#383F45] font-medium">Provider Name:</strong> {consultation.doctor}</div>
                  <div><strong className="text-[#383F45] font-medium">Specialty:</strong> General Practitioner</div>
                  <div><strong className="text-[#383F45] font-medium">Date of Encounter:</strong> 29/01/2025</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Medical History */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Medical History</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Chief Complaint:</strong> Persistent cough and fever for the past 3 days</div>
                  <div><strong className="text-[#383F45] font-medium">History of Present Illness:</strong> Ahmed has been experiencing a dry cough and fever (up to 38.5°C) for the past 3 days. He also reports feeling fatigued and having a slight headache. No recent travel history or contact with sick individuals.</div>
                  <div><strong className="text-[#383F45] font-medium">Past Medical History:</strong> Hypertension (controlled with medication)</div>
                  <div><strong className="text-[#383F45] font-medium">Medications:</strong> Amlodipine 5 mg daily</div>
                  <div><strong className="text-[#383F45] font-medium">Allergies:</strong> None known</div>
                  <div><strong className="text-[#383F45] font-medium">Family Medical History:</strong> Father with type 2 diabetes, mother with hypertension</div>
                  <div><strong className="text-[#383F45] font-medium">Social History:</strong> Non-smoker, occasional alcohol consumption, works as a software engineer</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Physical Examination */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Physical Examination</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Vital Signs:</strong> Temperature: 38.2°C | Blood Pressure: 135/85 mmHg | Heart Rate: 90 bpm | Respiratory Rate: 18 breaths/min | Oxygen Saturation: 98%</div>
                  <div><strong className="text-[#383F45] font-medium">General Appearance:</strong> Well-developed, well-nourished, in no acute distress</div>
                  <div><strong className="text-[#383F45] font-medium">HEENT:</strong> Conjunctivae clear, tympanic membranes intact, pharynx without erythema</div>
                  <div><strong className="text-[#383F45] font-medium">Cardiovascular:</strong> Regular rate and rhythm, no murmurs</div>
                  <div><strong className="text-[#383F45] font-medium">Respiratory:</strong> Clear to auscultation bilaterally, no wheezes or crackles</div>
                  <div><strong className="text-[#383F45] font-medium">Abdomen:</strong> Soft, non-tender, no organomegaly</div>
                  <div><strong className="text-[#383F45] font-medium">Musculoskeletal:</strong> Full range of motion in all extremities, no joint swelling</div>
                  <div><strong className="text-[#383F45] font-medium">Neurological:</strong> Alert and oriented x3, normal motor and sensory function</div>
                  <div><strong className="text-[#383F45] font-medium">Skin:</strong> No rashes or lesions</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Diagnostic Tests */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Diagnostic Tests</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Laboratory Results:</strong> CBC: WBC 11.2 x10^9/L, Hb 14.5 g/dL, Platelets 250 x10^9/L | CRP: Elevated at 45 mg/L</div>
                  <div><strong className="text-[#383F45] font-medium">Imaging Studies:</strong> Chest X-ray shows no significant findings</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Assessment */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Assessment</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-2 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Diagnosis:</strong> Upper respiratory tract infection</div>
                  <div><strong className="text-[#383F45] font-medium">Differential Diagnosis:</strong> Viral syndrome, early bacterial infection</div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-200/60" />

              {/* Documentation */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#24292E] font-semibold text-[13px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3CB3DA]" />
                  <span>Documentation</span>
                </div>
                <div className="text-[#676E76] text-[13px] pl-5 flex flex-col gap-1 leading-[1.6]">
                  <div><strong className="text-[#383F45] font-medium">Electronic Signature:</strong> {consultation.doctor}</div>
                  <div><strong className="text-[#383F45] font-medium">Date:</strong> 29/01/2025</div>
                </div>
              </div>

            </div>

            {/* Add Addendum Box */}
            <div className="flex flex-col gap-2">
              <label className="text-[#24292E] font-medium text-[13px] pl-1">Add Addendum</label>
              <textarea
                value={addendumText}
                onChange={(e) => setAddendumText(e.target.value)}
                className="w-full h-[120px] p-4 bg-[#F5F6FA] border border-transparent hover:border-gray-200 focus:border-[#5476FC] focus:bg-white rounded-xl text-[#676E76] text-[13px] leading-relaxed transition-all focus:outline-none resize-none"
              />
            </div>

            {/* Rich Text Editor Note Box */}
            <div className="flex flex-col gap-2">
              <label className="text-[#24292E] font-medium text-[13px] pl-1">Write note / Add to EMR here</label>
              <div className="w-full rounded-xl bg-[#F5F6FA] border border-transparent overflow-hidden flex flex-col">
                
                {/* Editor Toolbar */}
                <div className="flex items-center gap-1.5 p-2 bg-white/70 border-b border-gray-100">
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Bold">
                    <strong>B</strong>
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic transition-colors" title="Italic">
                    I
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 underline transition-colors" title="Underline">
                    U
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 line-through transition-colors" title="Strikethrough">
                    S
                  </button>
                  <div className="w-px h-5 bg-gray-300 mx-1" />
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-mono text-xs transition-colors" title="Inline Code">
                    &lt;/&gt;
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Clear Formatting">
                    Tx
                  </button>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full h-[150px] p-4 bg-white focus:bg-white text-[#676E76] text-[13px] leading-relaxed transition-all focus:outline-none resize-none border-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 justify-end mt-2">
              <button
                onClick={onBack}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-[#24292E] font-medium text-[13px] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("EMR Saved successfully!");
                  onBack();
                }}
                className="px-6 py-2.5 rounded-xl text-white font-medium text-[13px] transition-all hover:opacity-90"
                style={{ background: "linear-gradient(180deg, #8AA0FF 0%, #5476FC 100%)" }}
              >
                Save EMR
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Selected Patient Details Card */}
        <div className="w-full lg:w-[372px] shrink-0 bg-[#F5F6FA] border border-white rounded-[12px] p-6 flex flex-col gap-6">
          
          {/* Patient Details Header */}
          <div className="flex flex-col gap-1">
            <h3 className="text-[#24292E] font-medium text-[20px] leading-[1.5] tracking-[-0.4px]">
              Patient Details
            </h3>
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-4 bg-white/40 p-4 rounded-[12px] border border-white">
            <img
              src={patient.avatar}
              alt={patient.name}
              className="w-11 h-11 rounded-full object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://api.builder.io/api/v1/image/assets/TEMP/f3dc26797671e7caea0bc2f0647901599c916831?width=72";
              }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] truncate">
                {patient.name}
              </span>
              <span className="text-[#676E76] font-bold text-[12px] leading-[1.5] tracking-[-0.24px]">
                {patient.age} Year Old
              </span>
            </div>
          </div>

          {/* Patient Description bio snippet */}
          <p className="text-[#676E76] text-[12px] leading-[16px] tracking-[-0.24px] bg-white/40 p-4 rounded-[12px] border border-white whitespace-pre-wrap">
            {patient.description}
          </p>

          {/* View Profile Primary-Color-tint Button */}
          <button
            onClick={() => setProfilePatient(mapToPatient(patient))}
            className="flex w-full justify-center items-center py-2.5 rounded-[12px] bg-[#E0E7FF] hover:bg-[#D0DBFF] text-[#182A6F] font-semibold text-[13px] transition-all duration-200"
          >
            View Profile
          </button>

          <div className="w-full h-px bg-[#EBEEF5]" />

          {/* Fields sections */}
          <div className="flex flex-col gap-3">
            {/* Reason for visit */}
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-1">
              <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                Reason for visit
              </span>
              <p className="text-[#676E76] text-[12px] leading-[16px] line-clamp-2">
                {patient.reasonDescription}
              </p>
            </div>

            {/* Pre-visit form review card */}
            <div className="p-4 rounded-[12px] bg-white shadow-sm flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[#24292E] text-[12px] font-normal leading-[1.5] tracking-[-0.24px]">
                  Pre-visit Form
                </span>
                <p className="text-[#676E76] text-[12px] leading-[16px]">
                  Review the patient&apos;s pre-visit form to understand their medical history and reason for the appointment.
                </p>
              </div>

              <button
                onClick={() => setPreVisitPatient(mapToPatient(patient))}
                className="flex items-center gap-2 text-[#182A6F] font-semibold text-[13px] hover:text-[#5476FC] transition-colors"
              >
                <span>Read Pre-visit form</span>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
