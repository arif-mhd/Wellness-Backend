"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

interface OrderItem {
  medicine_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  pharmacyId: string;
}

interface Order {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  pharmacyName: string;
  pharmacyEmail: string;
  items: OrderItem[];
  delivery_address: string;
  status: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  total_amount: number;
  payment_status: string;
  payment_method: string;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function statusColor(status: Order["status"]) {
  switch (status) {
    case "delivered":   return "text-emerald-600";
    case "cancelled":   return "text-rose-500";
    case "shipped":     return "text-blue-500";
    case "processing":  return "text-amber-500";
    default:            return "text-slate-500";
  }
}

function statusLabel(status: Order["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-70 ml-1 shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" />
    </svg>
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

const AvatarCircle = ({ name }: { name: string }) => (
  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0 bg-[#6A8BFF]">
    {initials(name)}
  </div>
);

const PAGE_SIZE = 12;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Pharmacy" | "Lab" | "Radiology">("All");
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await adminFetch("/api/admin/orders");
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setOrders(data.orders ?? []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = orders.filter(o => {
    const matchTab = activeTab === "All" || o.pharmacyName.toLowerCase().includes(activeTab.toLowerCase());
    const matchSearch = !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.patientName.toLowerCase().includes(search.toLowerCase()) ||
      o.pharmacyName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = orders.find(o => o.id === selectedId) ?? null;

  const handleStatusChange = useCallback(async (orderId: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const r = await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as Order["status"] } : o));
    } catch {
      // silently ignore
    } finally {
      setUpdatingStatus(false);
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Orders</h1>
          {loading && (
            <div className="flex items-center gap-2 text-[13px] text-slate-400 font-medium">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#6A8BFF] rounded-full animate-spin" />
              Loading orders…
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-medium px-5 py-4 rounded-2xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">

          {/* LEFT: Table */}
          <div className={`${selected ? "xl:col-span-8" : "xl:col-span-12"} flex flex-col gap-5`}>

            {/* Tabs & Search */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {(["All", "Pharmacy", "Lab", "Radiology"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setPage(1); setSelectedId(null); }}
                    className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                      activeTab === tab
                        ? "bg-[#1E293B] text-white shadow-md"
                        : "bg-white text-slate-500 hover:text-slate-800 border border-slate-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <div className="relative ml-2">
                  <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search orders…"
                    className="w-40 pl-9 pr-3 py-2 bg-white border border-slate-100 rounded-full text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 shadow-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <span className="text-[12px] font-medium text-slate-400">{filtered.length} orders</span>
            </div>

            {/* Filter row */}
            <div className="flex items-center justify-between text-[13px] font-medium text-[#64748B] select-none mt-4 mb-2">
              <div className="flex items-center gap-5 flex-wrap flex-1">
                {["Name", "Order Type", "Pharmacy", "Doctor", "Patient", "Date range", "Payment type", "Status"].map(f => (
                  <span key={f} className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    {f}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                ))}
              </div>
              <button className="text-slate-400 hover:text-slate-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[600px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-700">
                      <th className="pb-4 pt-1 font-medium pl-2 w-[13%]">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-500">Order ID <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-medium w-[20%]">Patient Name</th>
                      <th className="pb-4 pt-1 font-medium w-[20%]">Pharmacy</th>
                      <th className="pb-4 pt-1 font-medium w-[16%]">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-500">Date Ordered <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-medium w-[10%]">Payment</th>
                      <th className="pb-4 pt-1 font-medium w-[10%]">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-500">Amount <DoubleCaret /></div>
                      </th>
                      <th className="pb-4 pt-1 font-medium w-[11%]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && paginated.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400 text-[13px] font-medium">
                          {search ? "No orders match your search." : "No pharmacy orders yet."}
                        </td>
                      </tr>
                    )}
                    {paginated.map(o => {
                      const isSelected = selectedId === o.id;
                      const shortId = `ORD-${o.id.slice(-5).toUpperCase()}`;
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedId(isSelected ? null : o.id)}
                          onMouseEnter={() => setHoveredId(o.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors h-[68px] hover:bg-slate-50/50`}
                        >
                          <td className="py-2 pl-2 text-[12px] font-medium text-slate-500">{shortId}</td>
                          <td className="py-2 pr-2">
                            <p className="text-[12.5px] font-medium text-slate-800 leading-tight">{o.patientName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{o.patientEmail}</p>
                          </td>
                          <td className="py-2 pr-2">
                            <p className="text-[12.5px] font-medium text-slate-800 leading-tight">{o.pharmacyName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{o.pharmacyEmail}</p>
                          </td>
                          <td className="py-2 text-[12px] text-slate-500 font-medium">{formatDate(o.createdAt)}</td>
                          <td className="py-2 text-[12px] font-medium text-[#6A8BFF]">
                            {o.payment_method === "mock" ? "Mock" : o.payment_method}
                          </td>
                          <td className="py-2 text-[12px] text-slate-600 font-medium">
                            AED {o.total_amount.toFixed(2)}
                          </td>
                          <td className="py-2 pr-2 relative">
                            <div className="flex items-center justify-between min-w-[130px] pr-2">
                              <span className={`text-[12px] font-medium ${statusColor(o.status)}`}>
                                {statusLabel(o.status)}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedId(o.id); }}
                                className={`bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-medium px-5 py-2 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition-all active:scale-95 whitespace-nowrap ml-4 ${hoveredId === o.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-1 mt-6 select-none border-t border-slate-50 pt-5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-all ${
                      n === page
                        ? "bg-[#6A8BFF] text-white shadow-md shadow-blue-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Order Details Panel */}
          {selected && (
            <div className="xl:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300">

              <div className="flex items-center justify-between pb-5 border-b border-slate-50 mb-5">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Order Details</h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-1">Order ID</p>
                  <p className="text-[13px] font-medium text-[#6A8BFF]">ORD-{selected.id.slice(-5).toUpperCase()}</p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-3">Patient</p>
                  <div className="flex items-center gap-3">
                    <AvatarCircle name={selected.patientName} />
                    <div>
                      <p className="text-[13px] font-medium text-slate-800 leading-tight">{selected.patientName}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{selected.patientEmail}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-3">Order Processed By</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.5 20.5l-6-6a4.243 4.243 0 0 1 6-6l6 6a4.243 4.243 0 0 1-6 6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.5 8.5l7 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-slate-800 leading-tight">{selected.pharmacyName}</p>
                        <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{selected.pharmacyEmail}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">Date Ordered</p>
                  <p className="text-[12px] text-slate-500 font-medium">{formatDate(selected.createdAt)}</p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-2">Items Ordered</p>
                  <div className="space-y-2">
                    {selected.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-slate-700 truncate max-w-[60%]">{item.name} × {item.quantity}</span>
                        <span className="font-medium text-slate-600">AED {(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">Payment</p>
                  <p className="text-[12px] font-medium text-slate-600">
                    AED {selected.total_amount.toFixed(2)}
                    <span className="text-[#6A8BFF] ml-2">
                      {selected.payment_status === "paid" ? "Paid" : selected.payment_status}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">Delivery Address</p>
                  <p className="text-[12px] text-slate-500 font-medium">{selected.delivery_address}</p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-slate-500 mb-2">Update Status</p>
                  <select
                    value={selected.status}
                    disabled={updatingStatus}
                    onChange={e => handleStatusChange(selected.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {selected.notes && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 mb-1.5">Notes</p>
                    <p className="text-[12px] text-slate-500 font-medium">{selected.notes}</p>
                  </div>
                )}
              </div>

              <button className="w-full py-4 mt-8 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#6A8BFF] rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98]">
                Go to Consultation
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
