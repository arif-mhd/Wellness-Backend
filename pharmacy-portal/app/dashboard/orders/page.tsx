

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
  const [updating, setUpdating] = useState<string | null>(null);

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

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await apiFetch(`/api/pharmacy/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await load();
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
      </div>
    );
  }

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 mt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[#707070] font-normal text-sm tracking-[-0.28px]">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </span>
          <h1 className="text-[#383F45] font-normal text-[32px] leading-none tracking-[-0.64px]">
            Incoming Orders
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#C0C8D0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-[#24292E] mb-1 text-base">No orders yet</p>
            <p className="text-sm text-[#676E76]">Incoming patient orders will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EBEEF5]">
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Order Details</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider">Delivery Address</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-4 text-xs font-medium text-[#676E76] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEEF5]">
                {orders.map((order) => (
                  <tr key={order.id} className="group hover:bg-[#F8FAFC] transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[#24292E]">Order #{order.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#676E76]">Placed on {new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45]">
                      <ul className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between gap-4">
                            <span className="text-xs">{item.quantity}x {item.name}</span>
                            <span className="text-[11px] text-[#676E76]">AED {(item.quantity * item.unit_price).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#383F45] max-w-[250px]">
                      {order.delivery_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5476FC]">
                      AED {order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {order.status === "confirmed" && (
                        <button
                          onClick={() => updateStatus(order.id, "shipped")}
                          disabled={updating === order.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {updating === order.id ? "Updating..." : "Mark Shipped"}
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          disabled={updating === order.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {updating === order.id ? "Updating..." : "Mark Delivered"}
                        </button>
                      )}
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
