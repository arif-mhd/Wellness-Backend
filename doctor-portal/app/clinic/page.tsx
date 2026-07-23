"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import MiniTrendChart from "@/components/clinic/MiniTrendChart";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ClinicDoctor {
  id: string;
  fullName: string;
  email: string;
  specialty?: string | null;
  isOnline?: boolean;
  avatarUrl?: string | null;
  slots?: Slot[];
}

interface RecentAppointment {
  id: string;
  patientName: string;
  patientEmail: string;
  reason: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
}

interface Task {
  type: "doctor_schedule_pending" | "missing_documentation";
  label: string;
  doctorId?: string;
  doctorName?: string;
  appointmentId?: string;
}

interface DashboardData {
  consultationsToday: number;
  consultationsYesterday: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  patientsWaiting: { count: number; patients: { name: string; avatarUrl: string | null }[] };
  recentAppointments: RecentAppointment[];
  tasks: { total: number; items: Task[] };
  patientsTrend: { label: string; count: number }[];
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr12 = h % 12 || 12;
  return `${hr12}.${String(m).padStart(2, "0")} ${ampm}`;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function TrendLine({ value, suffix }: { value: number; suffix: string }) {
  const isUp = value >= 0;
  return (
    <div className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {isUp ? (
          <>
            <path d="M4.08301 9.91671L9.91634 4.08337" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.08301 4.08337H9.91634V9.91671" stroke="#179353" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M4.08366 4.08337L9.91699 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.91699 4.08337L9.91699 9.91671L4.08366 9.91671" stroke="#F25252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <span className="text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
        <span className={`font-medium mr-1 ${isUp ? "text-[#179353]" : "text-[#F25252]"}`}>
          {Math.abs(value)}% {isUp ? "Increase" : "Decrease"}
        </span>
        <span className="text-[#707070]">{suffix}</span>
      </span>
    </div>
  );
}

function Avatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ClinicHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const qs = branchId ? `?branchId=${branchId}` : "";

  const [clinicName, setClinicName] = useState("");
  const [clinicAvatar, setClinicAvatar] = useState("");
  const [clinicSlots, setClinicSlots] = useState<Slot[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isMultiBranchOrg, setIsMultiBranchOrg] = useState(false);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    // Viewing a specific branch ("View Dash") shows that branch's own
    // identity/hours instead of the org's; otherwise this is either an
    // ordinary clinic or the org's own aggregate view.
    if (branchId) {
      apiFetch(`/api/clinics/branches/${branchId}`)
        .then((r) => r.json())
        .then((data) => {
          const b = data.branch ?? {};
          setClinicName(b.name ?? "Branch");
          setClinicSlots(Array.isArray(b.slots) ? b.slots : []);
          setIsAvailable(b.isOnline !== false);
          setIsMultiBranchOrg(false);
        })
        .catch(() => setClinicName("Branch"));
    } else {
      apiFetch("/api/clinics/me")
        .then((r) => r.json())
        .then((data) => {
          const c = data.clinic ?? {};
          setClinicName(c.fullName ?? "Your Clinic");
          setClinicAvatar(c.clinicImageUrl ?? "");
          setClinicSlots(Array.isArray(c.slots) ? c.slots : []);
          setIsAvailable(c.isOnline !== false);
          setIsMultiBranchOrg(!!c.isMultiBranchOrg);
        })
        .catch(() => setClinicName("Your Clinic"));
    }

    apiFetch(`/api/clinics/doctors${qs}`)
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data.doctors) ? data.doctors : []))
      .catch(() => setDoctors([]));

    apiFetch(`/api/clinics/dashboard${qs}`)
      .then((r) => r.json())
      .then((data) => setDashboard(data))
      .catch(() => setDashboard(null));
  }, [branchId, qs]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();

  const todayDow = new Date().getDay();
  const monthLabel = new Date().toLocaleString("en-US", { month: "long" });

  const goToDoctor = (doctorId: string) => router.push(`/clinic/doctors/${doctorId}?tab=consultations${branchId ? `&branchId=${branchId}` : ""}`);

  const handleToggleAvailable = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      const res = await apiFetch(`/api/clinics/online-status${qs}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch {
      setIsAvailable(!next);
    }
  };

  const handleApproveTask = async (task: Task) => {
    if (!task.doctorId) return;
    setApprovingId(task.doctorId);
    try {
      const res = await apiFetch(`/api/clinics/doctors/${task.doctorId}/verify-slots${qs}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to verify slots");
      setDashboard((prev) =>
        prev
          ? { ...prev, tasks: { total: prev.tasks.total - 1, items: prev.tasks.items.filter((t) => t !== task) } }
          : prev
      );
    } catch {
      // leave the task in place so the clinic can retry
    } finally {
      setApprovingId(null);
    }
  };

  const consultationsPct = dashboard ? pctChange(dashboard.consultationsToday, dashboard.consultationsYesterday) : 0;
  const revenuePct = dashboard ? pctChange(dashboard.revenueThisMonth, dashboard.revenueLastMonth) : 0;

  const scheduleTaskCount = dashboard?.tasks.items.filter((t) => t.type === "doctor_schedule_pending").length ?? 0;
  const docTaskCount = dashboard?.tasks.items.filter((t) => t.type === "missing_documentation").length ?? 0;
  const taskBreakdown =
    !dashboard || dashboard.tasks.total === 0
      ? "All caught up"
      : [
          scheduleTaskCount > 0 ? `${scheduleTaskCount} schedule approval${scheduleTaskCount === 1 ? "" : "s"}` : null,
          docTaskCount > 0 ? `${docTaskCount} missing note${docTaskCount === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const groupedClinicSlots = DAY_NAMES.map((name, dow) => {
    const daySlots = clinicSlots.filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { day: name, hours: daySlots.length > 0 ? daySlots.map((s) => `${fmt12(s.startTime)} - ${fmt12(s.endTime)}`).join(", ") : "Closed" };
  });

  return (
    <div className="px-8 pb-12 select-none">
      {/* Top Greeting Row */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col justify-center items-flex-start gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {greeting}
          </span>
          <div className="flex items-center gap-3">
            {clinicAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinicAvatar} alt={clinicName} className="w-11 h-11 rounded-full object-cover border border-gray-100" />
            ) : (
              <Avatar name={clinicName || "C"} size="w-11 h-11" />
            )}
            <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {clinicName || "Your Clinic"}
            </h1>
          </div>
          {branchId && (
            <button
              onClick={() => router.push(`/clinic/branches/${branchId}`)}
              className="self-start mt-1 bg-[#1E293B] text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-[#0f172a] transition-colors"
            >
              View Profile
            </button>
          )}
        </div>

        {/* Patients Waiting Online Widget */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1.5">
            <span className="text-[#707070] text-xs font-semibold tracking-[-0.24px]" style={{ fontFamily: "Inter, sans-serif" }}>
              Patients Waiting Online
            </span>
            <div className="flex items-center gap-3">
              {(dashboard?.patientsWaiting.patients.length ?? 0) > 0 && (
                <div className="flex items-center -space-x-3.5">
                  {dashboard!.patientsWaiting.patients.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#F4F7FC] shadow-sm relative" style={{ zIndex: 30 - i * 10 }}>
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Avatar name={p.name} size="w-full h-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span className="text-[#383F45] font-normal text-[36px] leading-none tracking-[-0.72px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                {dashboard?.patientsWaiting.count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {/* Card 1: Consultations Today */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Consultations Today
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {dashboard?.consultationsToday ?? 0} Consultations
          </div>
          <TrendLine value={consultationsPct} suffix="from yesterday" />
        </div>

        {/* Card 2: Tasks to be Completed */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            Tasks to be Completed
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {dashboard?.tasks.total ?? 0} Tasks
          </div>
          <div className="text-xs font-normal tracking-[-0.24px] text-[#5476FC]" style={{ fontFamily: "Outfit, sans-serif" }}>
            {taskBreakdown}
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-4 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Revenue
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[#707070] text-[11px] font-medium tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{monthLabel}</span>
            </div>
          </div>
          <div className="text-[#24292E] text-[22px] font-medium tracking-[-0.44px]" style={{ fontFamily: "Outfit, sans-serif" }}>
            ${Math.round(dashboard?.revenueThisMonth ?? 0).toLocaleString()}
          </div>
          <TrendLine value={revenuePct} suffix="from last month" />
        </div>

        {/* Card 4: Patients trend */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-center w-full">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
              Patients
            </span>
            <span className="text-[#707070] text-[11px] font-medium tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>This Month</span>
          </div>
          <MiniTrendChart data={dashboard?.patientsTrend ?? []} height={90} />
        </div>
      </div>

      {/* Dashboard split content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* New Appointments */}
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                New Appointments
              </h2>
              <button onClick={() => router.push(`/clinic/appointments${qs}`)} className="text-[#5476FC] text-xs font-semibold hover:underline">View all</button>
            </div>

            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            {(dashboard?.recentAppointments.length ?? 0) === 0 ? (
              <div className="text-center text-sm text-[#A0A8B0] py-6" style={{ fontFamily: "Outfit, sans-serif" }}>
                No upcoming appointments.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dashboard?.recentAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-[#F9FAFB] hover:border-[#D6DEFF] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                        <Avatar name={a.patientName} size="w-full h-full" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[#24292E] font-medium text-[14px] leading-tight tracking-[-0.28px] truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {a.patientName}
                        </span>
                        <span className="text-[#A0A8B0] text-xs font-light truncate">{a.patientEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="px-2.5 py-1 rounded-full bg-[#E2EAFE] flex items-center justify-center">
                        <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {a.reason}
                        </span>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-[#F0F2F2] flex items-center justify-center">
                        <span className="text-[#213159] font-light text-[12px] leading-none tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Doctor: {a.doctorName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {new Date(a.scheduledAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
                      </span>
                      <button
                        onClick={() => goToDoctor(a.doctorId)}
                        className="h-[32px] px-[16px] rounded-xl font-medium text-[13px] flex items-center justify-center transition-all bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.3)] hover:scale-[1.02] active:scale-[0.98] shrink-0"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Consult Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctors Available */}
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5 border border-transparent hover:border-gray-100 transition-all">
            <div className="flex items-center justify-between">
              <h2 className="text-[#24292E] text-[23px] font-normal tracking-[-0.46px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                Doctors Available
              </h2>
            </div>

            <div className="h-[1px] bg-[#EBEEF5] w-full" />

            {doctors.length === 0 ? (
              <div className="text-center text-sm text-[#A0A8B0] py-6" style={{ fontFamily: "Outfit, sans-serif" }}>
                No doctors added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((d) => {
                  const todaySlot = (d.slots ?? []).find((s) => s.dayOfWeek === todayDow && s.isActive);
                  const timing = todaySlot ? `${fmt12(todaySlot.startTime)} to ${fmt12(todaySlot.endTime)}` : "Not scheduled today";
                  return (
                    <button
                      key={d.id}
                      onClick={() => router.push(`/clinic/doctors/${d.id}${qs}`)}
                      className="p-4 rounded-xl border border-gray-100 bg-[#F9FAFB] flex items-center justify-between text-left hover:border-[#D6DEFF] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {d.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.avatarUrl} alt={d.fullName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <Avatar name={d.fullName} size="w-10 h-10" />
                          )}
                          {d.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#1FAF65] border-2 border-white rounded-full"></span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[#24292E] text-sm font-medium tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>{d.fullName}</span>
                          <span className="text-[#676E76] text-[13px] font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>{d.specialty ?? "General Physician"}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="text-[#676E76] text-[13px] font-normal" style={{ fontFamily: "Outfit, sans-serif" }}>{timing}</span>
                        <span className={`text-[12px] font-medium mt-0.5 ${d.isOnline ? "text-[#1FAF65]" : "text-gray-400"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                          {d.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Availability Panel — org-level hours don't exist for multi-branch orgs viewed in aggregate */}
          {!(isMultiBranchOrg && !branchId) && (
            <div className="bg-white rounded-xl p-6 border border-white shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-center w-full">
                <span className="text-[#24292E] text-[20px] font-normal tracking-[-0.4px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Clinic&apos;s Availability
                </span>
              </div>

              <div className="h-[1px] bg-[#EBEEF5] w-full" />

              <div className="flex flex-col gap-3">
                {groupedClinicSlots.map((row) => (
                  <div key={row.day} className="flex justify-between items-center text-xs">
                    <span className="text-[#596066] font-normal tracking-[-0.24px]" style={{ fontFamily: "Outfit, sans-serif" }}>{row.day}</span>
                    <span className="text-[#24292E] font-normal tracking-[-0.24px] text-right max-w-[65%] truncate" style={{ fontFamily: "Outfit, sans-serif" }} title={row.hours}>
                      {row.hours}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-center">
                <button
                  onClick={() => router.push(`/clinic/schedules${qs}`)}
                  className="w-full bg-[#1E293B] text-white text-xs font-semibold px-6 py-3 rounded-lg hover:bg-[#0f172a] transition-colors shrink-0"
                >
                  Edit Timeslots
                </button>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-[8px] w-full ${isAvailable ? "bg-[#E2F8EB]" : "bg-[#F5F5F5]"}`}>
                <span className={`font-medium text-[14px] tracking-[-0.28px] ${isAvailable ? "text-[#179353]" : "text-[#707070]"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                  {isAvailable ? "You are available now" : "You are offline"}
                </span>
                <button
                  onClick={handleToggleAvailable}
                  className="w-[33px] h-[17px] rounded-full p-[2px] flex items-center justify-end transition-all select-none"
                  style={{ backgroundColor: isAvailable ? "#1FAF65" : "#D1D5EB" }}
                >
                  <div className={`bg-white w-[13px] h-[13px] rounded-full shadow-sm transform transition-transform duration-200 ${isAvailable ? "translate-x-0" : "-translate-x-[16px]"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Tasks Pending Panel */}
          <div className="p-2 rounded-[24px] bg-[#F0F2F2] flex flex-col gap-2 shadow-sm border border-transparent hover:border-gray-200 transition-all">
            <div className="flex justify-between items-center w-full pl-2.5 pr-1 py-1">
              <span className="text-[#2B2B2B] text-[16px] font-medium leading-[1.5] font-bricolage">
                Tasks Pending
              </span>
            </div>

            {(dashboard?.tasks.items.length ?? 0) === 0 ? (
              <div className="p-5 flex flex-col gap-3 rounded-[12px] bg-[#CDE48C] w-full">
                <div className="flex flex-col gap-2">
                  <div className="text-[#2B2B2B] text-[24px] font-medium leading-[1.5] font-bricolage">
                    No Tasks
                  </div>
                </div>
                <div className="text-[#504E61] text-xs font-normal leading-[1.5]" style={{ fontFamily: "Inter, sans-serif" }}>
                  You&apos;re all caught up.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {dashboard!.tasks.items.map((t, i) => (
                  <div key={i} className="p-4 flex flex-col gap-2.5 rounded-[12px] bg-white w-full">
                    <div className="text-[#2B2B2B] text-[13px] font-medium leading-[1.4]" style={{ fontFamily: "Inter, sans-serif" }}>
                      {t.label}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.type === "doctor_schedule_pending" ? (
                        <button
                          onClick={() => handleApproveTask(t)}
                          disabled={approvingId === t.doctorId}
                          className="px-4 py-1.5 rounded-lg bg-[#1FAF65] text-white text-xs font-semibold hover:bg-[#179353] transition-colors disabled:opacity-50"
                        >
                          {approvingId === t.doctorId ? "Approving..." : "Approve"}
                        </button>
                      ) : null}
                      {t.doctorId && (
                        <button
                          onClick={() => goToDoctor(t.doctorId!)}
                          className="px-4 py-1.5 rounded-lg border border-[#D6DEFF] text-[#5476FC] text-xs font-semibold hover:bg-[#F4F7FF] transition-colors"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
