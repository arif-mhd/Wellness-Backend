/**
 * Creates a small set of demo resources (Patient, Practitioner, Encounter,
 * Observations, Composition, DocumentReference) on the public HAPI R4 FHIR
 * sandbox, then links one local patient to the resulting FHIR Patient id
 * via the fhirPatientId field. This gives us a reliable demo patient
 * instead of depending on the sandbox's noisy public test data.
 *
 * Run once:  npx ts-node-dev --transpile-only src/data/seedFhirDemo.ts [patientEmail]
 * (omit the email to link the first patient found in Cosmos)
 * Safe to re-run — creates a fresh set of FHIR resources each time.
 */

import "dotenv/config";
import { patientsContainer } from "../config/cosmos";
import { FHIR_BASE_URL } from "../config/fhir";

async function fhirPost(resourceType: string, resource: any): Promise<any> {
  const res = await fetch(`${FHIR_BASE_URL}/${resourceType}`, {
    method: "POST",
    headers: { "Content-Type": "application/fhir+json" },
    body: JSON.stringify(resource),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to create ${resourceType}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const targetEmail = process.argv[2];

  console.log(`Seeding demo FHIR resources on ${FHIR_BASE_URL} ...`);

  const patient = await fhirPost("Patient", {
    resourceType: "Patient",
    identifier: [{ system: "urn:teleconsult:demo", value: "DEMO-001" }],
    name: [{ family: "Hassan", given: ["Layla"] }],
    gender: "female",
    birthDate: "1990-04-12",
  });
  console.log(`  Patient created: ${patient.id}`);

  const practitioner = await fhirPost("Practitioner", {
    resourceType: "Practitioner",
    name: [{ family: "Al Farsi", given: ["Omar"], prefix: ["Dr."] }],
  });
  console.log(`  Practitioner created: ${practitioner.id}`);

  const encounter = await fhirPost("Encounter", {
    resourceType: "Encounter",
    status: "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
    subject: { reference: `Patient/${patient.id}` },
    participant: [{ individual: { reference: `Practitioner/${practitioner.id}`, display: "Dr. Omar Al Farsi" } }],
    period: { start: "2026-05-10T09:00:00Z", end: "2026-05-10T09:30:00Z" },
    reasonCode: [{ text: "Follow-up for hypertension" }],
  });
  console.log(`  Encounter created: ${encounter.id}`);

  await fhirPost("Observation", {
    resourceType: "Observation",
    status: "final",
    code: { text: "Blood Pressure Systolic" },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    effectiveDateTime: "2026-05-10T09:05:00Z",
    valueQuantity: { value: 138, unit: "mmHg" },
  });

  await fhirPost("Observation", {
    resourceType: "Observation",
    status: "final",
    code: { text: "Heart Rate" },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    effectiveDateTime: "2026-05-10T09:05:00Z",
    valueQuantity: { value: 76, unit: "beats/minute" },
  });
  console.log("  Observations created (BP, Heart Rate)");

  const noteText =
    "Patient presents for hypertension follow-up. BP improved from prior visit (was 152/95, now 138/88). " +
    "Reports good adherence to Amlodipine 5mg. No new symptoms. Continue current regimen, recheck in 3 months.";

  await fhirPost("Composition", {
    resourceType: "Composition",
    status: "final",
    type: { text: "Progress Note" },
    subject: { reference: `Patient/${patient.id}` },
    encounter: { reference: `Encounter/${encounter.id}` },
    date: "2026-05-10T09:30:00Z",
    author: [{ reference: `Practitioner/${practitioner.id}`, display: "Dr. Omar Al Farsi" }],
    title: "Hypertension Follow-up — Progress Note",
    section: [
      {
        title: "Assessment & Plan",
        text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${noteText}</div>` },
      },
    ],
  });
  console.log("  Composition (progress note) created");

  await fhirPost("DocumentReference", {
    resourceType: "DocumentReference",
    status: "current",
    type: { text: "Clinical Note" },
    subject: { reference: `Patient/${patient.id}` },
    context: { encounter: [{ reference: `Encounter/${encounter.id}` }] },
    date: "2026-05-10T09:30:00Z",
    description: "Hypertension Follow-up — Progress Note",
    content: [
      {
        attachment: {
          contentType: "text/plain",
          data: Buffer.from(noteText, "utf-8").toString("base64"),
        },
      },
    ],
  });
  console.log("  DocumentReference created");

  // ── Link to a local patient ──────────────────────────────────────────────
  let targetPatient: any = null;
  if (targetEmail) {
    const { resources } = await patientsContainer.items
      .query({ query: "SELECT * FROM c WHERE c.email = @email", parameters: [{ name: "@email", value: targetEmail }] })
      .fetchAll();
    targetPatient = resources[0] ?? null;
  } else {
    const { resources } = await patientsContainer.items.query({ query: "SELECT TOP 1 * FROM c" }).fetchAll();
    targetPatient = resources[0] ?? null;
  }

  if (!targetPatient) {
    console.warn("\n⚠️  No local patient found to link. Set fhirPatientId manually on a patient doc:");
    console.warn(`    fhirPatientId = "${patient.id}"`);
    return;
  }

  await patientsContainer.items.upsert({
    ...targetPatient,
    fhirPatientId: patient.id,
    updatedAt: new Date().toISOString(),
  });

  console.log(
    `\n✅ Linked local patient "${targetPatient.fullName ?? targetPatient.email}" (id: ${targetPatient.id}) to FHIR Patient/${patient.id}`
  );
  console.log(`   Base URL: ${FHIR_BASE_URL}`);
  console.log(`   Test it:  GET ${FHIR_BASE_URL}/Encounter?patient=${patient.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed FHIR demo failed:", err);
    process.exit(1);
  });
