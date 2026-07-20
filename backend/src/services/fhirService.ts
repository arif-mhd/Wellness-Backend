import { fhirSearch, fhirGetResource } from "./fhirClient";

function humanName(name: any[] = []): string {
  const n = name[0];
  if (!n) return "Unknown";
  return [n.prefix?.join(" "), n.given?.join(" "), n.family].filter(Boolean).join(" ");
}

function normalizePatient(p: any) {
  return {
    fhirId: p.id,
    name: humanName(p.name),
    gender: p.gender,
    birthDate: p.birthDate,
    identifiers: (p.identifier ?? []).map((i: any) => ({ system: i.system, value: i.value })),
  };
}

export async function searchFhirPatients(params: { given?: string; family?: string; identifier?: string }) {
  const resources = await fhirSearch("Patient", {
    given: params.given,
    family: params.family,
    identifier: params.identifier,
    _count: 10,
  });
  return resources.map(normalizePatient);
}

export async function getFhirPatient(fhirId: string) {
  return normalizePatient(await fhirGetResource("Patient", fhirId));
}

export async function getFhirEncounters(fhirId: string) {
  const resources = await fhirSearch("Encounter", { patient: fhirId, _sort: "-date", _count: 20 });
  return resources.map((e) => ({
    fhirId: e.id,
    status: e.status,
    type: e.type?.[0]?.text || e.type?.[0]?.coding?.[0]?.display || null,
    reason: e.reasonCode?.[0]?.text || e.reasonCode?.[0]?.coding?.[0]?.display || null,
    start: e.period?.start || null,
    end: e.period?.end || null,
    practitioner: e.participant?.[0]?.individual?.display || null,
  }));
}

function narrativeText(div?: string): string {
  if (!div) return "";
  return div.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function getFhirNotes(fhirId: string) {
  const [docs, compositions] = await Promise.all([
    fhirSearch("DocumentReference", { patient: fhirId, _count: 20 }),
    fhirSearch("Composition", { patient: fhirId, _count: 20 }),
  ]);

  const docNotes = docs.map((d) => {
    const attachment = d.content?.[0]?.attachment;
    let text = "";
    if (attachment?.data) {
      try {
        text = Buffer.from(attachment.data, "base64").toString("utf-8");
      } catch {
        text = "";
      }
    }
    return {
      fhirId: d.id,
      resourceType: "DocumentReference" as const,
      title: d.description || d.type?.text || d.type?.coding?.[0]?.display || "Clinical Document",
      date: d.date || null,
      status: d.status,
      text,
      contentType: attachment?.contentType || null,
      url: attachment?.url || null,
    };
  });

  const compositionNotes = compositions.map((c) => ({
    fhirId: c.id,
    resourceType: "Composition" as const,
    title: c.title || c.type?.text || "Clinical Note",
    date: c.date || null,
    status: c.status,
    text: (c.section ?? [])
      .map((s: any) => `${s.title ? s.title + ": " : ""}${narrativeText(s.text?.div)}`)
      .filter(Boolean)
      .join("\n\n"),
    contentType: "text/plain",
    url: null,
  }));

  return [...docNotes, ...compositionNotes].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export async function getFhirObservations(fhirId: string) {
  const resources = await fhirSearch("Observation", { patient: fhirId, _sort: "-date", _count: 30 });
  return resources.map((o) => ({
    fhirId: o.id,
    status: o.status,
    code: o.code?.text || o.code?.coding?.[0]?.display || "Observation",
    value: o.valueQuantity
      ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ""}`.trim()
      : o.valueString ?? o.valueCodeableConcept?.text ?? "",
    date: o.effectiveDateTime || o.issued || null,
  }));
}

export async function getFhirContext(fhirId: string) {
  const [conditions, medications] = await Promise.all([
    fhirSearch("Condition", { patient: fhirId, _count: 20 }),
    fhirSearch("MedicationRequest", { patient: fhirId, _count: 20 }),
  ]);

  return {
    conditions: conditions.map((c) => ({
      fhirId: c.id,
      text: c.code?.text || c.code?.coding?.[0]?.display || "Condition",
      clinicalStatus: c.clinicalStatus?.coding?.[0]?.code || null,
      onset: c.onsetDateTime || null,
    })),
    medications: medications.map((m) => ({
      fhirId: m.id,
      text: m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || "Medication",
      status: m.status,
      authoredOn: m.authoredOn || null,
    })),
  };
}
