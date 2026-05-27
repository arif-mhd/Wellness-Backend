"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MOCK_NEW_APPOINTMENTS, MOCK_ALL_CONSULTATIONS } from "./mockData";
import { Patient } from "./types";
import NewAppointmentsTable from "@/components/appointment/NewAppointmentsTable";
import AllConsultationsTable from "@/components/appointment/AllConsultationsTable";
import AppointmentDetailsCard from "@/components/appointment/AppointmentDetailsCard";
import ConsultationModal from "@/components/appointment/ConsultationModal";
import PatientProfileModal from "@/components/appointment/PatientProfileModal";
import { useSidebar } from "@/components/SidebarContext";

export default function AppointmentsPage() {
  const router = useRouter();
  const { isOpen: sidebarOpen } = useSidebar();
  const [activeTab, setActiveTab] = useState<"All" | "Upcoming" | "Past">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [dateFilter, setDateFilter] = useState<"Today" | "All">("Today");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Dynamic sorting states
  const [sortField, setSortField] = useState<"name" | "age" | "diagnosis" | "dateTime" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Selection states
  // By default, select Albert Flores (MOCK_NEW_APPOINTMENTS[1]) to match figma page load
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(MOCK_NEW_APPOINTMENTS[1]);

  // Call simulation state
  const [activeConsultationPatient, setActiveConsultationPatient] = useState<Patient | null>(null);

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toggle sorting
  const handleSort = (field: "name" | "age" | "diagnosis" | "dateTime") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    triggerToast(`Sorted consultations by ${field} (${sortOrder === "asc" ? "descending" : "ascending"})`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveTab("All");
    setDateFilter("Today");
    setSortField(null);
    triggerToast("Reset all table filters");
  };

  // Filter New Appointments list
  const filteredNewAppointments = useMemo(() => {
    let result = [...MOCK_NEW_APPOINTMENTS];

    // Filter by tab selection
    if (activeTab === "Upcoming") {
      result = result.filter(appt => appt.status === "Scheduled");
    } else if (activeTab === "Past") {
      result = []; // New appointments are generally not past/completed
    }

    // Filter by inline search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        appt =>
          appt.name.toLowerCase().includes(q) ||
          appt.diagnosis.toLowerCase().includes(q) ||
          appt.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeTab, searchQuery]);

  // Filter & Sort All Consultations list
  const filteredAllConsultations = useMemo(() => {
    let result = [...MOCK_ALL_CONSULTATIONS];

    // Filter by tab selection
    if (activeTab === "Upcoming") {
      result = result.filter(c => c.status === "Scheduled" || c.status === "Waiting");
    } else if (activeTab === "Past") {
      result = result.filter(c => c.status === "Completed");
    }

    // Filter by inline search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.diagnosis.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField] ?? "";
        let valB = b[sortField] ?? "";

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return result;
  }, [activeTab, searchQuery, sortField, sortOrder]);

  return (
    <div className={`p-4 font-outfit select-none relative min-h-full flex flex-col lg:flex-row gap-8 transition-all duration-300 ${sidebarOpen
        ? "md:p-6 lg:p-6 xl:p-8 xl:pl-[24px] xl:pr-[24px]"
        : "md:p-8 lg:p-10 lg:pl-[40px] lg:pr-[40px]"
      }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24292E] text-white px-4 py-3 rounded-[12px] flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-white/10 animate-slide-up text-sm font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8AA0FF]"></div>
          <span>{toastMessage}</span>
        </div>
      )}


      {/* Video Call Modal */}
      {activeConsultationPatient && (
        <ConsultationModal
          patient={activeConsultationPatient}
          onClose={() => {
            triggerToast(`Completed consultation with ${activeConsultationPatient.name}`);
            setActiveConsultationPatient(null);
          }}
        />
      )}

      {/* Left Panel - Tables & Filters */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Title and Top Action Row */}
        <div className="flex justify-between items-center w-full">
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Appointments
          </h1>

          <button
            onClick={() => router.push("/appointments/waitingroom")}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#758FFF] hover:to-[#4065FB] hover:shadow-md text-white font-medium text-[13px] rounded-[12px] transition-all duration-200"
          >
            <span>Go to Waiting Room</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.125 14.625L15.75 9L10.125 3.375M15.75 9H2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Tab Filters Row */}
        <div className="flex justify-between items-center w-full relative">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tabs */}
            <button
              onClick={() => {
                setActiveTab("All");
                setSelectedPatient(MOCK_NEW_APPOINTMENTS[1] || MOCK_NEW_APPOINTMENTS[0]);
              }}
              className={`px-4 py-2 text-[14px] font-normal leading-[1.3] tracking-[-0.28px] rounded-full transition-all duration-200 ${activeTab === "All"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#222530] hover:bg-gray-50 border border-[#EBEEF5]"
                }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setActiveTab("Upcoming");
                const upcoming = MOCK_NEW_APPOINTMENTS.find(p => p.status === "Scheduled" || p.status === "Waiting") || MOCK_NEW_APPOINTMENTS[1];
                setSelectedPatient(upcoming);
              }}
              className={`px-4 py-2 text-[14px] font-normal leading-[1.3] tracking-[-0.28px] rounded-full transition-all duration-200 ${activeTab === "Upcoming"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#222530] hover:bg-gray-50 border border-[#EBEEF5]"
                }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => {
                setActiveTab("Past");
                const completed = MOCK_ALL_CONSULTATIONS.find(c => c.status === "Completed");
                if (completed) {
                  setSelectedPatient(completed);
                }
              }}
              className={`px-4 py-2 text-[14px] font-normal leading-[1.3] tracking-[-0.28px] rounded-full transition-all duration-200 ${activeTab === "Past"
                  ? "bg-[#2E344E] text-white"
                  : "bg-white text-[#222530] hover:bg-gray-50 border border-[#EBEEF5]"
                }`}
            >
              Past
            </button>

            {/* Inline Search Toggle */}
            <div className="relative flex items-center">
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className={`p-2.5 bg-white rounded-full flex items-center justify-center border border-[#EBEEF5] hover:bg-gray-50 transition-all ${showSearchInput ? "border-[#8AA0FF] bg-[#E0E7FF]/20" : ""
                  }`}
                title="Search Appointments"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12.2484 12.2504L9.71094 9.71289" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showSearchInput && (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter name or diagnosis..."
                  className="absolute left-11 bg-white text-xs border border-[#EBEEF5] rounded-full px-4 py-2 w-48 shadow-md outline-none focus:ring-2 focus:ring-[#8AA0FF]/30 transition-all z-20"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Today Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100/75 rounded-[8px] transition-all text-[#707070] text-[12px] font-medium tracking-[-0.24px]"
            >
              <span>{dateFilter === "Today" ? "Today" : "All Dates"}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 ${showDateDropdown ? "rotate-180" : ""}`}>
                <path d="M4 6L8 10L12 6" stroke="#707070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 top-8 bg-white border border-[#EBEEF5] rounded-[12px] shadow-lg py-1.5 w-28 z-25 font-outfit text-xs text-[#24292E]">
                <button
                  onClick={() => {
                    setDateFilter("Today");
                    setShowDateDropdown(false);
                    triggerToast("Filtered to today's appointments");
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${dateFilter === "Today" ? "font-bold text-[#5476FC]" : ""}`}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    setDateFilter("All");
                    setShowDateDropdown(false);
                    triggerToast("Showing all appointment dates");
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${dateFilter === "All" ? "font-bold text-[#5476FC]" : ""}`}
                >
                  All Dates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: New Appointments */}
        {activeTab === "All" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[#24292E] font-medium text-[16px] tracking-[-0.32px]">
                New Appointments
              </h2>
              {searchQuery && (
                <button onClick={handleResetFilters} className="text-xs text-[#5476FC] hover:underline">
                  Clear Filters
                </button>
              )}
            </div>

            <NewAppointmentsTable
              appointments={filteredNewAppointments}
              selectedPatientId={selectedPatient?.id}
              onSelectPatient={setSelectedPatient}
              onConsult={setActiveConsultationPatient}
              onViewPreVisitForm={(patient) => router.push("/appointments/previsit-form?id=" + patient.id)}
            />
          </div>
        )}

        {/* Section 2: All Consultations */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[#24292E] font-medium text-[16px] tracking-[-0.32px]">
            All Consultations
          </h2>

          {/* Table Sorting Filters Bar */}
          <div className="flex justify-between items-center w-full py-1">
            <div className="flex items-center gap-6">
              {/* Name sort */}
              <button
                onClick={() => handleSort("name")}
                className={`flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.24px] ${sortField === "name" ? "text-[#5476FC]" : "text-[#707070] hover:text-[#24292E]"
                  }`}
              >
                <span>Name</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Age sort */}
              <button
                onClick={() => handleSort("age")}
                className={`flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.24px] ${sortField === "age" ? "text-[#5476FC]" : "text-[#707070] hover:text-[#24292E]"
                  }`}
              >
                <span>Age</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Diagnosis sort */}
              <button
                onClick={() => handleSort("diagnosis")}
                className={`flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.24px] ${sortField === "diagnosis" ? "text-[#5476FC]" : "text-[#707070] hover:text-[#24292E]"
                  }`}
              >
                <span>Diagnosis</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Date sort */}
              <button
                onClick={() => handleSort("dateTime")}
                className={`flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.24px] ${sortField === "dateTime" ? "text-[#5476FC]" : "text-[#707070] hover:text-[#24292E]"
                  }`}
              >
                <span>Date</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Quick action button filter reset */}
            <button
              onClick={handleResetFilters}
              className="w-7 h-7 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-[#5476FC] border border-[#EBEEF5] transition-all shadow-sm"
              title="Reset Filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
              </svg>
            </button>
          </div>

          <AllConsultationsTable
            consultations={filteredAllConsultations}
            selectedPatientId={selectedPatient?.id}
            onSelectPatient={setSelectedPatient}
            onConsult={setActiveConsultationPatient}
            onViewPreVisitForm={(patient) => router.push("/appointments/previsit-form?id=" + patient.id)}
            activeTab={activeTab}
          />
        </div>
      </div>

      {/* Right Panel - Details Sidecard */}
      <div className="w-full lg:w-[372px] lg:shrink-0 lg:sticky lg:top-8 self-start">
        <AppointmentDetailsCard
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onConsult={(patient) => {
            setActiveConsultationPatient(patient);
            triggerToast(`Consultation requested for ${patient.name}`);
          }}
          onViewProfile={(patient) => router.push("/appointments/patient-details?id=" + patient.id)}
          onViewPreVisitForm={(patient) => router.push("/appointments/previsit-form?id=" + patient.id)}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
