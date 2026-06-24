"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers ?? {}) },
  });
}

interface Product {
  id: string;
  pharmacyId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  requiresPrescription?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  reorderLevel?: number;
  manufacturer?: string;
  strength?: string;
  numberOfTablets?: string;
  productSummary?: string;
  recommendedFor?: string;
  benefits?: string;
  sideEffects?: string;
  howToUse?: string;
  flagged?: boolean;
  flagReason?: string | null;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  pending_approval: { label: "Pending Review", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  rejected:         { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0 gap-4">
      <span className="text-xs font-outfit font-semibold text-slate-400 uppercase tracking-wide shrink-0 w-36">{label}</span>
      <span className="text-sm font-outfit text-slate-800 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing]       = useState<Product | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState("");
  const [editImage, setEditImage]   = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/pharmacy/products/${id}`);
        if (res.ok) {
          const d = await res.json();
          setProduct(d.product);
        } else {
          setError("Product not found.");
        }
      } catch {
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  async function handleDelete() {
    if (!product) return;
    if (!confirm("Delete this product?")) return;
    setDeleting(product.id);
    try {
      await apiFetch(`/api/pharmacy/products/${product.id}`, { method: "DELETE" });
      router.push("/dashboard/inventory");
    } catch { /* silently */ } finally { setDeleting(null); }
  }

  function openEdit() {
    if (!product) return;
    setEditing({ ...product });
    setEditImage(null);
    setEditPreview(product.imageUrl ?? null);
    setEditError("");
  }

  function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImage(file);
    const reader = new FileReader();
    reader.onload = () => setEditPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (!editing.name || !editing.category || !editing.price) { setEditError("Name, category and price are required."); return; }
    setSaving(true); setEditError("");
    try {
      const token = await Session.getAccessToken();
      const form = new FormData();
      form.append("name", editing.name);
      form.append("description", editing.description ?? "");
      form.append("category", editing.category);
      form.append("price", String(editing.price));
      form.append("stock", String(editing.stock));
      form.append("requiresPrescription", String(editing.requiresPrescription ?? false));
      form.append("batchNumber", editing.batchNumber ?? "");
      form.append("expiryDate", editing.expiryDate ?? "");
      form.append("reorderLevel", editing.reorderLevel != null ? String(editing.reorderLevel) : "");
      form.append("manufacturer", editing.manufacturer ?? "");
      form.append("strength", editing.strength ?? "");
      form.append("numberOfTablets", editing.numberOfTablets ?? "");
      form.append("productSummary", editing.productSummary ?? "");
      form.append("recommendedFor", editing.recommendedFor ?? "");
      form.append("benefits", editing.benefits ?? "");
      form.append("sideEffects", editing.sideEffects ?? "");
      form.append("howToUse", editing.howToUse ?? "");
      if (editImage) form.append("image", editImage);

      const res = await fetch(`${API_URL}/api/pharmacy/products/${editing.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error || "Failed to update."); return; }
      const d = await res.json();
      setProduct(d.product);
      setEditing(null);
    } catch { setEditError("Network error."); } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
    </div>
  );

  if (error || !product) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-red-500 font-semibold text-sm font-outfit">{error || "Product not found."}</p>
      <Link href="/dashboard/inventory" className="text-[#5476FC] text-sm font-outfit font-bold hover:underline">
        Back to Inventory
      </Link>
    </div>
  );

  const statusCfg = STATUS_CONFIG[product.status];
  const isLowStock = product.stock < (product.reorderLevel ?? 50);
  const categoryEmoji =
    product.category === "OTC" ? "💊" :
    product.category === "Prescription" ? "📋" :
    product.category === "Supplement" ? "🌿" :
    product.category === "Medical Device" ? "🩺" : "📦";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header nav */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm hover:shadow-md transition"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Product Details</h1>
          <p className="text-sm font-outfit text-slate-500 mt-0.5">
            <Link href="/dashboard/inventory" className="hover:underline">Inventory</Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600">{product.name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — image + status card */}
        <div className="lg:col-span-1 flex flex-col gap-4">

          {/* Image */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center gap-4">
            <div className="w-full h-48 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4" />
              ) : (
                <span className="text-6xl">{categoryEmoji}</span>
              )}
            </div>
            <div className="w-full text-center">
              <h2 className="font-bricolage font-bold text-[#1a2332] text-lg leading-snug">{product.name}</h2>
              {product.strength && (
                <p className="text-xs font-outfit text-slate-400 mt-0.5">{product.strength}</p>
              )}
              {product.manufacturer && (
                <p className="text-xs font-outfit text-slate-500 mt-1">{product.manufacturer}</p>
              )}
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-outfit font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>

            {product.flagged && (
              <div className="w-full bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-xs font-outfit text-orange-700 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21V4l1-1h10l1 2h6v12H14l-1-2H5v8H3z" />
                </svg>
                <span>
                  <span className="font-bold">Flagged by admin.</span>
                  {product.flagReason && <span> {product.flagReason}</span>}
                </span>
              </div>
            )}

            {product.status === "rejected" && product.rejectedReason && (
              <div className="w-full bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs font-outfit text-red-600">
                ❌ {product.rejectedReason}
              </div>
            )}
          </div>

          {/* Price & stock summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-outfit font-semibold text-slate-400 uppercase tracking-wide">Price</span>
              <span className="text-xl font-bricolage font-bold text-[#5476FC]">AED {product.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-outfit font-semibold text-slate-400 uppercase tracking-wide">In Stock</span>
              <span className={`text-sm font-outfit font-bold ${isLowStock ? "text-red-500" : "text-slate-800"}`}>
                {product.stock} units {isLowStock && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">Low</span>}
              </span>
            </div>
            {product.reorderLevel != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-outfit font-semibold text-slate-400 uppercase tracking-wide">Reorder At</span>
                <span className="text-sm font-outfit text-slate-600">{product.reorderLevel} units</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={openEdit}
              className="w-full py-3 text-center rounded-xl border border-slate-200 text-sm font-outfit font-semibold text-slate-600 hover:bg-slate-50 transition bg-white shadow-sm"
            >
              Edit Product
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting !== null}
              className="w-full py-3 text-center rounded-xl border border-red-100 text-sm font-outfit font-semibold text-red-600 hover:bg-red-50 transition bg-white shadow-sm disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Product"}
            </button>
          </div>
        </div>

        {/* Right — details */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Product details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bricolage font-bold text-[#1a2332] mb-4">Product Details</h3>
            <DetailRow label="Category" value={product.category} />
            {product.requiresPrescription != null && (
              <DetailRow
                label="Prescription"
                value={
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-outfit font-semibold ${product.requiresPrescription ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                    {product.requiresPrescription ? "Required" : "Not required"}
                  </span>
                }
              />
            )}
            {product.description && (
              <div className="py-3 border-b border-slate-50">
                <span className="text-xs font-outfit font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Description</span>
                <p className="text-sm font-outfit text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>

          {/* Batch & stock details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bricolage font-bold text-[#1a2332] mb-4">Stock & Batch</h3>
            <DetailRow label="Batch Number" value={product.batchNumber} />
            <DetailRow
              label="Expiry Date"
              value={
                product.expiryDate
                  ? new Date(product.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : undefined
              }
            />
            <DetailRow label="Reorder Level" value={product.reorderLevel != null ? `${product.reorderLevel} units` : undefined} />
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bricolage font-bold text-[#1a2332] mb-4">Activity</h3>
            <DetailRow
              label="Added"
              value={new Date(product.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            />
            {product.approvedAt && (
              <DetailRow
                label="Approved"
                value={new Date(product.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              />
            )}
            {product.updatedAt && (
              <DetailRow
                label="Last Updated"
                value={new Date(product.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="font-bricolage font-bold text-[#1a2332] text-lg">Edit Product</h2>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {editError && <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-outfit">{editError}</div>}

              {/* Image */}
              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-2">Image</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-[#5476FC]/50 hover:bg-blue-50/20 transition">
                  {editPreview ? <img src={editPreview} alt="" className="h-full w-full object-contain rounded-xl p-2" />
                    : <p className="text-sm font-outfit text-slate-400">Click to change image</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name *</label>
                <input value={editing.name} onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Manufacturer</label>
                  <input value={editing.manufacturer ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, manufacturer: e.target.value } : prev)}
                    placeholder="e.g. GSK"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Strength</label>
                  <input value={editing.strength ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, strength: e.target.value } : prev)}
                    placeholder="e.g. 500mg"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={editing.description ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Summary</label>
                <textarea value={editing.productSummary ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, productSummary: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recommended For (Tags)</label>
                  <input value={editing.recommendedFor ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, recommendedFor: e.target.value } : prev)}
                    placeholder="e.g. Age: 8-64, Kids"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Number of Tablets / Quantity</label>
                  <input value={editing.numberOfTablets ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, numberOfTablets: e.target.value } : prev)}
                    placeholder="e.g. 15 Tablets"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Benefits</label>
                <textarea value={editing.benefits ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, benefits: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Side Effects</label>
                <textarea value={editing.sideEffects ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, sideEffects: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">How to use</label>
                <textarea value={editing.howToUse ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, howToUse: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition resize-none" />
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
                <select value={editing.category} onChange={e => setEditing(prev => prev ? { ...prev, category: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition appearance-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Price (AED) *</label>
                  <input type="number" min="0" step="0.01" value={editing.price}
                    onChange={e => setEditing(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Stock</label>
                  <input type="number" min="0" value={editing.stock}
                    onChange={e => setEditing(prev => prev ? { ...prev, stock: parseInt(e.target.value) } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
              </div>

              {/* Batch & stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Number</label>
                  <input value={editing.batchNumber ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, batchNumber: e.target.value } : prev)}
                    placeholder="BATCH-001"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input type="date" value={editing.expiryDate ?? ""}
                    onChange={e => setEditing(prev => prev ? { ...prev, expiryDate: e.target.value } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reorder Level</label>
                <input type="number" min="0"
                  value={editing.reorderLevel ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, reorderLevel: parseInt(e.target.value) || undefined } : prev)}
                  placeholder="e.g. 50"
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#5476FC]/40 transition" />
              </div>

              {/* Prescription toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-sm font-outfit font-semibold text-slate-700">Prescription Required</p>
                  <p className="text-xs font-outfit text-slate-400 mt-0.5">Patients must upload a prescription</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(prev => prev ? { ...prev, requiresPrescription: !prev.requiresPrescription } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editing.requiresPrescription ? "bg-[#5476FC]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editing.requiresPrescription ? "translate-x-6" : ""}`} />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs font-outfit text-blue-700">
                As an onboarded pharmacy, edits go live immediately. The admin can flag a product at any time.
              </div>
            </div>

            <div className="p-6 border-t border-slate-50 flex gap-3">
              <button onClick={() => setEditing(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-outfit font-semibold text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white font-outfit font-semibold text-sm shadow-md shadow-blue-200/40 hover:shadow-blue-300/50 transition disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
