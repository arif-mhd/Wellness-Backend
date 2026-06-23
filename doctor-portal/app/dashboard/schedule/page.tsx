"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScheduleTabs from "@/components/schedule/ScheduleTabs";
import ScheduleListView, { ScheduleItem } from "@/components/schedule/ScheduleListView";
import ScheduleCalendarView, { CalendarAppointment } from "@/components/schedule/ScheduleCalendarView";
import TimeSlotView from "@/components/schedule/TimeSlotView";
import ScheduleAbsencesView from "@/components/schedule/ScheduleAbsencesView";

function parseLocalTime(isoString: string): Date {
  if (!isoString) return new Date();
  const clean = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
  return new Date(clean);
}

function formatScheduleDateTime(isoString: string): string {
  try {
    const d = parseLocalTime(isoString);
    if (isNaN(d.getTime())) return "N/A";
    const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${datePart}, ${timePart}`;
  } catch {
    return "N/A";
  }
}

export default function SchedulesDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Scheduled Appointments");
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await apiFetch("/api/appointments/doctor");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments ?? []);
      }
    } catch (err) {
      console.error("Error fetching doctor appointments:", err);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Map backend appointments to ScheduleItem structure for ListView
  const listItems: ScheduleItem[] = useMemo(() => {
    // Show only non-cancelled appointments in scheduled dashboard
    const activeApts = appointments.filter(a => a.status !== "cancelled" && a.status !== "Cancelled");

    return activeApts.map((apt) => {
      const dob = apt.patientDob || "";
      let age = 0;
      if (dob) {
        const birthYear = new Date(dob).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      // Check if the appointment is today (regardless of time)
      const apptDate = parseLocalTime(apt.scheduledAt);
      const today = new Date();
      const isToday = apptDate.getFullYear() === today.getFullYear() &&
                      apptDate.getMonth() === today.getMonth() &&
                      apptDate.getDate() === today.getDate();
      
      const isCompleted = apt.status?.toLowerCase() === "completed";
      const isFuture = apptDate.getTime() > Date.now();
      const actionType: ScheduleItem["actionType"] =
        isToday && !isCompleted ? "Consult Now" :
        isFuture && !isCompleted ? "Reschedule" :
        "None";

      // Extract brief symptom type from reason
      const symptomType = apt.reason ? apt.reason.split(" ")[0].substring(0, 12) : "Checkup";

      return {
        id: apt.id,
        patientName: apt.patientName ?? "Unknown Patient",
        patientAge: age,
        patientAvatar: apt.patientAvatarUrl || "/default-avatar.svg",
        email: apt.patientEmail ?? "",
        symptomType: symptomType,
        symptomDetails: apt.reason ?? "General Consultation",
        dateTime: formatScheduleDateTime(apt.scheduledAt),
        scheduledAt: apptDate.toISOString(),
        actionType,
        patientBio: apt.patientChronicIllnesses || "No conditions reported.",
      };
    });
  }, [appointments]);

  // Map backend appointments to CalendarAppointment structure for CalendarView
  const calendarAppointments: CalendarAppointment[] = useMemo(() => {
    const activeApts = appointments.filter(a => a.status !== "cancelled" && a.status !== "Cancelled");

    return activeApts.map((apt) => {
      const d = parseLocalTime(apt.scheduledAt);
      const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const dayLabel = dayLabels[d.getDay()];

      const h = d.getHours() % 12 || 12;
      const ampm = d.getHours() >= 12 ? "PM" : "AM";
      const hourStr = `${h} ${ampm}`;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dob = apt.patientDob || "";
      let age = 0;
      if (dob) {
        const birthYear = new Date(dob).getFullYear();
        if (!isNaN(birthYear)) {
          age = new Date().getFullYear() - birthYear;
        }
      }

      return {
        id: apt.id,
        patientName: apt.patientName ?? "Unknown Patient",
        patientAvatar: apt.patientAvatarUrl || "/default-avatar.svg",
        patientAge: age,
        day: dayLabel,
        hour: hourStr,
        patientBio: apt.patientChronicIllnesses || "No conditions reported.",
        reasonForVisit: apt.reason ?? "General Consultation",
        dateStr,
      };
    });
  }, [appointments]);

  // Filtering based on search query
  const filteredListItems = useMemo(() => {
    return listItems.filter(
      (item) =>
        item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.symptomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.symptomDetails.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listItems, searchQuery]);

  // Handle default selection when list items load
  useEffect(() => {
    if (filteredListItems.length > 0 && selectedItemId === null) {
      setSelectedItemId(filteredListItems[0].id);
    }
  }, [filteredListItems, selectedItemId]);

  const handleSelectItem = (item: ScheduleItem) => {
    setSelectedItemId(item.id);
  };

  const handleConsultClick = (itemId: string | number) => {
    router.push(`/appointments/consult?id=${itemId}`);
  };

  return (
    <ProtectedRoute>
      <div className="px-5 pb-12 select-none">
        {/* Page Header */}
        <div className="flex flex-col justify-center items-start gap-1 mb-8 mt-2">
          <h1
            className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Schedules
          </h1>
        </div>

        {/* Schedule Tabs */}
        <ScheduleTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeView={activeView}
          setActiveView={setActiveView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showViewToggle={activeTab === "Scheduled Appointments"}
        />

        {/* Main Content: switches based on active tab and view */}
        <div className="w-full">
          {activeTab === "Time slot" ? (
            <TimeSlotView />
          ) : activeTab === "Schedule Absences" ? (
            <ScheduleAbsencesView />
          ) : activeView === "list" ? (
            <ScheduleListView
              items={filteredListItems}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              onRescheduleClick={(item) => console.log("Rescheduling:", item.patientName)}
              onConsultClick={(item) => handleConsultClick(item.id)}
            />
          ) : (
            <ScheduleCalendarView
              appointments={calendarAppointments}
              onConsultClick={(appt) => handleConsultClick(appt.id)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
