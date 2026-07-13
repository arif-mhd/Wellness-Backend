"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";

const CATEGORIES = ["Wellness", "Nutrition", "Mental Health", "Fitness", "Women's Health", "Pregnancy", "General"];

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[13px] font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6A8BFF]/30 focus:border-[#6A8BFF] transition";
const labelCls = "text-[11px] font-semibold text-slate-500 uppercase tracking-wider";

export default function AddArticlePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [author, setAuthor] = useState("Admin");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!content.trim()) { setError("Content is required."); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, content, category, coverImageUrl: coverImageUrl || null, author, tags }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to create article.");
      }
      router.push("/dashboard/articles");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-[24px] font-medium text-[#1e293b] tracking-tight">Add Article</h1>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {submitting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-[#5476FC] rounded-full animate-spin" />
            <p className="text-gray-600 text-sm font-medium">Saving article…</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

            {/* ── MAIN CONTENT ────────────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-8">
                <h2 className="text-[16px] font-semibold text-slate-800 mb-6">Article Content</h2>

                {/* Title */}
                <div className="mb-5">
                  <label className={labelCls}>Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 5 Tips for Better Sleep During Pregnancy"
                    className={`${inputCls} mt-2`}
                  />
                </div>

                {/* Summary */}
                <div className="mb-5">
                  <label className={labelCls}>Summary / Excerpt</label>
                  <textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="A short description shown in article cards and previews (1–2 sentences)"
                    rows={2}
                    className={`${inputCls} mt-2 resize-none`}
                  />
                </div>

                {/* Content */}
                <div>
                  <label className={labelCls}>Content <span className="text-red-400">*</span></label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write the full article content here. You can use plain text or markdown-style formatting."
                    rows={18}
                    className={`${inputCls} mt-2 resize-y`}
                  />
                  <p className="text-[11px] text-slate-400 mt-2">{content.length} characters · ~{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min read</p>
                </div>
              </div>
            </div>

            {/* ── SIDEBAR META ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-6">

              {/* Publish card */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6">
                <h2 className="text-[15px] font-semibold text-slate-800 mb-5">Publish</h2>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] hover:from-[#7A90FF] hover:to-[#4466FC] text-white rounded-[1rem] text-[13px] font-medium transition duration-200 shadow-[0_4px_10px_rgba(84,118,252,0.2)] active:scale-[0.98] mb-3"
                >
                  Publish Article
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/articles")}
                  className="w-full py-3 rounded-[1rem] bg-slate-100 text-slate-600 text-[13px] font-medium hover:bg-slate-200 transition active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>

              {/* Category & meta */}
              <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6 flex flex-col gap-5">
                <h2 className="text-[15px] font-semibold text-slate-800">Article Details</h2>

                {/* Category */}
                <div>
                  <label className={labelCls}>Category <span className="text-red-400">*</span></label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className={`${inputCls} mt-2`}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Author */}
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

                {/* Cover image URL */}
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

                {/* Tags */}
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
              </div>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
