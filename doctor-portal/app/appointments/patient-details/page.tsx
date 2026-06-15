"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import { Patient } from "../types";
import PatientProfileModal from "@/components/appointment/PatientProfileModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function PatientDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const from = searchParams.get("from");
  const mode = searchParams.get("mode");
  const tab = searchParams.get("tab") as any;

  const [dbPatient, setDbPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPatient() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const accessToken = await Session.getAccessToken();
        if (!accessToken) {
          setLoading(false);
          return;
        }
        const headers = { Authorization: `Bearer ${accessToken}` };
        const res = await fetch(`${API_URL}/api/appointments/doctor`, { headers });
        if (res.ok) {
          const { appointments } = await res.json();
          const match = appointments?.find((a: any) => a.patientId === id);
          if (match) {
            const dob = match.patientDob || "";
            let age = 0;
            if (dob) {
              const birthYear = new Date(dob).getFullYear();
              if (!isNaN(birthYear)) {
                age = new Date().getFullYear() - birthYear;
              }
            }
            setDbPatient({
              id: match.patientId,
              name: match.patientName ?? "Patient",
              age: age,
              email: match.patientEmail ?? "",
              diagnosis: match.reason ?? "Consultation",
              description: match.reason ?? "",
              status: "Completed",
              dateTime: match.scheduledAt ?? "",
              avatar: match.patientAvatarUrl || "/patient-avatar-1.png",
              bio: match.reason ?? "",
              gender: match.patientGender || "N/A",
              phone: match.patientPhone || "N/A",
              bloodGroup: match.patientBloodGroup || "N/A",
              height: match.patientHeight || "N/A",
              weight: match.patientWeight || "N/A",
              dob: dob,
              preVisitFormDate: dob,
              preVisitForm: {
                chronicIllnesses: match.patientChronicIllnesses || "None reported",
                currentMedications: match.patientCurrentMedications || "None",
                allergies: match.patientAllergies || "None",
                primaryConcern: match.reason ?? "",
                smokes: "No",
                drinks: "No"
              }
            });
          }
        }
      } catch (err) {
        console.error("Error fetching patient details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [id]);

  const handleClose = () => {
    if (from === "waitingroom") {
      router.push("/appointments/waitingroom");
    } else if (from === "patients") {
      router.push("/dashboard/patients");
    } else {
      router.push("/appointments");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F9FC] text-gray-500 font-outfit">
        Loading patient details...
      </div>
    );
  }

  if (!dbPatient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F9FC] text-gray-500 font-outfit">
        Patient details not found in database.
      </div>
    );
  }

  return <PatientProfileModal patient={dbPatient} onClose={handleClose} mode={mode} initialTab={tab} />;
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
