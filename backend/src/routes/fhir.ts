import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import { SessionRequest } from "supertokens-node/framework/express";
import { patientsContainer } from "../config/cosmos";
import { FhirError } from "../services/fhirClient";
import {
  searchFhirPatients,
  getFhirPatient,
  getFhirEncounters,
  getFhirNotes,
  getFhirObservations,
  getFhirContext,
} from "../services/fhirService";

// Read-only proxy to an external EMR's FHIR API (HAPI public sandbox today,
// standing in for the clinic's Cortex FHIR endpoint — see config/fhir.ts).
// Doctors use this to pull a patient's history from the external EMR for
// context during a consult. This is entirely separate from, and does not
// modify, the platform's own /api/appointments/:id/emr note-taking flow.
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

// ─── GET /api/fhir/patients/search ────────────────────────────────────────────
router.get("/patients/search", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    const { given, family, identifier } = req.query as Record<string, string>;
    res.json(await searchFhirPatients({ given, family, identifier }));
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ─── GET /api/fhir/patients/:fhirId ───────────────────────────────────────────
router.get("/patients/:fhirId", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    res.json(await getFhirPatient(req.params.fhirId));
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ─── GET /api/fhir/patients/:fhirId/encounters ────────────────────────────────
router.get("/patients/:fhirId/encounters", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    res.json(await getFhirEncounters(req.params.fhirId));
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ─── GET /api/fhir/patients/:fhirId/notes ─────────────────────────────────────
// Merged DocumentReference + Composition — the "doctor notes" resources.
router.get("/patients/:fhirId/notes", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    res.json(await getFhirNotes(req.params.fhirId));
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ─── GET /api/fhir/patients/:fhirId/observations ──────────────────────────────
router.get("/patients/:fhirId/observations", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    res.json(await getFhirObservations(req.params.fhirId));
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ─── GET /api/fhir/patients/:fhirId/context ───────────────────────────────────
// Conditions + MedicationRequests — background context for the notes above.
router.get("/patients/:fhirId/context", requireRole("doctor"), async (req: Request, res: Response) => {
  try {
    res.json(await getFhirContext(req.params.fhirId));
  } catch (err) {
    handleFhirError(err, res);
  }
});

export default router;
