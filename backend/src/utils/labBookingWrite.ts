import { labBookingsContainer } from "../config/cosmos";

// Same read -> recompute -> conditional-replace(IfMatch) -> retry-on-412
// pattern as updateAppointmentWithRetry (appointmentWrite.ts), but keyed by
// (id, patientId) instead of (id, id) — labBookingsContainer is partitioned
// on /patientId, not /id, since a lab booking is naturally owned by the
// patient who made it. Callers that don't already know the patientId (e.g.
// a doctor acting on a booking) must look it up first (a cross-partition
// query, same shape already used by PATCH /bookings/:id/status) before
// calling this.
//
// This exists specifically so two assigned doctors racing to approve/reject
// the same booking can't silently overwrite each other — the existing
// PATCH /bookings/:id/status (lab-role, fulfillment stages) still does a
// plain items.upsert() with no such guard; this helper is only used by the
// new doctor-approval endpoints below, not retrofitted onto that one.
export async function updateLabBookingWithRetry(
  id: string,
  patientId: string,
  computeUpdate: (booking: any) => any
): Promise<any | null> {
  for (let attempt = 0; ; attempt++) {
    const { resource: booking } = await labBookingsContainer.item(id, patientId).read();
    if (!booking) return null;

    const updated = computeUpdate(booking); // may throw — propagates straight to the caller

    try {
      await labBookingsContainer.item(id, patientId).replace(updated, { accessCondition: { type: "IfMatch", condition: booking._etag } });
      return updated;
    } catch (err: any) {
      if (err.code === 412 && attempt < 5) continue; // someone else wrote first — re-read and retry
      throw err;
    }
  }
}

// Thrown from a computeUpdate callback when the caller isn't allowed to act
// on this booking at all (e.g. not assigned to any lab on it).
export class LabBookingWriteNotAuthorizedError extends Error {
  constructor(message = "Not authorized.") {
    super(message);
    this.name = "LabBookingWriteNotAuthorizedError";
  }
}

// Thrown from a computeUpdate callback when the booking is no longer in a
// state this action applies to — specifically, another doctor already
// approved/rejected it. Distinct from the 403 above: this is a 409, the
// request was well-formed and authorized, it's just too late.
export class LabBookingAlreadyHandledError extends Error {
  constructor(message = "This booking has already been reviewed by another doctor.") {
    super(message);
    this.name = "LabBookingAlreadyHandledError";
  }
}
