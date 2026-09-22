// Appointment times arrive from the backend as TRUE UTC instants (see the
// backend's src/utils/timezone.ts). They must be displayed in the CLINIC's
// timezone — not the viewing browser's — so a doctor logging in from
// abroad still sees their clinic's own schedule. Get the zone from
// useClinicTimezone() in components/BrandingContext.tsx.
//
// This replaces the old parseLocalTime() helper that used to be copy-pasted
// across this portal. That helper stripped the trailing "Z" to compensate for
// the backend storing clinic-local wall-clock time mislabelled as UTC; now
// that the backend stores real UTC, stripping the "Z" shifts every time in
// the WRONG direction.

export function formatClinicDate(iso: string, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { ...options, timeZone: timezone });
}

export function formatClinicTime(iso: string, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...options, timeZone: timezone });
}

export function formatClinicDateTime(iso: string, timezone: string, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { ...options, timeZone: timezone });
}

// "YYYY-MM-DD" for the given instant AS SEEN IN THE CLINIC'S ZONE. Use this
// for every same-day comparison instead of Date.toDateString(), which
// silently answers in the browser's zone and so disagrees with the clinic
// near midnight.
export function clinicDayKey(value: string | Date, timezone: string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
}

export function isSameClinicDay(a: string | Date, b: string | Date, timezone: string): boolean {
  const ka = clinicDayKey(a, timezone);
  return !!ka && ka === clinicDayKey(b, timezone);
}

// Start of the clinic's "today" as a real instant, for range comparisons
// (e.g. "upcoming from today onwards").
export function startOfClinicToday(timezone: string): Date {
  const key = clinicDayKey(new Date(), timezone);
  // Reading the clinic-local midnight back as an instant needs the zone's
  // offset at that moment; Intl gives it to us via the formatted parts.
  const probe = new Date(`${key}T00:00:00Z`);
  const asClinic = new Date(probe.toLocaleString("en-US", { timeZone: timezone }));
  const asUtc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(probe.getTime() + (asUtc.getTime() - asClinic.getTime()));
}

// Calendar/clock parts of an instant AS SEEN IN THE CLINIC'S ZONE. Use these
// instead of Date.getFullYear()/getMonth()/getDate()/getHours(), which all
// answer in the browser's zone.
export function clinicParts(value: string | Date, timezone: string): {
  year: number; month: number; day: number; hours: number; minutes: number; weekday: number;
} {
  const d = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    // 0-based, to match Date.getMonth()'s convention at every call site.
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    // Intl renders midnight as "24" under hour12:false in some engines.
    hours: Number(get("hour")) % 24,
    minutes: Number(get("minute")),
    weekday: Math.max(0, weekdayNames.indexOf(get("weekday"))),
  };
}
