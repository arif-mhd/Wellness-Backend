import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import { appointmentsContainer } from "../config/cosmos";
import { addPrescriptionMedicines, getPrescriptionAdditionEligibility } from "../utils/prescriptionAdditions";
import { PrescriptionError } from "../utils/prescriptionPolicy";

const router = Router();
router.get("/:id/prescription-additions", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const { resource: apt } = await appointmentsContainer.item(req.params.id, req.params.id).read();
    if (!apt) { res.status(404).json({ error: "Appointment not found." }); return; }
    if (apt.doctorId !== req.session!.getUserId()) { res.status(403).json({ error: "Not authorized." }); return; }
    res.json({ ...getPrescriptionAdditionEligibility(apt), medicines: apt.emr?.medicines ?? [], clinicId: apt.clinicId ?? null });
  } catch { res.status(500).json({ error: "Could not load prescription." }); }
});
router.post("/:id/prescription-additions", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try { res.json(await addPrescriptionMedicines(req.params.id, req.session!.getUserId(), req.body)); }
  catch (err: any) {
    const status = err instanceof PrescriptionError ? err.status : err.code === 412 ? 409 : 500;
    res.status(status).json({ error: status === 500 ? "Could not save prescription additions. Retry with the same requestId." : err.message ?? "The appointment changed. Please retry." });
  }
});
export default router;
