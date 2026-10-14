import { appointmentsContainer, queryDocuments } from "../config/cosmos";
import { zonedTimeToUtc, utcToZonedTime, startOfClinicDayUtc } from "./timezone";

// Doctor availability worked out from the doctor's own weekly schedule
// (`slots`), leave (`absences`) and break switch (`isManuallyOffline`), in the
// clinic's timezone — the rule the online-status route describes ("online
// based on schedule by default; isManuallyOffline overrides"). The stored
// `isOnline` flag is only recomputed while the doctor has the portal open, so
// patient-facing "available now" and "next free slot" use this instead.

interface WeeklySlot {
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  slotDurationMins?: number;
  isActive?: boolean;
}

interface Absence {
  startDate: string;
  endDate: string;
}

export interface ScheduledDoctor {
  id: string;
  slots?: WeeklySlot[];
  absences?: Absence[];
  isManuallyOffline?: boolean;
}

const pad = (n: number) => n.toString().padStart(2, "0");
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** `YYYY-MM-DD` of `instant` in `timezone`. */
export function clinicDate(instant: Date, timezone: string): string {
  const local = utcToZonedTime(instant, timezone);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

/** `date` plus `days` calendar days (date-only arithmetic, no timezone involved). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function overlapsAbsence(doctor: ScheduledDoctor, start: Date, end: Date): boolean {
  return (doctor.absences ?? []).some((abs) => start < new Date(abs.endDate) && end > new Date(abs.startDate));
}

/**
 * Bookable start times (HH:MM, clinic time) on `date`, before bookings are
 * taken out: the doctor's active slots for that weekday, cut into
 * `slotDurationMins` pieces, minus leave and anything already started.
 */
export function scheduledTimes(
  doctor: ScheduledDoctor,
  date: string,
  timezone: string,
  now: Date = new Date(),
): { times: string[]; slotDurationMins: number } {
  // Noon anchor avoids DST-transition edge cases when computing which
  // calendar day-of-week this date is, in the clinic's own timezone.
  const dayOfWeek = utcToZonedTime(zonedTimeToUtc(date, "12:00", timezone), timezone).getDay();
  const daySlots = (doctor.slots ?? []).filter((s) => s.dayOfWeek === dayOfWeek && s.isActive);
  const times: string[] = [];
  let duration = 30;

  for (const slot of daySlots) {
    duration = slot.slotDurationMins ?? 30;
    if (!slot.startTime || !slot.endTime) continue;
    let cursor = minutesOf(slot.startTime);
    const end = minutesOf(slot.endTime);
    while (cursor + duration <= end) {
      const hhmm = `${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`;
      const start = zonedTimeToUtc(date, hhmm, timezone);
      const finish = new Date(start.getTime() + duration * 60 * 1000);
      if (!overlapsAbsence(doctor, start, finish) && start > now) times.push(hhmm);
      cursor += duration;
    }
  }
  return { times: Array.from(new Set(times)).sort(), slotDurationMins: duration };
}

/** HH:MM (clinic time) of the doctor's non-cancelled bookings between two clinic dates, by date. */
export async function bookedTimes(
  doctorId: string,
  fromDate: string,
  toDate: string,
  timezone: string,
): Promise<Map<string, Set<string>>> {
  const from = startOfClinicDayUtc(fromDate, timezone).toISOString();
  const to = new Date(zonedTimeToUtc(toDate, "23:59", timezone).getTime() + 59_999).toISOString();
  const booked = await queryDocuments<{ scheduledAt: string }>(appointmentsContainer, {
    query: `SELECT c.scheduledAt FROM c
            WHERE c.doctorId = @doctorId
              AND c.scheduledAt >= @from
              AND c.scheduledAt <= @to
              AND c.status != 'cancelled'`,
    parameters: [
      { name: "@doctorId", value: doctorId },
      { name: "@from", value: from },
      { name: "@to", value: to },
    ],
  });
  const byDate = new Map<string, Set<string>>();
  for (const b of booked) {
    const instant = new Date(b.scheduledAt);
    const local = utcToZonedTime(instant, timezone);
    const date = clinicDate(instant, timezone);
    if (!byDate.has(date)) byDate.set(date, new Set());
    byDate.get(date)!.add(`${pad(local.getHours())}:${pad(local.getMinutes())}`);
  }
  return byDate;
}

/** Free times on `date` — the available-slots answer. */
export async function availableTimes(
  doctor: ScheduledDoctor,
  date: string,
  timezone: string,
  now: Date = new Date(),
): Promise<{ available: string[]; slotDurationMins: number }> {
  const { times, slotDurationMins } = scheduledTimes(doctor, date, timezone, now);
  if (times.length === 0) return { available: [], slotDurationMins };
  const booked = (await bookedTimes(doctor.id, date, date, timezone)).get(date) ?? new Set();
  return { available: times.filter((t) => !booked.has(t)), slotDurationMins };
}

/**
 * Working right now: inside one of today's active schedule blocks (clinic
 * time), not on leave, and not switched to "on a break". Bookings do not
 * matter here — a doctor between patients is still working.
 */
export function isAvailableNow(doctor: ScheduledDoctor, timezone: string, now: Date = new Date()): boolean {
  if (doctor.isManuallyOffline) return false;
  const local = utcToZonedTime(now, timezone);
  const minute = local.getHours() * 60 + local.getMinutes();
  const dayOfWeek = local.getDay();
  const inBlock = (doctor.slots ?? []).some(
    (s) =>
      s.isActive &&
      s.dayOfWeek === dayOfWeek &&
      !!s.startTime &&
      !!s.endTime &&
      minutesOf(s.startTime) <= minute &&
      minute < minutesOf(s.endTime),
  );
  return inBlock && !overlapsAbsence(doctor, now, new Date(now.getTime() + 60_000));
}

export interface NextFreeSlot {
  doctorId: string;
  date: string;
  time: string;
  startsAt: string;
  timezone: string;
}

/** A doctor's earliest free slot within `days` days of today, or null. */
async function firstFreeSlot(
  doctor: ScheduledDoctor,
  timezone: string,
  days: number,
  now: Date,
): Promise<NextFreeSlot | null> {
  const first = clinicDate(now, timezone);
  let booked: Map<string, Set<string>> | null = null;
  for (let i = 0; i < days; i++) {
    const date = addDays(first, i);
    const { times } = scheduledTimes(doctor, date, timezone, now);
    if (times.length === 0) continue;
    // One bookings query for the whole window, made only once the doctor
    // turns out to have working hours in it.
    booked ??= await bookedTimes(doctor.id, first, addDays(first, days - 1), timezone);
    const taken = booked.get(date) ?? new Set();
    const time = times.find((t) => !taken.has(t));
    if (time) return { doctorId: doctor.id, date, time, startsAt: zonedTimeToUtc(date, time, timezone).toISOString(), timezone };
  }
  return null;
}

/**
 * The earliest free slot across `doctors` within `days` days of today —
 * schedule, leave and bookings all considered, the same way available-slots
 * does it.
 */
export async function nextFreeSlot(
  doctors: { doctor: ScheduledDoctor; timezone: string }[],
  days = 14,
  now: Date = new Date(),
): Promise<NextFreeSlot | null> {
  const found = await Promise.all(doctors.map(({ doctor, timezone }) => firstFreeSlot(doctor, timezone, days, now)));
  return found.reduce<NextFreeSlot | null>((best, slot) => (slot && (!best || slot.startsAt < best.startsAt) ? slot : best), null);
}
