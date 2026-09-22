import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCountryConfigForOrgId, getDefaultOrgIdForRegistration } from "./orgScope";
import { doctorsContainer } from "../config/cosmos";

// The ONLY place in the codebase that should ever combine a bare
// "YYYY-MM-DD" date + "HH:MM" time with a timezone. Every write path
// (booking, reschedule, follow-up, slot generation) must go through this
// instead of ad-hoc string concatenation — see appointments.ts/doctors.ts
// for the fake-UTC bug this replaces (appending a literal "Z" to a
// clinic-local wall-clock time with no real conversion).
export function zonedTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
}

// Inverse — the clinic-local wall-clock Date for a given real UTC instant,
// e.g. to decode a stored appointment's hour/minute in the clinic's own zone
// (booked-slot dedup) or to compute day-of-week for a given calendar date.
export function utcToZonedTime(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone);
}

// Clinic-local midnight (start of the clinic's "today") expressed as a real
// UTC Date — for day-boundary queries (auto-expiry, booked-slot range).
export function startOfClinicDayUtc(dateStr: string, timezone: string): Date {
  return zonedTimeToUtc(dateStr, "00:00", timezone);
}

// Resolves the IANA timezone a given doctor's schedule/appointments should
// be interpreted in — via their clinic's org (same tenantId chain already
// used for billing/insurance elsewhere), falling back to the platform
// default org for an independent doctor with no clinicId. Doesn't need a
// request/session — a doctor's timezone is intrinsic to their own clinic,
// not to whoever happens to be asking.
export async function resolveTimezoneForDoctor(doctor: { clinicId?: string | null }): Promise<string> {
  if (doctor.clinicId) {
    // Lazy import — same defensive pattern orgScope.ts already uses for this
    // exact function, keeping the clinicInsurance.ts -> clinicScope.ts
    // coupling scoped to where it's actually used rather than a static
    // module-level import.
    const { loadOrgDocForClinicId } = await import("../routes/clinicInsurance");
    const org = await loadOrgDocForClinicId(doctor.clinicId);
    if (org?.tenantId) {
      const countryConfig = await getCountryConfigForOrgId(org.tenantId);
      return countryConfig.timezone;
    }
  }
  const defaultOrgId = await getDefaultOrgIdForRegistration();
  const countryConfig = await getCountryConfigForOrgId(defaultOrgId);
  return countryConfig.timezone;
}

// Convenience wrapper for call sites (mostly notification-text generation)
// that only have a doctorId in hand, not an already-fetched doctor doc.
export async function resolveTimezoneForDoctorId(doctorId: string): Promise<string> {
  const { resource: doctor } = await doctorsContainer.item(doctorId, doctorId).read().catch(() => ({ resource: null as any }));
  return resolveTimezoneForDoctor(doctor ?? {});
}

// Formats a true-UTC instant as clinic-local date/time text, for
// notification/activity-log copy generated server-side (push, email, SMS).
// Always includes the resolved IANA timezone explicitly — Node has no
// implicit "local" timezone worth trusting (Cloud Run runs in UTC, so any
// formatting without an explicit timeZone silently renders in UTC instead
// of the clinic's actual zone).
export function formatClinicDateTimeText(isoUtc: string, timezone: string): { dateText: string; timeText: string } {
  const d = new Date(isoUtc);
  const dateText = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: timezone });
  const timeText = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  return { dateText, timeText };
}
