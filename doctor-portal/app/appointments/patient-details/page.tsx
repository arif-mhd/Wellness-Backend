"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MOCK_NEW_APPOINTMENTS, MOCK_ALL_CONSULTATIONS } from "../mockData";
import { MOCK_WAITING_PATIENTS } from "@/components/waiting-room/mockData";
import { Patient } from "../types";
import { WaitingPatient } from "@/components/waiting-room/types";
import PatientProfileModal from "@/components/appointment/PatientProfileModal";

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
  preVisitFormDate: wp.dob,
  preVisitForm: {
    chronicIllnesses: "None reported",
    currentMedications: "None",
    allergies: "None",
    primaryConcern: wp.reasonDescription,
    smokes: "No",
    drinks: "No"
  }
});

function PatientDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const from = searchParams.get("from");
  const mode = searchParams.get("mode");
  const tab = searchParams.get("tab") as any;

  const allPatients: Patient[] = [
    ...MOCK_NEW_APPOINTMENTS,
    ...MOCK_ALL_CONSULTATIONS,
    ...MOCK_WAITING_PATIENTS.map(mapToPatient)
  ];

  const patient = allPatients.find((p) => p.id === id) || allPatients[0];

  const handleClose = () => {
    if (from === "waitingroom") {
      router.push("/appointments/waitingroom");
    } else {
      router.push("/appointments");
    }
  };

  return <PatientProfileModal patient={patient} onClose={handleClose} mode={mode} initialTab={tab} />;
}

export default function PatientDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F9FC] text-gray-500 font-outfit">
        Loading patient details...
      </div>
    }>
      <PatientDetailsContent />
    </Suspense>
  );
}
