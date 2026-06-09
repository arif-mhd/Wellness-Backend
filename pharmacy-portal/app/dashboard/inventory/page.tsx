"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  id: string; name: string; description?: string; category: string;
  price: number; stock: number; imageUrl?: string;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string; rejectedReason?: string;
  requiresPrescription?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  reorderLevel?: number;
  manufacturer?: string;
  strength?: string;
  flagged?: boolean;
  flagReason?: string | null;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100", dot: "bg-green-500" },
  pending_approval: { label: "Pending",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100", dot: "bg-amber-400" },
  rejected:         { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100",   dot: "bg-red-500" },
};

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-outfit font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | Product["status"]>("all");
  const [search, setSearch]         = useState("");
  const [editing, setEditing]       = useState<Product | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState("");
  const [editImage, setEditImage]   = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pharmacy/products");
      if (res.ok) { const d = await res.json(); setProducts(d.products); }
    } catch { /* silently */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  async function handleDelete(productId: string) {
    if (!confirm("Delete this product?")) return;
    setDeleting(productId);
    try {
      await apiFetch(`/api/pharmacy/products/${productId}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch { /* silently */ } finally { setDeleting(null); }
  }

  function openEdit(product: Product) {
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
      if (editImage) form.append("image", editImage);

      const res = await fetch(`${API_URL}/api/pharmacy/products/${editing.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error || "Failed to update."); return; }
      const d = await res.json();
      setProducts(prev => prev.map(p => p.id === editing.id ? d.product : p));
      setEditing(null);
    } catch { setEditError("Network error."); } finally { setSaving(false); }
  }

  const counts = {
    all:              products.length,
    approved:         products.filter(p => p.status === "approved").length,
    pending_approval: products.filter(p => p.status === "pending_approval").length,
    rejected:         products.filter(p => p.status === "rejected").length,
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#22c55e]" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Inventory</h1>
          <p className="text-sm font-outfit text-slate-500 mt-0.5">{products.length} product{products.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/dashboard/add-product"
          className="px-4 py-2.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-xl font-outfit font-semibold text-sm shadow-md shadow-green-200/40 hover:shadow-green-300/50 transition flex items-center gap-2">
          <span>+</span> Add Product
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(["all", "approved", "pending_approval", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-outfit font-semibold transition ${
              filter === f
                ? "bg-[#1a2332] text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
            }`}>
            {f === "all" ? "All" : f === "pending_approval" ? "Pending" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {counts[f]}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 h-9 shadow-sm">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
            className="text-sm font-outfit text-slate-700 placeholder-slate-400 outline-none bg-transparent w-40" />
        </div>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center text-center shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-bricolage font-bold text-[#1a2332] mb-1">No products found</p>
          <p className="text-sm font-outfit text-slate-500">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition group">
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-slate-50 to-green-50/30 flex items-center justify-center relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4" />
                ) : (
                  <span className="text-5xl">
                    {product.category === "OTC" ? "💊" : product.category === "Prescription" ? "📋" : product.category === "Supplement" ? "🌿" : "📦"}
                  </span>
                )}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  <StatusBadge status={product.status} />
                  {product.flagged && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-outfit font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                      🚩 Flagged
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <p className="font-bricolage font-bold text-[#1a2332] truncate">{product.name}</p>
                <p className="text-xs font-outfit text-slate-400 mt-0.5">{product.category}</p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-bricolage font-bold text-[#22c55e]">AED {product.price.toFixed(2)}</span>
                  <span className="text-xs font-outfit text-slate-400">Stock: {product.stock}</span>
                </div>

                {product.status === "rejected" && product.rejectedReason && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs font-outfit text-red-600">
                    ❌ {product.rejectedReason}
                  </div>
                )}

                {product.flagged && (
                  <div className="mt-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs font-outfit text-orange-700 flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 21V4l1-1h10l1 2h6v12H14l-1-2H5v8H3z" />
                    </svg>
                    <span>
                      <span className="font-bold">Flagged by admin.</span>
                      {product.flagReason && <span> {product.flagReason}</span>}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white text-xs font-outfit font-semibold shadow-sm transition flex items-center justify-center gap-1"
                  >
                    View Details
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(product)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-outfit font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(product.id)} disabled={deleting === product.id}
                    className="flex-1 py-2 rounded-xl border border-red-100 text-xs font-outfit font-semibold text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1 disabled:opacity-40">
                    🗑️ {deleting === product.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                  className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-[#22c55e]/50 hover:bg-green-50/20 transition">
                  {editPreview ? <img src={editPreview} alt="" className="h-full w-full object-contain rounded-xl p-2" />
                    : <p className="text-sm font-outfit text-slate-400">Click to change image</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Product Name *</label>
                <input value={editing.name} onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Manufacturer</label>
                  <input value={editing.manufacturer ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, manufacturer: e.target.value } : prev)}
                    placeholder="e.g. GSK"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Strength</label>
                  <input value={editing.strength ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, strength: e.target.value } : prev)}
                    placeholder="e.g. 500mg"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={editing.description ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition resize-none" />
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
                <select value={editing.category} onChange={e => setEditing(prev => prev ? { ...prev, category: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition appearance-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Price (AED) *</label>
                  <input type="number" min="0" step="0.01" value={editing.price}
                    onChange={e => setEditing(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Stock</label>
                  <input type="number" min="0" value={editing.stock}
                    onChange={e => setEditing(prev => prev ? { ...prev, stock: parseInt(e.target.value) } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
              </div>

              {/* Batch & stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Number</label>
                  <input value={editing.batchNumber ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, batchNumber: e.target.value } : prev)}
                    placeholder="BATCH-001"
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
                <div>
                  <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input type="date" value={editing.expiryDate ?? ""}
                    onChange={e => setEditing(prev => prev ? { ...prev, expiryDate: e.target.value } : prev)}
                    className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-outfit font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reorder Level</label>
                <input type="number" min="0"
                  value={editing.reorderLevel ?? ""}
                  onChange={e => setEditing(prev => prev ? { ...prev, reorderLevel: parseInt(e.target.value) || undefined } : prev)}
                  placeholder="e.g. 50"
                  className="w-full h-11 px-4 bg-[#f3f4fd] rounded-xl text-sm font-outfit text-slate-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition" />
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
                  className={`relative w-12 h-6 rounded-full transition-colors ${editing.requiresPrescription ? "bg-[#22c55e]" : "bg-slate-200"}`}
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
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-outfit font-semibold text-sm shadow-md shadow-green-200/40 hover:shadow-green-300/50 transition disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
