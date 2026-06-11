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

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pharmacy/products");
      if (res.ok) { const d = await res.json(); setProducts(d.products); }
    } catch { /* silently */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const matchStatus = filter === "all" || (filter === "flagged" && p.flagged);
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });



  const counts = {
    all:     products.length,
    flagged: products.filter(p => p.flagged).length,
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
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
          className="px-4 py-2.5 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white rounded-xl font-outfit font-semibold text-sm shadow-md shadow-blue-200/40 hover:shadow-blue-300/50 transition flex items-center gap-2">
          Add Product
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(["all", "flagged"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-xl text-xs font-outfit font-semibold transition ${
              filter === f
                ? "bg-[#1a2332] text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
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
          <div className="mb-4 text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35" /></svg>
          </div>
          <p className="font-bricolage font-bold text-[#1a2332] mb-1">No products found</p>
          <p className="text-sm font-outfit text-slate-500">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition group">
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4" />
                ) : (
                  <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {product.flagged && (
                  <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-outfit font-bold shadow-md">
                      Flagged Product
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="font-bricolage font-bold text-[#1a2332] truncate">{product.name}</p>
                <p className="text-xs font-outfit text-slate-400 mt-0.5">{product.category}</p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-bricolage font-bold text-[#5476FC]">AED {product.price.toFixed(2)}</span>
                  <span className="text-xs font-outfit text-slate-400">Stock: {product.stock}</span>
                </div>

                {product.status === "rejected" && product.rejectedReason && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs font-outfit text-red-600">
                    Reason: {product.rejectedReason}
                  </div>
                )}



                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white text-xs font-outfit font-semibold shadow-sm transition flex items-center justify-center gap-1"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
