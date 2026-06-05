"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AddDoctorPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="w-full space-y-7 pb-12 font-sans animate-in fade-in duration-300">
        
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard/doctors")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-black text-[#1e293b] tracking-tight">Add Doctor</h1>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between px-2 w-full max-w-4xl pt-2 mb-2">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
             <div className="w-7 h-7 rounded-full bg-[#6A8BFF] text-white flex items-center justify-center text-[12px] font-bold shadow-sm shadow-blue-200">1</div>
             <span className="text-[13px] font-black text-slate-800 tracking-tight">Personal Information</span>
          </div>
          {/* Step 2 */}
          <div className="flex items-center gap-3 opacity-60">
             <div className="w-7 h-7 rounded-full bg-slate-300 text-white flex items-center justify-center text-[12px] font-bold">2</div>
             <span className="text-[13px] font-bold text-slate-500 tracking-tight">Medical/ Career Information</span>
          </div>
          {/* Step 3 */}
          <div className="flex items-center gap-3 opacity-60">
             <div className="w-7 h-7 rounded-full bg-slate-300 text-white flex items-center justify-center text-[12px] font-bold">3</div>
             <span className="text-[13px] font-bold text-slate-500 tracking-tight">Set Availability</span>
          </div>
          {/* Step 4 */}
          <div className="flex items-center gap-3 opacity-60">
             <div className="w-7 h-7 rounded-full bg-slate-300 text-white flex items-center justify-center text-[12px] font-bold">4</div>
             <span className="text-[13px] font-bold text-slate-500 tracking-tight">Payment Settings</span>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 mt-4">
           
           <div className="space-y-6">
              
              {/* Upload Profile Picture Banner */}
              <div className="bg-[#f8fafd] rounded-2xl p-6 flex items-center gap-5 border border-slate-50/50">
                 <button className="w-[52px] h-[52px] rounded-full bg-[#e8eeff] text-[#6A8BFF] flex items-center justify-center hover:bg-[#dbe6ff] transition shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                 </button>
                 <div>
                    <h3 className="text-[13px] font-black text-slate-800 mb-1 tracking-tight">Upload Profile Picture</h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">Add a profile picture to make your account more personal and easily recognizable.</p>
                 </div>
              </div>

              {/* Bio Textarea */}
              <div>
                 <textarea 
                   placeholder="Add Bio" 
                   className="w-full bg-[#f8fafd] rounded-2xl p-5 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition min-h-[90px] resize-none"
                 />
              </div>

              {/* Grid Layout for Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <input type="text" placeholder="Contact Number*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                 <input type="text" placeholder="Emirates ID*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                 
                 {/* Upload Emirates ID Dropzone (Full Width) */}
                 <div className="md:col-span-2 border-[1.5px] border-dotted border-[#6A8BFF]/50 bg-[#F6F9FF] rounded-[1.5rem] p-8 flex flex-col items-center justify-center text-center hover:bg-[#f0f5ff] transition cursor-pointer group">
                    <svg className="w-6 h-6 text-[#6A8BFF] mb-3 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <span className="text-[13px] font-black text-[#6A8BFF] mb-2 tracking-tight">Upload Emirates ID</span>
                    <span className="text-[10px] font-bold text-[#6A8BFF]/70 leading-relaxed uppercase tracking-wider">Accepted Formats: PDF, JPEG, PNG<br/>File Size Limit: Maximum file size: 5 MB</span>
                 </div>

                 {/* Rest of inputs */}
                 <input type="email" placeholder="Email*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                 
                 <div className="relative">
                   <select className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Gender*</option>
                     <option value="male" className="text-slate-800">Male</option>
                     <option value="female" className="text-slate-800">Female</option>
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </div>

                 <div className="relative">
                   <input type="text" placeholder="Date of Birth*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   </div>
                 </div>

                 <div className="relative">
                   <select className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Blood Group*</option>
                     <option value="A+" className="text-slate-800">A+</option>
                     <option value="O+" className="text-slate-800">O+</option>
                     <option value="B+" className="text-slate-800">B+</option>
                     <option value="AB+" className="text-slate-800">AB+</option>
                     <option value="A-" className="text-slate-800">A-</option>
                     <option value="O-" className="text-slate-800">O-</option>
                     <option value="B-" className="text-slate-800">B-</option>
                     <option value="AB-" className="text-slate-800">AB-</option>
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </div>

                 <input type="text" placeholder="Height (in cm)*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />
                 <input type="text" placeholder="Weight (in kg)*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />

                 <div className="relative">
                   <select className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Marital Status*</option>
                     <option value="single" className="text-slate-800">Single</option>
                     <option value="married" className="text-slate-800">Married</option>
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </div>
                 
                 <input type="text" placeholder="Address (house number, street, city)" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />

                 <div className="relative">
                   <select className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition appearance-none cursor-pointer">
                     <option value="" disabled selected>Postal Code*</option>
                     <option value="10001" className="text-slate-800">10001</option>
                     <option value="90210" className="text-slate-800">90210</option>
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </div>

                 <input type="text" placeholder="Languages Known*" className="w-full bg-[#f8fafd] rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-800 placeholder-slate-400 outline-none border border-slate-50/50 focus:border-[#6A8BFF] focus:bg-white transition" />

              </div>
           </div>

           {/* Footer Button */}
           <div className="mt-8 flex justify-end">
              <button className="bg-[#6A8BFF] hover:bg-[#5a7ae6] text-white px-12 py-3.5 rounded-[1.25rem] text-[13px] font-bold shadow-md shadow-blue-200/50 transition active:scale-[0.98]">
                 Continue
              </button>
           </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
