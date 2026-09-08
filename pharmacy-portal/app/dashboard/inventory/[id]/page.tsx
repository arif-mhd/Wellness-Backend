"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Session from "supertokens-web-js/recipe/session";
import Link from "next/link";
import { useAccountRole } from "@/hooks/useAccountRole";

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
  inStock: boolean;
  imageUrl?: string;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  requiresPrescription?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  manufacturer?: string;
  strength?: string;
  numberOfTablets?: string;
  productSummary?: string;
  recommendedFor?: string;
  benefits?: string;
  sideEffects?: string;
  howToUse?: string;
  flagged?: boolean;
  flagReason?: string | null;
}

interface LabTest {
  id: string;
  labId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  imageUrl?: string;
  status: "pending_approval" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  turnaround_hours?: number;
  requires_fasting?: boolean;
  requires_doctor_approval?: boolean;
  homeVisitAvailable?: boolean;
  recommendedFor?: string;
  howItsDone?: string;
  recommendedFrequency?: string;
  patientInstructions?: string;
  flagged?: boolean;
  flagReason?: string | null;
}

const STATUS_CONFIG = {
  approved:         { label: "Approved",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  pending_approval: { label: "Pending Review", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  rejected:         { label: "Rejected",  bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
};

const CATEGORIES = ["OTC", "Prescription", "Supplement", "Medical Device", "Personal Care", "Baby & Mother"];
const LAB_CATEGORIES = ["Blood Test", "Imaging", "Body Checkup", "Screening Package", "Vitamin Panel", "Hormone Panel", "Allergy Test", "Genetic Test"];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#EBEEF5] last:border-0 gap-4">
      <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider shrink-0 w-36">{label}</span>
      <span className="text-[13px] text-[#24292E] font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { role } = useAccountRole();
  const isLab = role === "lab";

  const [product, setProduct] = useState<Product | null>(null);
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing]       = useState<Product | null>(null);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState("");
  const [editImage, setEditImage]   = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        if (isLab) {
          const res = await apiFetch(`/api/lab/my-tests/${id}`);
          if (res.ok) { const d = await res.json(); setTest(d.test); }
          else setError("Test not found.");
        } else {
          const res = await apiFetch(`/api/pharmacy/products/${id}`);
          if (res.ok) { const d = await res.json(); setProduct(d.product); }
          else setError("Product not found.");
        }
      } catch {
        setError(isLab ? "Failed to load test." : "Failed to load product.");
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [id, isLab]);

  async function handleToggleStock() {
    if (!product) return;
    const nextInStock = !product.inStock;
    setProduct(prev => prev ? { ...prev, inStock: nextInStock } : prev);
    try {
      const form = new FormData();
      form.append("inStock", String(nextInStock));
      const res = await apiFetch(`/api/pharmacy/products/${product.id}`, { method: "PUT", body: form });
      if (!res.ok) throw new Error();
    } catch {
      setProduct(prev => prev ? { ...prev, inStock: !nextInStock } : prev);
    }
  }

  async function handleToggleHomeVisit() {
    if (!test) return;
    const next = !test.homeVisitAvailable;
    setTest(prev => prev ? { ...prev, homeVisitAvailable: next } : prev);
    try {
      const form = new FormData();
      form.append("homeVisitAvailable", String(next));
      const res = await apiFetch(`/api/lab/my-tests/${test.id}`, { method: "PUT", body: form });
      if (!res.ok) throw new Error();
    } catch {
      setTest(prev => prev ? { ...prev, homeVisitAvailable: !next } : prev);
    }
  }

  async function handleDelete() {
    const item = isLab ? test : product;
    if (!item) return;
    if (!confirm(isLab ? "Delete this test?" : "Delete this product?")) return;
    setDeleting(item.id);
    try {
      await apiFetch(isLab ? `/api/lab/my-tests/${item.id}` : `/api/pharmacy/products/${item.id}`, { method: "DELETE" });
      router.push("/dashboard/inventory");
    } catch { /* silently */ } finally { setDeleting(null); }
  }

  function openEdit() {
    if (isLab) {
      if (!test) return;
      setEditingTest({ ...test });
    } else {
      if (!product) return;
      setEditing({ ...product });
    }
    setEditImage(null);
    setEditPreview((isLab ? test?.imageUrl : product?.imageUrl) ?? null);
    setEditError("");
  }

  function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImage(file);
    const reader = new FileReader();
    reader.onload = () => setEditPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveEdit() {
    if (isLab) {
      if (!editingTest) return;
      if (!editingTest.name || !editingTest.category || !editingTest.price) { setEditError("Name, category and price are required."); return; }
      setSaving(true); setEditError("");
      try {
        const token = await Session.getAccessToken();
        const form = new FormData();
        form.append("name", editingTest.name);
        form.append("description", editingTest.description ?? "");
        form.append("category", editingTest.category);
        form.append("price", String(editingTest.price));
        form.append("turnaround_hours", String(editingTest.turnaround_hours ?? ""));
        form.append("requires_fasting", String(editingTest.requires_fasting ?? false));
        form.append("requires_doctor_approval", String(editingTest.requires_doctor_approval ?? false));
        form.append("homeVisitAvailable", String(editingTest.homeVisitAvailable ?? false));
        form.append("recommendedFor", editingTest.recommendedFor ?? "");
        form.append("howItsDone", editingTest.howItsDone ?? "");
        form.append("recommendedFrequency", editingTest.recommendedFrequency ?? "");
        form.append("patientInstructions", editingTest.patientInstructions ?? "");
        if (editImage) form.append("image", editImage);

        const res = await fetch(`${API_URL}/api/lab/my-tests/${editingTest.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token ?? ""}` },
          body: form,
        });
        if (!res.ok) { const d = await res.json(); setEditError(d.error || "Failed to update."); return; }
        const d = await res.json();
        setTest(d.test);
        setEditingTest(null);
      } catch { setEditError("Network error."); } finally { setSaving(false); }
      return;
    }

    if (!editing) return;
    if (!editing.name || !editing.category || !editing.price) { setEditError("Name, category and price are required."); return; }
    setSaving(true); setEditError("");
    try {
      const token = await Session.getAccessToken();
      const form = new FormData();
      form.append("name", editing.name);
      form.append("description", editing.description ?? "");
      form.append("category", editing.category);
      form.append("price", String(editing.price));
      form.append("inStock", String(editing.inStock));
      form.append("requiresPrescription", String(editing.requiresPrescription ?? false));
      form.append("batchNumber", editing.batchNumber ?? "");
      form.append("expiryDate", editing.expiryDate ?? "");
      form.append("manufacturer", editing.manufacturer ?? "");
      form.append("strength", editing.strength ?? "");
      form.append("numberOfTablets", editing.numberOfTablets ?? "");
      form.append("productSummary", editing.productSummary ?? "");
      form.append("recommendedFor", editing.recommendedFor ?? "");
      form.append("benefits", editing.benefits ?? "");
      form.append("sideEffects", editing.sideEffects ?? "");
      form.append("howToUse", editing.howToUse ?? "");
      if (editImage) form.append("image", editImage);

      const res = await fetch(`${API_URL}/api/pharmacy/products/${editing.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: form,
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error || "Failed to update."); return; }
      const d = await res.json();
      setProduct(d.product);
      setEditing(null);
    } catch { setEditError("Network error."); } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5476FC]" />
    </div>
  );

  const item: Product | LabTest | null = isLab ? test : product;

  if (error || !item) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-red-500 font-semibold text-sm font-outfit">{error || (isLab ? "Test not found." : "Product not found.")}</p>
      <Link href="/dashboard/inventory" className="text-[#5476FC] text-sm font-outfit font-bold hover:underline">
        Back to Inventory
      </Link>
    </div>
  );

  const statusCfg = STATUS_CONFIG[item.status];
  const categoryEmoji = isLab
    ? "🧪"
    : product?.category === "OTC" ? "💊" :
      product?.category === "Prescription" ? "📋" :
      product?.category === "Supplement" ? "🌿" :
      product?.category === "Medical Device" ? "🩺" : "📦";

  return (
    <div className="px-8 pb-12 font-outfit select-none animate-fade-in">
      {/* Header nav */}
      <div className="flex items-center gap-4 mb-8 mt-2">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-[#EBEEF5] flex items-center justify-center shadow-sm hover:shadow-md transition-all group"
        >
          <svg className="w-4 h-4 text-[#676E76] group-hover:text-[#5476FC] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-[28px] text-[#383F45] font-normal tracking-[-0.56px] leading-none">{isLab ? "Test Details" : "Product Details"}</h1>
          <p className="text-sm text-[#676E76] mt-1.5 tracking-[-0.28px]">
            <Link href="/dashboard/inventory" className="hover:text-[#5476FC] transition-colors">Inventory</Link>
            <span className="mx-2 text-[#EBEEF5]">/</span>
            <span className="text-[#383F45] font-medium">{item.name}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — image + status card */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* Image */}
          <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 flex flex-col items-center gap-5 transition-all hover:border-gray-300">
            <div className="w-full h-48 bg-[#F8FAFC] rounded-xl flex items-center justify-center overflow-hidden border border-[#EBEEF5]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-4 hover:scale-105 transition-transform duration-300" />
              ) : (
                <span className="text-6xl opacity-50">{categoryEmoji}</span>
              )}
            </div>
            <div className="w-full text-center">
              <h2 className="font-semibold text-[#24292E] text-[20px] tracking-[-0.4px] leading-snug">{item.name}</h2>
              {!isLab && product?.strength && (
                <p className="text-xs text-[#A0A8B0] mt-1">{product.strength}</p>
              )}
              {!isLab && product?.manufacturer && (
                <p className="text-[13px] text-[#676E76] mt-1.5">{product.manufacturer}</p>
              )}
              {isLab && typeof test?.turnaround_hours === "number" && (
                <p className="text-xs text-[#A0A8B0] mt-1">Turnaround: {test.turnaround_hours}h</p>
              )}
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[-0.22px] border ${statusCfg.bg} ${statusCfg.text} border-transparent`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>

            {item.flagged && (
              <div className="w-full bg-[#FFF4E5] border border-[#FDE68A] rounded-xl px-3 py-2 text-xs text-[#D97706] flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 21V4l1-1h10l1 2h6v12H14l-1-2H5v8H3z" />
                </svg>
                <span>
                  <span className="font-semibold">Flagged by admin.</span>
                  {item.flagReason && <span className="block mt-0.5"> {item.flagReason}</span>}
                </span>
              </div>
            )}

            {item.status === "rejected" && item.rejectedReason && (
              <div className="w-full bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl px-3 py-2 text-xs text-[#F25252]">
                <span className="font-semibold mr-1">Rejected:</span> {item.rejectedReason}
              </div>
            )}
          </div>

          {/* Price & availability summary */}
          <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 space-y-4 transition-all hover:border-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider">Price</span>
              <span className="text-[22px] font-semibold text-[#5476FC] tracking-[-0.44px]">AED {item.price.toFixed(2)}</span>
            </div>
            {isLab ? (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider">Home Visit</span>
                <button onClick={handleToggleHomeVisit} className="flex items-center gap-2.5">
                  <span className={`text-[13px] font-medium ${test?.homeVisitAvailable ? "text-green-700" : "text-gray-500"}`}>
                    {test?.homeVisitAvailable ? "Available" : "Unavailable"}
                  </span>
                  <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${test?.homeVisitAvailable ? "bg-[#5476FC]" : "bg-[#D1D5DB]"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${test?.homeVisitAvailable ? "translate-x-4" : ""}`} />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider">Availability</span>
                <button onClick={handleToggleStock} className="flex items-center gap-2.5">
                  <span className={`text-[13px] font-medium ${product?.inStock ? "text-green-700" : "text-gray-500"}`}>
                    {product?.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                  <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${product?.inStock ? "bg-[#5476FC]" : "bg-[#D1D5DB]"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${product?.inStock ? "translate-x-4" : ""}`} />
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={openEdit}
              className="w-full py-3 text-center rounded-xl border border-[#EBEEF5] text-[13px] font-medium text-[#383F45] hover:bg-[#F8FAFC] hover:border-gray-300 transition-all bg-white shadow-sm"
            >
              {isLab ? "Edit Test" : "Edit Product"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting !== null}
              className="w-full py-3 text-center rounded-xl border border-[#FCA5A5] text-[13px] font-medium text-[#F25252] hover:bg-[#FEE2E2] transition-all bg-white shadow-sm disabled:opacity-50"
            >
              {deleting ? "Deleting..." : (isLab ? "Delete Test" : "Delete Product")}
            </button>
          </div>
        </div>

        {/* Right — details */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {isLab ? (
            <>
              {/* Test details */}
              <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
                <h3 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px] mb-5 border-b border-[#EBEEF5] pb-3">Test Details</h3>
                <div className="space-y-1">
                  <DetailRow label="Category" value={test?.category} />
                  <DetailRow label="Turnaround" value={typeof test?.turnaround_hours === "number" ? `${test.turnaround_hours} hours` : undefined} />
                  <DetailRow
                    label="Fasting Required"
                    value={
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${test?.requires_fasting ? "bg-[#FFF4E5] text-[#D97706]" : "bg-[#E2F8EB] text-[#179353]"}`}>
                        {test?.requires_fasting ? "REQUIRED" : "NOT REQUIRED"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Doctor Approval"
                    value={
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${test?.requires_doctor_approval ? "bg-[#FFF4E5] text-[#D97706]" : "bg-[#E2F8EB] text-[#179353]"}`}>
                        {test?.requires_doctor_approval ? "REQUIRED" : "NOT REQUIRED"}
                      </span>
                    }
                  />
                  <DetailRow label="Recommended For" value={test?.recommendedFor} />
                  <DetailRow label="Recommended Frequency" value={test?.recommendedFrequency} />
                </div>
                {test?.description && (
                  <div className="py-4 mt-2">
                    <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider block mb-2">Description</span>
                    <p className="text-[13px] text-[#383F45] leading-relaxed">{test.description}</p>
                  </div>
                )}
                {test?.howItsDone && (
                  <div className="py-4 border-t border-[#EBEEF5]">
                    <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider block mb-2">How It's Done</span>
                    <p className="text-[13px] text-[#383F45] leading-relaxed">{test.howItsDone}</p>
                  </div>
                )}
                {test?.patientInstructions && (
                  <div className="py-4 border-t border-[#EBEEF5]">
                    <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider block mb-2">Patient Instructions</span>
                    <p className="text-[13px] text-[#383F45] leading-relaxed">{test.patientInstructions}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Product details */}
              <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
                <h3 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px] mb-5 border-b border-[#EBEEF5] pb-3">Product Details</h3>
                <div className="space-y-1">
                  <DetailRow label="Category" value={product?.category} />
                  {product?.requiresPrescription != null && (
                    <DetailRow
                      label="Prescription"
                      value={
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${product.requiresPrescription ? "bg-[#FFF4E5] text-[#D97706]" : "bg-[#E2F8EB] text-[#179353]"}`}>
                          {product.requiresPrescription ? "REQUIRED" : "NOT REQUIRED"}
                        </span>
                      }
                    />
                  )}
                </div>
                {product?.description && (
                  <div className="py-4 mt-2">
                    <span className="text-xs font-semibold text-[#676E76] uppercase tracking-wider block mb-2">Description</span>
                    <p className="text-[13px] text-[#383F45] leading-relaxed">{product.description}</p>
                  </div>
                )}
              </div>

              {/* Batch & stock details */}
              <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
                <h3 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px] mb-5 border-b border-[#EBEEF5] pb-3">Stock & Batch</h3>
                <div className="space-y-1">
                  <DetailRow label="Batch Number" value={product?.batchNumber} />
                  <DetailRow
                    label="Expiry Date"
                    value={
                      product?.expiryDate
                        ? new Date(product.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : undefined
                    }
                  />
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-[#EBEEF5] shadow-sm p-6 transition-all hover:border-gray-300">
            <h3 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px] mb-5 border-b border-[#EBEEF5] pb-3">Activity</h3>
            <div className="space-y-1">
              <DetailRow
                label="Added"
                value={new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              />
              {item.approvedAt && (
                <DetailRow
                  label="Approved"
                  value={new Date(item.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                />
              )}
              {item.updatedAt && (
                <DetailRow
                  label="Last Updated"
                  value={new Date(item.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal — pharmacy */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C2126]/60 backdrop-blur-sm animate-fade-in font-outfit">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-[#EBEEF5]">
            <div className="px-6 py-5 border-b border-[#EBEEF5] flex items-center justify-between bg-white shrink-0">
              <h2 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px]">Edit Product</h2>
              <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center text-[#A0A8B0] hover:text-[#24292E] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {editError && <div className="px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-[13px] text-[#F25252] font-medium">{editError}</div>}

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-2">Image</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[#EBEEF5] rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-[#5476FC]/50 hover:bg-[#EEF2FF]/50 transition-all group">
                  {editPreview ? <img src={editPreview} alt="" className="h-full w-full object-contain rounded-xl p-2" />
                    : <p className="text-[13px] text-[#A0A8B0] group-hover:text-[#5476FC] transition-colors">Click to change image</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Product Name *</label>
                <input value={editing.name} onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Manufacturer</label>
                  <input value={editing.manufacturer ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, manufacturer: e.target.value } : prev)}
                    placeholder="e.g. GSK"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Strength</label>
                  <input value={editing.strength ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, strength: e.target.value } : prev)}
                    placeholder="e.g. 500mg"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={editing.description ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Product Summary</label>
                <textarea value={editing.productSummary ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, productSummary: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Recommended For (Tags)</label>
                  <input value={editing.recommendedFor ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, recommendedFor: e.target.value } : prev)}
                    placeholder="e.g. Age: 8-64, Kids"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Number of Tablets / Quantity</label>
                  <input value={editing.numberOfTablets ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, numberOfTablets: e.target.value } : prev)}
                    placeholder="e.g. 15 Tablets"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Benefits</label>
                <textarea value={editing.benefits ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, benefits: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Side Effects</label>
                <textarea value={editing.sideEffects ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, sideEffects: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">How to use</label>
                <textarea value={editing.howToUse ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, howToUse: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Category *</label>
                <select value={editing.category} onChange={e => setEditing(prev => prev ? { ...prev, category: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all appearance-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Price (AED) *</label>
                <input type="number" min="0" step="0.01" value={editing.price}
                  onChange={e => setEditing(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
              </div>

              {/* Batch & stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Batch Number</label>
                  <input value={editing.batchNumber ?? ""} onChange={e => setEditing(prev => prev ? { ...prev, batchNumber: e.target.value } : prev)}
                    placeholder="BATCH-001"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input type="date" max="9999-12-31" value={editing.expiryDate ?? ""}
                    onChange={e => setEditing(prev => prev ? { ...prev, expiryDate: e.target.value } : prev)}
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 border border-[#EBEEF5]">
                <div>
                  <p className="text-[13px] font-semibold text-[#24292E]">In Stock</p>
                  <p className="text-[11px] text-[#A0A8B0] mt-1">Turn off the moment you run out — patients can't order it while this is off</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(prev => prev ? { ...prev, inStock: !prev.inStock } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editing.inStock ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editing.inStock ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Prescription toggle */}
              <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 border border-[#EBEEF5]">
                <div>
                  <p className="text-[13px] font-semibold text-[#24292E]">Prescription Required</p>
                  <p className="text-[11px] text-[#A0A8B0] mt-1">Patients must upload a prescription</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(prev => prev ? { ...prev, requiresPrescription: !prev.requiresPrescription } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editing.requiresPrescription ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editing.requiresPrescription ? "translate-x-6" : ""}`} />
                </button>
              </div>

              <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 text-xs text-[#4F46E5]">
                As an onboarded pharmacy, edits go live immediately. The admin can flag a product at any time.
              </div>
            </div>

            <div className="p-5 border-t border-[#EBEEF5] flex gap-3 bg-white shrink-0">
              <button onClick={() => setEditing(null)}
                className="flex-1 h-11 rounded-xl border border-[#EBEEF5] text-[#676E76] font-medium text-[13px] hover:bg-[#F8FAFC] transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — lab */}
      {editingTest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1C2126]/60 backdrop-blur-sm animate-fade-in font-outfit">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up border border-[#EBEEF5]">
            <div className="px-6 py-5 border-b border-[#EBEEF5] flex items-center justify-between bg-white shrink-0">
              <h2 className="font-semibold text-[#24292E] text-[18px] tracking-[-0.36px]">Edit Test</h2>
              <button onClick={() => setEditingTest(null)} className="w-8 h-8 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center text-[#A0A8B0] hover:text-[#24292E] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {editError && <div className="px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-[13px] text-[#F25252] font-medium">{editError}</div>}

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-2">Image</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[#EBEEF5] rounded-xl h-32 flex items-center justify-center cursor-pointer hover:border-[#5476FC]/50 hover:bg-[#EEF2FF]/50 transition-all group">
                  {editPreview ? <img src={editPreview} alt="" className="h-full w-full object-contain rounded-xl p-2" />
                    : <p className="text-[13px] text-[#A0A8B0] group-hover:text-[#5476FC] transition-colors">Click to change image</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageChange} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Test Name *</label>
                <input value={editingTest.name} onChange={e => setEditingTest(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={editingTest.description ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={3} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Recommended For (Tags)</label>
                  <input value={editingTest.recommendedFor ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, recommendedFor: e.target.value } : prev)}
                    placeholder="e.g. Adults, Diabetics"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Turnaround Time (hours)</label>
                  <input type="number" min="0" value={editingTest.turnaround_hours ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, turnaround_hours: e.target.value ? Number(e.target.value) : undefined } : prev)}
                    placeholder="e.g. 24"
                    className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">How It's Done</label>
                <textarea value={editingTest.howItsDone ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, howItsDone: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Recommended Frequency</label>
                <input value={editingTest.recommendedFrequency ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, recommendedFrequency: e.target.value } : prev)}
                  placeholder="e.g. Once every 6 months"
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Patient Instructions</label>
                <textarea value={editingTest.patientInstructions ?? ""} onChange={e => setEditingTest(prev => prev ? { ...prev, patientInstructions: e.target.value } : prev)}
                  rows={2} className="w-full px-4 py-3 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Category *</label>
                <select value={editingTest.category} onChange={e => setEditingTest(prev => prev ? { ...prev, category: e.target.value } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all appearance-none">
                  {LAB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#676E76] uppercase tracking-wider mb-1.5">Price (AED) *</label>
                <input type="number" min="0" step="0.01" value={editingTest.price}
                  onChange={e => setEditingTest(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : prev)}
                  className="w-full h-11 px-4 bg-[#F5F7FB] rounded-xl text-sm text-[#24292E] border border-transparent focus:outline-none focus:border-[#5476FC]/50 focus:bg-white transition-all" />
              </div>

              {/* Home visit toggle */}
              <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 border border-[#EBEEF5]">
                <div>
                  <p className="text-[13px] font-semibold text-[#24292E]">Available for Home Visit</p>
                  <p className="text-[11px] text-[#A0A8B0] mt-1">Patients can request an at-home sample collection for this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTest(prev => prev ? { ...prev, homeVisitAvailable: !prev.homeVisitAvailable } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editingTest.homeVisitAvailable ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editingTest.homeVisitAvailable ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Fasting toggle */}
              <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 border border-[#EBEEF5]">
                <div>
                  <p className="text-[13px] font-semibold text-[#24292E]">Requires Fasting</p>
                  <p className="text-[11px] text-[#A0A8B0] mt-1">Patients must fast before this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTest(prev => prev ? { ...prev, requires_fasting: !prev.requires_fasting } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editingTest.requires_fasting ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editingTest.requires_fasting ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Doctor approval toggle */}
              <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 border border-[#EBEEF5]">
                <div>
                  <p className="text-[13px] font-semibold text-[#24292E]">Requires Doctor Approval</p>
                  <p className="text-[11px] text-[#A0A8B0] mt-1">Patients need a doctor's approval before booking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTest(prev => prev ? { ...prev, requires_doctor_approval: !prev.requires_doctor_approval } : prev)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${editingTest.requires_doctor_approval ? "bg-[#5476FC]" : "bg-[#EBEEF5]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editingTest.requires_doctor_approval ? "translate-x-6" : ""}`} />
                </button>
              </div>

              <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-4 py-3 text-xs text-[#4F46E5]">
                As an onboarded lab, edits go live immediately. The admin can flag a test at any time.
              </div>
            </div>

            <div className="p-5 border-t border-[#EBEEF5] flex gap-3 bg-white shrink-0">
              <button onClick={() => setEditingTest(null)}
                className="flex-1 h-11 rounded-xl border border-[#EBEEF5] text-[#676E76] font-medium text-[13px] hover:bg-[#F8FAFC] transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white font-medium text-[13px] shadow-[0_4px_10px_rgba(84,118,252,0.25)] hover:shadow-[0_6px_14px_rgba(84,118,252,0.35)] transition-all disabled:opacity-60">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
