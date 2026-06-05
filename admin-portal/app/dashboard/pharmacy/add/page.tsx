"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AddPharmacyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contactNumber: "",
    location: "",
    owner: "",
    manager: "",
    tradeLicense: "",
    healthAuthorityLicense: "",
    pharmacistLicense: "",
    operatingHours: "",
    website: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    router.push("/dashboard/pharmacy");
  };

  return (
    <ProtectedRoute>
      <div className="w-full pb-16 font-sans animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all"
            aria-label="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-black text-[#1e293b] tracking-tight leading-tight">
              Add New Pharmacy
            </h1>
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">
              Fill in the details below to onboard a new pharmacy
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* LEFT — Basic Info */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pharmacy Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Apollo Pharmacy"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="pharmacy@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Contact Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={form.contactNumber}
                      onChange={handleChange}
                      required
                      placeholder="+971 50 000 0000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="https://pharmacy.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Location / Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      required
                      placeholder="Street, City, Country"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Operating Hours
                    </label>
                    <input
                      type="text"
                      name="operatingHours"
                      value={form.operatingHours}
                      onChange={handleChange}
                      placeholder="e.g. Mon – Sat: 8:00 AM – 10:00 PM"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Brief description about the pharmacy..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Management Card */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Management Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Owner Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="owner"
                      value={form.owner}
                      onChange={handleChange}
                      required
                      placeholder="Full name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Manager Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="manager"
                      value={form.manager}
                      onChange={handleChange}
                      required
                      placeholder="Full name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Licenses */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  Licenses &amp; Compliance
                </h2>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Trade License <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="tradeLicense"
                      value={form.tradeLicense}
                      onChange={handleChange}
                      required
                      placeholder="TD 0000 1111 2222"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Health Authority License <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="healthAuthorityLicense"
                      value={form.healthAuthorityLicense}
                      onChange={handleChange}
                      required
                      placeholder="HA 7777 6666 8900"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pharmacist License <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="pharmacistLicense"
                      value={form.pharmacistLicense}
                      onChange={handleChange}
                      required
                      placeholder="PL 6754 3456 8986"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Documents */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </span>
                  Upload Documents
                </h2>

                <div className="flex flex-col gap-4">
                  {["Trade License Copy", "Health Authority License Copy", "Pharmacist License Copy"].map((doc) => (
                    <div
                      key={doc}
                      className="border-2 border-dashed border-slate-100 rounded-xl p-4 flex items-center gap-3 hover:border-[#6A8BFF]/40 hover:bg-[#f8faff] transition cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-[#EEF2FF] flex items-center justify-center transition">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-700 truncate">{doc}</p>
                        <p className="text-[10px] text-slate-400 font-medium">PDF, JPG or PNG · Max 5MB</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#6A8BFF] hover:bg-[#5a7ae6] disabled:opacity-60 text-white rounded-[1rem] text-[13px] font-bold transition duration-200 shadow-md shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding Pharmacy...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Pharmacy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[1rem] text-[13px] font-bold transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
