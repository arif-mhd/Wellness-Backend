"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];

export default function AddProductPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("");
  const [price, setPrice]             = useState("");
  const [stock, setStock]             = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate]   = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [strength, setStrength]       = useState("");
  const [numberOfTablets, setNumberOfTablets] = useState("");
  const [productSummary, setProductSummary] = useState("");
  const [recommendedFor, setRecommendedFor] = useState("");
  const [benefits, setBenefits] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);
  const [productStatus, setProductStatus] = useState<"approved" | "pending_approval">("pending_approval");

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
      form.append("description", description);
      form.append("category", category);
      form.append("price", price);
      form.append("stock", stock || "0");
      form.append("requiresPrescription", String(requiresPrescription));
      if (batchNumber)  form.append("batchNumber", batchNumber);
      if (expiryDate)   form.append("expiryDate", expiryDate);
      if (reorderLevel) form.append("reorderLevel", reorderLevel);
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
      setProductStatus(data.product?.status ?? "pending_approval");
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard/inventory"), 2000);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center mx-auto mb-4 text-[#5476FC]">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 className="text-xl font-bricolage font-bold text-[#1a2332] mb-2">
          {productStatus === "approved" ? "Product Added!" : "Product Submitted!"}
        </h2>
        <p className="text-sm font-outfit text-slate-500">
          {productStatus === "approved"
            ? "Your product is now visible to patients."
            : "It will be reviewed by the admin before going live."}
        </p>
        <p className="text-xs font-outfit text-slate-400 mt-2">Redirecting to inventory…</p>
      </div>
    </div>
  );

  const inputCls = "w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition";
  const labelCls = "block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/inventory" className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm hover:shadow-md transition">
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Add New Product</h1>
          <p className="text-sm font-outfit text-slate-500 mt-0.5">Fill in the product details below</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-outfit">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image upload */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <label className={labelCls}>Product Image</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-[#5476FC]/50 hover:bg-blue-50/30 transition group"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-xl p-2" />
            ) : (
              <>
                <div className="mb-2 text-slate-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-sm font-outfit text-slate-500 group-hover:text-[#5476FC] transition">Click to upload image</p>
                <p className="text-xs font-outfit text-slate-400 mt-1">JPG, PNG up to 5MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* Core product info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bricolage font-bold text-[#1a2332] mb-1">Product Information</h2>

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
              className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
          </div>

          <div>
            <label className={labelCls}>Product Summary</label>
            <textarea value={productSummary} onChange={e => setProductSummary(e.target.value)}
              placeholder="Detailed product summary..."
              rows={3}
              className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Recommended For (Tags)</label>
              <input value={recommendedFor} onChange={e => setRecommendedFor(e.target.value)} placeholder="e.g. Age: 8-64, Kids" className={inputCls} />
              <p className="text-[11px] font-outfit text-slate-400 mt-1">Comma-separated values</p>
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
              className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
          </div>

          <div>
            <label className={labelCls}>Side Effects</label>
            <textarea value={sideEffects} onChange={e => setSideEffects(e.target.value)}
              placeholder="Potential side effects..."
              rows={2}
              className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
          </div>

          <div>
            <label className={labelCls}>How to use</label>
            <textarea value={howToUse} onChange={e => setHowToUse(e.target.value)}
              placeholder="Usage instructions..."
              rows={2}
              className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 placeholder-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
          </div>

          <div>
            <label className={labelCls}>Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition appearance-none">
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price (AED) *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Stock Quantity</label>
              <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Stock & batch details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bricolage font-bold text-[#1a2332] mb-1">Stock Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Batch Number</label>
              <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g. BATCH-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full h-12 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Reorder Level</label>
            <input type="number" min="0" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} placeholder="e.g. 50" className={inputCls} />
            <p className="text-[11px] font-outfit text-slate-400 mt-1">Alert will appear when stock falls below this level</p>
          </div>
        </div>

        {/* Prescription toggle */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bricolage font-bold text-[#1a2332]">Prescription Required</p>
              <p className="text-xs font-outfit text-slate-400 mt-1">Patients will need to upload a valid prescription to purchase this product</p>
            </div>
            <button
              type="button"
              onClick={() => setRequiresPrescription(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${requiresPrescription ? "bg-[#5476FC]" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${requiresPrescription ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs font-outfit text-blue-700">
          As an onboarded pharmacy, your products go live immediately. The admin may flag any product if needed — you&apos;ll see a notice in Inventory.
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white font-outfit font-semibold text-base shadow-lg shadow-blue-200/50 hover:shadow-blue-300/60 transition-all disabled:opacity-60">
          {loading ? "Submitting…" : "Add Product"}
        </button>
      </form>
    </div>
  );
}
