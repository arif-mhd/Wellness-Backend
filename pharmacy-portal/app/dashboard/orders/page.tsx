"use client";

import { useCallback, useEffect, useState } from "react";
import Session from "supertokens-web-js/recipe/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await Session.getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers ?? {}) },
  });
}

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
  items: OrderItem[];
  delivery_address: string;
  status: string;
  createdAt: string;
  total_amount: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/pharmacy/orders");
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-marcellus text-[#1a2332]">Incoming Orders</h1>
          <p className="text-sm font-outfit text-slate-500 mt-0.5">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center text-center shadow-sm">
          <div className="mb-4 text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-bricolage font-bold text-[#1a2332] mb-1">No orders yet</p>
          <p className="text-sm font-outfit text-slate-500">Incoming patient orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bricolage font-bold text-[#1a2332]">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs font-outfit text-slate-400 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-outfit font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-outfit text-slate-600 font-semibold mb-2">Delivery Address</p>
                <p className="text-sm font-outfit text-slate-500">{order.delivery_address}</p>
              </div>

              <div>
                <p className="text-sm font-outfit text-slate-600 font-semibold mb-2">Items</p>
                <ul className="divide-y divide-slate-50 border border-slate-50 rounded-lg overflow-hidden">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center p-3 text-sm font-outfit">
                      <span className="text-slate-700 font-semibold">{item.quantity}x {item.name}</span>
                      <span className="text-slate-500">AED {(item.quantity * item.unit_price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex justify-end">
                <p className="text-lg font-bricolage font-bold text-[#1a2332]">
                  Total: <span className="text-[#5476FC]">AED {order.total_amount.toFixed(2)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
