"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";

const CATEGORIES = ["Wellness", "Nutrition", "Mental Health", "Fitness", "Women's Health", "Pregnancy", "General"];

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition";
const labelCls = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

export default function EditArticlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [author, setAuthor] = useState("Admin");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [flagged, setFlagged] = useState(false);
  const [createdAt, setCreatedAt] = useState("");

  useEffect(() => {
    apiFetch(`/api/admin/articles/${id}`)
      .then(res => res.json())
      .then(({ article }) => {
        if (!article) { setError("Article not found."); return; }
        setTitle(article.title ?? "");
        setSummary(article.summary ?? "");
        setContent(article.content ?? "");
        setCategory(article.category ?? CATEGORIES[0]);
        setCoverImageUrl(article.coverImageUrl ?? "");
        setAuthor(article.author ?? "Admin");
        setTags(article.tags ?? []);
        setFlagged(article.flagged ?? false);
        setCreatedAt(article.createdAt ?? "");
      })
      .catch(() => setError("Could not load article."))
      .finally(() => setLoading(false));
  }, [id]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!content.trim()) { setError("Content is required."); return; }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(`/api/admin/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, content, category, coverImageUrl: coverImageUrl || null, author, tags }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Save failed.");
      }
      setSuccess("Article saved successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    setFlagging(true);
    try {
      const res = await apiFetch(`/api/admin/articles/${id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !flagged }),
      });
      if (res.ok) {
        const { article } = await res.json();
        setFlagged(article.flagged);
        setSuccess(article.flagged ? "Article flagged — hidden from patients." : "Article unflagged — now visible to patients.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } finally {
      setFlagging(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/dashboard/articles");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-[#5476FC] rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-[1440px] mx-auto pb-12 font-sans px-1 animate-in fade-in duration-300" style={{ fontFamily: "Outfit, sans-serif" }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard/articles")}
            className="w-[38px] h-[38px] rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight truncate">Edit Article</h1>
            {createdAt && (
              <p className="text-[12px] text-slate-400 mt-0.5">
                Created {new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          {flagged && (
            <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[12px] font-semibold flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" /></svg>
              Flagged
            </span>
          )}
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {submitting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Saving changes…</p>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

            {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                <h2 className="text-[16px] font-semibold text-slate-800 mb-6">Article Content</h2>

                <div className="mb-5">
                  <label className={labelCls}>Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Article title"
                    className={`${inputCls} mt-2`}
                  />
                </div>

                <div className="mb-5">
                  <label className={labelCls}>Summary / Excerpt</label>
                  <textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Short description shown in cards"
                    rows={2}
                    className={`${inputCls} mt-2 resize-none`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Content <span className="text-red-400">*</span></label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Full article content…"
                    rows={18}
                    className={`${inputCls} mt-2 resize-y`}
                  />
                  <p className="text-[11px] text-slate-400 mt-2">{content.length} characters · ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read</p>
                </div>
              </div>
            </div>

            {/* ── SIDEBAR ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">

              {/* Save / actions */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6 flex flex-col gap-3">
                <h2 className="text-[15px] font-semibold text-slate-800 mb-2">Actions</h2>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98]"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={handleFlag}
                  disabled={flagging}
                  className={`w-full py-3.5 rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${flagged ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                >
                  {flagging ? "Updating…" : flagged ? "Unflag — Make Visible" : "Flag — Hide from Patients"}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-[1rem] text-[13px] font-medium transition duration-200 active:scale-[0.98]"
                >
                  Delete Article
                </button>
              </div>

              {/* Meta */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6 flex flex-col gap-5">
                <h2 className="text-[15px] font-semibold text-slate-800">Article Details</h2>

                <div>
                  <label className={labelCls}>Category <span className="text-red-400">*</span></label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} mt-2`}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Author name"
                    className={`${inputCls} mt-2`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Cover Image URL</label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://…"
                    className={`${inputCls} mt-2`}
                  />
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-32 object-cover rounded-xl mt-3 border border-slate-100"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>

                <div>
                  <label className={labelCls}>Tags</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="Add a tag…"
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 rounded-xl bg-[#E5EDFF] text-[#6A8BFF] text-[13px] font-medium hover:bg-[#dbe6ff] transition shrink-0"
                    >
                      Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#6A8BFF] rounded-full text-[11px] font-medium">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="text-[#6A8BFF] hover:text-red-400 transition leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flagged status info */}
                <div className={`rounded-2xl p-4 ${flagged ? "bg-amber-50 border border-amber-100" : "bg-green-50 border border-green-100"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${flagged ? "bg-amber-400" : "bg-green-500"}`} />
                    <span className={`text-[12px] font-semibold ${flagged ? "text-amber-700" : "text-green-700"}`}>
                      {flagged ? "Hidden from patients" : "Visible to patients"}
                    </span>
                  </div>
                  <p className={`text-[11px] ${flagged ? "text-amber-600" : "text-green-600"}`}>
                    {flagged
                      ? "This article is flagged and will not appear in the patient app."
                      : "This article is live and visible in the patient app."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Delete confirmation modal */}
        {deleteConfirm && (
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
                  <p className="text-[13px] text-slate-500">This cannot be undone. The article will be permanently removed.</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-[13px] font-medium hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[13px] font-medium hover:bg-red-600 transition shadow-sm disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete"}
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
