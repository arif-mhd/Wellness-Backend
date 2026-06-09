"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import TaskListTable from "@/components/tasks/TaskListTable";
import TaskDetailsCard, { TaskItem } from "@/components/tasks/TaskDetailsCard";

export default function PrescriptionsTasksPage() {
  // High-fidelity initial mock data representing the exact mockup rows
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: 1,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Message from Pharmacy, prescription details pending",
      time: "21 Sep, 2020, 11:40 PM",
      priority: "High",
      status: "Pending",
      details: "The lab report for Arlene McCoy has been completed and is ready for review. Please check the results, update the electronic medical record (EMR), and finalize the consultation notes to ensure accurate documentation and follow-up care.",
      patientName: "Arlene McCoy",
      patientAge: 89,
      patientAvatar: "/patient-avatar-1.png",
      patientBio: "John Smith is a 45-year-old male from Sharjah, UAE, diagnosed with hypertension. He has a history of Type 2 Diabetes and is currently on medication for both conditions. John follows a regular exercise routine and maintains a cont...",
    },
    {
      id: 2,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Complete EMR Check LAB Report",
      time: "1 Feb, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "EMR Check is required for Floyd Miles before his scheduled surgery. Please ensure all previous consultation summaries are merged into his primary profile database.",
      patientName: "Floyd Miles",
      patientAge: 32,
      patientAvatar: "/patient-avatar-2.png",
      patientBio: "Floyd Miles is a 32-year-old software developer from Berlin, Germany. He was diagnosed with acute bronchial asthma two years ago and takes daily inhalations. He exercises three times a week and reports regular follow-ups.",
    },
    {
      id: 3,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Check Lab report",
      time: "22 Oct, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "Lab results for cholesterol and glucose levels have arrived. Review the recommendations and notify Leslie of any immediate nutritional shifts required.",
      patientName: "Leslie Alexander",
      patientAge: 28,
      patientAvatar: "/patient-avatar-1.png",
      patientBio: "Leslie Alexander is a 28-year-old fitness coach from Sydney, Australia, with a family history of diabetes. She is dedicated to high-intensity interval training, maintaining a low-glycemic diet, and undergoes bi-annual checkups.",
    },
    {
      id: 4,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Message from Insurance co-op",
      time: "8 Sep, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "Insurance claim needs verification for Jerome's treatment sessions. Validate log histories and cross-reference ICD-10 medical coding profiles.",
      patientName: "Jerome Bell",
      patientAge: 45,
      patientAvatar: "/patient-avatar-2.png",
      patientBio: "Jerome Bell is a 45-year-old high school counselor from Toronto, Canada, experiencing persistent insomnia and mild work-related stress. He is actively practicing cognitive behavioral therapy techniques and journaling daily.",
    },
    {
      id: 5,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Reminder for Follow-up of Patient",
      time: "22 Oct, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "Scheduled physical therapy checkup reminder. Reach out to Eleanor to check if joint mobility and pain scores have registered improvement over the past 3 weeks.",
      patientName: "Eleanor Pena",
      patientAge: 50,
      patientAvatar: "/patient-avatar-1.png",
      patientBio: "Eleanor Pena is a 50-year-old teacher from London, UK, managing chronic lower back pain with physical therapy and gentle swimming. She keeps a detailed log of pain triggers and maintains a highly nutritious plant-based diet.",
    },
    {
      id: 6,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Complete EMR Check LAB Report",
      time: "22 Oct, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "Check full blood panel report for Cameron. Pay specific attention to LDL cholesterol counts and evaluate if dosage increment is required.",
      patientName: "Cameron Williamson",
      patientAge: 41,
      patientAvatar: "/patient-avatar-2.png",
      patientBio: "Cameron Williamson is a 41-year-old project manager from New York, USA, diagnosed with seasonal allergies and hypercholesterolemia. He tracks his dietary cholesterol intake closely and stays active with cycling.",
    },
    {
      id: 7,
      type: "Task (Lab Report)",
      email: "yelena@example.com",
      summary: "Message from Pharmacy, Lorem ipsum",
      time: "22 Oct, 2020, 11:40 PM",
      priority: "Normal",
      status: "Pending",
      details: "Recovery consultation optimization and biometrics check. Cross-reference Yelena's post-training hydration stats and sleep scores.",
      patientName: "Yelena Isinbaeva",
      patientAge: 38,
      patientAvatar: "/patient-avatar-1.png",
      patientBio: "Yelena Isinbaeva is a 38-year-old former athlete from Volgograd, Russia, seeking consultation on optimizing post-workout recovery routines. She undergoes comprehensive quarterly biometric evaluations.",
    },
  ]);

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(1); // Task 1 selected by default
  const [hoveredTask, setHoveredTask] = useState<TaskItem | null>(null); // Hover state
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSelectTask = (task: TaskItem) => {
    setSelectedTaskId(task.id);
  };

  const handleToggleComplete = (taskId: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === "Completed" ? "Pending" : "Completed";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Find active task: hovered task takes priority, fallback to selected task
  const activeTask = hoveredTask || tasks.find((t) => t.id === selectedTaskId) || null;

  return (
    <ProtectedRoute>
      <div className="px-5 pb-12 select-none">
        {/* Page Title */}
        <div className="flex flex-col justify-center items-start gap-1 mb-8 mt-2">
          <h1
            className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Tasks
          </h1>
        </div>

        {/* ── Two-Column Main Layout Grid ────────────────────────────────────── */}
        <div className="grid gap-8 items-start w-full" style={{ gridTemplateColumns: "1fr 372px" }}>
          {/* Left Column: Tasks List & Interactive Controls */}
          <div className="min-w-0">
            <TaskListTable
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onHoverTask={setHoveredTask}
            />
          </div>

          {/* Right Column: Detailed Card (Fixed Width 372px) */}
          <div className="w-[372px] shrink-0 self-start">
            <TaskDetailsCard task={activeTask} onToggleComplete={handleToggleComplete} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
