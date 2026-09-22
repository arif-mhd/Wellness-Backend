import { appointmentsContainer } from "../config/cosmos";
import { resolveTimezoneForDoctorId, startOfClinicDayUtc } from "./timezone";

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
export async function autoExpireStaleAppointments<
  T extends { id: string; status: string; scheduledAt: string; doctorId: string }
>(appointments: T[]): Promise<T[]> {
  const candidates = appointments.filter(
    (apt) => apt.status === "scheduled" || apt.status === "in_progress"
  );
  if (candidates.length === 0) return appointments;

  // "Today" is clinic-local, not UTC-midnight — resolved per doctor (a batch
  // may span multiple clinics/timezones), cached so a batch sharing one
  // doctor only resolves their timezone once.
  const startOfTodayByDoctor = new Map<string, Promise<Date>>();
  const startOfTodayFor = (doctorId: string): Promise<Date> => {
    let cached = startOfTodayByDoctor.get(doctorId);
    if (!cached) {
      cached = resolveTimezoneForDoctorId(doctorId).then((timezone) => {
        // en-CA formats as YYYY-MM-DD — today's calendar date IN THE CLINIC'S
        // OWN ZONE, which can differ from the UTC calendar date near midnight.
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
        return startOfClinicDayUtc(todayStr, timezone);
      });
      startOfTodayByDoctor.set(doctorId, cached);
    }
    return cached;
  };

  const stale: T[] = [];
  for (const apt of candidates) {
    const startOfToday = await startOfTodayFor(apt.doctorId);
    if (new Date(apt.scheduledAt) < startOfToday) stale.push(apt);
  }

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
