"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Doctor {
  id: number;
  name: string;
  email: string;
  avatar: string;
  status: "online" | "offline";
  specialty: string;
  consultations: number;
  avgConsultation: number;
  prescriptions: number;
  rating: number;
  license: string;
  emiratesId: string;
  phone: string;
  gender: string;
  dob: string;
  fees: string;
  languages: string;
  bio: string;
}

const initialDoctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Nusrat Chowdhury",
    email: "nusrat@wellness.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Cardiology",
    consultations: 556,
    avgConsultation: 429,
    prescriptions: 177,
    rating: 4,
    license: "DHA-12345678",
    emiratesId: "784-1234-5678",
    phone: "+971 50 123 4567",
    gender: "Female",
    dob: "02 January 1990",
    fees: "AED 200.00",
    languages: "English, Arabic, +2",
    bio: "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I am dedicated to providing comprehensive and compassionate cardiac care.",
  },
  {
    id: 2,
    name: "Dr. Zafar Islam",
    email: "zafar@wellness.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Internal Medicine",
    consultations: 647,
    avgConsultation: 447,
    prescriptions: 154,
    rating: 4,
    license: "DHA-87654321",
    emiratesId: "784-8765-4321",
    phone: "+971 50 765 4321",
    gender: "Male",
    dob: "15 August 1985",
    fees: "AED 150.00",
    languages: "English, Hindi, Urdu",
    bio: "Specializing in internal medicine, Dr. Zafar focuses on adult comprehensive care, chronic disease management, and preventive medical health programs.",
  },
  {
    id: 3,
    name: "Dr. Anika Rahman",
    email: "anika@wellness.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Pediatrics",
    consultations: 994,
    avgConsultation: 877,
    prescriptions: 883,
    rating: 4,
    license: "DHA-24681357",
    emiratesId: "784-2468-1357",
    phone: "+971 50 246 8135",
    gender: "Female",
    dob: "22 November 1988",
    fees: "AED 180.00",
    languages: "English, Bengali",
    bio: "Compassionate and dedicated pediatrician committed to providing excellent healthcare for infants, toddlers, and adolescents.",
  },
  {
    id: 4,
    name: "Dr. Aminul Halder",
    email: "aminul@wellness.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Neurology",
    consultations: 453,
    avgConsultation: 738,
    prescriptions: 492,
    rating: 4,
    license: "DHA-13579246",
    emiratesId: "784-1357-9246",
    phone: "+971 50 135 7924",
    gender: "Male",
    dob: "10 April 1978",
    fees: "AED 300.00",
    languages: "English, Arabic, French",
    bio: "Dr. Aminul is a senior neurologist with expertise in stroke management, epilepsy, neuromuscular diseases, and sleep medicine.",
  },
  {
    id: 5,
    name: "Dr. Shama Islam",
    email: "shama@wellness.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Dermatology",
    consultations: 922,
    avgConsultation: 426,
    prescriptions: 429,
    rating: 4,
    license: "DHA-95135724",
    emiratesId: "784-9513-5724",
    phone: "+971 50 951 3572",
    gender: "Female",
    dob: "05 May 1991",
    fees: "AED 220.00",
    languages: "English, Tagalog",
    bio: "Specialist dermatologist focusing on medical acne treatments, cosmetic dermatology, laser treatments, and pediatric conditions.",
  }
];

const initialQueue: Doctor[] = [
  {
    id: 101,
    name: "Dr. Kabir Ahmed",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Cardiology",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 4,
    license: "DHA-12345678",
    emiratesId: "784-1234-5678",
    phone: "+971 50 123 4567",
    gender: "Male",
    dob: "02 January 1990",
    fees: "AED 200.00",
    languages: "English, Arabic, +2",
    bio: "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I am dedicated to providing comprehensive and compassionate cardiac care.",
  },
  {
    id: 102,
    name: "Dr. Thomas Mathew",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "General Practitioner",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-99887766",
    emiratesId: "784-9988-7766",
    phone: "+971 50 998 8776",
    gender: "Male",
    dob: "11 July 1993",
    fees: "AED 100.00",
    languages: "English, Malayalam",
    bio: "Newly qualified general practitioner interested in family health medicine.",
  },
  {
    id: 103,
    name: "Dr. Aarav Bhatnagar",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Endocrinology",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-66554433",
    emiratesId: "784-6655-4433",
    phone: "+971 50 665 5443",
    gender: "Male",
    dob: "20 September 1987",
    fees: "AED 230.00",
    languages: "English, Hindi",
    bio: "Endocrinologist focusing on diabetic patient programs and hormone imbalance disorders.",
  },
  {
    id: 104,
    name: "Dr. Fatima Rizvi",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "online",
    specialty: "Pediatrics",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-11223344",
    emiratesId: "784-1122-3344",
    phone: "+971 50 112 2334",
    gender: "Female",
    dob: "14 May 1985",
    fees: "AED 180.00",
    languages: "English, Urdu",
    bio: "Experienced pediatrician.",
  },
  {
    id: 105,
    name: "Dr. Gaganpreet Narula",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Orthopedics",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-55667788",
    emiratesId: "784-5566-7788",
    phone: "+971 50 556 6778",
    gender: "Male",
    dob: "09 August 1980",
    fees: "AED 250.00",
    languages: "English, Punjabi",
    bio: "Specializing in sports injuries and rehabilitation.",
  },
  {
    id: 106,
    name: "Dr. Mariam Begum",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Gynaecology",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-33445566",
    emiratesId: "784-3344-5566",
    phone: "+971 50 334 4556",
    gender: "Female",
    dob: "23 December 1988",
    fees: "AED 220.00",
    languages: "English, Arabic",
    bio: "Expert in maternal-fetal medicine.",
  },
  {
    id: 107,
    name: "Dr. Rajesh Sharma",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Dermatology",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-88990011",
    emiratesId: "784-8899-0011",
    phone: "+971 50 889 9001",
    gender: "Male",
    dob: "17 November 1982",
    fees: "AED 200.00",
    languages: "English, Hindi",
    bio: "Specializing in cosmetic dermatology.",
  },
  {
    id: 108,
    name: "Dr. Zara Hussain",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Psychiatry",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-22334455",
    emiratesId: "784-2233-4455",
    phone: "+971 50 223 3445",
    gender: "Female",
    dob: "05 March 1979",
    fees: "AED 300.00",
    languages: "English, Urdu",
    bio: "Consultant psychiatrist for mental wellness.",
  },
  {
    id: 109,
    name: "Dr. Vishnu Rajendran",
    email: "yelena@example.com",
    avatar: "/doctor-avatar.png",
    status: "offline",
    specialty: "Ophthalmology",
    consultations: 0,
    avgConsultation: 0,
    prescriptions: 0,
    rating: 0,
    license: "DHA-99001122",
    emiratesId: "784-9900-1122",
    phone: "+971 50 990 0112",
    gender: "Male",
    dob: "30 June 1986",
    fees: "AED 180.00",
    languages: "English, Malayalam",
    bio: "Expert in refractive eye surgeries.",
  }
];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-40 ml-1.5 shrink-0">
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

export default function ManageDoctorsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"onboard" | "queue">("queue");
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [queue, setQueue] = useState<Doctor[]>(initialQueue);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(101);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const currentList = activeTab === "onboard" ? doctors : queue;

  const sortedDoctors = [...currentList].filter((doc) => {
    const matchQuery = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(matchQuery) ||
      doc.specialty.toLowerCase().includes(matchQuery) ||
      doc.email.toLowerCase().includes(matchQuery)
    );
  });

  const selectedDoctor = 
    doctors.find((d) => d.id === selectedDoctorId) || 
    queue.find((q) => q.id === selectedDoctorId);

  const handleApprove = (id: number) => {
    const docToApprove = queue.find((d) => d.id === id);
    if (!docToApprove) return;

    setQueue(queue.filter((d) => d.id !== id));
    const approvedDoc: Doctor = {
      ...docToApprove,
      status: "online",
      rating: 5,
    };
    setDoctors([approvedDoc, ...doctors]);
    setSelectedDoctorId(null);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto space-y-7 pb-12 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight">Manage Doctors</h1>
          </div>
          <button
            onClick={() => router.push("/dashboard/doctors/add")}
            className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white text-[13px] font-bold px-6 py-3 rounded-full flex items-center gap-2 transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Doctor
          </button>
        </div>

        {/* Tab Selection & Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none px-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveTab("onboard");
                setSelectedDoctorId(doctors[0]?.id || null);
              }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                activeTab === "onboard"
                  ? "bg-[#1E293B] text-white shadow-md shadow-slate-200"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              Doctors Onboard
            </button>
            <button
              onClick={() => {
                setActiveTab("queue");
                setSelectedDoctorId(queue[0]?.id || null);
              }}
              className={`px-6 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                activeTab === "queue"
                  ? "bg-[#1E293B] text-white shadow-md shadow-slate-200"
                  : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"
              }`}
            >
              Onboarding Queue
            </button>

            {/* Expandable Search Trigger */}
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-sm ml-1"
                aria-label="Search doctors"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {isSearchOpen && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctor..."
                    className="border border-slate-200 bg-white rounded-full px-4 py-2 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-44 shadow-sm"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <button className="text-[13px] font-bold text-slate-500 bg-transparent flex items-center gap-1.5 hover:text-slate-800 transition">
              Today
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sorting Text Links Line (No Background Card) */}
        <div className="flex items-center justify-between text-[13px] font-bold text-[#64748B] px-3 select-none">
          <div className="flex items-center gap-12 flex-1">
            <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
              Name
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </span>
            <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
              Total Consultation
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </span>
            <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
              Diagnosis
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </span>
            <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
              Date
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
          <button aria-label="Filter" className="text-slate-400 hover:text-slate-700 transition mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          
          {/* Main Table panel */}
          <div className={`${selectedDoctor ? "lg:col-span-8" : "lg:col-span-12"} bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 transition-all duration-300 min-h-[600px] flex flex-col justify-between`}>
            <div className="overflow-x-auto">
              
              {activeTab === "onboard" ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4 pt-1 font-bold pl-2">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">
                          No. of Consultation <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">
                          Avg. Consultation <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">
                          No. of Prescription <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1 font-bold">
                        <div className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-slate-600">
                          Ratings <DoubleCaret />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDoctors.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected 
                              ? "bg-[#f8fafd]" 
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-2 flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src={doc.avatar} alt={doc.name} className="w-full h-full object-cover" />
                              {doc.status === "online" ? (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-white rounded-full" />
                              ) : (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                {doc.name}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{doc.email}</p>
                            </div>
                          </td>
                          <td className="py-3 text-[13px] text-slate-700 font-bold text-center">
                            {doc.consultations}
                          </td>
                          <td className="py-3 text-[13px] text-slate-700 font-bold text-center">
                            {doc.avgConsultation}
                          </td>
                          <td className="py-3 text-[13px] text-slate-700 font-bold text-center">
                            {doc.prescriptions}
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-[3px]">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const isFilled = i < doc.rating;
                                return (
                                  <svg
                                    key={i}
                                    className={`w-3.5 h-3.5 ${isFilled ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#6A8BFF] opacity-25"}`}
                                    viewBox="0 0 24 24"
                                    fill={isFilled ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4 pt-1 font-bold pl-2">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                          Name <DoubleCaret />
                        </div>
                      </th>
                      <th className="pb-4 pt-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDoctors.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className={`group cursor-pointer transition-colors duration-200 border-b border-slate-50 last:border-0 ${
                            isSelected 
                              ? "bg-[#f8fafd] rounded-2xl" 
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-2 flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-100 flex-shrink-0 bg-white">
                              <img src={doc.avatar} alt={doc.name} className="w-full h-full object-cover" />
                              {doc.status === "online" ? (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-white rounded-full" />
                              ) : (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-500 transition-colors truncate">
                                {doc.name}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{doc.email}</p>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {isSelected ? (
                              <button className="bg-[#6A8BFF] text-white text-[11px] font-bold px-6 py-2 rounded-full shadow-md shadow-blue-200/50">
                                Verify Manually
                              </button>
                            ) : (
                              <span className="text-[12px] font-bold text-slate-800 mr-6">
                                Verify Manually
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                aria-label="Previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button 
                  key={num}
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    num === 1 
                      ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                aria-label="Next page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Doctor Details panel */}
          {selectedDoctor && (
            <div className="lg:col-span-4 bg-[#F6F9FF] rounded-[2rem] shadow-sm border border-white p-7 animate-in slide-in-from-right-3 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Doctor Details</h2>
                <button
                  onClick={() => setSelectedDoctorId(null)}
                  className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm"
                  aria-label="Close details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile Header Card style */}
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-50 mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-slate-100">
                    <img src={selectedDoctor.avatar} alt={selectedDoctor.name} className="w-full h-full object-cover" />
                    {selectedDoctor.status === "online" && (
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#10b981] border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-slate-800">{selectedDoctor.name}</h3>
                    <p className="text-[10px] font-bold text-[#6A8BFF] uppercase tracking-wide mt-1 bg-blue-50/50 inline-block px-1.5 py-0.5 rounded">
                      LICENSE NUMBER {selectedDoctor.license}
                    </p>
                    <div className="flex items-center gap-[3px] mt-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const isFilled = i < selectedDoctor.rating;
                        return (
                          <svg
                            key={i}
                            className={`w-3.5 h-3.5 ${isFilled ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#6A8BFF] opacity-25"}`}
                            viewBox="0 0 24 24"
                            fill={isFilled ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialty Tag & Bio */}
              <div className="mb-6 px-1">
                <span className="inline-block px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-black tracking-wide uppercase mb-4">
                  {selectedDoctor.specialty}
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {selectedDoctor.bio}
                </p>
              </div>

              {/* Details table in white card */}
              <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-50 space-y-5 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Emirates ID</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.emiratesId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Contact Number</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Email ID</span>
                  <span className="text-[11px] text-slate-800 font-bold truncate max-w-[170px]">{selectedDoctor.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Gender</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.gender}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Date of Birth</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.dob}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">General Consultation Fees</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.fees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Languages</span>
                  <span className="text-[11px] text-slate-800 font-bold">{selectedDoctor.languages}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/dashboard/doctors/${selectedDoctor.id}`)}
                  className="w-full py-3.5 bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/50 active:scale-[0.98]"
                >
                  View Detailed Profile
                </button>
                {activeTab === "queue" && (
                  <button
                    onClick={() => handleApprove(selectedDoctor.id)}
                    className="w-full py-3.5 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[13px] font-bold transition duration-200 active:scale-[0.98]"
                  >
                    Complete Onboarding
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
