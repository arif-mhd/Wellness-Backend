import "dotenv/config";
import { vaccinationBookingsContainer } from "../config/cosmos";

// One-off migration for vaccination bookings stranded by the move from
// lab-side approval to doctor-side approval.
//
// The lab-approval flow wrote these statuses:
//   pending_approval  — awaiting a lab
//   approved          — a lab had approved it
// The doctor-approval flow that replaced it uses:
//   pending_doctor_approval — awaiting a clinic-assigned doctor
//   confirmed               — signed off (also the pre-approval legacy status)
//
// Left alone, a `pending_approval` booking matches no branch in either the
// doctor queue or the patient app: no doctor would ever see it, and the
// patient would see it rendered as confirmed. `approved` has the same problem
// on the patient side.
//
// Also drops the lab-specific stamps (approvedByLabId/approvedByLabName/
// rejectedByLabId/rejectedByLabName) that no longer have a counterpart.
//
// Run with --apply to actually write; the default is a dry run.
//   npm run migrate:vaccination-approvals -- --apply

const APPLY = process.argv.includes("--apply");

// pending_approval → the doctor queue picks it up.
// approved → a lab already cleared it; "confirmed" is the equivalent terminal
// state, so honour that decision rather than sending the patient back to
// waiting.
const STATUS_MAP: Record<string, string> = {
  pending_approval: "pending_doctor_approval",
  approved: "confirmed",
};

async function main() {
  console.log(APPLY ? "Running migration (WRITING)..." : "Dry run — pass --apply to write.\n");

  const { resources } = await vaccinationBookingsContainer.items
    .query({
      query: "SELECT * FROM c WHERE c.status IN ('pending_approval', 'approved')",
    })
    .fetchAll();

  if (resources.length === 0) {
    console.log("No bookings need migrating.");
    return;
  }

  console.log(`Found ${resources.length} booking(s) to migrate:\n`);

  let migrated = 0;
  let failed = 0;

  for (const booking of resources) {
    const nextStatus = STATUS_MAP[booking.status];
    if (!nextStatus) continue; // defensive — the query already filtered

    console.log(`  ${booking.id}  ${booking.status} → ${nextStatus}`);

    if (!APPLY) continue;

    const {
      approvedByLabId: _a,
      approvedByLabName: _b,
      rejectedByLabId: _c,
      rejectedByLabName: _d,
      ...rest
    } = booking;

    const updated = {
      ...rest,
      status: nextStatus,
      // A lab approval isn't a doctor approval — clear the stamp so the
      // booking doesn't claim a sign-off that never happened. The patient app
      // reads `confirmed` on its own and doesn't require approvedAt.
      approvedBy: null,
      approvedAt: nextStatus === "confirmed" ? (booking.approvedAt ?? null) : null,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Partition key is /patientId.
      await vaccinationBookingsContainer
        .item(booking.id, booking.patientId)
        .replace(updated, { accessCondition: { type: "IfMatch", condition: booking._etag } });
      migrated++;
    } catch (err: any) {
      // 412 = someone wrote to this booking between our read and write.
      // Re-run the migration to pick it up rather than clobbering that write.
      failed++;
      console.error(`    ! failed (${err.code ?? "unknown"}): ${err.message ?? err}`);
    }
  }

  console.log("");
  if (APPLY) {
    console.log(`Migrated ${migrated} booking(s).${failed ? ` ${failed} failed — re-run to retry.` : ""}`);
  } else {
    console.log(`Dry run complete. ${resources.length} booking(s) would be migrated.`);
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
