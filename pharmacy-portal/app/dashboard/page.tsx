"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const MOCK_CHART_DATA = [
  { name: 'Jan', sales: 12400, delivered: 45, returned: 2 },
  { name: 'Feb', sales: 15200, delivered: 52, returned: 3 },
  { name: 'Mar', sales: 14800, delivered: 48, returned: 1 },
  { name: 'Apr', sales: 18500, delivered: 65, returned: 4 },
  { name: 'May', sales: 21000, delivered: 78, returned: 2 },
  { name: 'Jun', sales: 24500, delivered: 92, returned: 5 },
];

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

  const recent = products.slice(0, 5);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-marcellus text-[#1a2332]">
          Welcome, {pharmacy?.ownerName?.split(" ")[0] ?? "Pharmacy"}
        </h1>
        <p className="text-sm font-outfit text-slate-500 mt-1">{pharmacy?.pharmacyName} · {pharmacy?.licenseNumber}</p>
      </div>

      {/* Monthly Activity Graph */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8">
        <div className="mb-6">
          <h2 className="font-bricolage font-bold text-lg text-[#1a2332]">Monthly Activity Overview</h2>
          <p className="text-sm font-outfit text-slate-500">Sales and order metrics over the last 6 months</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_CHART_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Outfit' }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Outfit' }} dx={-10} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Outfit' }} dx={10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Outfit' }}
                labelStyle={{ fontWeight: 'bold', color: '#1a2332', marginBottom: '4px' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales (AED)" stroke="#5476FC" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="delivered" name="Delivered Orders" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="returned" name="Returned Orders" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/dashboard/add-product"
          className="bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-blue-200/40 hover:shadow-blue-300/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          </div>
          <div>
            <p className="font-bricolage font-bold text-lg">Add Product</p>
            <p className="text-sm text-blue-100 font-outfit">Submit a new product for approval</p>
          </div>
        </Link>
        <Link href="/dashboard/inventory"
          className="bg-white rounded-2xl p-6 flex items-center gap-4 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
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
          <Link href="/dashboard/inventory" className="text-xs font-outfit font-semibold text-[#5476FC] hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center px-8">
            <div className="mb-4 text-slate-300">
              <svg className="w-12 h-12 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </div>
            <p className="font-bricolage font-bold text-[#1a2332] mb-1">No products yet</p>
            <p className="text-sm font-outfit text-slate-500 mb-5">Add your first product to get started</p>
            <Link href="/dashboard/add-product"
              className="px-5 py-2.5 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white rounded-xl font-outfit font-semibold text-sm shadow-md shadow-blue-200/40">
              Add Product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map(p => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] flex items-center justify-center text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
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
