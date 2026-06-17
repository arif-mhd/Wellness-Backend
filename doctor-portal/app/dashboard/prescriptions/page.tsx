"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";
import TaskListTable from "@/components/tasks/TaskListTable";
import TaskDetailsCard, { TaskItem } from "@/components/tasks/TaskDetailsCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface RawTask {
  id: string;
  type: "upcoming_consultation" | "pending_emr";
  title: string;
  summary: string;
  priority: "High" | "Normal";
  status: "Pending";
  time: string;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl: string | null;
  patientAge: number | null;
  appointmentId: string;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function PrescriptionsTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<TaskItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchTasks = useCallback(async () => {
    try {
      const accessToken = await Session.getAccessToken();
      if (!accessToken) return;
      const res = await fetch(`${API_URL}/api/appointments/doctor/tasks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const { tasks: raw } = (await res.json()) as { tasks: RawTask[] };

      const mapped: TaskItem[] = raw.map((t) => ({
        id: t.id,
        type: t.type,
        email: t.patientEmail,
        summary: t.summary,
        time: formatTime(t.time),
        priority: t.priority,
        status: t.status,
        details: t.title,
        patientName: t.patientName,
        patientAge: t.patientAge,
        patientAvatar: t.patientAvatarUrl ?? "/patient-avatar-1.png",
        patientBio: "",
        appointmentId: t.appointmentId,
      }));

      setTasks(mapped);
      setSelectedTaskId((prev) => prev ?? mapped[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSelectTask = (task: TaskItem) => setSelectedTaskId(task.id);

  const handleAction = (task: TaskItem) => {
    if (task.type === "upcoming_consultation") {
      router.push(`/appointments/consult?appointmentId=${task.appointmentId}&patientName=${encodeURIComponent(task.patientName)}`);
    } else {
      router.push(`/appointments/consult?appointmentId=${task.appointmentId}&patientName=${encodeURIComponent(task.patientName)}&tab=emr`);
    }
  };

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
            {loading ? (
              <div className="flex items-center justify-center bg-white border border-[#EBEEF5] rounded-[24px] min-h-[580px] text-sm text-[#A0A8B0]">
                Loading tasks...
              </div>
            ) : (
              <TaskListTable
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={handleSelectTask}
                onAction={handleAction}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onHoverTask={setHoveredTask}
              />
            )}
          </div>

          {/* Right Column: Detailed Card (Fixed Width 372px) */}
          <div className="w-[372px] shrink-0 self-start">
            <TaskDetailsCard task={activeTask} onAction={handleAction} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
