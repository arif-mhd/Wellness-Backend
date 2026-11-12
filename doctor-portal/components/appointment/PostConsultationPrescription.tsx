"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import AddMedicines, { Medicine } from "@/components/video-call/AddMedicines";

interface Eligibility { eligible: boolean; reason?: string; deadline?: string | null; medicines: Medicine[]; clinicId?: string | null }
export default function PostConsultationPrescription({ appointmentId, onSaved, initialMedicines = [] }: { appointmentId: string; onSaved?: (medicines: Medicine[]) => void; initialMedicines?: Medicine[] }) {
  const initial = useRef(initialMedicines);
  const [info, setInfo] = useState<Eligibility | null>(null);
  const [draft, setDraft] = useState<Medicine[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [expired, setExpired] = useState(false);
  const pending = useRef<string | null>(null);
  const inFlight = useRef(false);
  const path = `/api/appointments/${encodeURIComponent(appointmentId)}/prescription-additions`;
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch(path); const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load prescription.");
        if (active) setInfo(data);
      } catch (err: any) { if (active) { setError(err.message); setInfo({ eligible: false, medicines: initial.current }); } }
    })();
    return () => { active = false; };
  }, [path]);
  useEffect(() => {
    if (!info?.deadline || !info.eligible) return;
    const remaining = Date.parse(info.deadline) - Date.now();
    if (remaining <= 0) { setExpired(true); return; }
    const timer = window.setTimeout(() => setExpired(true), Math.min(remaining, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [info]);

  const save = async () => {
    if (inFlight.current || (!pending.current && ((!draft.length && !removed.length) || expired || !info?.eligible))) return;
    inFlight.current = true; setSaving(true); setError(""); setMessage("");
    // Keep the exact same payload for an ambiguous result (lost response).
    // Do not let edits turn a retry into a second prescription addition.
    if (!pending.current) pending.current = JSON.stringify({ requestId: crypto.randomUUID(), medicines: draft, removeMedicineIds: removed });
    try {
      const res = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: pending.current });
      const data = await res.json();
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) { pending.current = null; setUncertain(false); }
        else setUncertain(true);
        throw new Error(data.error || "Could not save additions.");
      }
      pending.current = null; setUncertain(false); setDraft([]); setRemoved([]); setShowEditor(false);
      setInfo(prev => prev ? { ...prev, medicines: data.medicines ?? prev.medicines } : prev);
      onSaved?.(data.medicines ?? info?.medicines ?? []);
      setMessage(data.notificationPending ? "Medicines saved. Patient notification is queued for retry." : "Medicines saved. Patient notification created.");
    } catch (err: any) { if (pending.current) setUncertain(true); setError(err.message || "Could not save additions. Retry with the same medicines."); }
    finally { inFlight.current = false; setSaving(false); }
  };

  return <section className="rounded-xl border border-[#EBEEF5] p-4 space-y-3" aria-label="Post-consultation prescription">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">Medicines</h3>
      {info?.eligible && !expired && <button type="button" disabled={saving || uncertain} onClick={() => setShowEditor(true)} className="rounded-lg bg-[#E0E7FF] px-3 py-2 text-sm text-[#182A6F] disabled:opacity-50">Add Medicine</button>}
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {!info && !error && <p className="text-sm">Loading prescription…</p>}
    {info && <>
      <div className="space-y-3">
        {info.medicines.map((m, i) => <div key={m.id ?? i} className="rounded-xl bg-[#F5F6FA] p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className={removed.includes(m.id) ? "line-through text-gray-400" : ""}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</span>
            {info.eligible && !expired && <button type="button" disabled={saving || uncertain || !m.id} aria-label={`${removed.includes(m.id) ? "Undo removal of" : "Remove"} ${m.name}`} onClick={() => setRemoved(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} className="text-red-600 disabled:opacity-50">{removed.includes(m.id) ? "Undo" : "Remove"}</button>}
          </div>
          <p className="text-[#5476FC]">{[m.timing, m.frequency].filter(Boolean).join(" · ")}</p>
          {m.instructions && <p>Notes: {m.instructions}</p>}
          {m.contributorName && <p className="italic text-[#5476FC]">By Dr. {m.contributorName}</p>}
          {removed.includes(m.id) && <p>Will be removed when you save changes.</p>}
        </div>)}
        {!info.medicines.length && <p className="text-xs text-gray-500">No medicines prescribed for this consultation.</p>}
      </div>
      {(!info.eligible || expired) && !uncertain ? <p className="text-sm text-gray-600">{expired ? "The 24-hour window has ended." : info.reason}</p> : <>
        <p className="text-xs text-gray-600">Add or remove medicines for this consultation within 24 hours of completion. Removing a medicine does not cancel or change an existing pharmacy order.</p>
        {info.deadline && <p className="text-xs text-gray-600">Changes close: {new Date(info.deadline).toLocaleString()}</p>}
        {showEditor && !saving && !uncertain && <AddMedicines medicines={draft} onChange={setDraft} clinicId={info.clinicId ?? undefined} />}
        {uncertain && <p className="text-xs">The save result is unconfirmed. Retry the same request before making more additions.</p>}
        <button type="button" onClick={save} disabled={saving || (!uncertain && ((!draft.length && !removed.length) || expired))} className="rounded-lg bg-[#5476FC] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : uncertain ? "Retry saving" : "Save changes & notify patient"}</button>
      </>}
    </>}
  </section>;
}
