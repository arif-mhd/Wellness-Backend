/**
 * One-time correction for appointment `scheduledAt` values written before
 * the timezone fix (see src/utils/timezone.ts). Every booking/reschedule/
 * follow-up write path used to combine a clinic-local wall-clock date+time
 * with a literal "Z" and no real conversion — e.g. a genuine 9:30 AM Dubai
 * booking was stored as "...T09:30:00.000Z" (true UTC 9:30, not the
 * intended 05:30 UTC). Once the write path is fixed, that same stored
 * string is read CORRECTLY as 9:30 AM UTC — which silently "corrects" the
 * interpretation of an already-wrong value into a *new*, still-wrong
 * instant, and would also mis-fire reminders and mis-gate auto-expiry.
 *
 * This re-derives the clinic-local wall-clock the patient/doctor actually
 * intended from the OLD (mis-tagged) stored value — by reading its UTC
 * digits as if they were already clinic-local, exactly how every display
 * site's now-removed `parseLocalTime()` Z-stripping hack used to do it —
 * and re-encodes that as a true UTC instant via zonedTimeToUtc.
 *
 * Scope: only appointments that
 *   - are still "scheduled" or "in_progress" (no product value in touching
 *     completed/cancelled history),
 *   - are future-dated under the OLD (buggy) reading, i.e. the raw stored
 *     scheduledAt is still ahead of now — a past one already happened under
 *     whatever time it actually showed and correcting it now would just be
 *     confusing,
 *   - belong to a doctor whose resolved clinic timezone actually differs
 *     from UTC (a UTC-timezone clinic was never affected by this bug),
 *   - don't already carry a `migratedAt` marker (idempotent — safe to re-run).
 *
 * REQUIRES --created-before=<ISO timestamp>: the moment the FIXED backend went
 * live. Appointments created before it are in the old (mislabelled) format and
 * need correcting; anything created after it was already written correctly by
 * the new code and must NOT be touched — without this cutoff a booking made
 * minutes after the deploy would be shifted a second time and end up wrong.
 * Get the value from the deploy's timestamp, e.g. `2026-09-22T11:30:00Z`.
 *
 * Defaults to a DRY RUN — prints the before/after diff without writing.
 *   npx ts-node src/scripts/backfillAppointmentTimezones.ts --created-before=2026-09-22T11:30:00Z
 * Pass --apply to actually perform the writes:
 *   npx ts-node src/scripts/backfillAppointmentTimezones.ts --created-before=2026-09-22T11:30:00Z --apply
 */

import "dotenv/config";
import { appointmentsContainer } from "../config/cosmos";
import { zonedTimeToUtc, resolveTimezoneForDoctor } from "../utils/timezone";
import { doctorsContainer } from "../config/cosmos";

const APPLY = process.argv.includes("--apply");
const CREATED_BEFORE_ARG = process.argv.find((a) => a.startsWith("--created-before="))?.split("=")[1];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

async function main() {
  if (!CREATED_BEFORE_ARG) {
    console.error("Missing --created-before=<ISO timestamp> (the moment the fixed backend was deployed).");
    console.error("Everything created before it gets corrected; everything after is left alone.");
    console.error("Usage: npx ts-node src/scripts/backfillAppointmentTimezones.ts --created-before=2026-09-22T11:30:00Z [--apply]");
    process.exit(1);
  }
  const createdBefore = new Date(CREATED_BEFORE_ARG);
  if (isNaN(createdBefore.getTime())) {
    console.error(`Could not parse --created-before value '${CREATED_BEFORE_ARG}' as a date.`);
    process.exit(1);
  }
  console.log(`Cutoff: only appointments created before ${createdBefore.toISOString()} will be corrected.\n`);

  const { resources: appointments } = await appointmentsContainer.items
    .query({
      query: "SELECT * FROM c WHERE (c.status = 'scheduled' OR c.status = 'in_progress') AND NOT IS_DEFINED(c.migratedAt)",
    })
    .fetchAll();

  console.log(`${appointments.length} scheduled/in_progress appointment(s) without a migratedAt marker.\n`);

  const now = Date.now();
  const timezoneByDoctorId = new Map<string, Promise<string>>();
  const resolveTimezone = (doctorId: string): Promise<string> => {
    let cached = timezoneByDoctorId.get(doctorId);
    if (!cached) {
      cached = doctorsContainer
        .item(doctorId, doctorId)
        .read()
        .then((r) => resolveTimezoneForDoctor(r.resource ?? {}))
        .catch(() => resolveTimezoneForDoctor({}));
      timezoneByDoctorId.set(doctorId, cached);
    }
    return cached;
  };

  let migratedCount = 0;
  let skippedPast = 0;
  let skippedUtc = 0;
  let skippedPostDeploy = 0;

  for (const apt of appointments as any[]) {
    // Written by the already-fixed code — correct as-is, must not be shifted.
    if (!apt.createdAt || new Date(apt.createdAt).getTime() >= createdBefore.getTime()) {
      skippedPostDeploy++;
      continue;
    }
    if (new Date(apt.scheduledAt).getTime() <= now) {
      skippedPast++;
      continue;
    }

    const timezone = await resolveTimezone(apt.doctorId);
    if (timezone === "UTC") {
      skippedUtc++;
      continue;
    }

    const old = new Date(apt.scheduledAt);
    const dateStr = `${old.getUTCFullYear()}-${pad(old.getUTCMonth() + 1)}-${pad(old.getUTCDate())}`;
    const timeStr = `${pad(old.getUTCHours())}:${pad(old.getUTCMinutes())}`;
    const corrected = zonedTimeToUtc(dateStr, timeStr, timezone);

    console.log(
      `- [${apt.id}] doctor=${apt.doctorId} tz=${timezone} old=${apt.scheduledAt} -> new=${corrected.toISOString()}`
    );
    migratedCount++;

    if (APPLY) {
      await appointmentsContainer.items.upsert({
        ...apt,
        scheduledAt: corrected.toISOString(),
        migratedAt: new Date().toISOString(),
      });
    }
  }

  console.log(
    `\n${migratedCount} appointment(s) ${APPLY ? "corrected" : "would be corrected"}. ` +
      `${skippedPast} skipped (already past), ${skippedUtc} skipped (clinic already UTC), ` +
      `${skippedPostDeploy} skipped (created after the cutoff — already correct).`
  );
  if (!APPLY) {
    console.log(`Re-run with --apply to write these changes.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
