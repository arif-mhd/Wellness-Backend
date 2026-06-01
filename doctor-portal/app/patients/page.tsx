"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MOCK_RECENT_PATIENTS, MOCK_ALL_CONSULTATIONS, Patient } from "./mockData";
import RecentPatientsTable from "@/components/patients/RecentPatientsTable";
import AllConsultationsTable from "@/components/patients/AllConsultationsTable";
import PatientDetailsCard from "@/components/patients/PatientDetailsCard";

export default function PatientsPage() {
  const router = useRouter();
  
  // Selection state - by default, select Albert Flores (MOCK_RECENT_PATIENTS[1]) to match Figma
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(
    MOCK_RECENT_PATIENTS[1]
  );

  // Filter states
  const [activeTab, setActiveTab] = useState<"All" | "Fever" | "Cough" | "Asthma">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"Today" | "All">("Today");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Filter patients by activeTab and searchQuery
  const filteredRecentPatients = useMemo(() => {
    let result = [...MOCK_RECENT_PATIENTS];

    if (activeTab !== "All") {
      result = result.filter(
        (p) => p.diagnosis.toLowerCase() === activeTab.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.diagnosis.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeTab, searchQuery]);

  const filteredAllConsultations = useMemo(() => {
    let result = [...MOCK_ALL_CONSULTATIONS];

    if (activeTab !== "All") {
      result = result.filter(
        (p) => p.diagnosis.toLowerCase() === activeTab.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.diagnosis.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeTab, searchQuery]);

  // Handle message click - show a mock alert/toast or trigger action
  const handleMessageClick = (patient: Patient) => {
    alert(`Starting chat with ${patient.name}...`);
  };

  // Handle complete task action - navigate to patient details screen
  const handleCompleteTask = (patient: Patient) => {
    router.push(`/appointments/patient-details?id=${patient.id}`);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  return (
    <div className="w-full min-h-full px-6 xl:px-[40px] py-8 font-outfit select-none bg-[#F7F9FC]">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        
        {/* Left Side: Tables and Filter controls */}
        <div className="flex-1 w-full flex flex-col gap-8 min-w-0">
          
          {/* Header Row: Patients Title & Go to Waiting Room Button */}
          <div className="flex justify-between items-center w-full">
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
              Patients
            </h1>
            <button
              onClick={() => router.push("/appointments")}
              className="flex items-center gap-2 px-[13px] py-[6px] rounded-[12px] bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white hover:opacity-90 transition-opacity font-medium text-[13px] leading-5 shadow-[0_6px_20px_rgba(84,118,252,0.15)]"
            >
              <span>Go to Waiting Room</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Filters & Search Controls Row */}
          <div className="flex flex-wrap justify-between items-center gap-4 w-full">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {(["All", "Fever", "Cough", "Asthma"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 rounded-full text-[14px] font-normal leading-[1.3] tracking-[-0.28px] transition-all ${
                      isActive
                        ? "bg-[#2E344E] text-white"
                        : "bg-white text-[#222530] hover:bg-gray-100 border border-gray-100 shadow-sm"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Sub Search & Date dropdown filter */}
            <div className="flex items-center gap-4 relative">
              {/* Search input field */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter patients..."
                  className="bg-white border border-[#EBEEF5] text-sm text-[#222530] px-4 py-2 pl-9 rounded-full focus:outline-none focus:border-[#8AA0FF] focus:ring-1 focus:ring-[#8AA0FF] w-[200px] transition-all shadow-sm"
                />
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Date Filter selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-transparent hover:bg-gray-100 rounded transition-colors text-[#707070] text-[12px] font-medium leading-[1.5] tracking-[-0.24px]"
                >
                  <span>{dateFilter}</span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDateDropdown && (
                  <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
                    <button
                      onClick={() => {
                        setDateFilter("Today");
                        setShowDateDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 text-gray-700"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setDateFilter("All");
                        setShowDateDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 text-gray-700"
                    >
                      All
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Recent Patients */}
          <div className="flex flex-col gap-4 w-full">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] select-none">
              Recent Patients
            </h2>
            <RecentPatientsTable
              patients={filteredRecentPatients}
              selectedPatientId={selectedPatient?.id}
              onSelectPatient={handleSelectPatient}
              onCompleteTask={handleCompleteTask}
              onMessageClick={handleMessageClick}
            />
          </div>

          {/* Section: All Consultations */}
          <div className="flex flex-col gap-4 w-full">
            <h2 className="text-[#24292E] font-medium text-[16px] leading-[1.2] tracking-[-0.32px] select-none">
              All Consultations
            </h2>
            <AllConsultationsTable
              patients={filteredAllConsultations}
              selectedPatientId={selectedPatient?.id}
              onSelectPatient={handleSelectPatient}
              onCompleteTask={handleCompleteTask}
              onMessageClick={handleMessageClick}
            />
          </div>

        </div>

        {/* Right Side: Detail Panel */}
        <div className="w-full xl:w-[372px] shrink-0 sticky top-4">
          <PatientDetailsCard
            patient={selectedPatient}
            onClose={() => setSelectedPatient(undefined)}
            onViewProfile={(patient) => {
              // Redirect to appointments dashboard patient profile view
              router.push(`/appointments?patientId=${patient.id}`);
            }}
          />
        </div>

      </div>
    </div>
  );
}
