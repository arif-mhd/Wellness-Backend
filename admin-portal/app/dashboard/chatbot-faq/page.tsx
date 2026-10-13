"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiFetch } from "@/lib/apiFetch";

// Help & FAQ content per brand. Patients browse it in the assistant and in
// Profile → Help and Support, and the assistant answers typed "how do I…"
// questions from it — only ever from this text, so what's written here is
// exactly what patients are told.

interface Org { id: string; slug: string; name: string }
interface Category { id: string; title: string; order: number; isActive: boolean }
interface Entry {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  relatedIds: string[];
  deepLink: string | null;
  order: number;
  isActive: boolean;
  reviewNote: string | null;
}
interface DeepLinkOption { key: string; label: string; feature: string | null }

const MAX_QUESTION = 200;
const MAX_ANSWER = 2000;
const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100";
const ghostBtn = "text-[12px] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500";

const EMPTY_ENTRY = { categoryId: "", question: "", answer: "", relatedIds: [] as string[], deepLink: "", isActive: true, markReviewed: false };

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return body.error ?? fallback;
}

export default function ChatbotFaqPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [deepLinks, setDeepLinks] = useState<DeepLinkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");

  // Question editor
  const [entryForm, setEntryForm] = useState({ ...EMPTY_ENTRY });
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");

  // Category editor
  const [categoryTitle, setCategoryTitle] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Loading ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/admin/organizations");
        if (!res.ok) throw new Error(await readError(res, "Could not load brands."));
        const list: Org[] = (await res.json()).organizations ?? [];
        setOrgs(list);
        // The assistant is a Wellness feature today, so open on Wellness.
        setOrgId((list.find((o) => o.slug === "wellness") ?? list[0])?.id ?? "");
      } catch (e: any) {
        setPageError(e.message ?? "Could not load brands.");
        setLoading(false);
      }
    })();
  }, []);

  const load = async (id = orgId) => {
    if (!id) return;
    setLoading(true);
    setPageError("");
    try {
      const res = await apiFetch(`/api/admin/faq?orgId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(await readError(res, "Could not load the FAQ."));
      const data = await res.json();
      setCategories(data.categories ?? []);
      setEntries(data.entries ?? []);
      setDeepLinks(data.deepLinks ?? []);
    } catch (e: any) {
      setPageError(e.message ?? "Could not load the FAQ.");
      setCategories([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (orgId) { setNotice(""); load(orgId); } }, [orgId]);

  const send = async (path: string, method: string, body?: object) => {
    const res = await apiFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify({ orgId, ...body }) : undefined,
    });
    if (!res.ok) throw new Error(await readError(res, "Something went wrong. Please try again."));
    return res.json().catch(() => ({}));
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const needsReview = entries.filter((e) => e.reviewNote);
  const term = search.trim().toLowerCase();
  const visibleEntries = (categoryId: string) =>
    entries
      .filter((e) => e.categoryId === categoryId)
      .filter((e) => !reviewOnly || e.reviewNote)
      .filter((e) => !term || `${e.question} ${e.answer}`.toLowerCase().includes(term));
  const deepLinkLabel = (key: string | null) => deepLinks.find((d) => d.key === key)?.label ?? null;
  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "this brand";

  // ── Actions ─────────────────────────────────────────────────────────────────
  const seedDefaults = async () => {
    setSeeding(true);
    setNotice("");
    try {
      const r = await send("/api/admin/faq/seed", "POST", {});
      setNotice(
        r.createdEntries
          ? `Loaded ${r.createdEntries} answers in ${r.createdCategories} categories. ${r.hiddenForReview} are hidden until you review them.`
          : "Everything in the defaults is already here — nothing was changed."
      );
      await load();
    } catch (e: any) {
      setPageError(e.message);
    } finally {
      setSeeding(false);
    }
  };

  const swapOrder = async (kind: "categories" | "entries", a: { id: string; order: number }, b: { id: string; order: number }) => {
    try {
      // Equal orders (e.g. after a bulk import) would make a swap a no-op.
      const [oa, ob] = a.order === b.order ? [b.order + 1, a.order] : [b.order, a.order];
      await send(`/api/admin/faq/${kind}/${a.id}`, "PUT", { order: oa });
      await send(`/api/admin/faq/${kind}/${b.id}`, "PUT", { order: ob });
      await load();
    } catch (e: any) {
      setPageError(e.message);
    }
  };

  const toggleCategory = async (c: Category) => {
    try { await send(`/api/admin/faq/categories/${c.id}`, "PUT", { isActive: !c.isActive }); await load(); }
    catch (e: any) { setPageError(e.message); }
  };

  const deleteCategory = async (c: Category) => {
    if (!window.confirm(`Delete the category “${c.title}”?`)) return;
    try {
      const res = await apiFetch(`/api/admin/faq/categories/${c.id}?orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Could not delete the category."));
      await load();
    } catch (e: any) { setPageError(e.message); }
  };

  const toggleEntry = async (e: Entry) => {
    // Publishing a flagged draft goes through the editor, where the review
    // note is shown and has to be acknowledged.
    if (!e.isActive && e.reviewNote) { openEditEntry(e); return; }
    try { await send(`/api/admin/faq/entries/${e.id}`, "PUT", { isActive: !e.isActive }); await load(); }
    catch (err: any) { setPageError(err.message); }
  };

  const deleteEntry = async (e: Entry) => {
    if (!window.confirm(`Delete “${e.question}”? It will also be removed from any related-question lists.`)) return;
    try {
      const res = await apiFetch(`/api/admin/faq/entries/${e.id}?orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Could not delete the question."));
      await load();
    } catch (err: any) { setPageError(err.message); }
  };

  // ── Editors ─────────────────────────────────────────────────────────────────
  const openNewEntry = (categoryId?: string) => {
    setEntryForm({ ...EMPTY_ENTRY, categoryId: categoryId ?? categories[0]?.id ?? "" });
    setEditingEntry(null); setFormError(""); setRelatedSearch(""); setShowEntryForm(true);
  };
  const openEditEntry = (e: Entry) => {
    setEntryForm({
      categoryId: e.categoryId, question: e.question, answer: e.answer, relatedIds: e.relatedIds ?? [],
      deepLink: e.deepLink ?? "", isActive: e.isActive, markReviewed: false,
    });
    setEditingEntry(e); setFormError(""); setRelatedSearch(""); setShowEntryForm(true);
  };

  const saveEntry = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const stillFlagged = !!editingEntry?.reviewNote && !entryForm.markReviewed;
    if (entryForm.isActive && stillFlagged) {
      setFormError("Tick “I've reviewed this answer” before making it visible to patients.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const body: any = {
        categoryId: entryForm.categoryId, question: entryForm.question, answer: entryForm.answer,
        relatedIds: entryForm.relatedIds, deepLink: entryForm.deepLink || null, isActive: entryForm.isActive,
      };
      if (editingEntry && entryForm.markReviewed) body.reviewNote = null;
      if (editingEntry) await send(`/api/admin/faq/entries/${editingEntry.id}`, "PUT", body);
      else await send("/api/admin/faq/entries", "POST", body);
      setShowEntryForm(false);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openCategoryForm = (c?: Category) => {
    setEditingCategory(c ?? null); setCategoryTitle(c?.title ?? ""); setFormError(""); setShowCategoryForm(true);
  };
  const saveCategory = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true); setFormError("");
    try {
      if (editingCategory) await send(`/api/admin/faq/categories/${editingCategory.id}`, "PUT", { title: categoryTitle });
      else await send("/api/admin/faq/categories", "POST", { title: categoryTitle });
      setShowCategoryForm(false);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRelated = (id: string) =>
    setEntryForm((f) => ({
      ...f,
      relatedIds: f.relatedIds.includes(id) ? f.relatedIds.filter((r) => r !== id) : [...f.relatedIds, id].slice(0, 6),
    }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Chatbot FAQ</h1>
            <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
              Questions and answers patients can tap through in the assistant and in Help and Support. The assistant
              also answers typed questions about the app from these answers only, so patients are told exactly what is
              written here.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openCategoryForm()}
              disabled={!orgId}
              className="border border-slate-200 bg-white text-slate-700 text-[13px] font-semibold px-5 py-3 rounded-xl whitespace-nowrap disabled:opacity-40"
            >
              Add category
            </button>
            <button
              onClick={() => openNewEntry()}
              disabled={!categories.length}
              className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl whitespace-nowrap shadow-[0_4px_10px_rgba(84,118,252,0.2)] disabled:opacity-40"
            >
              Add question
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="faq-org" className="text-[13px] text-slate-500">Brand</label>
          <select
            id="faq-org"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] bg-white"
          >
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input
            id="faq-search"
            type="text"
            placeholder="Search questions and answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm pl-4 pr-4 py-2.5 rounded-full border border-slate-100 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
          />
        </div>

        {pageError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-[13px]">{pageError}</div>}
        {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-[13px]">{notice}</div>}

        {needsReview.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[13px] text-amber-900">
              <span className="font-semibold">{needsReview.length} {needsReview.length === 1 ? "answer needs" : "answers need"} review.</span>{" "}
              They describe policy the system can't confirm, such as refunds, so they stay hidden from patients until
              someone checks them.
            </p>
            <button onClick={() => setReviewOnly((v) => !v)} className="text-[12px] font-semibold text-amber-900 underline whitespace-nowrap">
              {reviewOnly ? "Show all questions" : "Show only these"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 && !pageError ? (
          <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-10 text-center flex flex-col items-center gap-3">
            <h2 className="text-[18px] font-medium text-[#1e293b]">No FAQ for {orgName} yet</h2>
            <p className="text-[13px] text-slate-500 max-w-lg">
              Load the default answers to start from. They cover accounts, appointments, video consultations, orders,
              family profiles and more, for the features {orgName} has turned on. Answers about policy, such as refunds,
              come in hidden so you can check them first. Everything can be edited afterwards.
            </p>
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl mt-2 disabled:opacity-50"
            >
              {seeding ? "Loading..." : "Load default FAQ"}
            </button>
          </div>
        ) : (
          categories.map((c, ci) => {
            const list = visibleEntries(c.id);
            if ((term || reviewOnly) && list.length === 0) return null;
            const all = entries.filter((e) => e.categoryId === c.id);
            return (
              <section key={c.id} className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[18px] font-medium text-[#1e293b]">{c.title}</h2>
                    <span className="text-[11px] text-slate-400">{all.length} {all.length === 1 ? "question" : "questions"}</span>
                    {!c.isActive && <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5">Hidden</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <button className={ghostBtn} disabled={ci === 0} onClick={() => swapOrder("categories", c, categories[ci - 1])} aria-label="Move category up">↑</button>
                    <button className={ghostBtn} disabled={ci === categories.length - 1} onClick={() => swapOrder("categories", c, categories[ci + 1])} aria-label="Move category down">↓</button>
                    <button className="text-[12px] font-medium text-[#5476FC] hover:underline" onClick={() => openNewEntry(c.id)}>Add question</button>
                    <button className={ghostBtn} onClick={() => openCategoryForm(c)}>Rename</button>
                    <button className={ghostBtn} onClick={() => toggleCategory(c)}>{c.isActive ? "Hide" : "Show"}</button>
                    <button className={ghostBtn} disabled={all.length > 0} title={all.length ? "Move or delete its questions first" : undefined} onClick={() => deleteCategory(c)}>Delete</button>
                  </div>
                </div>

                {list.length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-2">No questions in this category yet.</p>
                ) : (
                  <ul className="flex flex-col">
                    {list.map((e) => {
                      const siblings = all;
                      const idx = siblings.findIndex((s) => s.id === e.id);
                      return (
                        <li key={e.id} className="border-t border-slate-50 py-4 flex flex-col lg:flex-row gap-3 lg:items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold text-slate-800">{e.question}</p>
                              {!e.isActive && <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5">Hidden</span>}
                              {e.reviewNote && <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full px-2.5 py-0.5">Needs review</span>}
                            </div>
                            <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">{e.answer}</p>
                            {e.reviewNote && <p className="text-[12px] text-amber-800 mt-1.5">{e.reviewNote}</p>}
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              {deepLinkLabel(e.deepLink) ? `Opens: ${deepLinkLabel(e.deepLink)}` : "No screen link"}
                              {" · "}
                              {e.relatedIds?.length ? `${e.relatedIds.length} related` : "No related questions"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 whitespace-nowrap">
                            <button className={ghostBtn} disabled={idx <= 0} onClick={() => swapOrder("entries", e, siblings[idx - 1])} aria-label="Move question up">↑</button>
                            <button className={ghostBtn} disabled={idx >= siblings.length - 1} onClick={() => swapOrder("entries", e, siblings[idx + 1])} aria-label="Move question down">↓</button>
                            <button className="text-[12px] font-medium text-[#5476FC] hover:underline" onClick={() => openEditEntry(e)}>Edit</button>
                            <button className={ghostBtn} onClick={() => toggleEntry(e)}>{e.isActive ? "Hide" : e.reviewNote ? "Review & show" : "Show"}</button>
                            <button className={ghostBtn} onClick={() => deleteEntry(e)}>Delete</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })
        )}

        {/* ── Question editor ─────────────────────────────────────────── */}
        {showEntryForm && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowEntryForm(false)}>
            <form
              onSubmit={saveEntry}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-[640px] max-h-[90vh] overflow-y-auto flex flex-col gap-3"
            >
              <h2 className="text-[16px] font-semibold text-slate-800">{editingEntry ? "Edit question" : "Add question"}</h2>
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{formError}</div>}

              {editingEntry?.reviewNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-900 flex flex-col gap-2">
                  <p><span className="font-semibold">Why this needs review:</span> {editingEntry.reviewNote}</p>
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      id="faq-mark-reviewed"
                      type="checkbox"
                      checked={entryForm.markReviewed}
                      onChange={(e) => setEntryForm({ ...entryForm, markReviewed: e.target.checked })}
                    />
                    I&apos;ve reviewed this answer and it reflects our actual policy
                  </label>
                </div>
              )}

              <label htmlFor="faq-category" className="text-[12px] font-medium text-slate-600">Category</label>
              <select id="faq-category" required value={entryForm.categoryId} onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })} className={inputCls}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>

              <label htmlFor="faq-question" className="text-[12px] font-medium text-slate-600">Question</label>
              <input
                id="faq-question"
                required
                maxLength={MAX_QUESTION}
                placeholder="How do I cancel an appointment?"
                value={entryForm.question}
                onChange={(e) => setEntryForm({ ...entryForm, question: e.target.value })}
                className={inputCls}
              />

              <label htmlFor="faq-answer" className="text-[12px] font-medium text-slate-600 flex justify-between">
                <span>Answer</span>
                <span className="font-normal text-slate-400 tabular-nums">{entryForm.answer.length} / {MAX_ANSWER}</span>
              </label>
              <textarea
                id="faq-answer"
                required
                maxLength={MAX_ANSWER}
                rows={5}
                placeholder="Use the button and screen names patients see in the app."
                value={entryForm.answer}
                onChange={(e) => setEntryForm({ ...entryForm, answer: e.target.value })}
                className={inputCls}
              />

              <label htmlFor="faq-deeplink" className="text-[12px] font-medium text-slate-600">“Open this screen” button (optional)</label>
              <select id="faq-deeplink" value={entryForm.deepLink} onChange={(e) => setEntryForm({ ...entryForm, deepLink: e.target.value })} className={inputCls}>
                <option value="">No button</option>
                {deepLinks.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}{d.feature ? ` (shown only if ${d.feature.replace(/_/g, " ")} is enabled)` : ""}</option>
                ))}
              </select>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[12px] font-medium text-slate-600">Related questions ({entryForm.relatedIds.length}/6)</span>
                <input
                  id="faq-related-search"
                  placeholder="Filter..."
                  value={relatedSearch}
                  onChange={(e) => setRelatedSearch(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] w-40"
                />
              </div>
              <div className="border border-slate-100 rounded-xl max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
                {entries
                  .filter((e) => e.id !== editingEntry?.id)
                  .filter((e) => !relatedSearch.trim() || e.question.toLowerCase().includes(relatedSearch.trim().toLowerCase()))
                  .map((e) => (
                    <label key={e.id} className="flex items-start gap-2 text-[12px] text-slate-700 px-1.5 py-1 rounded hover:bg-slate-50">
                      <input type="checkbox" className="mt-0.5" checked={entryForm.relatedIds.includes(e.id)} onChange={() => toggleRelated(e.id)} />
                      <span>
                        {e.question}
                        {!e.isActive && <span className="text-slate-400"> (hidden)</span>}
                      </span>
                    </label>
                  ))}
                {entries.length <= 1 && <p className="text-[12px] text-slate-400 p-1.5">No other questions yet.</p>}
              </div>
              {entryForm.relatedIds.some((id) => !byId.get(id)?.isActive) && (
                <p className="text-[11px] text-slate-400">Hidden questions are linked but won&apos;t show to patients until they&apos;re made visible.</p>
              )}

              <label className="flex items-center gap-2 text-[13px] text-slate-700 mt-1">
                <input id="faq-visible" type="checkbox" checked={entryForm.isActive} onChange={(e) => setEntryForm({ ...entryForm, isActive: e.target.checked })} />
                Visible to patients
              </label>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowEntryForm(false)} className="flex-1 border border-slate-200 text-slate-600 text-[13px] font-medium py-2.5 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Category editor ─────────────────────────────────────────── */}
        {showCategoryForm && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCategoryForm(false)}>
            <form onSubmit={saveCategory} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-[420px] flex flex-col gap-3">
              <h2 className="text-[16px] font-semibold text-slate-800">{editingCategory ? "Rename category" : "Add category"}</h2>
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{formError}</div>}
              <input
                id="faq-category-title"
                required
                maxLength={80}
                placeholder="e.g. Appointments"
                value={categoryTitle}
                onChange={(e) => setCategoryTitle(e.target.value)}
                className={inputCls}
              />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowCategoryForm(false)} className="flex-1 border border-slate-200 text-slate-600 text-[13px] font-medium py-2.5 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-medium py-2.5 rounded-lg disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
