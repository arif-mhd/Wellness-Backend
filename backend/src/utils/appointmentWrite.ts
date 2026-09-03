import { appointmentsContainer } from "../config/cosmos";

// Several independent writers touch the SAME appointment document within
// seconds of each other around call-end (call-presence, recording-consent,
// the LiveKit egress webhook writing back recordingBlobPath, and a doctor's
// EMR save, which the consult screen forces right before disconnecting).
// A plain `items.upsert(apt-with-my-change)` built from a snapshot read
// earlier is a lost-update race: whichever of these writes lands last wins
// outright and silently discards every other writer's change from that same
// window — this is exactly how a completed recording's recordingBlobPath
// was disappearing (a routine EMR save overwrote it moments after the
// webhook set it, or vice versa).
//
// This wraps the same read → recompute → conditional-replace → retry-on-409
// pattern already used correctly for call-presence and recording-consent,
// so every writer of this document is safe by construction instead of each
// one having to remember to hand-roll it. `computeUpdate` is called with a
// FRESH read of the document on every attempt (not just the first), so it
// must be pure/side-effect-free — the effects of its result belong in the
// caller, after this resolves.
export async function updateAppointmentWithRetry(
  id: string,
  computeUpdate: (apt: any) => any
): Promise<any | null> {
  for (let attempt = 0; ; attempt++) {
    const { resource: apt } = await appointmentsContainer.item(id, id).read();
    if (!apt) return null;

    const updated = computeUpdate(apt); // may throw — propagates straight to the caller

    try {
      await appointmentsContainer.item(id, id).replace(updated, { accessCondition: { type: "IfMatch", condition: apt._etag } });
      return updated;
    } catch (err: any) {
      if (err.code === 412 && attempt < 5) continue; // someone else wrote first — re-read and retry
      throw err;
    }
  }
}

// Thrown from a computeUpdate callback to abort the retry loop immediately
// (rather than writing a no-op) and signal the caller to respond 403.
export class AppointmentWriteNotAuthorizedError extends Error {
  constructor(message = "Not authorized.") {
    super(message);
    this.name = "AppointmentWriteNotAuthorizedError";
  }
}
