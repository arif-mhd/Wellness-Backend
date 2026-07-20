"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border tracking-wide ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all" | "flagged" | Product["status"]>("all");
  // Seeded from ?search= so the header search bar can deep-link here.
  const [search, setSearch]         = useState(() => searchParams.get("search") ?? "");

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
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {products.length} product{products.length !== 1 ? "s" : ""} total
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Inventory
          </h1>
        </div>
        <Link href="/dashboard/add-product"
          className="px-5 py-2.5 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white rounded-xl font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all flex items-center gap-2">
          Add Product
        </Link>
      </div>

      {/* Filter and Search Action Row */}
      <div className="bg-white rounded-xl p-4 border border-[#EBEEF5] shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Search */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path d="M6.41667 11.0833C8.994 11.0833 11.0833 8.994 11.0833 6.41667C11.0833 3.83934 8.994 1.75 6.41667 1.75C3.83934 1.75 1.75 3.83934 1.75 6.41667C1.75 8.994 3.83934 11.0833 6.41667 11.0833Z" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.2504 12.2504L9.71289 9.71289" stroke="#3D4B5A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full bg-[#F5F7FB] text-[#24292E] placeholder-[#9EA5AD] text-sm rounded-lg pl-11 pr-4 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 focus:bg-white transition-all"
          />
        </div>

        {/* Right Side: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-[#F5F7FB] text-[#3D4B5A] text-xs font-medium rounded-lg px-3 py-2.5 outline-none border border-transparent focus:border-[#5476FC]/50 hover:bg-[#EBEEF5] transition-colors cursor-pointer"
            >
              <option value="all">All Products ({counts.all})</option>
              <option value="flagged">Flagged ({counts.flagged})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EBEEF5] py-20 flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35" /></svg>
          </div>
          <p className="font-semibold text-[#24292E] mb-1 text-base">No products found</p>
          <p className="text-sm text-[#676E76]">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden hover:border-gray-300 hover:shadow-md transition-all group flex flex-col">
              {/* Image */}
              <div className="h-40 bg-[#F8FAFC] flex items-center justify-center relative border-b border-[#EBEEF5]">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <svg className="w-12 h-12 text-[#C0C8D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {product.flagged && (
                  <div className="absolute top-2 left-2 bg-[#F25252] text-white px-2 py-1 rounded-md text-[10px] font-bold shadow-sm">
                    Flagged
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={product.status} />
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <p className="font-medium text-[#24292E] truncate text-sm" title={product.name}>{product.name}</p>
                <p className="text-[11px] text-[#676E76] mt-0.5 uppercase tracking-wider">{product.category}</p>

                <div className="flex items-center justify-between mt-3 mb-1">
                  <span className="text-lg font-semibold text-[#5476FC]">AED {product.price.toFixed(2)}</span>
                  <span className="text-xs text-[#676E76]">Stock: <span className="font-medium text-[#383F45]">{product.stock}</span></span>
                </div>

                {product.status === "rejected" && product.rejectedReason && (
                  <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 text-[11px] text-red-600 line-clamp-2">
                    {product.rejectedReason}
                  </div>
                )}

                <div className="mt-auto pt-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                    className="w-full py-2 rounded-lg bg-[#F5F7FB] text-[#3D4B5A] text-xs font-medium hover:bg-[#EBEEF5] transition-colors border border-transparent"
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
