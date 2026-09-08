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

interface LabService {
  id: string;
  supertokens_id?: string | null;
  name: string;
  email: string;
  contactNumber: string;
  location: string;
  director?: string;
  manager?: string;
  labLicense?: string;
  healthAuthorityLicense?: string;
  accreditationNumber?: string;
  specializations?: string[];
  status: "pending_approval" | "approved" | "rejected";
  registeredAt?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  clinicIds?: string[];
  affiliation?: string | null;
  totalTests: number;
  rating: number;
}

interface LabTest {
  id: string;
  labId: string;
  labName?: string;
  name: string;
  category: string;
  price: number;
  turnaround_hours?: number | null;
  requires_fasting?: boolean;
  requires_doctor_approval?: boolean;
  homeVisitAvailable?: boolean;
  is_active: boolean;
  status: "pending_approval" | "approved" | "rejected";
  description?: string | null;
  createdAt: string;
}

interface Document {
  id: number;
  name: string;
}

function Avatar({ lab, size = "md" }: { lab: LabService; size?: "sm" | "md" | "lg" | "xl" }) {
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : size === "xl" ? "w-[4.5rem] h-[4.5rem] text-3xl" : "w-10 h-10 text-sm";
  const name = lab.name || "?";
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br from-[#6A8BFF] to-[#5a7ae6] flex items-center justify-center text-white font-medium shadow-sm`}>
        {name[0].toUpperCase()}
      </div>
      {lab.status === "approved" && (
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

export default function LabProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<"about" | "tests">("about");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [lab, setLab] = useState<LabService | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Approve/Reject
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Toggle-active loading state, keyed by testId
  const [togglingTestId, setTogglingTestId] = useState<string | null>(null);

  // Add Test modal
  const [showAddTest, setShowAddTest] = useState(false);
  const [addingTest, setAddingTest] = useState(false);
  const [addTestError, setAddTestError] = useState("");
  const emptyTestForm = () => ({
    name: "", category: "", price: "", turnaround_hours: "",
    requires_fasting: false, requires_doctor_approval: false, homeVisitAvailable: false,
    description: "",
  });
  const [testForm, setTestForm] = useState(emptyTestForm());

  const [documents, setDocuments] = useState<Document[]>([
    { id: 1, name: "Lab_License.pdf" },
    { id: 2, name: "Accreditation_certificate.pdf" },
  ]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [labRes, testsRes] = await Promise.all([
        adminFetch(`/api/admin/lab/${id}`),
        adminFetch(`/api/admin/lab/${id}/tests`),
      ]);

      if (labRes.ok) {
        const d = await labRes.json();
        setLab(d.lab);
      } else {
        setError("Lab not found.");
      }

      if (testsRes.ok) {
        const d = await testsRes.json();
        setTests(d.tests ?? []);
      }
    } catch {
      setError("Failed to load lab data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [id]);

  async function approveLab() {
    if (!lab) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/lab/${lab.id}/approve`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setLab(d.lab);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectLab() {
    if (!lab) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/lab/${lab.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        const d = await res.json();
        setLab(d.lab);
        setShowRejectInput(false);
        setRejectReason("");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleTestActive(testId: string) {
    setTogglingTestId(testId);
    try {
      const res = await adminFetch(`/api/admin/lab/tests/${testId}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const d = await res.json();
        setTests(prev => prev.map(t => t.id === testId ? { ...t, ...d.test } : t));
      }
    } finally {
      setTogglingTestId(null);
    }
  }

  async function submitTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testForm.name || !testForm.category || !testForm.price) {
      setAddTestError("Name, category and price are required.");
      return;
    }
    setAddingTest(true);
    setAddTestError("");
    try {
      const res = await adminFetch(`/api/admin/lab/${id}/tests`, {
        method: "POST",
        body: JSON.stringify({
          name:                      testForm.name,
          category:                  testForm.category,
          price:                     testForm.price,
          turnaround_hours:          testForm.turnaround_hours || null,
          requires_fasting:          testForm.requires_fasting,
          requires_doctor_approval:  testForm.requires_doctor_approval,
          homeVisitAvailable:        testForm.homeVisitAvailable,
          description:               testForm.description || null,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setTests(prev => [d.test, ...prev]);
        setLab(prev => prev ? { ...prev, totalTests: (prev.totalTests ?? 0) + 1 } : prev);
        setShowAddTest(false);
        setTestForm(emptyTestForm());
      } else {
        const d = await res.json().catch(() => ({}));
        setAddTestError(d.error ?? "Failed to add test.");
      }
    } catch {
      setAddTestError("Network error.");
    } finally {
      setAddingTest(false);
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
          Loading lab details…
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !lab) {
    return (
      <ProtectedRoute>
        <div className="w-full flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-red-500 font-semibold text-sm">{error || "Lab not found."}</p>
          <button
            onClick={() => router.push("/dashboard/lab-service")}
            className="text-[#6A8BFF] text-sm font-semibold hover:underline"
          >
            Back to Lab Services
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300">
        <div className="flex flex-col gap-8">

          {/* Top Bar Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/lab-service")}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm border border-slate-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[26px] font-medium text-[#1e293b] tracking-tight">Lab Details</h1>
          </div>

          {/* Main Header Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="shrink-0">
                <Avatar lab={lab} size="xl" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-1">
                  <h2 className="text-[20px] font-semibold text-slate-800">{lab.name}</h2>
                  {lab.status === "approved" && (
                    <div className="flex items-center gap-1.5 text-teal-400 bg-teal-50 px-2.5 py-1 rounded-full">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[11px] font-semibold whitespace-nowrap">Approved</span>
                    </div>
                  )}
                  {lab.status === "pending_approval" && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">Pending Approval</span>
                  )}
                  {lab.status === "rejected" && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Rejected</span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-slate-500">{lab.email}</p>
              </div>
            </div>

            {lab.status === "approved" && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button className="flex-1 sm:flex-none px-8 py-3.5 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] text-[13px] font-semibold rounded-2xl transition active:scale-95 text-center">
                  Edit
                </button>
                <button className="flex-1 sm:flex-none px-8 py-3.5 bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] text-[13px] font-semibold rounded-2xl transition active:scale-95 text-center">
                  Deactivate Lab
                </button>
              </div>
            )}
          </div>

          {/* Approve / Reject actions for pending labs */}
          {lab.status === "pending_approval" && (
            <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-50">
              <h3 className="text-[14px] font-semibold text-slate-800 mb-4">Review Application</h3>
              {showRejectInput ? (
                <div className="space-y-3">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection…"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <div className="flex gap-2 max-w-md">
                    <button
                      onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={rejectLab}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60"
                    >
                      {actionLoading ? "…" : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 max-w-md">
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={approveLab}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#179353] text-white text-[13px] font-semibold hover:bg-[#138048] shadow-[0_4px_10px_rgba(23,147,83,0.2)] transition disabled:opacity-60"
                  >
                    {actionLoading ? "…" : "Approve"}
                  </button>
                </div>
              )}
            </div>
          )}

          {lab.status === "rejected" && lab.rejectedReason && (
            <div className="bg-red-50 border border-red-100 rounded-[2rem] p-7 text-[13px] text-red-600 font-semibold">
              Rejected: {lab.rejectedReason}
            </div>
          )}

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
              onClick={() => setActiveTab("tests")}
              className={`px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all ${
                activeTab === "tests"
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "bg-white text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100"
              }`}
            >
              Tests
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
                    {lab.labLicense && (
                      <DetailRow label="Lab License" value={lab.labLicense} />
                    )}
                    {lab.healthAuthorityLicense && (
                      <DetailRow label="Health Authority License" value={lab.healthAuthorityLicense} />
                    )}
                    {lab.accreditationNumber && (
                      <DetailRow label="Accreditation No." value={lab.accreditationNumber} />
                    )}
                    <DetailRow label="Director" value={lab.director || "—"} />
                    {lab.manager && (
                      <DetailRow label="Manager" value={lab.manager} />
                    )}
                    <DetailRow label="Location" value={lab.location || "—"} />
                    <DetailRow label="Contact Number" value={lab.contactNumber} />
                    <DetailRow
                      label="Email ID"
                      value={lab.email}
                      valueClass="text-[#6A8BFF] font-semibold"
                    />
                    {lab.affiliation && (
                      <DetailRow label="Affiliation" value={lab.affiliation} />
                    )}
                    {(lab.registeredAt || lab.createdAt) && (
                      <DetailRow
                        label="Registered"
                        value={new Date(lab.registeredAt ?? lab.createdAt!).toLocaleDateString()}
                      />
                    )}
                    {lab.approvedAt && (
                      <DetailRow
                        label="Approved"
                        value={new Date(lab.approvedAt).toLocaleDateString()}
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

            {/* TESTS TAB */}
            {activeTab === "tests" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">

                {/* Filters Row */}
                <div className="flex items-center gap-8 text-[13px] font-semibold text-[#64748B] select-none pl-2 flex-wrap">
                  <div className="hidden lg:flex items-center gap-8">
                    <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                      Test Name
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                      Category
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                      Price
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-slate-800 cursor-pointer transition">
                      Status
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={() => { setShowAddTest(true); setAddTestError(""); setTestForm(emptyTestForm()); }}
                      className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[12px] font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Test
                    </button>
                    <button aria-label="Filter" className="text-slate-500 hover:text-slate-800 transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Tests Table */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 p-7 min-h-[400px] flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    {tests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <svg className="w-10 h-10 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm font-semibold">No tests for this lab</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse block lg:table">
                        <thead className="hidden lg:table-header-group">
                          <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800 tracking-wider">
                            <th className="pb-4 pt-1 font-semibold pl-2">Test Name</th>
                            <th className="pb-4 pt-1 font-semibold">Category</th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Price <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold">
                              <div className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                Status <DoubleCaret />
                              </div>
                            </th>
                            <th className="pb-4 pt-1 font-semibold text-center">Active</th>
                          </tr>
                        </thead>
                        <tbody className="block lg:table-row-group">
                          {tests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((test) => {
                            return (
                              <tr
                                key={test.id}
                                className={`block lg:table-row bg-white lg:bg-transparent rounded-2xl mb-4 p-4 lg:mb-0 lg:p-0 shadow-sm lg:shadow-none border border-slate-100 lg:border-b lg:border-slate-50 relative group transition-colors duration-200 lg:last:border-0 ${!test.is_active ? "bg-slate-50/40" : "lg:hover:bg-slate-50/50"}`}
                              >
                                <td className="block lg:table-cell py-2 lg:py-5 px-2">
                                  <div className="flex lg:hidden text-[10px] uppercase text-slate-400 font-semibold mb-1">Test Name</div>
                                  <span className="text-[13px] font-semibold text-slate-800">{test.name}</span>
                                  {test.homeVisitAvailable && (
                                    <span className="ml-2 text-[10px] font-semibold bg-[#EEF2FF] text-[#6A8BFF] px-2 py-0.5 rounded-full">Home Visit</span>
                                  )}
                                </td>
                                <td className="block lg:table-cell py-2 lg:py-5 text-[13px] font-medium text-slate-500 lg:px-0 px-2">
                                  <div className="flex lg:hidden text-[10px] uppercase text-slate-400 font-semibold mb-1">Category</div>
                                  {test.category}
                                </td>
                                <td className="block lg:table-cell py-2 lg:py-5 text-[13px] font-medium text-slate-500 lg:px-0 px-2">
                                  <div className="flex lg:hidden text-[10px] uppercase text-slate-400 font-semibold mb-1">Price (AED)</div>
                                  AED {test.price.toFixed(2)}
                                </td>
                                <td className="block lg:table-cell py-2 lg:py-5 text-[13px] font-semibold lg:px-0 px-2">
                                  <div className="flex lg:hidden text-[10px] uppercase text-slate-400 font-semibold mb-1">Status</div>
                                  {test.status === "pending_approval" ? (
                                    <span className="text-amber-500">Pending</span>
                                  ) : test.status === "rejected" ? (
                                    <span className="text-red-400">Rejected</span>
                                  ) : (
                                    <span className="text-teal-500">Approved</span>
                                  )}
                                </td>
                                <td className="block lg:table-cell py-2 lg:py-5 lg:text-center px-2">
                                  <div className="flex lg:hidden text-[10px] uppercase text-slate-400 font-semibold mb-1">Active</div>
                                  <button
                                    onClick={() => toggleTestActive(test.id)}
                                    disabled={togglingTestId === test.id}
                                    className={`relative w-11 h-6 rounded-full transition-colors lg:mx-auto disabled:opacity-60 ${test.is_active ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                                  >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${test.is_active ? "translate-x-5" : ""}`} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {tests.length > 0 && (
                    <div className="mt-6 border-t border-slate-50 pt-5">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(tests.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Add Test Modal ──────────────────────────────────────────── */}
      {showAddTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">

            {/* Modal header */}
            <div className="flex items-center justify-between p-7 border-b border-slate-50">
              <h2 className="text-[17px] font-medium text-slate-800">Add Test</h2>
              <button
                onClick={() => setShowAddTest(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitTest} className="p-7 space-y-5">
              {addTestError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {addTestError}
                </div>
              )}

              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Test Name *</label>
                  <input
                    value={testForm.name}
                    onChange={e => setTestForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Thyroid TSH - Serum"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category *</label>
                  <input
                    value={testForm.category}
                    onChange={e => setTestForm(p => ({ ...p, category: e.target.value }))}
                    placeholder="e.g. Thyroid, Vitamin, Package"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
              </div>

              {/* Price + Turnaround */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Price (AED) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={testForm.price}
                    onChange={e => setTestForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Turnaround (hours)</label>
                  <input
                    type="number" min="1"
                    value={testForm.turnaround_hours}
                    onChange={e => setTestForm(p => ({ ...p, turnaround_hours: e.target.value }))}
                    placeholder="24"
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={testForm.description}
                  onChange={e => setTestForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this test measure and why is it done?"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition resize-none"
                />
              </div>

              {/* Fasting toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Requires Fasting</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Patient must fast before this test</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestForm(p => ({ ...p, requires_fasting: !p.requires_fasting }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${testForm.requires_fasting ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${testForm.requires_fasting ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Doctor approval toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Requires Doctor Approval</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">A doctor must approve before booking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestForm(p => ({ ...p, requires_doctor_approval: !p.requires_doctor_approval }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${testForm.requires_doctor_approval ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${testForm.requires_doctor_approval ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Home visit toggle */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Home Visit Available</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Patients can book this test as a home visit</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestForm(p => ({ ...p, homeVisitAvailable: !p.homeVisitAvailable }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${testForm.homeVisitAvailable ? "bg-[#6A8BFF]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${testForm.homeVisitAvailable ? "translate-x-6" : ""}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTest(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTest}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-semibold transition shadow-[0_4px_10px_rgba(84,118,252,0.2)] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {addingTest ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding…
                    </>
                  ) : "Add Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
