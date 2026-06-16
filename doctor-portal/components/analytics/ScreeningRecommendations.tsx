"use client";

import React, { useState, useMemo } from "react";

interface ScreeningItem {
  name: string;
  count: number;
}

interface ScreeningRecommendationsProps {
  appointments: any[];
}

export default function ScreeningRecommendations({ appointments = [] }: ScreeningRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<"guideline" | "age" | "disease">("guideline");

  // Get completed appointments
  const completedAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.status === "completed" || a.status === "Completed"
    );
  }, [appointments]);

  // Extract unique patient records
  const uniquePatients = useMemo(() => {
    const map = new Map<string, { age: number; gender: string; chronic: string }>();

    completedAppointments.forEach((apt) => {
      const pId = apt.patientId;
      if (!pId) return;

      const dob = apt.patientDob || "";
      let age = 0;
      if (dob) {
        const birthYear = new Date(dob).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      const gender = (apt.patientGender || "other").toLowerCase();
      const chronic = (apt.patientChronicIllnesses || "None").toLowerCase();

      map.set(pId, { age, gender, chronic });
    });

    return Array.from(map.values());
  }, [completedAppointments]);

  // Compute screening recommendations dynamically
  const recommendationsData = useMemo(() => {
    // 1. Guideline Based
    const annualExamCount = uniquePatients.length;
    const fluVaccineCount = uniquePatients.length;
    const lipidPanelCount = uniquePatients.filter((p) => p.age >= 20).length;

    const guidelineList: ScreeningItem[] = [
      { name: "Annual Physical Exam", count: annualExamCount },
      { name: "Influenza Vaccine Recommendation", count: fluVaccineCount },
      { name: "Lipid Panel Lipid Screening", count: lipidPanelCount },
    ].filter(r => r.count > 0);

    // 2. Age related
    const mammogramCount = uniquePatients.filter((p) => p.gender === "female" && p.age >= 40).length;
    const colorectalCount = uniquePatients.filter((p) => p.age >= 50).length;
    const boneDensityCount = uniquePatients.filter((p) => p.gender === "female" && p.age >= 65).length;

    const ageList: ScreeningItem[] = [
      { name: "Mammogram (Females >= 40)", count: mammogramCount },
      { name: "Colorectal Cancer Screening (Age >= 50)", count: colorectalCount },
      { name: "Bone Density Scan (Females >= 65)", count: boneDensityCount },
    ].filter(r => r.count > 0);

    // 3. Disease screening
    const diabeticRetinopathyCount = uniquePatients.filter((p) => p.chronic.includes("diabetes")).length;
    const renalFunctionCount = uniquePatients.filter((p) => p.chronic.includes("hypertension") || p.chronic.includes("kidney")).length;
    const spirometryCount = uniquePatients.filter((p) => p.chronic.includes("asthma") || p.chronic.includes("copd")).length;

    const diseaseList: ScreeningItem[] = [
      { name: "Diabetic Retinopathy Screening (Diabetic Patients)", count: diabeticRetinopathyCount },
      { name: "Renal Function Assessment (Hypertensive Patients)", count: renalFunctionCount },
      { name: "Spirometry / Lung Function Test (Asthma/COPD Patients)", count: spirometryCount },
    ].filter(r => r.count > 0);

    // Sort descending by count
    guidelineList.sort((a, b) => b.count - a.count);
    ageList.sort((a, b) => b.count - a.count);
    diseaseList.sort((a, b) => b.count - a.count);

    return {
      guideline: guidelineList,
      age: ageList,
      disease: diseaseList,
    };
  }, [uniquePatients]);

  const currentList = useMemo(() => {
    return recommendationsData[activeTab];
  }, [recommendationsData, activeTab]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header Filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* Title */}
        <h2 className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px] select-none" style={{ fontFamily: "Outfit, sans-serif" }}>
          Screening Recommendations
        </h2>

        {/* Filter Bar Below Heading */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("guideline")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "guideline"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Guideline Based
          </button>
          <button
            onClick={() => setActiveTab("age")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "age"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Age related
          </button>
          <button
            onClick={() => setActiveTab("disease")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold select-none transition-all shadow-xs ${
              activeTab === "disease"
                ? "bg-[#2E344E] text-white"
                : "bg-white text-[#24292E] border border-[#EBEEF5] hover:bg-gray-50"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Disease screening
          </button>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EBEEF5] shadow-sm flex flex-col gap-4 relative w-full">
        {/* Table Header */}
        <div className="flex justify-between items-center w-full pb-2 border-b border-[#EBEEF5]">
          <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider">Screening Recommendation</span>
          <span className="text-[#838B95] text-xs font-semibold uppercase tracking-wider mr-10">Patients Recommended</span>
        </div>

        {/* Screening List */}
        <div className="flex flex-col gap-1.5 mt-2 max-h-[200px] overflow-y-auto pr-1">
          {currentList.length === 0 ? (
            <div className="text-center text-xs text-[#838B95] py-12">
              No recommendations generated. Check that you have completed consultations with patient demographics.
            </div>
          ) : (
            currentList.map((item, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={item.name}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl transition-all ${
                    isFirst ? "bg-[#F5F6FA]" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[#24292E] text-xs font-semibold truncate max-w-[400px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.name}
                  </span>
                  <span className="text-[#24292E] text-xs font-bold mr-24" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {item.count}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
