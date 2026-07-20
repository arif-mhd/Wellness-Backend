"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

interface Doctor {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  license?: string | null;
  specialty?: string | null;
  qualification?: string | null;
  address?: string | null;
  fees?: number | null;
  phone?: string | null;
  languages?: string | null;
  emiratesId?: string | null;
  gender?: string | null;
  isOnline?: boolean;
  slots?: any[];
  consultations?: number;
  prescriptions?: number;
  rating?: number;
  avgConsultation?: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function Avatar({ doctor, size = "w-10 h-10" }: { doctor: Doctor; size?: string }) {
  if (doctor.avatarUrl) {
    return <img src={doctor.avatarUrl} alt={doctor.fullName} className={`${size} rounded-full object-cover border border-gray-100 shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-[#8AA0FF] to-[#5476FC] flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {doctor.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "?"}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-[11px] text-gray-400 ml-1">({rating.toFixed(1)})</span>
    </div>
  );
}

export default function ClinicDoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "online" | "offline">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    setError("");
    try {
      const res = await apiFetch("/api/clinics/doctors");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      const list: Doctor[] = data.doctors ?? [];
      setDoctors(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchDoctors(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = doctors.filter((d) => {
    if (tab === "online" && !d.isOnline) return false;
    if (tab === "offline" && d.isOnline) return false;
    const q = search.toLowerCase();
    return !q || d.fullName?.toLowerCase().includes(q) || d.specialty?.toLowerCase().includes(q);
  });

  const onlineDoctors = filtered.filter((d) => d.isOnline);
  const offlineDoctors = filtered.filter((d) => !d.isOnline);
  const selected = doctors.find((d) => d.id === selectedId) ?? null;

  const Row = ({ doctor }: { doctor: Doctor }) => (
    <tr
      onClick={() => setSelectedId(doctor.id)}
      className={`group cursor-pointer transition-colors border-b border-gray-50 last:border-0 hover:bg-slate-50/50 ${selectedId === doctor.id ? "bg-indigo-50/40" : ""}`}
    >
      <td className="py-3 pl-2 pr-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar doctor={doctor} />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${doctor.isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-800 group-hover:text-[#5476FC] truncate">{doctor.fullName}</p>
            <p className="text-[11px] text-gray-400 truncate">{doctor.specialty ?? "—"}</p>
            <p className={`text-[10px] font-semibold ${doctor.isOnline ? "text-emerald-500" : "text-gray-400"}`}>{doctor.isOnline ? "Online" : "Not available"}</p>
          </div>
        </div>
      </td>
      <td className="py-3 text-[13px] text-gray-700 font-medium text-center">{doctor.consultations ?? 0}</td>
      <td className="py-3 text-[13px] text-gray-700 font-medium text-center">{doctor.avgConsultation ?? 0}</td>
      <td className="py-3 text-[13px] text-gray-700 font-medium text-center">{doctor.prescriptions ?? 0}</td>
      <td className="py-3 text-center"><div className="flex justify-center"><StarRow rating={doctor.rating ?? 0} /></div></td>
      <td className="py-3 pr-4 text-right">
        <button onClick={(e) => { e.stopPropagation(); router.push(`/clinic/doctors/${doctor.id}`); }} className="text-[#5476FC] text-xs font-semibold hover:underline">
          View →
        </button>
      </td>
    </tr>
  );

  return (
    <div className="px-10 lg:px-[40px] py-8 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT */}
        <div className={`${selected ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-[24px] font-medium text-[#1e293b] font-outfit">Manage Doctors</h1>
            <button
              onClick={() => router.push("/clinic/doctors/add")}
              className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Doctor
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {([["all", "All"], ["online", "Online"], ["offline", "Offline/Clinic"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all ${tab === key ? "bg-[#1E293B] text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all"
              className="border border-gray-200 bg-white rounded-full px-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#5476FC]/20 w-56"
            />
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

          <div className="bg-white rounded-[1.75rem] shadow-sm border border-gray-100 p-7 min-h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading doctors…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-[13px] font-semibold">No doctors yet — add your first one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2 font-medium">Name</th>
                      <th className="pb-3 font-medium text-center">Total Consultations</th>
                      <th className="pb-3 font-medium text-center">Avg. Consultation</th>
                      <th className="pb-3 font-medium text-center">Prescriptions</th>
                      <th className="pb-3 font-medium text-center">Feedback</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineDoctors.map((d) => <Row key={d.id} doctor={d} />)}
                    {offlineDoctors.length > 0 && (
                      <tr><td colSpan={6} className="pt-5 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Offline</td></tr>
                    )}
                    {offlineDoctors.map((d) => <Row key={d.id} doctor={d} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Doctor Details quick panel */}
        {selected && (
          <div className="lg:col-span-4 bg-white rounded-[1.75rem] shadow-sm border border-gray-100 p-7">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[16px] font-medium text-gray-800">Doctor Details</h2>
              <button onClick={() => setSelectedId(null)} className="w-7 h-7 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="relative shrink-0">
                <Avatar doctor={selected} size="w-14 h-14" />
                <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 border-2 border-white rounded-full ${selected.isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-gray-800">{selected.fullName}</h3>
                {selected.license && <p className="text-[10px] font-medium text-[#5476FC] uppercase mt-0.5">Lic: {selected.license}</p>}
                <p className={`text-[11px] font-semibold mt-0.5 ${selected.isOnline ? "text-emerald-500" : "text-gray-400"}`}>{selected.isOnline ? "Available" : "Not available"}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                ["Emirates ID", selected.emiratesId],
                ["Gender", selected.gender],
                ["Specialization", selected.specialty],
                ["Qualification", selected.qualification],
                ["Location", selected.address],
                ["Consultation Fees", selected.fees ? `AED ${selected.fees}` : null],
                ["Email", selected.email],
                ["Contact Number", selected.phone],
                ["Languages", selected.languages],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-gray-400 font-medium shrink-0">{label}</span>
                  <span className="text-[11px] text-gray-800 font-medium truncate max-w-[170px]">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 mb-6">
              <button onClick={() => router.push(`/clinic/doctors/${selected.id}`)} className="w-full py-3 bg-[#1E293B] hover:bg-[#0f172a] text-white rounded-xl text-[13px] font-medium transition-colors">
                View Profile
              </button>
              <button disabled title="Clinic-to-doctor messaging isn't available yet" className="w-full py-3 bg-gray-50 text-gray-300 rounded-xl text-[13px] font-medium cursor-not-allowed">
                Message
              </button>
            </div>

            {selected.slots && selected.slots.length > 0 && (
              <div>
                <h4 className="text-[12px] font-bold text-gray-700 mb-2">Timing</h4>
                <div className="space-y-1.5">
                  {DAY_NAMES.map((name, dow) => {
                    const daySlots = selected.slots!.filter((s: any) => s.dayOfWeek === dow && s.isActive);
                    if (daySlots.length === 0) return null;
                    return (
                      <div key={dow} className="flex justify-between text-[11px]">
                        <span className="text-gray-500">{name}</span>
                        <span className="font-medium text-gray-700">
                          {daySlots.map((s: any) => `${fmt12(s.startTime)} - ${fmt12(s.endTime)}`).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
