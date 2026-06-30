"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";


async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...(opts.headers ?? {}),
    },
  });
}

interface Product {
  id: string; name: string; category: string; price: number; stock: number;
  status: "pending_approval" | "approved" | "rejected"; createdAt: string; imageUrl?: string;
}
interface Pharmacy {
  pharmacyName: string; ownerName: string; licenseNumber: string; location?: string; status: string;
}
interface OrderItem {
  medicine_id: string; name: string; quantity: number; unit_price: number; pharmacyId: string;
}
interface Order {
  id: string; patientId: string; items: OrderItem[];
  delivery_address: string; status: string; createdAt: string; total_amount: number;
}

/** Build a 6-month rolling chart dataset from real orders. */
function buildChartData(orders: Order[]) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const slots: { month: string; year: number; monthIdx: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    slots.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), monthIdx: d.getMonth() });
  }
  const map: Record<string, { sales: number; orders: number }> = {};
  slots.forEach(s => { map[`${s.year}-${s.monthIdx}`] = { sales: 0, orders: 0 }; });
  orders.forEach(order => {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (map[key]) {
      map[key].sales  += order.total_amount ?? 0;
      map[key].orders += 1;
    }
  });
  return slots.map(s => ({
    month:  s.month,
    sales:  parseFloat(map[`${s.year}-${s.monthIdx}`].sales.toFixed(2)),
    orders: map[`${s.year}-${s.monthIdx}`].orders,
  }));
}

/* ─── Status configs ─────────────────────────────────────────────────────── */
const PRODUCT_STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "#E2F8EB", text: "#179353", dot: "#179353" },
  pending_approval: { label: "Pending",   bg: "#FFF4E5", text: "#D97706", dot: "#F59E0B" },
  rejected:         { label: "Rejected",  bg: "#FEE2E2", text: "#F25252", dot: "#F25252" },
};

const ORDER_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  pending:    { bg: "#FFF4E5", text: "#D97706", dot: "#F59E0B" },
  confirmed:  { bg: "#EEF2FF", text: "#4F46E5", dot: "#6366F1" },
  processing: { bg: "#EEF2FF", text: "#4F46E5", dot: "#6366F1" },
  shipped:    { bg: "#E0F2FE", text: "#0369A1", dot: "#0EA5E9" },
  delivered:  { bg: "#E2F8EB", text: "#179353", dot: "#179353" },
  cancelled:  { bg: "#FEE2E2", text: "#F25252", dot: "#F25252" },
};

function StatusBadge({ status, config }: { status: string; config: Record<string, { bg: string; text: string; dot: string }> }) {
  const c = config[status] ?? config["pending"];
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[-0.22px]"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {label}
    </span>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl shadow-lg border border-[#EBEEF5] px-4 py-3 text-sm"
      style={{ background: "white", minWidth: 160 }}
    >
      <p className="font-semibold text-[#24292E] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-6 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-[#383F45]">
            {entry.dataKey === "sales" ? `AED ${entry.value.toLocaleString()}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router   = useRouter();
  const [pharmacy,   setPharmacy]   = useState<Pharmacy | null>(null);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, prRes, orRes] = await Promise.all([
        apiFetch("/api/pharmacy/me"),
        apiFetch("/api/pharmacy/products"),
        apiFetch("/api/pharmacy/orders"),
      ]);
      if (pRes.ok)  { const d = await pRes.json();  setPharmacy(d.pharmacy); }
      if (prRes.ok) { const d = await prRes.json(); setProducts(d.products ?? []); }
      if (orRes.ok) { const d = await orRes.json(); setOrders(d.orders   ?? []); }
    } catch { /* silently */ } finally { setLoading(false); setDataLoaded(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recentProducts = products.slice(0, 5);
  const recentOrders   = orders.slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning!";
    if (h < 17) return "Good Afternoon!";
    return "Good Evening!";
  })();

  /* pending product count */
  const pendingCount = products.filter(p => p.status === "pending_approval").length;
  /* total order value */
  const totalRevenue  = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
    </div>
  );

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">

      {/* ── Greeting Row ─────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {greeting}
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            {pharmacy?.ownerName?.split(" ")[0] ?? (dataLoaded ? "Pharmacy Admin" : "—")}
          </h1>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-[#707070] text-xs font-semibold tracking-[-0.24px] font-sans">
            Pharmacy Status
          </span>
          <span className="text-[#383F45] font-normal text-[20px] leading-none tracking-[-0.4px]">
            {pharmacy?.pharmacyName ?? "—"}
          </span>
          <span className="text-[#A0A8B0] text-sm font-normal">
            {pharmacy?.licenseNumber ?? "—"}
          </span>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">

        {/* Card: Total Products */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
              Total Products
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5476FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
          </div>
          <div className="text-[#24292E] text-[28px] font-semibold tracking-[-0.56px]">
            {dataLoaded ? products.length : "—"}
          </div>
          <div className="text-[#A0A8B0] text-[11px]">
            {pendingCount > 0 ? `${pendingCount} awaiting approval` : "All approved"}
          </div>
        </div>

        {/* Card: Total Orders */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
              Total Orders
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#E2F8EB] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#179353]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
          </div>
          <div className="text-[#24292E] text-[28px] font-semibold tracking-[-0.56px]">
            {dataLoaded ? orders.length : "—"}
          </div>
          <div className="text-[#A0A8B0] text-[11px]">
            {orders.filter(o => o.status === "pending").length} pending dispatch
          </div>
        </div>

        {/* Card: Revenue */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
              Total Revenue
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#FFF4E5] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-[#24292E] text-[28px] font-semibold tracking-[-0.56px]">
            {dataLoaded ? `AED ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-[#179353]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[11px] text-[#179353] font-medium">Live from orders</span>
          </div>
        </div>

        {/* Card: Quick Actions */}
        <div className="bg-white rounded-xl p-6 flex flex-col gap-3 shadow-sm border border-[#EBEEF5] hover:border-gray-100 hover:shadow-md transition-all">
          <span className="text-[#676E76] text-xs font-normal tracking-[-0.24px]">
            Quick Actions
          </span>
          <Link
            href="/dashboard/add-product"
            className="w-full bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white py-2.5 rounded-lg text-[13px] font-medium text-center shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all"
          >
            + Add Product
          </Link>
          <Link
            href="/dashboard/orders"
            className="w-full bg-[#F7F8FA] border border-slate-200 text-[#24292E] py-2.5 rounded-lg text-[13px] font-medium text-center hover:bg-slate-50 transition-all"
          >
            View Orders
          </Link>
        </div>
      </div>

      {/* ── Chart + Recent Products ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-[#EBEEF5] hover:border-gray-100 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
            <div>
              <h2 className="text-[#24292E] text-[20px] font-semibold tracking-[-0.4px]">
                Sales Overview
              </h2>
              <p className="text-[#A0A8B0] text-xs mt-0.5">
                Revenue & order volume — last 6 months
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#676E76]">
                <span className="w-3 h-0.5 rounded-full bg-[#5476FC] inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#676E76]">
                <span className="w-3 h-0.5 rounded-full bg-[#179353] inline-block" /> Orders
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-[#EBEEF5] w-full my-4" />

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={buildChartData(orders)} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#5476FC" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#5476FC" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#179353" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#179353" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontFamily: "Outfit" }}
                  dy={8}
                />
                <YAxis
                  yAxisId="sales"
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  dx={-4}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  axisLine={false} tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit" }}
                  dx={4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="sales"
                  type="monotone"
                  dataKey="sales"
                  name="Revenue (AED)"
                  stroke="#5476FC"
                  strokeWidth={2.5}
                  fill="url(#gradSales)"
                  dot={{ r: 3, fill: "#5476FC", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#5476FC", stroke: "white", strokeWidth: 2 }}
                />
                <Area
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#179353"
                  strokeWidth={2.5}
                  fill="url(#gradOrders)"
                  dot={{ r: 3, fill: "#179353", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#179353", stroke: "white", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-white rounded-xl p-6 border border-[#EBEEF5] shadow-sm hover:border-gray-100 transition-all flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[#24292E] text-[18px] font-semibold tracking-[-0.36px]">
              Recent Products
            </span>
            <Link href="/dashboard/inventory" className="text-[#5476FC] text-xs font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="h-[1px] bg-[#EBEEF5] w-full" />

          <div className="flex flex-col gap-1.5">
            {recentProducts.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center">
                <p className="font-medium text-[#24292E] mb-1 text-[15px]">No products yet</p>
                <p className="text-xs text-[#676E76] mb-5">Add your first product to get started</p>
                <Link href="/dashboard/add-product"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8AA0FF] to-[#5476FC] text-white rounded-xl font-medium text-[13px] shadow-sm">
                  Add Product
                </Link>
              </div>
            ) : (
              recentProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-[#F8FAFC] rounded-xl transition-colors border border-transparent hover:border-[#EBEEF5]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#5476FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[13px] font-medium text-[#24292E] leading-tight">{p.name}</p>
                      <p className="text-[11px] text-[#676E76]">{p.category} · AED {p.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} config={PRODUCT_STATUS_CONFIG} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Orders ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden mb-6">
        <div className="flex justify-between items-center p-6 border-b border-[#EBEEF5]">
          <div>
            <h2 className="text-[#24292E] text-[20px] font-semibold tracking-[-0.4px]">
              Recent Orders
            </h2>
            <p className="text-[#676E76] text-xs mt-0.5">
              Latest incoming patient orders
            </p>
          </div>
          <Link href="/dashboard/orders" className="text-xs font-medium text-[#5476FC] hover:underline">
            View All Orders
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-[#24292E] mb-1">No orders yet</p>
            <p className="text-xs text-[#676E76]">Patient orders will appear here once placed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Delivery Address</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEEF5]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors duration-200 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-sm text-[#24292E]">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45]">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      <span className="ml-1 text-[#676E76] text-xs">
                        ({order.items.slice(0, 2).map(i => i.name).join(", ")}{order.items.length > 2 ? "…" : ""})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45] max-w-[200px] truncate">
                      {order.delivery_address || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[#676E76]">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#24292E]">
                      AED {order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
