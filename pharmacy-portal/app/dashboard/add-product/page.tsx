"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";
import { useAccountRole } from "@/hooks/useAccountRole";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];
const LAB_CATEGORIES = ["Blood Test", "Imaging", "Body Checkup", "Screening Package", "Vitamin Panel", "Hormone Panel", "Allergy Test", "Genetic Test"];

export default function AddProductPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { role } = useAccountRole();
  const isLab = role === "lab";

  // ── Shared fields ──────────────────────────────────────────────────────
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("");
  const [price, setPrice]             = useState("");
  const [recommendedFor, setRecommendedFor] = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);
  const [itemStatus, setItemStatus]   = useState<"approved" | "pending_approval">("pending_approval");

  // ── Pharmacy-only fields ───────────────────────────────────────────────
  const [inStock, setInStock]         = useState(true);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate]   = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [strength, setStrength]       = useState("");
  const [numberOfTablets, setNumberOfTablets] = useState("");
  const [productSummary, setProductSummary] = useState("");
  const [benefits, setBenefits] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);

  // ── Lab-only fields ─────────────────────────────────────────────────────
  const [turnaroundHours, setTurnaroundHours] = useState("");
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [requiresDoctorApproval, setRequiresDoctorApproval] = useState(false);
  const [homeVisitAvailable, setHomeVisitAvailable] = useState(false);
  const [howItsDone, setHowItsDone] = useState("");
  const [recommendedFrequency, setRecommendedFrequency] = useState("");
  const [patientInstructions, setPatientInstructions] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !category || !price) { setError("Name, category and price are required."); return; }
    setError(""); setLoading(true);
    try {
      const token = await Session.getAccessToken();
      const form = new FormData();
      form.append("name", name);
      form.append("category", category);
      form.append("price", price);

      if (isLab) {
        if (description) form.append("description", description);
        if (turnaroundHours) form.append("turnaround_hours", turnaroundHours);
        form.append("requires_fasting", String(requiresFasting));
        form.append("requires_doctor_approval", String(requiresDoctorApproval));
        form.append("homeVisitAvailable", String(homeVisitAvailable));
        if (recommendedFor) form.append("recommendedFor", recommendedFor);
        if (howItsDone) form.append("howItsDone", howItsDone);
        if (recommendedFrequency) form.append("recommendedFrequency", recommendedFrequency);
        if (patientInstructions) form.append("patientInstructions", patientInstructions);
        if (imageFile) form.append("image", imageFile);

        const res = await fetch(`${API_URL}/api/lab/my-tests`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}` },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to add test."); return; }
        setItemStatus(data.test?.status ?? "pending_approval");
        setSuccess(true);
        setTimeout(() => router.replace("/dashboard/inventory"), 2000);
        return;
      }

      form.append("description", description);
      form.append("inStock", String(inStock));
      form.append("requiresPrescription", String(requiresPrescription));
      if (batchNumber)  form.append("batchNumber", batchNumber);
      if (expiryDate)   form.append("expiryDate", expiryDate);
      if (manufacturer) form.append("manufacturer", manufacturer);
      if (strength)     form.append("strength", strength);
      if (numberOfTablets) form.append("numberOfTablets", numberOfTablets);
      if (productSummary) form.append("productSummary", productSummary);
      if (recommendedFor) form.append("recommendedFor", recommendedFor);
      if (benefits) form.append("benefits", benefits);
      if (sideEffects) form.append("sideEffects", sideEffects);
      if (howToUse) form.append("howToUse", howToUse);
      if (imageFile)    form.append("image", imageFile);

      const res = await fetch(`${API_URL}/api/pharmacy/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to add product."); return; }
      setItemStatus(data.product?.status ?? "pending_approval");
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard/inventory"), 2000);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center animate-fade-in font-outfit">
        <div className="w-20 h-20 rounded-full bg-[#EEF2FF] border-2 border-[#C7D2FE] flex items-center justify-center mx-auto mb-4 text-[#5476FC]">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="text-[22px] font-semibold text-[#24292E] mb-2 tracking-[-0.44px]">
          {isLab
            ? (itemStatus === "approved" ? "Test Added!" : "Test Submitted!")
            : (itemStatus === "approved" ? "Product Added!" : "Product Submitted!")}
        </h2>
        <p className="text-sm text-[#676E76]">
          {itemStatus === "approved"
            ? `Your ${isLab ? "test" : "product"} is now visible to patients.`
            : "It will be reviewed by the admin before going live."}
        </p>
        <p className="text-xs text-[#A0A8B0] mt-2">Redirecting to inventory…</p>
      </div>
    </div>
  );

  const inputCls = "w-full h-12 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] placeholder-[#9EA5AD] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all";
  const labelCls = "block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5";
  const textareaCls = "w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] placeholder-[#9EA5AD] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none";

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 pt-6 font-outfit animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/inventory" className="w-10 h-10 rounded-xl bg-white border border-[#EBEEF5] flex items-center justify-center shadow-sm hover:shadow-md transition-all group">
          <svg className="w-4 h-4 text-[#676E76] group-hover:text-[#5476FC] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[28px] text-[#383F45] font-normal tracking-[-0.56px] leading-none">
            {isLab ? "Add New Lab Test" : "Add New Product"}
          </h1>
          <p className="text-sm text-[#676E76] mt-1.5 tracking-[-0.28px]">
            {isLab ? "Fill in the lab test details below" : "Fill in the product details below"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-sm text-[#F25252] font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image upload */}
        <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
          <label className={labelCls}>{isLab ? "Test Image" : "Product Image"}</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#EBEEF5] rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-[#5476FC]/50 hover:bg-[#EEF2FF]/50 transition-all group"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-xl p-2" />
            ) : (
              <>
                <div className="mb-2 text-[#C0C8D0]">
                  <svg className="w-10 h-10 group-hover:text-[#5476FC] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-sm text-[#676E76] group-hover:text-[#5476FC] transition-colors">Click to upload image</p>
                <p className="text-[11px] text-[#A0A8B0] mt-1">JPG, PNG up to 5MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {isLab ? (
          <>
            {/* Core test info */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 space-y-5 transition-all hover:border-gray-300">
              <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-2 border-b border-[#EBEEF5] pb-3">Test Information</h2>

              <div>
                <label className={labelCls}>Test Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Complete Blood Count (CBC)" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of what this test measures…"
                  rows={3} className={textareaCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Recommended For (Tags)</label>
                  <input value={recommendedFor} onChange={e => setRecommendedFor(e.target.value)} placeholder="e.g. Adults, Diabetics" className={inputCls} />
                  <p className="text-[11px] text-[#A0A8B0] mt-1.5">Comma-separated values</p>
                </div>
                <div>
                  <label className={labelCls}>Turnaround Time (hours)</label>
                  <input type="number" min="0" value={turnaroundHours} onChange={e => setTurnaroundHours(e.target.value)} placeholder="e.g. 24" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>How It's Done</label>
                <textarea value={howItsDone} onChange={e => setHowItsDone(e.target.value)}
                  placeholder="Sample collection method, procedure…"
                  rows={2} className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>Recommended Frequency</label>
                <input value={recommendedFrequency} onChange={e => setRecommendedFrequency(e.target.value)} placeholder="e.g. Once every 6 months" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Patient Instructions</label>
                <textarea value={patientInstructions} onChange={e => setPatientInstructions(e.target.value)}
                  placeholder="Instructions patients should follow before/after the test…"
                  rows={2} className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full h-12 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all appearance-none">
                  <option value="" disabled>Select a category</option>
                  {LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Price (AED) *</label>
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {/* Home visit toggle — the important new one, called out clearly */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#24292E]">Available for Home Visit</p>
                  <p className="text-xs text-[#676E76] mt-1">Patients can request an at-home sample collection for this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHomeVisitAvailable(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${homeVisitAvailable ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${homeVisitAvailable ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Fasting toggle */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#24292E]">Requires Fasting</p>
                  <p className="text-xs text-[#676E76] mt-1">Patients must fast before this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresFasting(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${requiresFasting ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${requiresFasting ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Doctor approval toggle */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#24292E]">Requires Doctor Approval</p>
                  <p className="text-xs text-[#676E76] mt-1">Patients need a doctor's approval before booking this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresDoctorApproval(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${requiresDoctorApproval ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${requiresDoctorApproval ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 text-xs text-[#4F46E5] flex gap-3 items-start">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                As an onboarded lab, your tests go live immediately. The admin may flag any test if needed — you&apos;ll see a notice in Inventory.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[15px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
              {loading ? "Submitting…" : "Add Lab Test"}
            </button>
          </>
        ) : (
          <>
            {/* Core product info */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 space-y-5 transition-all hover:border-gray-300">
              <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-2 border-b border-[#EBEEF5] pb-3">Product Information</h2>

              <div>
                <label className={labelCls}>Product Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Panadol Extra 500mg" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Manufacturer</label>
                  <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. GSK" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Strength / Dosage</label>
                  <input value={strength} onChange={e => setStrength(e.target.value)} placeholder="e.g. 500mg" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the product, dosage, indications…"
                  rows={3}
                  className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>Product Summary</label>
                <textarea value={productSummary} onChange={e => setProductSummary(e.target.value)}
                  placeholder="Detailed product summary..."
                  rows={3}
                  className={textareaCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Recommended For (Tags)</label>
                  <input value={recommendedFor} onChange={e => setRecommendedFor(e.target.value)} placeholder="e.g. Age: 8-64, Kids" className={inputCls} />
                  <p className="text-[11px] text-[#A0A8B0] mt-1.5">Comma-separated values</p>
                </div>
                <div>
                  <label className={labelCls}>Number of Tablets / Quantity</label>
                  <input value={numberOfTablets} onChange={e => setNumberOfTablets(e.target.value)} placeholder="e.g. 15 Tablets" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Benefits</label>
                <textarea value={benefits} onChange={e => setBenefits(e.target.value)}
                  placeholder="Product benefits..."
                  rows={2}
                  className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>Side Effects</label>
                <textarea value={sideEffects} onChange={e => setSideEffects(e.target.value)}
                  placeholder="Potential side effects..."
                  rows={2}
                  className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>How to use</label>
                <textarea value={howToUse} onChange={e => setHowToUse(e.target.value)}
                  placeholder="Usage instructions..."
                  rows={2}
                  className={textareaCls} />
              </div>

              <div>
                <label className={labelCls}>Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full h-12 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all appearance-none">
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Price (AED) *</label>
                <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {/* Stock & batch details */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 space-y-5 transition-all hover:border-gray-300">
              <h2 className="text-[#24292E] font-semibold text-[18px] tracking-[-0.36px] mb-2 border-b border-[#EBEEF5] pb-3">Stock Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Batch Number</label>
                  <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. BATCH-001" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" max="9999-12-31" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                    className="w-full h-12 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
              </div>
            </div>

            {/* Availability toggle */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#24292E]">In Stock</p>
                  <p className="text-xs text-[#676E76] mt-1">Patients can only order this product while it's marked in stock — flip this off the moment you run out</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInStock(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${inStock ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${inStock ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Prescription toggle */}
            <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#24292E]">Prescription Required</p>
                  <p className="text-xs text-[#676E76] mt-1">Patients will need to upload a valid prescription to purchase this product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequiresPrescription(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${requiresPrescription ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${requiresPrescription ? "translate-x-6" : ""}`} />
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 text-xs text-[#4F46E5] flex gap-3 items-start">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                As an onboarded pharmacy, your products go live immediately. The admin may flag any product if needed — you&apos;ll see a notice in Inventory.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[15px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
              {loading ? "Submitting…" : "Add Product"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
