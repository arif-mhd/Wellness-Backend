"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

// Common detail row component
const DetailRow = ({ label, value, valueClass = "text-slate-800 font-bold", labelClass = "text-slate-400 font-bold" }: { label: string, value: React.ReactNode, valueClass?: string, labelClass?: string }) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value}</span>
  </div>
);

// Common PDF link component
const DocLink = ({ title, filename }: { title: string, filename: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] text-slate-600 font-medium">{title}</span>
    <a href="#" className="text-[11px] font-bold text-[#6A8BFF] hover:underline underline-offset-2">
      {filename}
    </a>
  </div>
);

// Diagnosis card component
const DiagnosisCard = ({ title, count, colorHex }: { title: string, count: number, colorHex: string }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-50">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
      <span className="text-[11px] font-bold text-slate-500">{title}</span>
    </div>
    <div className="text-[22px] font-black text-slate-800 tracking-tight">
      {count}
    </div>
  </div>
);

// Review card component
const ReviewCard = ({ name, rating, review }: { name: string, rating: number, review: string }) => (
  <div className="bg-[#f8fafd] rounded-[1rem] p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm bg-slate-100">
      <img src="/doctor-avatar.png" alt={name} className="w-full h-full object-cover" />
    </div>
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <h4 className="text-[12px] font-bold text-slate-800">{name}</h4>
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: 5 }).map((_, i) => {
            const isFilled = i < rating;
            return (
              <svg
                key={i}
                className={`w-3 h-3 ${isFilled ? "text-[#6A8BFF] fill-[#6A8BFF]" : "text-[#6A8BFF] opacity-25"}`}
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
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
        {review}
      </p>
    </div>
  </div>
);

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"about" | "diagnosis" | "reviews">("about");

  // Mocking doctor data for the specific layout
  const doctor = {
    id: Number(id),
    name: "Dr. Nusrat Chowdhury",
    email: "john@example.com",
    avatar: "/doctor-avatar.png",
    specialty: "Cardiology",
    license: "DHA-12345678",
    bio: "A board-certified physician specializing in internal medicine. I completed my medical degree at Harvard Medical School and my residency at Johns Hopkins Hospital, where I gained extensive experience in patient care and clinical research. I have published multiple articles in peer-reviewed journals and received the Excellence in Patient Care Award in 2022. My commitment to ongoing education allows me to provide the highest standard of care to my patients.",
    emiratesId: "784-1234-5678",
    phone: "+971 50 123 4567",
    gender: "Male", // per mockup text
    dob: "02 January 1990",
    fees: "AED 200.00",
    languages: "English, Arabic, +2",
    height: "167",
    weight: "89",
    address: "1234 Al Zahra Streetm",
    postalCode: "12345"
  };

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/doctors")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1e293b] tracking-tight">Doctor Profile</h1>
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
          
          {/* Left Column (Main Content) */}
          <div className="xl:col-span-8 space-y-7">
            
            {/* Header Card */}
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-[84px] h-[84px] rounded-full overflow-hidden border-[3px] border-slate-50 shadow-sm shrink-0">
                    <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-[19px] font-black text-slate-800 tracking-tight">{doctor.name}</h2>
                    <p className="text-[10px] font-bold text-[#6A8BFF] uppercase tracking-wide mt-1.5">
                      LICENSE NUMBER {doctor.license}
                    </p>
                    <div className="mt-3 inline-block px-4 py-1.5 bg-[#e4edff] text-[#6A8BFF] rounded-md text-[11px] font-black tracking-wide uppercase">
                      {doctor.specialty}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition">
                    Edit
                  </button>
                  <button className="px-7 py-3 bg-[#E5EDFF] hover:bg-[#dbe6ff] text-[#6A8BFF] rounded-[1rem] text-[12px] font-bold transition">
                    Deactivate Doctor Profile
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 mb-2.5">Bio</p>
                <p className="text-[12px] text-slate-600 font-medium leading-[1.8]">{doctor.bio}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveTab("about")} 
                className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'about' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                About
              </button>
              <button 
                onClick={() => setActiveTab("diagnosis")} 
                className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'diagnosis' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                Diagnosis
              </button>
              <button 
                onClick={() => setActiveTab("reviews")} 
                className={`px-7 py-3 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                  activeTab === 'reviews' 
                    ? 'bg-[#1E293B] text-white shadow-slate-300' 
                    : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-800'
                }`}
              >
                Rating and Reviews
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[400px]">
              
              {/* ABOUT TAB */}
              {activeTab === "about" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Personal Details */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Personal Details</h3>
                    <div className="space-y-4">
                      <DetailRow 
                        label="Emirates ID" 
                        value={
                          <div className="flex items-center gap-1.5">
                            {doctor.emiratesId}
                            <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </div>
                        } 
                      />
                      <DetailRow label="Contact Number" value={doctor.phone} />
                      <DetailRow label="Email ID" value={<a href={`mailto:${doctor.email}`} className="text-[#6A8BFF] hover:underline">{doctor.email}</a>} valueClass="font-bold" />
                      <DetailRow label="Gender" value={doctor.gender} />
                      <DetailRow label="Date of Birth" value={doctor.dob} />
                      <DetailRow label="General Consultation Fees" value={doctor.fees} />
                      <DetailRow label="Languages" value={doctor.languages} />
                      <DetailRow label="Height (in cm)" value={doctor.height} />
                      <DetailRow label="Weight (in kg)" value={doctor.weight} />
                      <DetailRow label="Address" value={doctor.address} />
                      <DetailRow label="Postal Code" value={doctor.postalCode} />
                    </div>
                  </div>

                  {/* Consultation Fee */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Consultation Fee</h3>
                    <div className="space-y-4">
                      <DetailRow label="Abu Dhabi" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Dubai" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Sharjah" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Ajman" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Umm Al-Quwain" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Ras Al Khaimah" value="AED 200.00" labelClass="font-medium text-slate-500" />
                      <DetailRow label="Fujairah" value="AED 200.00" labelClass="font-medium text-slate-500" />
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
                    <h3 className="text-[14px] font-black text-slate-800 mb-6">Documents</h3>
                    <div className="space-y-6">
                      <DocLink title="Medical Degree Certificate" filename="Med_certificate.pdf" />
                      <DocLink title="Specialization Certificates" filename="Spec_certificate.pdf" />
                      <DocLink title="Other Certificates" filename="Certificate.pdf" />
                    </div>
                  </div>

                </div>
              )}

              {/* DIAGNOSIS TAB */}
              {activeTab === "diagnosis" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-[12px] text-slate-700 font-bold max-w-2xl leading-relaxed">
                    These are the top reasons patients book appointments, highlighting the doctor's main areas of focus.
                  </p>
                  
                  {/* Dotted lines visual */}
                  <div className="grid grid-cols-4 gap-3 pt-4">
                    <div className="w-full h-0 border-b-[4px] border-dotted border-[#8b5cf6]" />
                    <div className="w-full h-0 border-b-[4px] border-dotted border-[#10b981]" />
                    <div className="w-full h-0 border-b-[4px] border-dotted border-[#f59e0b]" />
                    <div className="w-full h-0 border-b-[4px] border-dotted border-[#06b6d4]" />
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-4 gap-5">
                    <DiagnosisCard title="Fever" count={123} colorHex="#8b5cf6" />
                    <DiagnosisCard title="Cough" count={118} colorHex="#10b981" />
                    <DiagnosisCard title="Asthma" count={143} colorHex="#f59e0b" />
                    <DiagnosisCard title="Headache" count={134} colorHex="#06b6d4" />
                  </div>
                </div>
              )}

              {/* RATING AND REVIEWS TAB */}
              {activeTab === "reviews" && (
                <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-7">
                    <h3 className="text-[14px] font-black text-slate-800">All Ratings</h3>
                    <div className="flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                      <svg className="w-4 h-4 text-[#6A8BFF] fill-[#6A8BFF]" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      4.2 <span className="text-slate-400 font-medium ml-1 text-[13px]">(345 Ratings)</span>
                    </div>
                  </div>
                  
                  {/* Reviews List */}
                  <div className="space-y-4">
                    <ReviewCard 
                      name="Kelemen Krisztina" 
                      rating={4} 
                      review="His attentive approach and thorough understanding of my condition made me feel confident in my treatment plan." 
                    />
                    <ReviewCard 
                      name="Szűcs Gabriella" 
                      rating={4} 
                      review="I had a fantastic experience with Dr. John Smith. He is very knowledgeable and genuinely cares about his patients." 
                    />
                    <ReviewCard 
                      name="Somogyi Adél" 
                      rating={4} 
                      review="Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care are evident." 
                    />
                    <ReviewCard 
                      name="Somogyi Adél" 
                      rating={4} 
                      review="Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care are evident." 
                    />
                    <ReviewCard 
                      name="Somogyi Adél" 
                      rating={4} 
                      review="Dr. John Smith is an outstanding doctor. His professionalism and dedication to patient care are evident." 
                    />
                  </div>

                  {/* Pagination Controls */}
                  <div className="bg-[#f8fafd] rounded-full flex items-center justify-between px-3 py-2 mt-8">
                    <button 
                      className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-600 transition shadow-sm bg-transparent"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <button 
                          key={num}
                          className={`w-8 h-8 rounded-full text-[13px] font-bold flex items-center justify-center transition-all ${
                            num === 1 
                              ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-200" 
                              : "text-slate-500 hover:bg-white hover:text-slate-800"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <button 
                      className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-600 transition shadow-sm bg-transparent"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* Right Column (Availability) */}
          <div className="xl:col-span-4">
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50 sticky top-6">
              
              <div className="flex items-center justify-between mb-7">
                <h3 className="text-[16px] font-black text-slate-800">Availability</h3>
                <button className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-800 transition">
                  This Week 
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Notice Box */}
              <div className="bg-[#FFF8EA] rounded-[1.5rem] p-5 mb-7">
                <div className="flex items-start gap-2.5">
                  <svg className="w-[18px] h-[18px] text-[#F59E0B] shrink-0 mt-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed pr-2">
                    This doctor has updated their availability slots. Please review and verify the changes.
                  </p>
                </div>
                <div className="flex justify-end mt-4">
                  <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white px-6 py-2.5 rounded-full text-[11px] font-bold shadow-md shadow-blue-200/50 transition active:scale-95">
                    Verify Now
                  </button>
                </div>
              </div>

              {/* Schedule List */}
              <div className="space-y-5 px-1">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                  <div key={day} className="flex justify-between items-center text-[12px] pb-5 border-b border-slate-50 last:border-0 last:pb-0">
                    <span className="text-slate-500 font-medium">{day}</span>
                    <span className="text-slate-800 font-bold">10AM - 06PM</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

// Add a custom property to override `DetailRow` inner span classes if needed
function DetailRowWithCustomLabel({ label, value, labelClass = "text-slate-400" }: { label: string, value: React.ReactNode, labelClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
      <span className={`text-[11px] font-bold ${labelClass}`}>{label}</span>
      <span className="text-[11px] font-bold text-slate-800">{value}</span>
    </div>
  );
}
