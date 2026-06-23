"use client";

import { useState, useEffect, use } from "react";

import Pagination from "@/components/Pagination";
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

interface Pharmacy {
  id: string;
  supertokens_id: string;
  ownerName: string;
  pharmacyName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  location?: string;
  emiratesId?: string;
  status: "pending_approval" | "approved" | "rejected";
  registeredAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  tradeLicense?: string;
  healthAuthorityLicense?: string;
  manager?: string;
  pharmacistLicense?: string;
  contactNumber?: string;
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
  requiresPrescription?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  reorderLevel?: number;
  flagged?: boolean;
  flagReason?: string | null;
}

interface Document {
  id: number;
  name: string;
}

function Avatar({ pharmacy, size = "md" }: { pharmacy: Pharmacy; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : size === "xl" ? "w-[4.5rem] h-[4.5rem] text-3xl" : "w-10 h-10 text-sm";
  const name = pharmacy.pharmacyName || "?";
  const imageUrl = (pharmacy as any).imageUrl; 
  return (
    <div className={`relative shrink-0`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className={`${sz} rounded-full object-cover border border-slate-100 shadow-sm`} />
      ) : (
        <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium shadow-sm`}>
          {name[0].toUpperCase()}
        </div>
      )}
      {pharmacy.status === "approved" && (
        <div className={`absolute top-0 right-0 bg-teal-400 ${size === "xl" ? "w-4 h-4 border-[3px]" : size === "lg" ? "w-3.5 h-3.5 border-[2.5px]" : "w-2.5 h-2.5 border-2"} rounded-full border-white ${size === "lg" || size === "xl" ? "translate-x-0.5 -translate-y-0.5" : ""}`}></div>
      )}
    </div>
  );
}

const DetailRow = ({
  label,
  value,
  valueClass = "text-slate-800 font-semibold",
  labelClass = "text-slate-400 font-medium",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  labelClass?: string;
}) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between py-1">
    <span className={`text-[11px] ${labelClass}`}>{label}</span>
    <span className={`text-[11px] ${valueClass}`}>{value}</span>
  </div>
);

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-80 ml-1.5 shrink-0">
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 15l7-7 7 7" />
    </svg>
    <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

export default function PharmacyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"about" | "stock">("about");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Product modal
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState("");
  const emptyProductForm = () => ({
    name: "", description: "", category: "", price: "", stock: "",
    manufacturer: "", strength: "", batchNumber: "", expiryDate: "",
    reorderLevel: "", requiresPrescription: false,
  });
  const [productForm, setProductForm] = useState(emptyProductForm());

  const [documents, setDocuments] = useState<Document[]>([
    { id: 1, name: "Med_certificate.pdf" },
    { id: 2, name: "Med_certificate.pdf" },
    { id: 3, name: "Med_certificate.pdf" },
    { id: 4, name: "Med_certificate.pdf" },
    { id: 5, name: "Proposal_draft.doc" },
  ]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [phRes, prRes] = await Promise.all([
          adminFetch(`/api/admin/pharmacy/${id}`),
          adminFetch(`/api/admin/pharmacy/${id}/products`),
        ]);

        if (phRes.ok) {
          const d = await phRes.json();
          setPharmacy(d.pharmacy);
        } else {
          setError("Pharmacy not found.");
        }

        if (prRes.ok) {
          const d = await prRes.json();
          setProducts(d.products ?? []);
        }
      } catch {
        setError("Failed to load pharmacy data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  async function toggleFlag(productId: string, currentlyFlagged: boolean, reason?: string) {
    const res = await adminFetch(`/api/admin/pharmacy/products/${productId}/flag`, {
      method: "PATCH",
      body: JSON.stringify({ flagged: !currentlyFlagged, reason: reason ?? null }),
    });
    if (res.ok) {
      const d = await res.json();
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...d.product } : p));
    }
  }

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productForm.name || !productForm.category || !productForm.price) {
      setAddProductError("Name, category and price are required.");
      return;
    }
    setAddingProduct(true);
    setAddProductError("");
    try {
      const res = await adminFetch(`/api/admin/pharmacy/${id}/products`, {
        method: "POST",
        body: JSON.stringify({
          name:                 productForm.name,
          description:          productForm.description || null,
          category:             productForm.category,
          price:                productForm.price,
          stock:                productForm.stock || "0",
          requiresPrescription: productForm.requiresPrescription,
          manufacturer:         productForm.manufacturer || null,
          strength:             productForm.strength || null,
          batchNumber:          productForm.batchNumber || null,
          expiryDate:           productForm.expiryDate || null,
          reorderLevel:         productForm.reorderLevel || null,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setProducts(prev => [d.product, ...prev]);
        setShowAddProduct(false);
        setProductForm(emptyProductForm());
      } else {
        const d = await res.json().catch(() => ({}));
        setAddProductError(d.error ?? "Failed to add product.");
      }
    } catch {
      setAddProductError("Network error.");
    } finally {
      setAddingProduct(false);
    }
  }

  const addDocument = () => {
    const newDoc = { id: Date.now(), name: `New_Document_${documents.length + 1}.pdf` };
    setDocuments([...documents, newDoc]);
  };

  const removeDocument = (idToRemove: number) => {
    setDocuments(documents.filter((doc) => doc.id !== idToRemove));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="w-full flex items-center justify-center py-32 text-slate-400 text-sm font-semibold">
          Loading pharmacy details…
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !pharmacy) {
    return (
      <ProtectedRoute>
        <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-red-500 font-semibold text-sm">{error || "Pharmacy not found."}</p>
          <button
            onClick={() => router.push("/dashboard/pharmacy")}
            className="text-[#6A8BFF] text-sm font-semibold hover:underline"
          >
            Back to Pharmacy
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  // Show all products in the stock tab — onboarded pharmacies have all products approved
  const stockProducts = products;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="flex flex-col gap-8">

          {/* Top Bar Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/pharmacy")}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm border border-slate-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[26px] font-medium text-[#1e293b] tracking-tight">Pharmacy Details</h1>
          </div>

          {/* Main Header Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar pharmacy={pharmacy} size="xl" />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[20px] font-semibold text-slate-800">{pharmacy.pharmacyName}</h2>
                  {pharmacy.status === "approved" && (
                    <div className="flex items-center gap-1.5 text-teal-400">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-semibold">Verified by Malaffi</span>
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-medium text-slate-500">{pharmacy.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-8 py-3.5 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] text-[13px] font-semibold rounded-2xl transition active:scale-95">
                Edit
              </button>
              <button className="px-8 py-3.5 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] text-[13px] font-semibold rounded-2xl transition active:scale-95">
                Deactivate Pharmacy
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("about")}
              className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all ${
                activeTab === "about"
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "bg-white text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100"
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all ${
                activeTab === "stock"
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "bg-white text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100"
              }`}
            >
              Stock Overview
            </button>
          </div>

          {/* Tab Contents */}
          <div className="mt-2">

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Details Column */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50">
                  <h3 className="text-[16px] font-semibold text-slate-800 mb-8">Details</h3>
                  <div className="space-y-6">
                    {pharmacy.tradeLicense && (
                      <DetailRow label="Trade License" value={pharmacy.tradeLicense} />
                    )}
                    {pharmacy.healthAuthorityLicense && (
                      <DetailRow label="Health Authority License" value={pharmacy.healthAuthorityLicense} />
                    )}
                    <DetailRow label="Owner" value={pharmacy.ownerName} />
                    {pharmacy.manager && (
                      <DetailRow label="Manager" value={pharmacy.manager} />
                    )}
                    {pharmacy.pharmacistLicense && (
                      <DetailRow label="Pharmacist License" value={pharmacy.pharmacistLicense} />
                    )}
                    <DetailRow label="License Number" value={pharmacy.licenseNumber} />
                    <DetailRow label="Location" value={pharmacy.location || "—"} />
                    <DetailRow label="Contact Number" value={pharmacy.phone} />
                    {pharmacy.emiratesId && (
                      <DetailRow label="Emirates ID" value={pharmacy.emiratesId} />
                    )}
                    <DetailRow
                      label="Email ID"
                      value={pharmacy.email}
                      valueClass="text-[#6A8BFF] font-semibold"
                    />
                    <DetailRow
                      label="Registered"
                      value={new Date(pharmacy.registeredAt).toLocaleDateString()}
                    />
                    {pharmacy.approvedAt && (
                      <DetailRow
                        label="Approved"
                        value={new Date(pharmacy.approvedAt).toLocaleDateString()}
                      />
                    )}
                  </div>
                </div>

                {/* Documents Column */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 self-start">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[16px] font-semibold text-slate-800">Documents</h3>
                    <button
                      onClick={addDocument}
                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-semibold px-6 py-2.5 rounded-xl flex items-center gap-1.5 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-95"
                    >
                      <span className="text-[14px] leading-none">+</span>
                      Add Documents
                    </button>
                  </div>

                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-[#f8fafd] border border-slate-100 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-300"
                      >
                        <span className="text-[13px] font-medium text-[#6A8BFF] underline decoration-[#6A8BFF]/30 underline-offset-4">
                          {doc.name}
                        </span>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className="text-[12px] font-medium text-red-400 hover:text-red-600 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-sm font-semibold border-2 border-dashed border-slate-100 rounded-xl">
                        No documents added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STOCK OVERVIEW TAB */}
            {activeTab === "stock" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">

                {/* Filters Row */}
                <div className="flex items-center gap-8 text-[13px] font-semibold text-[#64748B] select-none pl-2 flex-wrap">
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    Medicine Name
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    Batch No.
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    Expiry Date
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                    Stock Status
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={() => { setShowAddProduct(true); setAddProductError(""); setProductForm(emptyProductForm()); }}
                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Product
                    </button>
                    <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Stock Table */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 p-7 min-h-[400px] flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    {stockProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <svg className="w-10 h-10 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <p className="text-sm font-semibold">No products for this pharmacy</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800 tracking-wider">
                            <th className="pb-4 pt-1 font-semibold pl-2">Medicine Name</th>
                            <th className="pb-4 pt-1 font-semibold">Batch No.</th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Quantity <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Expiry Date <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Price (per unit) <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Stock Status <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold text-center">Flagged</th>
                            <th className="pb-4 pt-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => {
                            const isLowStock = item.stock < (item.reorderLevel ?? 100);
                            return (
                              <tr
                                key={item.id}
                                className={`group transition-colors duration-200 border-b border-slate-50 last:border-0 ${item.flagged ? "bg-red-50/40" : "hover:bg-slate-50/50"}`}
                              >
                                <td className="py-5 px-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-slate-800">{item.name}</span>
                                    {item.flagged && (
                                      <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Flagged</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400">{item.category}</span>
                                </td>
                                <td className="py-5 text-[12px] font-semibold text-slate-400">
                                  {item.batchNumber ?? "—"}
                                </td>
                                <td className="py-5 text-[13px] font-medium text-slate-500 pl-4">{item.stock}</td>
                                <td className="py-5 text-[13px] font-medium text-slate-500">
                                  {item.expiryDate ?? "—"}
                                </td>
                                <td className="py-5 text-[13px] font-medium text-slate-500 pl-4">
                                  AED {item.price.toFixed(2)}
                                </td>
                                <td className="py-5 text-[13px] font-semibold pl-4">
                                  {item.status === "pending_approval" ? (
                                    <span className="text-amber-500">Pending</span>
                                  ) : item.status === "rejected" ? (
                                    <span className="text-red-400">Rejected</span>
                                  ) : (
                                    <span className={isLowStock ? "text-red-400" : "text-[#6A8BFF]"}>
                                      {isLowStock ? "Low Stock" : "In Stock"}
                                    </span>
                                  )}
                                </td>
                                <td className="py-5 text-center">
                                  <button
                                    onClick={() => toggleFlag(item.id, item.flagged ?? false)}
                                    title={item.flagged ? `Flagged: ${item.flagReason ?? ""}` : "Flag this product"}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition ${
                                      item.flagged
                                        ? "bg-red-100 text-red-500 hover:bg-red-200"
                                        : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500"
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill={item.flagged ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V4l1-1h10l1 2h6v12H14l-1-2H5v8H3z" />
                                    </svg>
                                  </button>
                                </td>
                                <td className="py-5 pr-4 text-right min-w-[200px]">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => router.push(`/dashboard/pharmacy/${id}/product/${item.id}`)}
                                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[11px] font-semibold px-5 py-2 rounded-xl shadow-[0_4px_10px_rgba(84,118,252,0.2)] transition opacity-0 group-hover:opacity-100"
                                    >
                                      View Details
                                    </button>
                                    {item.flagged ? (
                                      <button
                                        onClick={() => toggleFlag(item.id, true)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold px-4 py-2 rounded-full transition"
                                      >
                                        Unflag
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => toggleFlag(item.id, false)}
                                        className="bg-red-50 hover:bg-red-100 text-red-500 text-[11px] font-semibold px-4 py-2 rounded-full transition opacity-0 group-hover:opacity-100"
                                      >
                                        Flag
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {stockProducts.length > 0 && (
                    <div className="mt-6 border-t border-slate-50 pt-5">
                {stockProducts.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={Math.ceil(stockProducts.length / itemsPerPage)} 
                    onPageChange={setCurrentPage} 
                  />
                )}
              </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Add Product Modal ──────────────────────────────────────────── */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">

            {/* Modal header */}
            <div className="flex items-center justify-between p-7 border-b border-slate-50">
              <h2 className="text-[17px] font-medium text-slate-800">Add Product</h2>
              <button
                onClick={() => setShowAddProduct(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitProduct} className="p-7 space-y-5">
              {addProductError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {addProductError}
                </div>
              )}

              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Product Name *</label>
                  <input
                    value={productForm.name}
                    onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Paracetamol 500mg"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition appearance-none"
                  >
                    <option value="" disabled>Select category</option>
                    {["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manufacturer + Strength */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Manufacturer</label>
                  <input
                    value={productForm.manufacturer}
                    onChange={e => setProductForm(p => ({ ...p, manufacturer: e.target.value }))}
                    placeholder="e.g. GSK"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Strength / Dosage</label>
                  <input
                    value={productForm.strength}
                    onChange={e => setProductForm(p => ({ ...p, strength: e.target.value }))}
                    placeholder="e.g. 500mg"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description, indications…"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition resize-none"
                />
              </div>

              {/* Price + Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Price (AED) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={productForm.price}
                    onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Quantity</label>
                  <input
                    type="number" min="0"
                    value={productForm.stock}
                    onChange={e => setProductForm(p => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
              </div>

              {/* Batch + Expiry */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Batch Number</label>
                  <input
                    value={productForm.batchNumber}
                    onChange={e => setProductForm(p => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="e.g. BATCH-001"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={productForm.expiryDate}
                    onChange={e => setProductForm(p => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
              </div>

              {/* Reorder Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reorder Level</label>
                <input
                  type="number" min="0"
                  value={productForm.reorderLevel}
                  onChange={e => setProductForm(p => ({ ...p, reorderLevel: e.target.value }))}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                />
              </div>

              {/* Prescription toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Prescription Required</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Patients must upload a valid prescription</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm(p => ({ ...p, requiresPrescription: !p.requiresPrescription }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${productForm.requiresPrescription ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${productForm.requiresPrescription ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProduct}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold transition shadow-[0_4px_10px_rgba(84,118,252,0.2)] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {addingProduct ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding…
                    </>
                  ) : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
