import { createHash, randomUUID } from "crypto";
import { appointmentsContainer, doctorsContainer, notificationsContainer } from "../config/cosmos";
import { updateAppointmentWithRetry } from "./appointmentWrite";
import { sendPushToUser } from "./pushNotifications";
import { PrescriptionError } from "./prescriptionPolicy";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const LEASE_MS = 120_000;
export function getPrescriptionAdditionEligibility(apt: any) {
  const completed = typeof apt.completedAt === "string" ? Date.parse(apt.completedAt) : NaN;
  const deadline = Number.isFinite(completed) ? new Date(completed + WINDOW_MS).toISOString() : null;
  let reason = "";
  if (apt.status !== "completed" || apt.visitType === "offline") reason = "Only completed video appointments support prescription additions.";
  else if (!Number.isFinite(completed) || completed > Date.now()) reason = "A reliable completion time is unavailable for this appointment.";
  else if (Date.now() >= completed + WINDOW_MS) reason = "The 24-hour window has ended.";
  return { eligible: !reason, reason, deadline };
}

function normalizeMedicines(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) throw new PrescriptionError(400, "Supply between 1 and 20 new medicines.");
  return value.map((m: any) => {
    if (!m || typeof m !== "object") throw new PrescriptionError(400, "Invalid medicine.");
    const clean: Record<string, any> = {};
    for (const key of ["name", "dosage", "timing", "frequency", "instructions"] as const) {
      const v = m[key] ?? (key === "instructions" ? "" : undefined);
      if (typeof v !== "string" || v.length > 1000 || (key !== "instructions" && !v.trim())) throw new PrescriptionError(400, `Invalid medicine ${key}.`);
      clean[key] = v.trim();
    }
    for (const key of ["productId", "manufacturer"] as const) {
      if (m[key] !== undefined) {
        if (typeof m[key] !== "string" || !m[key].trim() || m[key].length > 200) throw new PrescriptionError(400, `Invalid ${key}.`);
        clean[key] = m[key].trim();
      }
    }
    for (const key of ["durationDays", "quantity"] as const) {
      if (m[key] !== undefined) {
        if (!Number.isInteger(m[key]) || m[key] < 1 || m[key] > (key === "durationDays" ? 365 : 100000)) throw new PrescriptionError(400, `Invalid ${key}.`);
        clean[key] = m[key];
      }
    }
    return clean;
  });
}

export async function addPrescriptionMedicines(id: string, doctorId: string, body: any) {
  const requestId = body?.requestId;
  if (typeof requestId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw new PrescriptionError(400, "A requestId (8-100 letters, digits, underscores or hyphens) is required.");
  const medicines = normalizeMedicines(body?.medicines);
  const hash = createHash("sha256").update(JSON.stringify(medicines)).digest("hex");
  const eventId = `rx_${createHash("sha256").update(`${id}:${requestId}`).digest("hex")}`;
  const doctor = await doctorsContainer.item(doctorId, doctorId).read();
  const contributorName = doctor.resource?.fullName ?? "Doctor";
  let updated: any;
  try {
    updated = await updateAppointmentWithRetry(id, apt => {
      if (apt.doctorId !== doctorId) throw new PrescriptionError(403, "Not authorized.");
      const previous = (apt.prescriptionUpdates ?? []).find((e: any) => e.id === eventId);
      if (previous) {
        if (previous.hash !== hash) throw new PrescriptionError(409, "This requestId was already used for different medicines.");
        throw new AlreadySaved(apt);
      }
      const eligibility = getPrescriptionAdditionEligibility(apt);
      if (!eligibility.eligible) throw new PrescriptionError(409, eligibility.reason);
      if ((apt.prescriptionUpdates?.length ?? 0) >= 100 || (apt.emr?.medicines?.length ?? 0) + medicines.length > 500) throw new PrescriptionError(409, "Prescription addition limit reached.");
      const now = new Date(Date.now()).toISOString();
      const added = medicines.map((m, i) => ({ ...m, id: `${eventId}_${i}`, contributorDoctorId: doctorId, contributorName, addedAt: now, prescriptionUpdateId: eventId }));
      // The update and durable notification intent are a single conditional write.
      return { ...apt, emr: { ...apt.emr, medicines: [...(apt.emr?.medicines ?? []), ...added], savedAt: now }, prescriptionUpdates: [...(apt.prescriptionUpdates ?? []), { id: eventId, hash, doctorId, doctorName: contributorName, addedAt: now, medicineIds: added.map(m => m.id), notificationPending: true }], updatedAt: now };
    });
  } catch (err) {
    if (err instanceof AlreadySaved) updated = err.appointment;
    else throw err;
  }
  if (!updated) throw new PrescriptionError(404, "Appointment not found.");
  await deliverPrescriptionNotifications(id);
  // Read the saved delivery state; delivery failure never rolls back the prescription.
  const { resource: current } = await appointmentsContainer.item(id, id).read().catch(() => ({ resource: updated }));
  return { status: "OK", medicines: (current ?? updated).emr.medicines, notificationPending: Boolean((current ?? updated).prescriptionUpdates?.find((e: any) => e.id === eventId)?.notificationPending) };
}

class AlreadySaved extends Error { constructor(public appointment: any) { super("Already saved"); } }
class SkipDelivery extends Error {}

// At-least-once delivery. A lease avoids concurrent attempts; a crash after a
// push is accepted but before acknowledgement can still cause a repeat push.
// event/notificationId is stable so clients can deduplicate that rare case.
export async function deliverPrescriptionNotifications(id: string): Promise<void> {
  const { resource: snapshot } = await appointmentsContainer.item(id, id).read().catch(() => ({ resource: undefined }));
  for (const pending of snapshot?.prescriptionUpdates ?? []) {
    if (!pending.notificationPending) continue;
    const lease = randomUUID();
    try {
      const claimed = await updateAppointmentWithRetry(id, apt => {
        const event = apt.prescriptionUpdates?.find((e: any) => e.id === pending.id);
        if (!event?.notificationPending || (event.leaseUntil > Date.now())) throw new SkipDelivery();
        return { ...apt, prescriptionUpdates: apt.prescriptionUpdates.map((e: any) => e.id === pending.id ? { ...e, lease, leaseUntil: Date.now() + LEASE_MS } : e) };
      });
      if (!claimed) continue;
      const notification = { id: pending.id, patientId: claimed.patientId, profileId: claimed.familyMemberId || claimed.patientId, title: "Prescription updated", body: "Your doctor has added medicines to your prescription. Open the appointment to review it.", type: "prescription_updated", referenceId: id, isRead: false, sentAt: pending.addedAt };
      try { await notificationsContainer.items.create(notification); } catch (err: any) { if (err.code !== 409) throw err; }
      const delivered = await sendPushToUser(claimed.patientId, notification.title, notification.body, { type: notification.type, referenceId: id, profileId: notification.profileId, notificationId: notification.id });
      if (!delivered) throw new Error("Push delivery was not accepted");
      await updateAppointmentWithRetry(id, apt => ({ ...apt, prescriptionUpdates: apt.prescriptionUpdates.map((e: any) => e.id === pending.id && e.lease === lease ? { ...e, notificationPending: false, deliveredAt: new Date(Date.now()).toISOString(), leaseUntil: 0 } : e) }));
    } catch (err) {
      if (err instanceof SkipDelivery) continue;
      console.warn("[prescription-notification] Delivery pending", id, pending.id);
      await updateAppointmentWithRetry(id, apt => ({ ...apt, prescriptionUpdates: apt.prescriptionUpdates.map((e: any) => e.id === pending.id && e.lease === lease ? { ...e, leaseUntil: 0 } : e) })).catch(() => {});
    }
  }
}
