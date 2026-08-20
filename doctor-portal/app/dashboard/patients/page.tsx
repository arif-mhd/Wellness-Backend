"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Patient } from "@/app/appointments/types";
import { apiFetch } from "@/lib/apiFetch";

function formatVisitDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "N/A";
  }
}

interface DBPatient {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  avatar: string;
  diagnosis: string;
  lastVisit: string;
  status: string;
}

export default function PatientsPage() {
  const router = useRouter();

  // Loading states
  const [dataLoaded, setDataLoaded] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"All" | "Male" | "Female">("All");
  const [diagnosisFilter, setDiagnosisFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "age-asc" | "age-desc" | "last-visit">("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load API data
  const fetchData = useCallback(async () => {
    try {
      const apptRes = await apiFetch("/api/appointments/doctor");
      if (apptRes.ok) {
        const { appointments: data } = await apptRes.json();
        setAppointments(data ?? []);
      }
    } catch (err) {
      console.error("Error loading doctor appointments:", err);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique patients who have COMPLETED consultations
  const consultedPatients = useMemo(() => {
    const map = new Map<string, DBPatient>();

    // Filter appointments for completed consultations
    const completedApps = appointments.filter(
      (apt: any) => apt.status === "completed" || apt.status === "Completed"
    );

    completedApps.forEach((apt: any) => {
      const keyId = apt.familyMemberId || apt.patientId;
      if (!keyId) return;

      const dob = apt.patientDob || "";
      let age = 0;
      if (dob) {
        const birthYear = new Date(dob).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      const patientData: DBPatient = {
        id: keyId,
        name: apt.patientName ?? "Unknown Patient",
        email: apt.patientEmail ?? "",
        phone: apt.patientPhone ?? "",
        gender: apt.patientGender || "N/A",
        dob: dob,
        age: age,
        avatar: apt.patientAvatarUrl || "/default-avatar.svg",
        diagnosis: apt.reason ?? "Consultation",
        lastVisit: apt.scheduledAt ?? "",
        status: "Completed",
      };

      // Keep the most recent appointment details (appointments are returned DESC by scheduledAt)
      if (!map.has(keyId)) {
        map.set(keyId, patientData);
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  // Get unique diagnoses list for filtering
  const uniqueDiagnoses = useMemo(() => {
    const set = new Set<string>();
    consultedPatients.forEach(p => {
      if (p.diagnosis) set.add(p.diagnosis);
    });
    return ["All", ...Array.from(set)];
  }, [consultedPatients]);

  // Stats computation
  const stats = useMemo(() => {
    const total = consultedPatients.length;
    const males = consultedPatients.filter(p => p.gender.toLowerCase() === "male").length;
    const females = consultedPatients.filter(p => p.gender.toLowerCase() === "female").length;
    const completedConsultations = appointments.filter(
      (apt: any) => apt.status === "completed" || apt.status === "Completed"
    ).length;

    return { total, males, females, completedConsultations };
  }, [consultedPatients, appointments]);

  // Filtered & Sorted list
  const filteredPatients = useMemo(() => {
    let list = [...consultedPatients];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.diagnosis.toLowerCase().includes(q)
      );
    }

    // Gender filter
    if (genderFilter !== "All") {
      list = list.filter(p => p.gender.toLowerCase() === genderFilter.toLowerCase());
    }

    // Diagnosis filter
    if (diagnosisFilter !== "All") {
      list = list.filter(p => p.diagnosis === diagnosisFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "age-asc") {
        return a.age - b.age;
      }
      if (sortBy === "age-desc") {
        return b.age - a.age;
      }
      if (sortBy === "last-visit") {
        return b.lastVisit.localeCompare(a.lastVisit);
      }
      return 0;
    });

    return list;
  }, [consultedPatients, searchQuery, genderFilter, diagnosisFilter, sortBy]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter, diagnosisFilter, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
      <div className="px-4 md:px-8 pb-12 font-outfit select-none animate-fade-in">

        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 mt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
              Patient Directory
            </span>
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
              Consulted Patients
            </h1>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">

          {/* Stat 1: Total Patients */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-[#EBEEF5] hover:border-gray-300 hover:shadow-md transition-all">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Total Consulted</span>
            <span className="text-[#24292E] text-[28px] font-semibold leading-none tracking-[-0.56px]">
              {stats.total}
            </span>
            <span className="text-gray-400 text-[11px]">Unique patient profiles</span>
          </div>

          {/* Stat 2: Total Completed Consultations */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-[#EBEEF5] hover:border-gray-300 hover:shadow-md transition-all">
            <span className="text-[#5476FC] text-xs font-semibold tracking-[-0.24px]">Consultations Conducted</span>
            <span className="text-[#383F45] text-[28px] font-semibold leading-none tracking-[-0.56px]">
              {stats.completedConsultations}
            </span>
            <span className="text-gray-400 text-[11px]">Total finished appointments</span>
          </div>

          {/* Stat 3: Male Patients */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-[#EBEEF5] hover:border-gray-300 hover:shadow-md transition-all">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Male Patients</span>
            <span className="text-[#24292E] text-[28px] font-semibold leading-none tracking-[-0.56px]">
              {stats.males}
            </span>
            <span className="text-gray-400 text-[11px]">
              {stats.total > 0 ? `${Math.round((stats.males / stats.total) * 100)}%` : "0%"} of directory
            </span>
          </div>

          {/* Stat 4: Female Patients */}
          <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-[#EBEEF5] hover:border-gray-300 hover:shadow-md transition-all">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">Female Patients</span>
            <span className="text-[#24292E] text-[28px] font-semibold leading-none tracking-[-0.56px]">
              {stats.females}
            </span>
            <span className="text-gray-400 text-[11px]">
              {stats.total > 0 ? `${Math.round((stats.females / stats.total) * 100)}%` : "0%"} of directory
            </span>
          </div>
        </div>

        {/* Filter and Search Action Row */}
        <div className="bg-white rounded-xl p-4 border border-[#EBEEF5] shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">

          {/* Left Side: Search */}
          <div className="relative flex-1 min-w-[280px]">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12.2504 12.2504L9.71289 9.71289" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or diagnosis..."
              className="w-full bg-[#F5F7FB] text-[#24292E] placeholder-[#9EA5AD] text-sm rounded-lg pl-11 pr-4 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 focus:bg-white transition-all"
            />
          </div>

          {/* Right Side: Filters */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Gender Filter */}
            <div className="flex flex-col gap-1">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="bg-[#F5F7FB] text-[#3D4B5A] text-xs font-medium rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 hover:bg-[#EBEEF5] transition-colors cursor-pointer"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Diagnosis Filter */}
            <div className="flex flex-col gap-1">
              <select
                value={diagnosisFilter}
                onChange={(e) => setDiagnosisFilter(e.target.value)}
                className="bg-[#F5F7FB] text-[#3D4B5A] text-xs font-medium rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 hover:bg-[#EBEEF5] transition-colors cursor-pointer max-w-[150px]"
              >
                <option value="All">All Diagnoses</option>
                {uniqueDiagnoses.filter(d => d !== "All").map(diag => (
                  <option key={diag} value={diag}>{diag}</option>
                ))}
              </select>
            </div>

            {/* Sort by */}
            <div className="flex flex-col gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#F5F7FB] text-[#3D4B5A] text-xs font-medium rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 hover:bg-[#EBEEF5] transition-colors cursor-pointer"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="age-asc">Age (Youngest first)</option>
                <option value="age-desc">Age (Oldest first)</option>
                <option value="last-visit">Last Visit</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchQuery || genderFilter !== "All" || diagnosisFilter !== "All" || sortBy !== "name-asc") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setGenderFilter("All");
                  setDiagnosisFilter("All");
                  setSortBy("name-asc");
                }}
                className="p-2.5 rounded-lg border border-[#EBEEF5] text-red-500 hover:bg-red-50 transition-colors"
                title="Reset Filters"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider">Patient Name</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider">Demographics</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider">Diagnosis</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider">Last Consultation</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] capitalize tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEEF5]">
                {paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                      {dataLoaded ? "No patients matching search criteria" : "Loading directory..."}
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&from=patients`)}
                      className="group hover:bg-[#F8FAFC] cursor-pointer transition-all duration-200"
                    >
                      {/* Name / Avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={patient.avatar}
                            alt={patient.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#EBEEF5] shadow-sm group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/default-avatar.svg";
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-[#24292E] font-medium text-sm group-hover:text-[#5476FC] transition-colors">
                              {patient.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#383F45]">
                        <div className="flex flex-col">
                          <span>{patient.age > 0 ? `${patient.age} y/o` : "N/A"}</span>
                          <span className="text-xs text-[#707070] font-light capitalize">{patient.gender}</span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#383F45]">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{patient.email || "N/A"}</span>
                          <span className="text-xs text-[#707070] font-light mt-0.5">{patient.phone || "N/A"}</span>
                        </div>
                      </td>

                      {/* Diagnosis */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#E2EAFE] text-[#213159] font-light text-xs tracking-[-0.2px]">
                          {patient.diagnosis}
                        </span>
                      </td>

                      {/* Last Visit */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-[#676E76]">
                        {formatVisitDate(patient.lastVisit)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&from=patients`)}
                            className="text-[#5476FC] hover:text-[#4065FB] hover:bg-[#5476FC]/10 px-3 py-1.5 rounded-lg text-xs transition-colors"
                          >
                            Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-[#EBEEF5]">
            {paginatedPatients.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                {dataLoaded ? "No patients matching search criteria" : "Loading directory..."}
              </div>
            ) : (
              paginatedPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => router.push(`/appointments/patient-details?id=${patient.id}&from=patients`)}
                  className="p-4 flex flex-col gap-3 hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                >
                  {/* Top Row: Avatar, Name, Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={patient.avatar}
                        alt={patient.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#EBEEF5]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.svg";
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[#24292E] font-medium text-sm">
                          {patient.name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {patient.age > 0 ? `${patient.age} y/o` : "N/A"} • <span className="capitalize">{patient.gender}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/appointments/patient-details?id=${patient.id}&from=patients`);
                      }}
                      className="text-[#5476FC] bg-[#5476FC]/5 hover:bg-[#5476FC]/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-[#5476FC]/10"
                    >
                      Profile
                    </button>
                  </div>

                  {/* Middle Row: Diagnosis & Last Visit */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#9EA5AD] font-medium uppercase tracking-wider">Diagnosis</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#E2EAFE] text-[#213159] font-light text-xs inline-block w-max">
                        {patient.diagnosis}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[11px] text-[#9EA5AD] font-medium uppercase tracking-wider">Last Visit</span>
                      <span className="text-[#383F45] text-xs font-medium">
                        {formatVisitDate(patient.lastVisit)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Contact */}
                  <div className="flex flex-col gap-1 mt-1 pt-3 border-t border-gray-100">
                    <span className="text-[11px] text-[#9EA5AD] font-medium uppercase tracking-wider">Contact Info</span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#383F45] text-xs font-mono">{patient.email || "N/A"}</span>
                      <span className="text-[#383F45] text-xs">{patient.phone || "N/A"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-6 py-[13px] bg-[#F7F9FF] border-t border-[#EBEEF5] select-none">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center justify-center transition-colors duration-150 ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:opacity-70"}`}
              >
                <svg width="8" height="16" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.645 1.42C7.757 1.553 7.847 1.711 7.908 1.884C7.969 2.058 8 2.244 8 2.431C8 2.619 7.969 2.805 7.908 2.978C7.847 3.151 7.757 3.309 7.645 3.441L2.931 9.001L7.645 14.561C7.872 14.829 8 15.192 8 15.571C8 15.950 7.872 16.314 7.645 16.582C7.418 16.850 7.110 17 6.788 17C6.467 17 6.159 16.850 5.932 16.582L0.355 10.004C0.243 9.872 0.153 9.714 0.092 9.541C0.031 9.368 0 9.182 0 8.994C0 8.807 0.031 8.621 0.092 8.447C0.153 8.274 0.243 8.116 0.355 7.984L5.932 1.407C6.393 0.862 7.171 0.862 7.645 1.421Z" fill="#A9A9A9" fillOpacity="0.73" />
                </svg>
              </button>

              <div className="flex items-center flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-outfit text-[14px] transition-all duration-150 ${pageNum === currentPage ? "bg-[#8AA0FF] text-white" : "text-[#656565] hover:text-[#24292E]"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center justify-center transition-colors duration-150 ${currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:opacity-70"}`}
              >
                <svg width="8" height="16" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.355 1.42C0.243 1.553 0.153 1.711 0.092 1.884C0.031 2.058 0 2.244 0 2.431C0 2.619 0.031 2.805 0.092 2.978C0.153 3.151 0.243 3.309 0.355 3.441L5.069 9.001L0.355 14.561C0.128 14.829 0 15.192 0 15.571C0 15.950 0.128 16.314 0.355 16.582C0.582 16.850 0.890 17 1.212 17C1.533 17 1.841 16.850 2.068 16.582L7.645 10.004C7.757 9.872 7.847 9.714 7.908 9.541C7.969 9.368 8 9.182 8 8.994C8 8.807 7.969 8.621 7.908 8.447C7.847 8.274 7.757 8.116 7.645 7.984L2.068 1.407C1.607 0.862 0.829 0.862 0.355 1.421Z" fill="#A9A9A9" fillOpacity="0.73" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </div>
  );
}
