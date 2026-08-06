import { appointmentsContainer } from "../config/cosmos";

// An appointment whose calendar day has fully passed without ever being
// completed is a missed/abandoned consultation — not a live "in progress"
// call (that's today's, still ongoing) and not a still-due "scheduled" slot
// (that's today's or later). This lazily sweeps and permanently cancels
// those the next time ANY of {patient, doctor, clinic} loads an appointment
// list that includes them, rather than requiring a separate cron process —
// same lazy-on-read approach this codebase already used for the patient's
// own list, just centralized and extended to also catch an appointment
// stuck in "in_progress" (e.g. a call that started but was never properly
// ended) instead of only "scheduled" ones.
//
// Mutates the passed-in array in place (so a caller's already-fetched list
// reflects the new status immediately, no re-fetch needed) and returns it.
export async function autoExpireStaleAppointments<T extends { id: string; status: string; scheduledAt: string }>(
  appointments: T[]
): Promise<T[]> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const stale = appointments.filter(
    (apt) =>
      (apt.status === "scheduled" || apt.status === "in_progress") &&
      new Date(apt.scheduledAt) < startOfToday
  );

  if (stale.length === 0) return appointments;

  const cancelledAt = new Date().toISOString();
  await Promise.all(
    stale.map((apt) =>
      appointmentsContainer.items
        .upsert({ ...apt, status: "cancelled", cancelledReason: "auto_expired", updatedAt: cancelledAt })
        .catch((err) => console.error(`[autoExpireStaleAppointments] Failed to expire ${apt.id}:`, err))
    )
  );

  stale.forEach((apt) => {
    (apt as any).status = "cancelled";
    (apt as any).cancelledReason = "auto_expired";
    (apt as any).updatedAt = cancelledAt;
  });

  return appointments;
}
