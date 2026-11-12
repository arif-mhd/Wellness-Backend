"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function adminFetch(path: string, options?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

type QuestionType = "text" | "single" | "multi" | "yesno" | "scale";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
}

interface Template {
  id: string;
  name: string;
  keywords: string[];
  questions: Question[];
  isDefault?: boolean;
  is_active: boolean;
}

const TYPE_LABEL: Record<QuestionType, string> = {
  text: "Free text",
  single: "Pick one",
  multi: "Pick several",
  yesno: "Yes / No",
  scale: "Scale 1-10",
};

// A question while it is being edited: options live as one-per-line text.
interface DraftQuestion {
  id: string;
  label: string;
  type: QuestionType;
  optionsText: string;
  required: boolean;
}

interface Draft {
  name: string;
  keywordsText: string;
  questions: DraftQuestion[];
}

const emptyQuestion = (): DraftQuestion => ({ id: "", label: "", type: "text", optionsText: "", required: false });
const EMPTY: Draft = { name: "", keywordsText: "", questions: [emptyQuestion()] };

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100";

export default function PrevisitFormsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keyword tester
  const [testReason, setTestReason] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await adminFetch("/api/admin/previsit-templates");
      const d = await r.json();
      setTemplates(Array.isArray(d) ? d : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setDraft({ ...EMPTY, questions: [emptyQuestion()] }); setEditing(null); setError(""); setShowForm(true); };
  const openEdit = (t: Template) => {
    setDraft({
      name: t.name,
      keywordsText: t.keywords.join(", "),
      questions: t.questions.map((q) => ({
        id: q.id, label: q.label, type: q.type, optionsText: (q.options ?? []).join("\n"), required: !!q.required,
      })),
    });
    setEditing(t); setError(""); setShowForm(true);
  };

  const updateQuestion = (i: number, patch: Partial<DraftQuestion>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }));
  const moveQuestion = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.questions.length) return d;
      const qs = [...d.questions];
      [qs[i], qs[j]] = [qs[j], qs[i]];
      return { ...d, questions: qs };
    });
  const removeQuestion = (i: number) =>
    setDraft((d) => ({ ...d, questions: d.questions.filter((_, idx) => idx !== i) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        name: draft.name,
        keywords: draft.keywordsText.split(",").map((k) => k.trim()).filter(Boolean),
        questions: draft.questions.map((q) => ({
          id: q.id || undefined,
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.type === "single" || q.type === "multi"
            ? q.optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
            : undefined,
        })),
      };
      const res = await adminFetch(editing ? `/api/admin/previsit-templates/${editing.id}` : "/api/admin/previsit-templates", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save.");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    const res = await adminFetch(`/api/admin/previsit-templates/${id}/toggle`, { method: "PATCH" });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? "Failed."); return; }
    load();
  };

  const remove = async (t: Template) => {
    if (!confirm(`Delete the "${t.name}" form? Patients whose visit reason matched it will get a different form.`)) return;
    const res = await adminFetch(`/api/admin/previsit-templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? "Failed to delete."); return; }
    load();
  };

  const runTest = async () => {
    if (!testReason.trim()) return;
    setTestResult(null);
    try {
      const res = await adminFetch("/api/admin/previsit-templates/preview", { method: "POST", body: JSON.stringify({ reason: testReason }) });
      const d = await res.json();
      setTestResult(d.matched ? `Matches: ${d.matched.name}` : d.note ?? "No match.");
    } catch {
      setTestResult("Could not run the test.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="w-full pb-12 font-sans flex flex-col gap-6">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-medium text-[#1e293b] tracking-tight">Pre-visit Forms</h1>
            <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
              The questions a patient answers before a consultation depend on the reason they gave when booking. Each form
              below is matched by its keywords. If no form matches, the patient gets AI-written questions for their reason,
              or the General form if that isn&apos;t available.
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-gradient-to-b from-[#8AA0FF] to-[#5476FC] text-white text-[13px] font-semibold px-6 py-3 rounded-xl whitespace-nowrap shadow-[0_4px_10px_rgba(84,118,252,0.2)]"
          >
            Add Form
          </button>
        </div>

        {/* Keyword tester */}
        <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-6">
          <h2 className="text-[15px] font-medium text-[#1e293b]">Test a visit reason</h2>
          <p className="text-[12px] text-slate-500 mt-1 mb-3">Type what a patient might write, to see which form they would get.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={testReason}
              onChange={(e) => { setTestReason(e.target.value); setTestResult(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") runTest(); }}
              placeholder="e.g. stomach pain since yesterday"
              className={`${inputCls} sm:max-w-md`}
            />
            <button onClick={runTest} disabled={!testReason.trim()} className="bg-[#5476FC] text-white text-[13px] font-semibold px-6 py-2.5 rounded-xl disabled:opacity-40">
              Test
            </button>
          </div>
          {testResult && <p className="text-[13px] text-slate-700 mt-3 font-medium">{testResult}</p>}
        </div>

        <div className="bg-white rounded-[2rem] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100 p-7">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#6A8BFF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-12">No forms yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[12px] font-semibold text-slate-800">
                    <th className="pb-4 pl-2">Form</th>
                    <th className="pb-4">Matches reasons containing</th>
                    <th className="pb-4 text-center">Questions</th>
                    <th className="pb-4 text-center">Status</th>
                    <th className="pb-4" />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0 align-top">
                      <td className="py-4 pl-2 text-[13px] font-semibold text-slate-800">
                        {t.name}
                        {t.isDefault && <span className="ml-2 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">Fallback</span>}
                      </td>
                      <td className="py-4 pr-4 text-[12px] text-slate-500 max-w-[420px]">
                        {t.isDefault ? "Anything not matched by another form" : t.keywords.join(", ")}
                      </td>
                      <td className="py-4 text-[12px] text-slate-500 text-center">{t.questions.length}</td>
                      <td className={`py-4 text-[12px] font-medium text-center ${t.is_active ? "text-[#1FAF65]" : "text-slate-400"}`}>
                        {t.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="py-4 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(t)} className="text-[12px] font-medium text-[#5476FC] hover:underline mr-4">Edit</button>
                        {!t.isDefault && (
                          <>
                            <button onClick={() => toggle(t.id)} className="text-[12px] font-medium text-slate-500 hover:underline mr-4">
                              {t.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => remove(t)} className="text-[12px] font-medium text-red-500 hover:underline">Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <form
              onSubmit={save}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-[640px] max-h-[90vh] overflow-y-auto flex flex-col gap-3"
            >
              <h2 className="text-[16px] font-semibold text-slate-800">{editing ? `Edit "${editing.name}"` : "Add Pre-visit Form"}</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs text-center">{error}</div>}

              <input required placeholder="Form name (e.g. Stomach & digestive)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />

              {!editing?.isDefault && (
                <>
                  <textarea
                    placeholder="Keywords, separated by commas (e.g. stomach, abdominal pain, nausea, vomiting)"
                    value={draft.keywordsText}
                    onChange={(e) => setDraft({ ...draft, keywordsText: e.target.value })}
                    className={inputCls}
                    rows={2}
                  />
                  <p className="text-[11px] text-slate-400 -mt-1">
                    A patient&apos;s visit reason gets this form when it contains one of these words or phrases. If several forms match, the one with the most specific match wins.
                  </p>
                </>
              )}

              <div className="flex items-center justify-between mt-2">
                <h3 className="text-[13px] font-semibold text-slate-800">Questions</h3>
                <span className="text-[11px] text-slate-400">{draft.questions.length} of 20</span>
              </div>

              {draft.questions.map((q, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3 flex flex-col gap-2 bg-slate-50/50">
                  <div className="flex gap-2">
                    <input
                      required
                      placeholder={`Question ${i + 1}`}
                      value={q.label}
                      onChange={(e) => updateQuestion(i, { label: e.target.value })}
                      className={inputCls}
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(i, { type: e.target.value as QuestionType })}
                      className="border border-slate-200 rounded-xl px-2 text-[12px] bg-white"
                    >
                      {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </div>
                  {(q.type === "single" || q.type === "multi") && (
                    <textarea
                      placeholder={"Options, one per line\nMild\nModerate\nSevere"}
                      value={q.optionsText}
                      onChange={(e) => updateQuestion(i, { optionsText: e.target.value })}
                      className={inputCls}
                      rows={4}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[12px] text-slate-600">
                      <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, { required: e.target.checked })} />
                      Required
                    </label>
                    <div className="flex items-center gap-3 text-[12px]">
                      <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-slate-800 disabled:opacity-30">Up</button>
                      <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === draft.questions.length - 1} className="text-slate-500 hover:text-slate-800 disabled:opacity-30">Down</button>
                      <button type="button" onClick={() => removeQuestion(i)} disabled={draft.questions.length === 1} className="text-red-500 hover:underline disabled:opacity-30">Remove</button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, questions: [...d.questions, emptyQuestion()] }))}
                disabled={draft.questions.length >= 20}
                className="text-[13px] font-medium text-[#5476FC] border border-dashed border-[#5476FC]/40 rounded-xl py-2.5 hover:bg-blue-50/40 disabled:opacity-40"
              >
                + Add question
              </button>
              <p className="text-[11px] text-slate-400">
                Tip: questions with the ids <code>conditions</code>, <code>medications</code>, <code>severity</code>, <code>duration</code>, <code>location</code>,
                <code> symptoms</code> and <code>allergies</code> also fill the matching fields the doctor already sees. The default forms use them.
              </p>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 text-[13px] font-medium py-2.5 rounded-lg">Cancel</button>
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
