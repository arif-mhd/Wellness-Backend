/**
 * Adds ONE new resource to a patient's EXISTING linked FHIR record on the
 * sandbox (does not create a new Patient — reuses fhirPatientId already set
 * by seedFhirDemo.ts). Useful for adding more demo data without duplicating
 * patients on HAPI.
 *
 * Usage:
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts <email> observation "<label>" <value> "<unit>"
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts <email> note "<title>" "<note text>"
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts <email> encounter "<reason>"
 *
 * Examples:
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts gayathri123@gmail.com observation "Body Weight" 60 kg
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts gayathri123@gmail.com note "Follow-up" "Patient reports improved symptoms."
 *   npx ts-node-dev --transpile-only src/data/addFhirRecord.ts gayathri123@gmail.com encounter "Routine check-up"
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

async function getLinkedFhirPatientId(email: string): Promise<string> {
  const { resources } = await patientsContainer.items
    .query({ query: "SELECT * FROM c WHERE c.email = @email", parameters: [{ name: "@email", value: email }] })
    .fetchAll();
  const patient = resources[0];
  if (!patient) throw new Error(`No local patient found with email ${email}`);
  if (!patient.fhirPatientId) throw new Error(`Patient ${email} has no fhirPatientId — run seed:fhir first`);
  return patient.fhirPatientId;
}

async function main() {
  const [, , email, type, ...rest] = process.argv;

  if (!email || !type) {
    console.error("Usage: addFhirRecord.ts <email> <observation|note|encounter> <...args>");
    process.exit(1);
  }

  const fhirPatientId = await getLinkedFhirPatientId(email);
  const now = new Date().toISOString();

  if (type === "observation") {
    const [label, value, unit] = rest;
    if (!label || value === undefined) {
      console.error('Usage: ... observation "<label>" <value> "<unit>"');
      process.exit(1);
    }
    const created = await fhirPost("Observation", {
      resourceType: "Observation",
      status: "final",
      code: { text: label },
      subject: { reference: `Patient/${fhirPatientId}` },
      effectiveDateTime: now,
      valueQuantity: { value: Number(value), unit: unit || "" },
    });
    console.log(`✅ Observation created: ${created.id} (${label} = ${value} ${unit || ""})`);
  } else if (type === "note") {
    const [title, text] = rest;
    if (!title || !text) {
      console.error('Usage: ... note "<title>" "<note text>"');
      process.exit(1);
    }
    const created = await fhirPost("DocumentReference", {
      resourceType: "DocumentReference",
      status: "current",
      type: { text: "Clinical Note" },
      subject: { reference: `Patient/${fhirPatientId}` },
      date: now,
      description: title,
      content: [{ attachment: { contentType: "text/plain", data: Buffer.from(text, "utf-8").toString("base64") } }],
    });
    console.log(`✅ DocumentReference created: ${created.id} ("${title}")`);
  } else if (type === "encounter") {
    const [reason] = rest;
    if (!reason) {
      console.error('Usage: ... encounter "<reason>"');
      process.exit(1);
    }
    const created = await fhirPost("Encounter", {
      resourceType: "Encounter",
      status: "finished",
      class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
      subject: { reference: `Patient/${fhirPatientId}` },
      period: { start: now, end: now },
      reasonCode: [{ text: reason }],
    });
    console.log(`✅ Encounter created: ${created.id} ("${reason}")`);
  } else {
    console.error(`Unknown type "${type}" — use observation, note, or encounter`);
    process.exit(1);
  }

  console.log(`   Linked to FHIR Patient/${fhirPatientId} — reopen the EHR panel in the doctor portal to see it.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Add FHIR record failed:", err.message);
    process.exit(1);
  });
