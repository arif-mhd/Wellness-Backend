"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScheduleTabs from "@/components/schedule/ScheduleTabs";
import ScheduleListView, { ScheduleItem } from "@/components/schedule/ScheduleListView";
import ScheduleCalendarView, { CalendarAppointment } from "@/components/schedule/ScheduleCalendarView";
import TimeSlotView from "@/components/schedule/TimeSlotView";
import ScheduleAbsencesView from "@/components/schedule/ScheduleAbsencesView";

export default function SchedulesDashboardPage() {
  const [activeTab, setActiveTab] = useState("Scheduled Appointments");
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(1); // Row 1 selected by default

  // High-fidelity list view items representing the exact screenshot
  const listItems: ScheduleItem[] = [
    {
      id: 1,
      patientName: "Brooklyn Simmons",
      patientAge: 32,
      patientAvatar: "/patient-avatar-1.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "21 Sep, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "John Smith is a 45-year-old male from Sharjah, UAE, diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions. John follows a regular exercise routine and maintains a cont...",
    },
    {
      id: 2,
      patientName: "Arlene McCoy",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      email: "yelena@example.com",
      symptomType: "Cough",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "1 Feb, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Arlene McCoy is a 32-year-old marketing manager with a history of acute coughing fits. She resides in Berlin, exercises twice a week, and maintains a strict allergy checkup schedule.",
    },
    {
      id: 3,
      patientName: "Cameron Williamson",
      patientAge: 32,
      patientAvatar: "/patient-avatar-1.png",
      email: "yelena@example.com",
      symptomType: "Asthma",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Cameron Williamson is a 32-year-old software architect diagnosed with bronchial asthma since childhood. He monitors air quality daily and reports regular follow-ups.",
    },
    {
      id: 4,
      patientName: "Courtney Henry",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      email: "yelena@example.com",
      symptomType: "Cough",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "8 Sep, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Courtney Henry is a 32-year-old graphic designer seeking medical advice on persistent throat irritations and minor sleeping troubles.",
    },
    {
      id: 5,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-1.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
    {
      id: 6,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
    {
      id: 7,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-1.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
    {
      id: 8,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Reschedule",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
    {
      id: 9,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-1.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Consult Now",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
    {
      id: 10,
      patientName: "Bessie Cooper",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      email: "yelena@example.com",
      symptomType: "Fever",
      symptomDetails: "I've had a fever for three days with chills...",
      dateTime: "22 Oct, 2020, 11:40 PM",
      actionType: "Consult Now",
      patientBio: "Bessie Cooper is a 32-year-old teacher diagnosed with moderate intermittent fever. She is focused on proper hydration and takes daily physical checkups.",
    },
  ];

  // High-fidelity calendar view items representing the exact cards in screenshot 2
  const calendarAppointments: CalendarAppointment[] = [
    {
      id: 101,
      patientName: "Floyd Miles",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 89,
      day: "TUE",
      hour: "10 AM",
      patientBio: "Floyd Miles is a 45-year-old female from Sharjah, UAE, diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions. John follows a regular exercise routine and maintains a cont...",
      reasonForVisit: "I've had a fever for three days with chills, body aches, and fatigue.",
    },
    {
      id: 102,
      patientName: "Arlene McCoy",
      patientAvatar: "/patient-avatar-1.png",
      patientAge: 32,
      day: "TUE",
      hour: "11 AM",
      patientBio: "Arlene McCoy is a 32-year-old marketing manager with a history of acute coughing fits.",
      reasonForVisit: "Persistent dry cough for two weeks accompanied by mild chest tightness.",
    },
    {
      id: 103,
      patientName: "Theresa Webb",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 44,
      day: "FRI",
      hour: "7 AM",
      patientBio: "Theresa Webb is a 44-year-old senior account supervisor with chronic structural joint discomfort.",
      reasonForVisit: "Physical checkup of lower back mobility and annual check on heart metrics.",
    },
    {
      id: 104,
      patientName: "Arlene McCoy",
      patientAvatar: "/patient-avatar-1.png",
      patientAge: 32,
      day: "FRI",
      hour: "8 AM",
      patientBio: "Arlene McCoy is a 32-year-old marketing manager with a history of acute coughing fits.",
      reasonForVisit: "Weekly follow-up on recovery statistics post allergy prescription.",
    },
    {
      id: 105,
      patientName: "Albert Flores",
      patientAvatar: "/patient-avatar-1.png",
      patientAge: 68,
      day: "THU",
      hour: "10 AM",
      patientBio: "Albert Flores is a 68-year-old retiree managing early-stage joint arthritis and cholesterol indexes.",
      reasonForVisit: "Review blood panel results and consult on regular training workloads.",
    },
    {
      id: 106,
      patientName: "Theresa Webb",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 44,
      day: "THU",
      hour: "11 AM",
      patientBio: "Theresa Webb is a 44-year-old senior account supervisor with chronic structural joint discomfort.",
      reasonForVisit: "Consultation on daily dietary changes to manage mild acid reflux.",
    },
    {
      id: 107,
      patientName: "Kristin Watson",
      patientAvatar: "/patient-avatar-1.png",
      patientAge: 27,
      day: "THU",
      hour: "12 AM", // Mapped to the "12 AM" cell labeled in the mockup hourly lists
      patientBio: "Kristin Watson is a 27-year-old interior architect experiencing seasonal asthma flare-ups.",
      reasonForVisit: "Routine consultation for inhaler dosage evaluation and allergy profile matching.",
    },
    {
      id: 108,
      patientName: "Cameron Williams...",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 32,
      day: "THU",
      hour: "01 PM",
      patientBio: "Cameron Williamson is a 32-year-old software architect diagnosed with bronchial asthma.",
      reasonForVisit: "Pulmonary fitness check and post-seasonal peak flow rate tracking.",
    },
    {
      id: 109,
      patientName: "Cameron Williams...",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 32,
      day: "FRI",
      hour: "10 AM",
      patientBio: "Cameron Williamson is a 32-year-old software architect diagnosed with bronchial asthma.",
      reasonForVisit: "Follow-up consultation on post-workout recovery metrics.",
    },
    {
      id: 110,
      patientName: "Cameron Williams...",
      patientAvatar: "/patient-avatar-2.png",
      patientAge: 32,
      day: "FRI",
      hour: "01 PM",
      patientBio: "Cameron Williamson is a 32-year-old software architect diagnosed with bronchial asthma.",
      reasonForVisit: "Checkup on peak flow measurements and review of lifestyle changes.",
    },
  ];

  // Filtering based on search query
  const filteredListItems = listItems.filter(
    (item) =>
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symptomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symptomDetails.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: ScheduleItem) => {
    setSelectedItemId(item.id);
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

        {/* Schedule Tabs — hide view toggles on Time slot or Absences tab */}
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
              onConsultClick={(item) => console.log("Consulting:", item.patientName)}
            />
          ) : (
            <ScheduleCalendarView
              appointments={calendarAppointments}
              onConsultClick={(appt) => console.log("Consulting:", appt.patientName)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
