"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}`, ...(opts.headers ?? {}) },
  });
}

interface Product {
  id: string; name: string; category: string; price: number; stock: number;
  status: "pending_approval" | "approved" | "rejected"; createdAt: string; imageUrl?: string;
}
interface Pharmacy {
  pharmacyName: string; ownerName: string; licenseNumber: string; location?: string; status: string;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",   bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  pending_approval: { label: "Pending",    bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  rejected:         { label: "Rejected",   bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_approval;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-outfit font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [pharmacy, setPharmacy]   = useState<Pharmacy | null>(null);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    try {
      const [pRes, prRes] = await Promise.all([apiFetch("/api/pharmacy/me"), apiFetch("/api/pharmacy/products")]);
      if (pRes.ok)  { const d = await pRes.json();  setPharmacy(d.pharmacy); }
      if (prRes.ok) { const d = await prRes.json(); setProducts(d.products); }
    } catch { /* silently */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approved  = products.filter(p => p.status === "approved").length;
  const pending   = products.filter(p => p.status === "pending_approval").length;
  const rejected  = products.filter(p => p.status === "rejected").length;
  const totalStock = products.filter(p => p.status === "approved").reduce((s, p) => s + p.stock, 0);
  const recent = products.slice(0, 5);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#22c55e]" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-marcellus text-[#1a2332]">
          Welcome, {pharmacy?.ownerName?.split(" ")[0] ?? "Pharmacy"} 👋
        </h1>
        <p className="text-sm font-outfit text-slate-500 mt-1">{pharmacy?.pharmacyName} · {pharmacy?.licenseNumber}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Products",   value: products.length, icon: "📦", color: "from-blue-500 to-blue-600" },
          { label: "Approved",         value: approved,        icon: "✅", color: "from-green-500 to-green-600" },
          { label: "Pending Review",   value: pending,         icon: "⏳", color: "from-amber-400 to-amber-500" },
          { label: "Total Stock Units",value: totalStock,      icon: "🗃️", color: "from-purple-500 to-purple-600" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg mb-3`}>
              {icon}
            </div>
            <p className="text-2xl font-bricolage font-bold text-[#1a2332]">{value}</p>
            <p className="text-xs font-outfit text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/dashboard/add-product"
          className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-green-200/40 hover:shadow-green-300/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">➕</div>
          <div>
            <p className="font-bricolage font-bold text-lg">Add Product</p>
            <p className="text-sm text-green-100 font-outfit">Submit a new product for approval</p>
          </div>
        </Link>
        <Link href="/dashboard/inventory"
          className="bg-white rounded-2xl p-6 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[#f0fdf4] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📋</div>
          <div>
            <p className="font-bricolage font-bold text-lg text-[#1a2332]">Inventory</p>
            <p className="text-sm text-slate-500 font-outfit">View and manage all products</p>
          </div>
        </Link>
      </div>

      {/* Recent products */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h2 className="font-bricolage font-bold text-[#1a2332]">Recent Products</h2>
          <Link href="/dashboard/inventory" className="text-xs font-outfit font-semibold text-[#22c55e] hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-8">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-bricolage font-bold text-[#1a2332] mb-1">No products yet</p>
            <p className="text-sm font-outfit text-slate-500 mb-5">Add your first product to get started</p>
            <Link href="/dashboard/add-product"
              className="px-5 py-2.5 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-xl font-outfit font-semibold text-sm shadow-md shadow-green-200/40">
              Add Product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map(p => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center text-lg">
                    {p.category === "OTC" ? "💊" : p.category === "Prescription" ? "📋" : "🌿"}
                  </div>
                  <div>
                    <p className="text-sm font-outfit font-semibold text-[#1a2332]">{p.name}</p>
                    <p className="text-xs font-outfit text-slate-400">{p.category} · AED {p.price.toFixed(2)}</p>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
