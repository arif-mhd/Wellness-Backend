"use client";

import { useEffect, useState, use } from "react";
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
  flagged?: boolean;
  flagReason?: string | null;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  pending_approval: { label: "Pending Review", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  rejected:         { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#22c55e]" />
    </div>
  );

  if (error || !product) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-red-500 font-semibold text-sm font-outfit">{error || "Product not found."}</p>
      <Link href="/dashboard/inventory" className="text-[#22c55e] text-sm font-outfit font-bold hover:underline">
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
            <div className="w-full h-48 bg-gradient-to-br from-slate-50 to-green-50/30 rounded-xl flex items-center justify-center overflow-hidden">
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
              <span className="text-xl font-bricolage font-bold text-[#22c55e]">AED {product.price.toFixed(2)}</span>
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

          {/* Edit button */}
          <Link
            href="/dashboard/inventory"
            className="block w-full py-3 text-center rounded-xl border border-slate-200 text-sm font-outfit font-semibold text-slate-600 hover:bg-slate-50 transition bg-white shadow-sm"
          >
            ✏️ Edit Product
          </Link>
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
    </div>
  );
}
