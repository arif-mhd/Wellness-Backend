"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import AddMedicines, { Medicine } from "@/components/video-call/AddMedicines";

interface Eligibility { eligible: boolean; reason?: string; deadline?: string | null; medicines: Medicine[]; clinicId?: string | null }
export default function PostConsultationPrescription({ appointmentId, onSaved }: { appointmentId: string; onSaved?: (medicines: Medicine[]) => void }) {
  const [info, setInfo] = useState<Eligibility | null>(null);
  const [draft, setDraft] = useState<Medicine[]>([]);
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
      } catch (err: any) { if (active) setError(err.message); }
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
    if (inFlight.current || (!pending.current && (draft.length === 0 || expired))) return;
    inFlight.current = true; setSaving(true); setError(""); setMessage("");
    // Keep the exact same payload for an ambiguous result (lost response).
    // Do not let edits turn a retry into a second prescription addition.
    if (!pending.current) pending.current = JSON.stringify({ requestId: crypto.randomUUID(), medicines: draft });
    try {
      const res = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: pending.current });
      const data = await res.json();
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) { pending.current = null; setUncertain(false); }
        else setUncertain(true);
        throw new Error(data.error || "Could not save additions.");
      }
      pending.current = null; setUncertain(false); setDraft([]);
      setInfo(prev => prev ? { ...prev, medicines: data.medicines ?? prev.medicines } : prev);
      onSaved?.(data.medicines ?? info?.medicines ?? []);
      setMessage(data.notificationPending ? "Medicines saved. Patient notification is queued for retry." : "Medicines saved. Patient notification created.");
    } catch (err: any) { if (pending.current) setUncertain(true); setError(err.message || "Could not save additions. Retry with the same medicines."); }
    finally { inFlight.current = false; setSaving(false); }
  };

  return <section className="rounded-xl border border-[#EBEEF5] p-4 space-y-3" aria-label="Post-consultation prescription">
    <h3 className="text-sm font-semibold">Prescription additions</h3>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {!info && !error && <p className="text-sm">Loading prescription…</p>}
    {info && <>
      {info.medicines.length > 0 && <div><p className="text-xs font-semibold">Existing prescription (read-only)</p><ul className="list-disc pl-5 text-sm">{info.medicines.map((m, i) => <li key={m.id ?? i}>{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</li>)}</ul></div>}
      {(!info.eligible || expired) && !uncertain ? <p className="text-sm text-gray-600">{expired ? "The 24-hour window has ended." : info.reason}</p> : <>
        <p className="text-xs text-gray-600">Only new medicines can be added, within 24 hours of completion. Existing medicines and placed orders will not change.</p>
        {info.deadline && <p className="text-xs text-gray-600">Additions close: {new Date(info.deadline).toLocaleString()}</p>}
        {!saving && !uncertain && <AddMedicines medicines={draft} onChange={setDraft} clinicId={info.clinicId ?? undefined} />}
        {uncertain && <p className="text-xs">The save result is unconfirmed. Retry the same request before making more additions.</p>}
        <button type="button" onClick={save} disabled={saving || (!uncertain && (draft.length === 0 || expired))} className="rounded-lg bg-[#5476FC] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : uncertain ? "Retry saving" : "Save additions & notify patient"}</button>
      </>}
    </>}
  </section>;
}
