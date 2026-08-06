import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import { patientsContainer } from "../config/cosmos";
import { FhirError } from "../services/fhirClient";
import {
  getFhirEncounters,
  getFhirNotes,
  getFhirObservations,
} from "../services/fhirService";

// Read-only proxy to an external EMR's FHIR API (HAPI public sandbox today,
// standing in for the clinic's Cortex FHIR endpoint — see config/fhir.ts).
//
// Doctor-facing access to a PATIENT'S external record lives in
// appointments.ts (GET /api/appointments/:id/fhir/*) instead of here — those
// routes verify the calling doctor is actually authorized on a specific
// appointment before resolving that patient's fhirPatientId server-side.
// This file used to also expose /patients/search and /patients/:fhirId/*
// directly to any doctor account with no such check (any doctor could look
// up or free-text-search any patient's external record); those routes have
// been removed. Only the patient's own self-service lookup remains here.
const router = Router();

function handleFhirError(err: unknown, res: Response) {
  if (err instanceof FhirError) {
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    res.status(status).json({ error: err.message, operationOutcome: err.operationOutcome });
    return;
  }
  console.error("FHIR integration error:", err);
  res.status(502).json({ error: "Failed to reach external FHIR server" });
}

// ─── GET /api/fhir/me ──────────────────────────────────────────────────────────
// Patient self-service: returns the calling patient's OWN external EMR records.
// Deliberately does not take a fhirId param — the linked ID is resolved
// server-side from the patient's own Cosmos doc, so a patient can never query
// another patient's external records by guessing/passing an arbitrary id.
router.get("/me", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { resource: patient } = await patientsContainer.item(patientId, patientId).read();
    const fhirPatientId = patient?.fhirPatientId;

    if (!fhirPatientId) {
      res.json({ linked: false, encounters: [], notes: [], observations: [] });
      return;
    }

    const [encounters, notes, observations] = await Promise.all([
      getFhirEncounters(fhirPatientId),
      getFhirNotes(fhirPatientId),
      getFhirObservations(fhirPatientId),
    ]);

    res.json({ linked: true, encounters, notes, observations });
  } catch (err) {
    handleFhirError(err, res);
  }
});

export default router;
