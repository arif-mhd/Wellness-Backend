"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import ClinicComingSoon from "@/components/ClinicComingSoon";
import Step4CreatePassword from "@/components/auth/Step4CreatePassword";
import MiniTrendChart from "@/components/clinic/MiniTrendChart";

interface TrendPoint { label: string; count: number; }

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  bio?: string | null;
  isOnline?: boolean;
  status: "requested" | "details_pending" | "pending_approval" | "active" | "rejected";
  doctorCount: number;
  userCount: number;
  consultationsToday: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  todayHours: string;
  weeklyHours: { label: string; hours: string }[];
  patientsTrend: TrendPoint[];
}

interface OtherInfoRow { id: string; label: string; value: string; }

interface BranchUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  emiratesId: string | null;
  address: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  languages?: string | null;
  otherInfo?: { label: string; value: string }[];
  avatarUrl?: string | null;
  registeredAt?: string;
}

interface Slot { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; }

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  license?: string | null;
  emiratesId?: string | null;
  gender?: string | null;
  specialty?: string | null;
  specializations?: { name: string }[];
  qualification?: string | null;
  address?: string | null;
  languages?: string[] | string | null;
  fees?: number | null;
  isOnline?: boolean;
  avatarUrl?: string | null;
  slots?: Slot[];
  consultations?: number;
  consultationsOnline?: number;
  prescriptions?: number;
  rating?: number;
  avgConsultation?: number;
}

interface Appointment {
  id: string;
  patientName: string;
  reason: string;
  doctorName: string;
  status: string;
  scheduledAt: string;
}

function Avatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function AvatarPlaceholder({ name, avatarUrl, size = "w-10 h-10 text-sm" }: { name: string; avatarUrl?: string | null; size?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover shrink-0 border border-gray-200`} />;
  }
  return <Avatar name={name} size={size} />;
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center text-[#5476FC]">
        {[1, 2, 3, 4, 5].map(i => (
          i <= rounded ? (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          ) : (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          )
        ))}
      </div>
      <span className="text-[#24292E] text-[11px] font-medium">({rating})</span>
    </div>
  );
}

function formatLanguages(languages: string[] | string | null | undefined) {
  if (Array.isArray(languages)) return languages.join(", ") || "—";
  if (typeof languages === "string") return languages.trim() || "—";
  return "—";
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr12 = h % 12 || 12;
  return m === 0 ? `${hr12} ${ampm}` : `${hr12}.${String(m).padStart(2, "0")} ${ampm}`;
}

const TIMING_DAYS = [
  { label: "Monday", dow: 1 }, { label: "Tuesday", dow: 2 }, { label: "Wednesday", dow: 3 },
  { label: "Thursday", dow: 4 }, { label: "Friday", dow: 5 }, { label: "Saturday", dow: 6 },
];

const DOC_COL = { name: "190px", cons1: "90px", cons2: "90px", avg: "90px", presc: "90px", feedback: "110px" };

const TABS = ["Users/Managers", "Doctors", "Appointments", "Licenses", "Timings", "Insurances", "Payments", "Analytics", "Rating and Performance"];

export default function BranchDetailPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = use(params);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Users/Managers");
  const [togglingOnline, setTogglingOnline] = useState(false);

  const [users, setUsers] = useState<BranchUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmiratesId, setEditEmiratesId] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editLanguages, setEditLanguages] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState("All");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptsLoaded, setApptsLoaded] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmiratesId, setAddEmiratesId] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addGender, setAddGender] = useState("");
  const [addDob, setAddDob] = useState("");
  const [addBloodGroup, setAddBloodGroup] = useState("");
  const [addLanguages, setAddLanguages] = useState("");
  const [addOtherInfo, setAddOtherInfo] = useState<OtherInfoRow[]>([{ id: "1", label: "Qualifications", value: "" }]);
  const [addAvatarFile, setAddAvatarFile] = useState<File | null>(null);
  const [addAvatarPreview, setAddAvatarPreview] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  const addOtherInfoRow = () => setAddOtherInfo((rows) => [...rows, { id: Date.now().toString(), label: "", value: "" }]);
  const updateAddOtherInfoRow = (id: string, field: "label" | "value", val: string) =>
    setAddOtherInfo((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const removeAddOtherInfoRow = (id: string) => setAddOtherInfo((rows) => rows.filter((r) => r.id !== id));

  const loadBranch = () => {
    apiFetch(`/api/clinics/branches/${branchId}`)
      .then((r) => r.json())
      .then((data) => setBranch(data.branch ?? null))
      .catch(() => setBranch(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBranch(); }, [branchId]);

  const loadUsers = () => {
    apiFetch(`/api/clinics/branches/${branchId}/users`)
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data.users) ? data.users : []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoaded(true));
  };

  useEffect(() => {
    if (activeTab === "Users/Managers" && !usersLoaded) loadUsers();
    if (activeTab === "Doctors" && !doctorsLoaded) {
      apiFetch(`/api/clinics/doctors?branchId=${branchId}`)
        .then((r) => r.json())
        .then((data) => setDoctors(Array.isArray(data.doctors) ? data.doctors : []))
        .catch(() => setDoctors([]))
        .finally(() => setDoctorsLoaded(true));
    }
    if (activeTab === "Appointments" && !apptsLoaded) {
      apiFetch(`/api/clinics/appointments?branchId=${branchId}`)
        .then((r) => r.json())
        .then((data) => setAppointments(Array.isArray(data.appointments) ? data.appointments : []))
        .catch(() => setAppointments([]))
        .finally(() => setApptsLoaded(true));
    }
  }, [activeTab, branchId, usersLoaded, doctorsLoaded, apptsLoaded]);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);
  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) setSelectedDoctorId(doctors[0].id);
  }, [doctors, selectedDoctorId]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  useEffect(() => {
    if (selectedUser) {
      setEditFullName(selectedUser.fullName ?? "");
      setEditPhone(selectedUser.phone ?? "");
      setEditEmiratesId(selectedUser.emiratesId ?? "");
      setEditAddress(selectedUser.address ?? "");
      setEditGender(selectedUser.gender ?? "");
      setEditDob(selectedUser.dateOfBirth ?? "");
      setEditBloodGroup(selectedUser.bloodGroup ?? "");
      setEditLanguages(selectedUser.languages ?? "");
    }
    setEditingUser(false);
  }, [selectedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      if (doctorFilter === "Online" && !d.isOnline) return false;
      if (doctorFilter === "Offline" && d.isOnline) return false;
      return true;
    });
  }, [doctors, doctorFilter]);
  const onlineDoctors = filteredDoctors.filter((d) => d.isOnline);
  const offlineDoctors = filteredDoctors.filter((d) => !d.isOnline);
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? filteredDoctors[0] ?? null;

  const resetAddForm = () => {
    setAddStep(1); setAddFullName(""); setAddEmail(""); setAddPhone("");
    setAddEmiratesId(""); setAddAddress(""); setAddGender(""); setAddDob("");
    setAddBloodGroup(""); setAddLanguages("");
    setAddOtherInfo([{ id: "1", label: "Qualifications", value: "" }]);
    setAddAvatarFile(null); setAddAvatarPreview("");
    setAddPassword(""); setAddConfirmPassword(""); setAddError("");
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addPassword !== addConfirmPassword) { setAddError("Passwords do not match."); return; }
    setAddBusy(true);
    setAddError("");
    try {
      let avatarUrl: string | null = null;
      if (addAvatarFile) {
        const draftId = `branchuser_${Date.now()}`;
        const form = new FormData();
        form.append("avatar", addAvatarFile);
        form.append("draftId", draftId);
        const uploadRes = await apiFetch(`/api/clinics/branches/${branchId}/users/upload`, { method: "POST", body: form });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.urls?.avatar ?? null;
        }
      }

      const res = await apiFetch(`/api/clinics/branches/${branchId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addFullName, email: addEmail, phone: addPhone,
          emiratesId: addEmiratesId || null, address: addAddress || null,
          gender: addGender || null, dateOfBirth: addDob || null,
          bloodGroup: addBloodGroup || null, languages: addLanguages || null,
          otherInfo: addOtherInfo.filter((r) => r.label.trim() || r.value.trim()).map(({ id, ...rest }) => rest),
          avatarUrl,
          password: addPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add user.");
      }
      setShowAddUser(false);
      resetAddForm();
      setUsersLoaded(false);
    } catch (err: any) {
      setAddError(err.message ?? "Failed to add user.");
    } finally {
      setAddBusy(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const res = await apiFetch(`/api/clinics/branches/${branchId}/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName, phone: editPhone, emiratesId: editEmiratesId || null, address: editAddress || null,
          gender: editGender || null, dateOfBirth: editDob || null, bloodGroup: editBloodGroup || null, languages: editLanguages || null,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingUser(false);
      setUsersLoaded(false);
    } catch {
      window.alert("Failed to save changes.");
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const password = window.prompt("New password (min 8 characters):");
    if (!password) return;
    try {
      const res = await apiFetch(`/api/clinics/branches/${branchId}/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      window.alert("Credentials reset.");
    } catch {
      window.alert("Failed to reset credentials.");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm("Remove this user's access to the branch?")) return;
    try {
      const res = await apiFetch(`/api/clinics/branches/${branchId}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSelectedUserId(null);
      setUsersLoaded(false);
    } catch {
      window.alert("Failed to remove user.");
    }
  };

  const handleToggleOnline = async () => {
    if (!branch) return;
    const next = !(branch.isOnline !== false);
    setTogglingOnline(true);
    setBranch({ ...branch, isOnline: next });
    try {
      const res = await apiFetch(`/api/clinics/online-status?branchId=${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setBranch((prev) => (prev ? { ...prev, isOnline: !next } : prev));
    } finally {
      setTogglingOnline(false);
    }
  };

  if (loading) {
    return <div className="px-8 py-12 text-center text-sm text-[#A0A8B0]">Loading...</div>;
  }
  if (!branch) {
    return <div className="px-8 py-12 text-center text-sm text-red-600">Branch not found.</div>;
  }

  const isAvailable = branch.isOnline !== false;

  return (
    <div className="px-8 py-8" style={{ fontFamily: "Outfit, sans-serif" }}>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/clinic/branches"
          className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white shadow-sm border border-[#E4E8F0] hover:bg-gray-50 transition-all"
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="#65799D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-[#383F45] font-medium text-[24px] leading-[1.23] tracking-[-0.72px]">
          {branch.name}
        </h1>
      </div>

      {branch.status === "details_pending" && (
        <div className="flex items-center justify-between gap-4 bg-[#EEF2FF] border border-[#D6DEFF] rounded-xl px-5 py-4 mb-6">
          <div className="flex flex-col">
            <span className="text-[#24292E] text-[13px] font-semibold">Your branch request was approved</span>
            <span className="text-[#676E76] text-[12px]">Complete this branch's company profile and schedule to send it for final approval.</span>
          </div>
          <Link href={`/clinic/branches/${branchId}/complete-setup`} className="shrink-0 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
            Complete Setup
          </Link>
        </div>
      )}

      {/* Header card */}
      <div className="bg-[#EEF0F6] rounded-2xl p-7 flex flex-col lg:flex-row gap-8 mb-6 shadow-sm border border-[#E4E8F0]">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <Avatar name={branch.name} size="w-20 h-20" />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[#24292E] text-[18px] font-semibold">{branch.name}</span>
              {branch.status === "active" && (
                <button
                  onClick={handleToggleOnline}
                  disabled={togglingOnline}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${isAvailable ? "bg-[#E2F8EB] text-[#179353]" : "bg-[#F5F5F5] text-[#707070]"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-[#1FAF65]" : "bg-[#9EA5AD]"}`} />
                  {isAvailable ? "Available" : "Offline"}
                </button>
              )}
            </div>
            {branch.status !== "active" && (
              <span className="text-[13px] font-medium text-[#F59E0B]">
                {{
                  requested: "Request Pending Review",
                  details_pending: "Awaiting Your Details",
                  pending_approval: "Pending Final Approval",
                  rejected: "Rejected",
                }[branch.status]}
              </span>
            )}
            <span className="text-[#676E76] text-[12px] mt-1">Address: {branch.address}</span>
            <span className="text-[#676E76] text-[12px] mt-2 max-w-[420px] leading-relaxed">
              {branch.bio || "No description added yet."}
            </span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 content-start">
          <div className="flex flex-col gap-1">
            <span className="text-[#676E76] text-[11px]">Doctors</span>
            <span className="text-[#24292E] text-[18px] font-medium">{branch.doctorCount}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#676E76] text-[11px]">Consultations Today</span>
            <span className="text-[#24292E] text-[18px] font-medium">{branch.consultationsToday}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#676E76] text-[11px]">Revenue This Month</span>
            <span className="text-[#24292E] text-[18px] font-medium">${branch.revenueThisMonth.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#676E76] text-[11px]">Revenue Last Month</span>
            <span className="text-[#24292E] text-[18px] font-medium">${branch.revenueLastMonth.toLocaleString()}</span>
          </div>
        </div>

        <div className="w-full lg:w-[240px] bg-white rounded-xl p-4 shrink-0 border border-[#E4E8F0]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#24292E] text-[12px] font-semibold">Patients</span>
            <span className="text-[#707070] text-[10px]">Last 8 Days</span>
          </div>
          <MiniTrendChart data={branch.patientsTrend ?? []} height={90} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-[#EBEEF5] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white shadow-md scale-[1.02]"
                : "bg-white text-[#676E76] border border-[#E4E8F0] hover:border-[#5476FC] hover:text-[#5476FC] shadow-sm"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Users/Managers tab */}
      {activeTab === "Users/Managers" && (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#E4E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#24292E] text-[15px] font-semibold">Users / Managers</h2>
              <button
                onClick={() => { resetAddForm(); setShowAddUser(true); }}
                className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                {users.length === 0 ? "Add Senior Account" : "Add User"}
              </button>
            </div>

            {!usersLoaded ? (
              <div className="text-center text-sm text-[#A0A8B0] py-8">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center text-sm text-[#A0A8B0] py-8">No users yet — add this branch&apos;s senior account to get started.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: "560px" }}>
                  <div className="flex items-center px-4 py-2 text-[10px] font-medium text-[#676E76] border-b border-[#EBEEF5] uppercase tracking-wide">
                    <div className="w-[220px] shrink-0">Name</div>
                    <div className="flex-1 min-w-[100px]">Contact</div>
                    <div className="w-[110px] shrink-0">Added On</div>
                    <div className="w-[170px] shrink-0 text-right">Actions</div>
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    {users.map((u, idx) => {
                      const isSelected = selectedUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"}`}
                        >
                          <div className="w-[220px] shrink-0 flex items-center gap-3 pr-2">
                            <AvatarPlaceholder name={u.fullName} avatarUrl={u.avatarUrl} size="w-9 h-9" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[#24292E] text-[13px] font-medium truncate">
                                {u.fullName} {idx === 0 && <span className="ml-1 text-[10px] font-bold text-[#5476FC] uppercase">Senior</span>}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-[100px] text-[#A0A8B0] text-[11px] truncate pr-2">{u.email} · {u.phone}</div>
                          <div className="w-[110px] shrink-0 text-[#676E76] text-[11px]">
                            {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </div>
                          <div className="w-[170px] shrink-0 flex items-center justify-end gap-3">
                            <button onClick={(e) => { e.stopPropagation(); handleResetPassword(u.id); }} className="text-[11px] font-medium text-[#5476FC] hover:underline">
                              Reset
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveUser(u.id); }} className="text-[11px] font-medium text-red-500 hover:underline">
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: selected user's detail panel */}
          {selectedUser && (
            <div className="w-full xl:w-[320px] bg-[#EEF0F6] rounded-2xl p-5 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[#24292E] text-[15px] font-bold">{selectedUser.fullName}</h2>
                {!editingUser && (
                  <button onClick={() => setEditingUser(true)} className="text-[#596066] hover:text-[#5476FC] transition-colors">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M15.75 9a6.75 6.75 0 1 1-6.75-6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10.335 9.788 8.25 9.75V7.665l4.822-4.822a.563.563 0 0 1 .796 0l1.065 1.065a.563.563 0 0 1 0 .795L10.335 9.788Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <AvatarPlaceholder name={selectedUser.fullName} avatarUrl={selectedUser.avatarUrl} size="w-12 h-12" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[#9EA5AD] text-[11px] font-medium truncate">{selectedUser.email}</span>
                </div>
              </div>

              <div className="h-px bg-[#D6DEFF] mb-5 w-full" />

              {editingUser ? (
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Name</label>
                    <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Phone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Emirates ID</label>
                    <input value={editEmiratesId} onChange={(e) => setEditEmiratesId(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Address</label>
                    <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Gender</label>
                    <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white">
                      <option value="">—</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Date of Birth</label>
                    <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Blood Group</label>
                    <select value={editBloodGroup} onChange={(e) => setEditBloodGroup(e.target.value)} className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white">
                      <option value="">—</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#24292E]">Languages</label>
                    <input value={editLanguages} onChange={(e) => setEditLanguages(e.target.value)} placeholder="English, Arabic" className="h-9 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC] bg-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mb-5">
                  {[
                    { label: "Name", val: selectedUser.fullName },
                    { label: "Phone", val: selectedUser.phone },
                    { label: "Mail Id", val: selectedUser.email },
                    { label: "Emirates ID", val: selectedUser.emiratesId ?? "—" },
                    { label: "Address", val: selectedUser.address ?? "—" },
                    { label: "Gender", val: selectedUser.gender ?? "—" },
                    { label: "Date of Birth", val: selectedUser.dateOfBirth ?? "—" },
                    { label: "Blood Group", val: selectedUser.bloodGroup ?? "—" },
                    { label: "Languages", val: selectedUser.languages ?? "—" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[#24292E] text-[12px] font-medium">{row.label}</span>
                      <span className="text-[#676E76] text-[11px] text-right truncate w-40">{row.val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="h-px bg-[#D6DEFF] mb-5 w-full" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-[#24292E] text-[13px] font-bold uppercase">Main Credentials</span>
              </div>
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[#676E76] text-[12px]">Username</span>
                  <span className="text-[#24292E] text-[12px] font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#676E76] text-[12px]">Password</span>
                  <span className="text-[#24292E] text-[12px] font-medium">••••••••</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                {editingUser ? (
                  <>
                    <button onClick={() => setEditingUser(false)} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[12px] font-medium py-2 rounded-lg hover:bg-white transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveUser} disabled={savingUser} className="flex-1 bg-[#1E293B] text-white text-[12px] font-medium py-2 rounded-lg hover:bg-[#0f172a] transition-colors disabled:opacity-50">
                      {savingUser ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleResetPassword(selectedUser.id)} className="flex-1 border border-[#D6DEFF] text-[#5476FC] text-[12px] font-medium py-2 rounded-lg hover:bg-white transition-colors">
                      Reset
                    </button>
                    <button onClick={() => handleRemoveUser(selectedUser.id)} className="flex-1 bg-red-500 text-white text-[12px] font-medium py-2 rounded-lg hover:bg-red-600 transition-colors">
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Doctors tab */}
      {activeTab === "Doctors" && (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setDoctorFilter("All")} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${doctorFilter === "All" ? "bg-black text-white" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>All</button>
                <button onClick={() => setDoctorFilter("Online")} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${doctorFilter === "Online" ? "bg-[#EAECEF] text-[#24292E] border border-[#C8D0DA]" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>Online</button>
                <button onClick={() => setDoctorFilter("Offline")} className={`px-5 py-1.5 rounded-full text-[13px] font-medium tracking-wide transition-all ${doctorFilter === "Offline" ? "bg-[#EAECEF] text-[#24292E] border border-[#C8D0DA]" : "bg-[#D0D5DD] text-[#344054] hover:bg-[#B0B8C4]"}`}>Offline/Clinic</button>
              </div>
              <Link href={`/clinic/doctors/add?branchId=${branchId}`} className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[12px] font-medium px-5 py-2 rounded-lg shadow-sm hover:shadow-md transition-all">
                Add Doctor
              </Link>
            </div>

            <div className="w-full overflow-x-auto pb-2 bg-white rounded-xl border border-[#E4E8F0] shadow-sm p-4">
              <div style={{ minWidth: "780px" }}>
                <div className="flex items-center px-2 py-2 text-[10px] font-medium text-[#24292E] border-b border-[#EBEEF5]">
                  <div style={{ width: DOC_COL.name, flexShrink: 0 }}>Name</div>
                  <div className="flex-1 min-w-[90px]" />
                  <div style={{ width: DOC_COL.cons1, flexShrink: 0 }} className="text-center leading-tight">Total No. of<br />Consultation</div>
                  <div style={{ width: DOC_COL.cons2, flexShrink: 0 }} className="text-center leading-tight">Online<br />Consultations</div>
                  <div style={{ width: DOC_COL.avg, flexShrink: 0 }} className="text-center leading-tight">Average<br />Consultation</div>
                  <div style={{ width: DOC_COL.presc, flexShrink: 0 }} className="text-center leading-tight">Number of<br />prescription</div>
                  <div style={{ width: DOC_COL.feedback, flexShrink: 0 }} className="text-center">P. Feedback</div>
                  <div className="w-[50px] shrink-0" />
                </div>

                {!doctorsLoaded ? (
                  <div className="text-center text-sm text-[#A0A8B0] py-8">Loading...</div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="text-center text-sm text-[#A0A8B0] py-8">No doctors added to this branch yet.</div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 mt-4">
                      {onlineDoctors.map((doc) => {
                        const displayName = doc.fullName?.startsWith("Dr.") ? doc.fullName : `Dr. ${doc.fullName}`;
                        const isSelected = selectedDoctorId === doc.id;
                        return (
                          <div key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"}`}>
                            <div style={{ width: DOC_COL.name, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
                              <div className="relative">
                                <AvatarPlaceholder name={displayName} avatarUrl={doc.avatarUrl} size="w-10 h-10" />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#179353]" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[#24292E] text-[13px] font-medium truncate">{displayName}</span>
                                <span className="text-[#179353] text-[11px] font-medium">Online</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-[90px] pr-2 text-[#24292E] text-[11px] font-medium">{doc.specialty ?? "General Physician"}</div>
                            <div style={{ width: DOC_COL.cons1, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultations ?? 0}</div>
                            <div style={{ width: DOC_COL.cons2, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultationsOnline ?? 0}</div>
                            <div style={{ width: DOC_COL.avg, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.avgConsultation ?? 0}</div>
                            <div style={{ width: DOC_COL.presc, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.prescriptions ?? 0}</div>
                            <div style={{ width: DOC_COL.feedback, flexShrink: 0 }} className="flex justify-center"><StarRating rating={doc.rating ?? 0} /></div>
                            <div className="w-[50px] flex shrink-0 items-center justify-end">
                              <Link href={`/clinic/doctors/${doc.id}?branchId=${branchId}`} onClick={(e) => e.stopPropagation()} className="text-[#24292E] text-[12px] font-medium hover:text-[#5476FC] transition-colors">View</Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {offlineDoctors.length > 0 && (
                      <>
                        <h2 className="text-[#24292E] text-sm font-bold mt-6 mb-3">Offline</h2>
                        <div className="flex flex-col gap-2">
                          {offlineDoctors.map((doc) => {
                            const displayName = doc.fullName?.startsWith("Dr.") ? doc.fullName : `Dr. ${doc.fullName}`;
                            const isSelected = selectedDoctorId === doc.id;
                            return (
                              <div key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className={`flex items-center px-4 py-3 rounded-xl border transition-all cursor-pointer ${isSelected ? "bg-[#EEF2FF] border-[#5476FC]/40 shadow-sm" : "bg-white border-[#E4E8F0] hover:border-[#C0CAFF]"}`}>
                                <div style={{ width: DOC_COL.name, flexShrink: 0 }} className="flex items-center gap-3 pr-3">
                                  <AvatarPlaceholder name={displayName} avatarUrl={doc.avatarUrl} size="w-10 h-10" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[#24292E] text-[13px] font-medium truncate">{displayName}</span>
                                    <span className="text-[#9EA5AD] text-[11px] font-medium">Not available</span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-[90px] pr-2 text-[#24292E] text-[11px] font-medium">{doc.specialty ?? "General Physician"}</div>
                                <div style={{ width: DOC_COL.cons1, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultations ?? 0}</div>
                                <div style={{ width: DOC_COL.cons2, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.consultationsOnline ?? 0}</div>
                                <div style={{ width: DOC_COL.avg, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.avgConsultation ?? 0}</div>
                                <div style={{ width: DOC_COL.presc, flexShrink: 0 }} className="text-[#0A56D9] text-[13px] font-semibold text-center">{doc.prescriptions ?? 0}</div>
                                <div style={{ width: DOC_COL.feedback, flexShrink: 0 }} className="flex justify-center"><StarRating rating={doc.rating ?? 0} /></div>
                                <div className="w-[50px] flex shrink-0 items-center justify-end">
                                  <Link href={`/clinic/doctors/${doc.id}?branchId=${branchId}`} onClick={(e) => e.stopPropagation()} className="text-[#24292E] text-[12px] font-medium hover:text-[#5476FC] transition-colors">View</Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Doctor Details */}
          {selectedDoctor && (
            <div className="w-full xl:w-[320px] bg-[#EEF0F6] rounded-2xl p-5 flex flex-col shrink-0 border border-[#E4E8F0] shadow-sm">
              <h2 className="text-[#24292E] text-[15px] font-bold mb-5">Doctor Details</h2>
              <div className="flex items-center gap-3 mb-6">
                <AvatarPlaceholder name={selectedDoctor.fullName} avatarUrl={selectedDoctor.avatarUrl} size="w-12 h-12" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[#24292E] text-[13px] font-bold truncate">
                    {selectedDoctor.fullName?.startsWith("Dr.") ? selectedDoctor.fullName : `Dr. ${selectedDoctor.fullName}`}
                  </span>
                  <span className="text-[#9EA5AD] text-[11px] font-medium truncate">Lic:{selectedDoctor.license ?? "—"}</span>
                  <span className={`${selectedDoctor.isOnline ? "text-[#179353]" : "text-[#9EA5AD]"} text-[11px] font-medium mt-0.5`}>
                    {selectedDoctor.isOnline ? "Available" : "Not Available"}
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#D6DEFF] mb-5 w-full" />

              <div className="flex flex-col gap-3 mb-8">
                {[
                  { label: "Emirates ID", val: selectedDoctor.emiratesId ?? "—" },
                  { label: "Gender", val: selectedDoctor.gender?.toUpperCase() ?? "—" },
                  { label: "Specialization", val: selectedDoctor.specialty ?? "—" },
                  { label: "Qualification", val: selectedDoctor.qualification ?? "—" },
                  { label: "Location", val: selectedDoctor.address ?? "—" },
                  { label: "Consultation Fees", val: selectedDoctor.fees != null ? `$${selectedDoctor.fees}` : "—" },
                  { label: "Email", val: selectedDoctor.email ?? "—" },
                  { label: "Contact Number", val: selectedDoctor.phone ?? "—" },
                  { label: "Languages", val: formatLanguages(selectedDoctor.languages) },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-[#24292E] text-[12px] font-medium">{row.label}</span>
                    <span className="text-[#676E76] text-[11px] text-right truncate w-32">{row.val}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 mb-8">
                <Link href={`/clinic/doctors/${selectedDoctor.id}?branchId=${branchId}`} className="w-full flex items-center justify-center bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
                  View Profile
                </Link>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[#24292E] text-[13px] font-bold uppercase">Timing</span>
                <Link href={`/clinic/doctors/${selectedDoctor.id}?tab=schedules&branchId=${branchId}`} className="text-[#24292E] hover:text-[#5476FC] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                </Link>
              </div>
              <div className="flex flex-col gap-2.5">
                {TIMING_DAYS.map(({ label, dow }) => {
                  const daySlots = (selectedDoctor.slots ?? []).filter((s) => s.dayOfWeek === dow && s.isActive).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const hours = daySlots.length > 0 ? daySlots.map((s) => `${fmt12(s.startTime)} to ${fmt12(s.endTime)}`).join(", ") : "Not available";
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[#676E76] text-[12px]">{label}</span>
                      <span className="text-[#24292E] text-[12px] font-medium text-right max-w-[60%] truncate" title={hours}>{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appointments tab */}
      {activeTab === "Appointments" && (
        <div className="bg-white rounded-xl border border-[#E4E8F0] shadow-sm p-6">
          <h2 className="text-[#24292E] text-[15px] font-semibold mb-5">Appointments</h2>
          {!apptsLoaded ? (
            <div className="text-center text-sm text-[#A0A8B0] py-8">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center text-sm text-[#A0A8B0] py-8">No appointments yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {appointments.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E4E8F0]">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.patientName} size="w-9 h-9" />
                    <div className="flex flex-col">
                      <span className="text-[#24292E] text-[13px] font-medium">{a.patientName}</span>
                      <span className="text-[#A0A8B0] text-[11px]">{a.reason} · Dr. {a.doctorName}</span>
                    </div>
                  </div>
                  <span className="text-[12px] text-[#676E76]">
                    {new Date(a.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!["Users/Managers", "Doctors", "Appointments"].includes(activeTab) && (
        <ClinicComingSoon title={activeTab} description="This section is coming soon." />
      )}

      {/* Add branch user modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1E1E1E]/60 backdrop-blur-sm p-4">
          <div className={`bg-white w-full ${addStep === 1 ? "max-w-[760px]" : "max-w-[480px]"} rounded-2xl p-8 shadow-2xl max-h-[88vh] overflow-y-auto`}>
            {addError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center mb-4">{addError}</div>}
            {addStep === 1 ? (
              <form
                onSubmit={(e) => { e.preventDefault(); setAddError(""); setAddStep(2); }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h2 className="text-[#111827] text-[12px] font-bold tracking-widest uppercase text-center mb-1">
                    {users.length === 0 ? "Add Senior Account" : "Add User"}
                  </h2>
                  <h3 className="text-[#111827] text-[18px] font-bold text-center">Personal Informations</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {/* Left column */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Full Name</label>
                      <input required value={addFullName} onChange={(e) => setAddFullName(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Emirates ID</label>
                      <input value={addEmiratesId} onChange={(e) => setAddEmiratesId(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Email ID</label>
                      <input required type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Contact Number</label>
                      <input required value={addPhone} onChange={(e) => setAddPhone(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#24292E]">Gender</label>
                        <select value={addGender} onChange={(e) => setAddGender(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-3 text-[13px] outline-none focus:border-[#5476FC] cursor-pointer">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-[#24292E]">Blood Group</label>
                        <select value={addBloodGroup} onChange={(e) => setAddBloodGroup(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-3 text-[13px] outline-none focus:border-[#5476FC] cursor-pointer">
                          <option value="">Select</option>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Date of Birth</label>
                      <input type="date" value={addDob} onChange={(e) => setAddDob(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Profile Photo</label>
                      <div className="flex items-center gap-3">
                        <label className="w-16 h-16 rounded-xl bg-[#F7F8FC] border border-dashed border-[#D6DEFF] flex items-center justify-center cursor-pointer overflow-hidden shrink-0 hover:border-[#5476FC] transition-colors">
                          {addAvatarPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={addAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5476FC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4" /></svg>
                          )}
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setAddAvatarFile(file);
                              setAddAvatarPreview(file ? URL.createObjectURL(file) : "");
                            }}
                          />
                        </label>
                        <span className="text-[11px] text-[#A0A8B0] leading-relaxed">Optional — shown across the branch&apos;s user list.</span>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Address</label>
                      <input value={addAddress} onChange={(e) => setAddAddress(e.target.value)} className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#24292E]">Languages</label>
                      <input value={addLanguages} onChange={(e) => setAddLanguages(e.target.value)} placeholder="English, Arabic" className="w-full h-11 border border-[#D6DEFF] rounded-xl px-4 text-[13px] outline-none focus:border-[#5476FC]" />
                    </div>

                    <div className="flex flex-col gap-3">
                      <span className="text-[12px] font-semibold text-[#24292E]">Other (if any)</span>
                      <div className="flex flex-col gap-2.5">
                        {addOtherInfo.map((row) => (
                          <div key={row.id} className="grid grid-cols-2 gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Label"
                              value={row.label}
                              onChange={(e) => updateAddOtherInfoRow(row.id, "label", e.target.value)}
                              className="w-full h-10 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC]"
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Value"
                                value={row.value}
                                onChange={(e) => updateAddOtherInfoRow(row.id, "value", e.target.value)}
                                className="w-full h-10 border border-[#D6DEFF] rounded-lg px-3 text-[12px] outline-none focus:border-[#5476FC]"
                              />
                              {addOtherInfo.length > 1 && (
                                <button type="button" onClick={() => removeAddOtherInfoRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={addOtherInfoRow} className="self-start flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Add More Info
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 pt-4 border-t border-[#E4E8F0]">
                  <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 border border-[#D6DEFF] text-[#676E76] text-[13px] font-medium py-2.5 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg shadow-md">
                    Continue
                  </button>
                </div>
              </form>
            ) : (
              <Step4CreatePassword
                password={addPassword}
                setPassword={setAddPassword}
                confirmPassword={addConfirmPassword}
                setConfirmPassword={setAddConfirmPassword}
                loading={addBusy}
                onSubmit={handleAddUserSubmit}
                onGoBack={() => setAddStep(1)}
                usernameValue={addEmail}
                submitLabel="Save Credentials"
                loadingLabel="Saving..."
                title={`Create Credential For USER ${addFullName || ""}`.trim()}
                description="Set the login credentials this user will sign in with. They'll get the same clinic management screens you use, scoped to this branch."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
