"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";
import Pagination from "@/components/Pagination";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverImageUrl?: string | null;
  tags: string[];
  author: string;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["All", "Wellness", "Nutrition", "Mental Health", "Fitness", "Women's Health", "Pregnancy", "General"];

const DoubleCaret = () => (
  <div className="flex flex-col items-center gap-[0.5px] opacity-40 ml-1.5 shrink-0">
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 15l7-7 7 7" /></svg>
    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" /></svg>
  </div>
);

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    "Wellness":        "bg-blue-50 text-blue-600",
    "Nutrition":       "bg-green-50 text-green-600",
    "Mental Health":   "bg-purple-50 text-purple-600",
    "Fitness":         "bg-orange-50 text-orange-600",
    "Women's Health":  "bg-pink-50 text-pink-600",
    "Pregnancy":       "bg-rose-50 text-rose-600",
    "General":         "bg-slate-50 text-slate-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${colors[category] ?? "bg-slate-50 text-slate-600"}`}>
      {category}
    </span>
  );
}

export default function ManageArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "flagged">("all");
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const itemsPerPage = 8;

  const fetchArticles = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/articles");
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error ?? `Error ${res.status}`);
        return;
      }
      const { articles: data } = await res.json();
      setArticles(data ?? []);
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleFlag = async (id: string, currentFlagged: boolean) => {
    setFlagging(id);
    try {
      const res = await apiFetch(`/api/admin/articles/${id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !currentFlagged }),
      });
      if (res.ok) {
        const { article } = await res.json();
        setArticles(prev => prev.map(a => a.id === id ? { ...a, flagged: article.flagged } : a));
        if (selectedId === id) setSelectedId(null);
      }
    } finally {
      setFlagging(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const res = await apiFetch("/api/admin/articles/seed", { method: "POST" });
      const b = await res.json();
      if (b.status === "skipped") {
        setSeedMsg(`Already seeded (${b.message})`);
      } else {
        setSeedMsg(`Seeded ${b.seeded} articles successfully.`);
        fetchArticles();
      }
    } catch {
      setSeedMsg("Seed failed.");
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedMsg(""), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setDeleteConfirmId(null);
    try {
      const res = await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id));
        if (selectedId === id) setSelectedId(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  const filtered = articles.filter(a => {
    if (activeTab === "flagged" && !a.flagged) return false;
    if (activeCategory !== "All" && a.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.author?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q);
    }
    return true;
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectedArticle = articles.find(a => a.id === selectedId) ?? null;

  const flaggedCount = articles.filter(a => a.flagged).length;

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans animate-in fade-in duration-300" style={{ fontFamily: "Outfit, sans-serif" }}>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div className={`${selectedArticle ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-5`}>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Manage Articles</h1>
              <div className="flex items-center gap-3">
                {seedMsg && (
                  <span className="text-[12px] text-slate-500 font-medium">{seedMsg}</span>
                )}
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="border border-slate-200 bg-white text-slate-600 text-[13px] font-medium px-4 py-3 rounded-xl flex items-center gap-2 transition duration-200 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                >
                  {seeding ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-[#5476FC] rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  Seed Articles
                </button>
                <button
                  onClick={() => router.push("/dashboard/articles/add")}
                  className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white text-[13px] font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Article
                </button>
              </div>
            </div>

            {/* Tab + search row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all ${activeTab === "all" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"}`}
                >
                  All Articles
                </button>
                <button
                  onClick={() => { setActiveTab("flagged"); setCurrentPage(1); }}
                  className={`px-6 py-2.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${activeTab === "flagged" ? "bg-[#1E293B] text-white shadow-md shadow-slate-200" : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/70"}`}
                >
                  Flagged
                  {flaggedCount > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${activeTab === "flagged" ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-600"}`}>
                      {flaggedCount}
                    </span>
                  )}
                </button>

                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-sm ml-1"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  {searchOpen && (
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                      placeholder="Search articles..."
                      className="border border-slate-200 bg-white rounded-full px-4 py-2 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-48 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <button onClick={fetchArticles} className="text-[12px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1.5 transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${activeCategory === cat ? "bg-[#6A8BFF] text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200/70 hover:border-[#6A8BFF]/40 hover:text-slate-800"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Column headers */}
            <div className="flex items-center text-[13px] font-medium text-[#64748B] px-3 select-none">
              <div className="flex items-center gap-1.5 flex-[3] cursor-pointer hover:text-slate-800">
                Title <DoubleCaret />
              </div>
              <div className="flex items-center gap-1.5 w-28 cursor-pointer hover:text-slate-800">
                Category <DoubleCaret />
              </div>
              <div className="flex items-center gap-1.5 w-28 cursor-pointer hover:text-slate-800">
                Author <DoubleCaret />
              </div>
              <div className="flex items-center gap-1.5 w-28 cursor-pointer hover:text-slate-800">
                Date <DoubleCaret />
              </div>
              <div className="w-20 text-center">Status</div>
              <div className="w-20 text-center">Actions</div>
            </div>

            {/* Table panel */}
            <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 min-h-[500px] flex flex-col justify-between">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-[#5476FC] rounded-full animate-spin" />
                    <p className="text-[13px] text-slate-400 font-medium">Loading articles…</p>
                  </div>
                ) : paginated.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                    <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-[13px] font-semibold">
                      {activeTab === "flagged" ? "No flagged articles" : "No articles yet — add one to get started"}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {paginated.map(article => (
                        <tr
                          key={article.id}
                          onClick={() => setSelectedId(prev => prev === article.id ? null : article.id)}
                          className={`group cursor-pointer transition-colors duration-150 border-b border-slate-50 last:border-0 ${selectedId === article.id ? "bg-blue-50/40" : "hover:bg-slate-50/50"}`}
                        >
                          {/* Title */}
                          <td className="py-3.5 px-2 flex-[3]">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Cover thumbnail */}
                              {article.coverImageUrl ? (
                                <img src={article.coverImageUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-100" />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E0E7FF] to-[#EEF2FF] flex items-center justify-center shrink-0">
                                  <svg className="w-5 h-5 text-[#6A8BFF] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 group-hover:text-[#5476FC] transition-colors truncate max-w-[280px]">
                                  {article.title}
                                </p>
                                {article.summary && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{article.summary}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 w-28">
                            <CategoryBadge category={article.category} />
                          </td>

                          {/* Author */}
                          <td className="py-3.5 w-28 text-[13px] text-slate-600 font-medium">{article.author}</td>

                          {/* Date */}
                          <td className="py-3.5 w-28 text-[11px] text-slate-400 font-medium">
                            {new Date(article.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 w-20 text-center">
                            {article.flagged ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" /></svg>
                                Flagged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                Live
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 w-20" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit */}
                              <button
                                onClick={() => router.push(`/dashboard/articles/${article.id}`)}
                                title="Edit"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#5476FC] hover:bg-blue-50 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Flag / Unflag */}
                              <button
                                onClick={() => handleFlag(article.id, article.flagged)}
                                disabled={flagging === article.id}
                                title={article.flagged ? "Unflag (make visible)" : "Flag (hide from patients)"}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${article.flagged ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
                              >
                                {flagging === article.id ? (
                                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill={article.flagged ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                                  </svg>
                                )}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setDeleteConfirmId(article.id)}
                                disabled={deleting === article.id}
                                title="Delete"
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                              >
                                {deleting === article.id ? (
                                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filtered.length > itemsPerPage && (
                <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} />
              )}
            </div>
          </div>

          {/* ── RIGHT DETAIL PANEL ───────────────────────────────────────── */}
          {selectedArticle && (
            <div className="lg:col-span-4 bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7 animate-in slide-in-from-right-3 duration-300 sticky top-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[17px] font-medium text-slate-800 tracking-tight">Article Preview</h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition shadow-sm border border-slate-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Cover image */}
              {selectedArticle.coverImageUrl ? (
                <img src={selectedArticle.coverImageUrl} alt="" className="w-full h-40 object-cover rounded-2xl mb-5 border border-slate-100" />
              ) : (
                <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-[#E0E7FF] to-[#EEF2FF] flex items-center justify-center mb-5">
                  <svg className="w-10 h-10 text-[#6A8BFF] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}

              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <CategoryBadge category={selectedArticle.category} />
                {selectedArticle.flagged && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">Flagged</span>
                )}
              </div>

              <h3 className="text-[16px] font-semibold text-slate-800 leading-snug mb-2">{selectedArticle.title}</h3>
              {selectedArticle.summary && (
                <p className="text-[12px] text-slate-500 leading-relaxed mb-4">{selectedArticle.summary}</p>
              )}

              {/* Meta */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-5">
                {[
                  { label: "Author", value: selectedArticle.author },
                  { label: "Published", value: new Date(selectedArticle.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                  { label: "Last updated", value: new Date(selectedArticle.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">{label}</span>
                    <span className="text-[11px] text-slate-700 font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {selectedArticle.tags.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedArticle.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-50 text-[#6A8BFF] rounded-full text-[11px] font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push(`/dashboard/articles/${selectedArticle.id}`)}
                  className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
                >
                  Edit Article
                </button>
                <button
                  onClick={() => handleFlag(selectedArticle.id, selectedArticle.flagged)}
                  disabled={flagging === selectedArticle.id}
                  className={`w-full py-3.5 rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${selectedArticle.flagged ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                >
                  {flagging === selectedArticle.id ? "Updating…" : selectedArticle.flagged ? "Unflag — Make Visible" : "Flag — Hide from Patients"}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(selectedArticle.id)}
                  className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98]"
                >
                  Delete Article
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete confirmation modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-150">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-slate-800 mb-1">Delete Article?</h3>
                  <p className="text-[13px] text-slate-500">This action cannot be undone. The article will be permanently removed.</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-[13px] font-medium hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
