"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.headers ?? {}),
    },
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
  approvedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  requiresPrescription?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  reorderLevel?: number;
  manufacturer?: string;
  strength?: string;
  flagged?: boolean;
  flagReason?: string | null;
  flaggedAt?: string | null;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "bg-teal-50",   text: "text-teal-700",  dot: "bg-teal-500" },
  pending_approval: { label: "Pending",   bg: "bg-amber-50",  text: "text-amber-700", dot: "bg-amber-400" },
  rejected:         { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",   dot: "bg-red-500" },
};

const DetailRow = ({
  label,
  value,
  valueClass = "text-[11px] text-slate-800 font-bold text-right",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 gap-4">
    <span className="text-[11px] text-slate-400 font-bold shrink-0">{label}</span>
    <span className={valueClass}>{value ?? "—"}</span>
  </div>
);

export default function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const router = useRouter();
  const { id: pharmacyId, productId } = use(params);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await adminFetch(`/api/admin/pharmacy/${pharmacyId}/products`);
        if (res.ok) {
          const d = await res.json();
          const found = (d.products ?? []).find((p: Product) => p.id === productId);
          if (found) {
            setProduct(found);
          } else {
            setError("Product not found.");
          }
        } else {
          setError("Failed to load product.");
        }
      } catch {
        setError("Failed to load product.");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [pharmacyId, productId]);

  async function toggleFlag() {
    if (!product) return;
    setFlagging(true);
    try {
      const res = await adminFetch(`/api/admin/pharmacy/products/${product.id}/flag`, {
        method: "PATCH",
        body: JSON.stringify({ flagged: !product.flagged, reason: null }),
      });
      if (res.ok) {
        const d = await res.json();
        setProduct(prev => prev ? { ...prev, ...d.product } : prev);
      }
    } finally {
      setFlagging(false);
    }
  }

  if (loading) return (
    <ProtectedRoute>
      <div className="w-full flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6A8BFF]" />
      </div>
    </ProtectedRoute>
  );

  if (error || !product) return (
    <ProtectedRoute>
      <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-red-500 font-semibold text-sm">{error || "Product not found."}</p>
        <button
          onClick={() => router.back()}
          className="text-[#6A8BFF] text-sm font-bold hover:underline"
        >
          Go Back
        </button>
      </div>
    </ProtectedRoute>
  );

  const statusCfg = STATUS_CONFIG[product.status];
  const isLowStock = product.stock < (product.reorderLevel ?? 50);
  const categoryEmoji =
    product.category === "OTC" ? "💊" :
    product.category === "Prescription" ? "📋" :
    product.category === "Supplement" ? "🌿" :
    product.category === "Medical Device" ? "🩺" : "📦";

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {/* Top nav */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm border border-slate-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[26px] font-black text-[#1e293b] tracking-tight">Product Details</h1>
            <p className="text-[12px] text-slate-400 font-semibold mt-0.5">
              <button onClick={() => router.push("/dashboard/pharmacy")} className="hover:text-[#6A8BFF] transition">Pharmacy</button>
              <span className="mx-1.5 text-slate-300">/</span>
              <button onClick={() => router.back()} className="hover:text-[#6A8BFF] transition">Stock Overview</button>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="text-slate-600">{product.name}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-7">

          {/* LEFT — image + quick stats */}
          <div className="xl:col-span-1 flex flex-col gap-5">

            {/* Image card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 flex flex-col items-center gap-5">
              <div className="w-full h-52 bg-gradient-to-br from-slate-50 to-blue-50/20 rounded-2xl flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-6" />
                ) : (
                  <span className="text-7xl">{categoryEmoji}</span>
                )}
              </div>

              <div className="w-full text-center">
                <h2 className="text-[18px] font-black text-slate-800 leading-snug">{product.name}</h2>
                {product.strength && (
                  <p className="text-[12px] font-semibold text-slate-400 mt-0.5">{product.strength}</p>
                )}
                {product.manufacturer && (
                  <p className="text-[12px] font-semibold text-slate-500 mt-1">{product.manufacturer}</p>
                )}
              </div>

              {/* Status */}
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>

              {/* Flagged banner */}
              {product.flagged && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[11px] font-bold text-red-600 flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 21V4l1-1h10l1 2h6v12H14l-1-2H5v8H3z" />
                  </svg>
                  <span>Flagged by admin{product.flagReason ? `: ${product.flagReason}` : ""}</span>
                </div>
              )}

              {product.status === "rejected" && product.rejectedReason && (
                <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[11px] text-red-600 font-semibold">
                  Rejected: {product.rejectedReason}
                </div>
              )}
            </div>

            {/* Price & stock */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">Price</span>
                <span className="text-[20px] font-black text-[#6A8BFF]">AED {product.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">Stock</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[14px] font-black ${isLowStock ? "text-red-500" : "text-slate-800"}`}>
                    {product.stock} units
                  </span>
                  {isLowStock && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">Low</span>
                  )}
                </div>
              </div>
              {product.reorderLevel != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold">Reorder At</span>
                  <span className="text-[13px] font-bold text-slate-600">{product.reorderLevel} units</span>
                </div>
              )}
            </div>

            {/* Flag / Unflag action */}
            <button
              onClick={toggleFlag}
              disabled={flagging}
              className={`w-full py-3.5 rounded-[1rem] text-[13px] font-bold transition disabled:opacity-60 ${
                product.flagged
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100"
              }`}
            >
              {flagging ? "…" : product.flagged ? "Remove Flag" : "Flag This Product"}
            </button>
          </div>

          {/* RIGHT — details */}
          <div className="xl:col-span-2 flex flex-col gap-5">

            {/* Product info */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
              <h3 className="text-[16px] font-black text-slate-800 mb-5">Product Information</h3>
              <DetailRow label="Category" value={product.category} />
              <DetailRow
                label="Prescription"
                value={
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${product.requiresPrescription ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                    {product.requiresPrescription ? "Required" : "Not required"}
                  </span>
                }
              />
              {product.description && (
                <div className="py-3 border-b border-slate-50">
                  <span className="text-[11px] text-slate-400 font-bold block mb-2">Description</span>
                  <p className="text-[13px] text-slate-700 font-medium leading-relaxed">{product.description}</p>
                </div>
              )}
            </div>

            {/* Batch & stock */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
              <h3 className="text-[16px] font-black text-slate-800 mb-5">Stock & Batch</h3>
              <DetailRow label="Batch Number" value={product.batchNumber} />
              <DetailRow
                label="Expiry Date"
                value={
                  product.expiryDate
                    ? new Date(product.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : undefined
                }
              />
              <DetailRow
                label="Reorder Level"
                value={product.reorderLevel != null ? `${product.reorderLevel} units` : undefined}
              />
            </div>

            {/* Activity / timestamps */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7">
              <h3 className="text-[16px] font-black text-slate-800 mb-5">Activity</h3>
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
              {product.flagged && product.flaggedAt && (
                <DetailRow
                  label="Flagged At"
                  value={new Date(product.flaggedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  valueClass="text-[11px] text-red-500 font-bold text-right"
                />
              )}
              {product.rejectedAt && (
                <DetailRow
                  label="Rejected At"
                  value={new Date(product.rejectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  valueClass="text-[11px] text-red-500 font-bold text-right"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
