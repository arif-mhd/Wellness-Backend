"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });
}

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];

interface Product {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  manufacturer: string;
  strength: string;
  batchNumber: string;
  expiryDate: string;
  reorderLevel: string;
  requiresPrescription: boolean;
}

const emptyProduct = (): Product => ({
  name: "", description: "", category: "", price: "", stock: "",
  manufacturer: "", strength: "", batchNumber: "", expiryDate: "",
  reorderLevel: "", requiresPrescription: false,
});

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition";
const labelCls = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

export default function AddPharmacyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pharmacy form
  const [form, setForm] = useState({
    pharmacyName: "", email: "", phone: "", ownerName: "", manager: "",
    location: "", tradeLicense: "", healthAuthorityLicense: "",
    pharmacistLicense: "", description: "", operatingHours: "", website: "",
  });

  // Products to add alongside the pharmacy
  const [products, setProducts] = useState<Product[]>([emptyProduct()]);
  const [activeProductIdx, setActiveProductIdx] = useState(0);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProductChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [e.target.name]: e.target.value } : p));
  };

  const togglePrescription = (idx: number) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, requiresPrescription: !p.requiresPrescription } : p));
  };

  const addProduct = () => {
    setProducts(prev => [...prev, emptyProduct()]);
    setActiveProductIdx(products.length);
  };

  const removeProduct = (idx: number) => {
    setProducts(prev => prev.filter((_, i) => i !== idx));
    setActiveProductIdx(Math.max(0, activeProductIdx - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      // Step 1 — Create the pharmacy
      const pharmRes = await adminFetch("/api/admin/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!pharmRes.ok) {
        const d = await pharmRes.json().catch(() => ({}));
        setError(d.error ?? "Failed to create pharmacy.");
        return;
      }

      const { pharmacy } = await pharmRes.json();
      const pharmacyId: string = pharmacy.id;

      // Step 2 — Add each non-empty product
      const filledProducts = products.filter(p => p.name.trim() && p.category && p.price);
      const productErrors: string[] = [];

      for (const p of filledProducts) {
        const res = await adminFetch(`/api/admin/pharmacy/${pharmacyId}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:                 p.name,
            description:          p.description || null,
            category:             p.category,
            price:                p.price,
            stock:                p.stock || "0",
            requiresPrescription: p.requiresPrescription,
            manufacturer:         p.manufacturer || null,
            strength:             p.strength || null,
            batchNumber:          p.batchNumber || null,
            expiryDate:           p.expiryDate || null,
            reorderLevel:         p.reorderLevel || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          productErrors.push(`"${p.name}": ${d.error ?? "failed"}`);
        }
      }

      if (productErrors.length) {
        setSuccessMsg(`Pharmacy created. Some products failed: ${productErrors.join("; ")}`);
      } else {
        setSuccessMsg(`Pharmacy "${form.pharmacyName}" created successfully${filledProducts.length ? ` with ${filledProducts.length} product(s)` : ""}.`);
      }

      setTimeout(() => router.push("/dashboard/pharmacy"), 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProduct = products[activeProductIdx];

  return (
    <ProtectedRoute>
      <div className="w-full pb-16 font-sans animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-md transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight leading-tight">Add New Pharmacy</h1>
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">Fill in pharmacy details and optionally add products</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}
        {successMsg && (
          <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">{successMsg}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT — Pharmacy info */}
            <div className="xl:col-span-2 flex flex-col gap-6">

              {/* Basic Info */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "Pharmacy Name *", name: "pharmacyName", placeholder: "e.g. Apollo Pharmacy", required: true },
                    { label: "Email Address *", name: "email", type: "email", placeholder: "pharmacy@example.com", required: true },
                    { label: "Contact Number *", name: "phone", type: "tel", placeholder: "+971 50 000 0000", required: true },
                    { label: "Website", name: "website", type: "url", placeholder: "https://pharmacy.com" },
                  ].map(({ label, name, type = "text", placeholder, required }) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <label className={labelCls}>{label}</label>
                      <input
                        type={type} name={name} required={required}
                        value={(form as any)[name]} onChange={handleFormChange}
                        placeholder={placeholder} className={inputCls}
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls}>Location / Address *</label>
                    <input type="text" name="location" required value={form.location} onChange={handleFormChange} placeholder="Street, City, Country" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls}>Operating Hours</label>
                    <input type="text" name="operatingHours" value={form.operatingHours} onChange={handleFormChange} placeholder="e.g. Mon – Sat: 8:00 AM – 10:00 PM" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls}>Description</label>
                    <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Brief description about the pharmacy..." rows={3} className={`${inputCls} resize-none`} />
                  </div>
                </div>
              </div>

              {/* Management */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Management Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Owner Name *</label>
                    <input type="text" name="ownerName" required value={form.ownerName} onChange={handleFormChange} placeholder="Full name" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Manager Name</label>
                    <input type="text" name="manager" value={form.manager} onChange={handleFormChange} placeholder="Full name" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[16px] font-medium text-slate-800 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </span>
                    Products
                    <span className="text-[12px] text-slate-400 font-semibold">(optional)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="text-[12px] font-semibold text-[#6A8BFF] hover:text-[#5a7ae6] flex items-center gap-1.5 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                  </button>
                </div>

                {/* Product tabs */}
                {products.length > 1 && (
                  <div className="flex gap-2 mb-5 flex-wrap">
                    {products.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveProductIdx(i)}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                          activeProductIdx === i
                            ? "bg-[#1E293B] text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {p.name.trim() || `Product ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active product form */}
                {activeProduct && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Product Name *</label>
                        <input name="name" value={activeProduct.name} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="e.g. Paracetamol 500mg" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Category *</label>
                        <select name="category" value={activeProduct.category} onChange={e => handleProductChange(activeProductIdx, e)} className={inputCls}>
                          <option value="" disabled>Select category</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Manufacturer</label>
                        <input name="manufacturer" value={activeProduct.manufacturer} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="e.g. GSK" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Strength / Dosage</label>
                        <input name="strength" value={activeProduct.strength} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="e.g. 500mg" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Price (AED) *</label>
                        <input type="number" min="0" step="0.01" name="price" value={activeProduct.price} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="0.00" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Stock Quantity</label>
                        <input type="number" min="0" name="stock" value={activeProduct.stock} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="0" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Batch Number</label>
                        <input name="batchNumber" value={activeProduct.batchNumber} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="e.g. BATCH-001" className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Expiry Date</label>
                        <input type="date" name="expiryDate" value={activeProduct.expiryDate} onChange={e => handleProductChange(activeProductIdx, e)} className={inputCls} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Reorder Level</label>
                        <input type="number" min="0" name="reorderLevel" value={activeProduct.reorderLevel} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="e.g. 50" className={inputCls} />
                      </div>
                      <div className="sm:col-span-2 flex flex-col gap-1.5">
                        <label className={labelCls}>Description</label>
                        <textarea name="description" value={activeProduct.description} onChange={e => handleProductChange(activeProductIdx, e)} placeholder="Brief description, indications..." rows={2} className={`${inputCls} resize-none`} />
                      </div>
                    </div>

                    {/* Prescription toggle */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">Prescription Required</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Patients must upload a valid prescription</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePrescription(activeProductIdx)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${activeProduct.requiresPrescription ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${activeProduct.requiresPrescription ? "translate-x-6" : ""}`} />
                      </button>
                    </div>

                    {/* Remove product */}
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProduct(activeProductIdx)}
                        className="text-[12px] font-semibold text-red-400 hover:text-red-600 transition flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove this product
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Licenses + Actions */}
            <div className="flex flex-col gap-6">

              {/* Licenses */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  Licenses &amp; Compliance
                </h2>
                <div className="flex flex-col gap-5">
                  {[
                    { label: "Trade License *", name: "tradeLicense", placeholder: "TD 0000 1111 2222", required: true },
                    { label: "Health Authority License *", name: "healthAuthorityLicense", placeholder: "HA 7777 6666 8900", required: true },
                    { label: "Pharmacist License *", name: "pharmacistLicense", placeholder: "PL 6754 3456 8986", required: true },
                  ].map(({ label, name, placeholder, required }) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <label className={labelCls}>{label}</label>
                      <input
                        type="text" name={name} required={required}
                        value={(form as any)[name]} onChange={handleFormChange}
                        placeholder={placeholder} className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents (UI only) */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-8">
                <h2 className="text-[16px] font-medium text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[#6A8BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </span>
                  Upload Documents
                </h2>
                <div className="flex flex-col gap-4">
                  {["Trade License Copy", "Health Authority License Copy", "Pharmacist License Copy"].map(doc => (
                    <div key={doc} className="border-2 border-dashed border-slate-100 rounded-xl p-4 flex items-center gap-3 hover:border-[#6A8BFF]/40 hover:bg-[#f8faff] transition cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-[#EEF2FF] flex items-center justify-center transition">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 truncate">{doc}</p>
                        <p className="text-[10px] text-slate-400 font-medium">PDF, JPG or PNG · Max 5MB</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-[#6A8BFF] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary + submit */}
              <div className="bg-[#f8fafd] rounded-[2rem] border border-slate-100 p-6 space-y-3 text-[12px] text-slate-500 font-semibold">
                <p className="text-[13px] font-medium text-slate-800 mb-1">Summary</p>
                <p>Pharmacy: <span className="text-slate-800">{form.pharmacyName || "—"}</span></p>
                <p>Owner: <span className="text-slate-800">{form.ownerName || "—"}</span></p>
                <p>Products: <span className="text-slate-800">{products.filter(p => p.name.trim()).length}</span></p>
                <p>Status after creation: <span className="text-teal-600 font-semibold">Approved</span></p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] disabled:opacity-60 text-white rounded-[1rem] text-[13px] font-semibold transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating…
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
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[1rem] text-[13px] font-semibold transition"
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
