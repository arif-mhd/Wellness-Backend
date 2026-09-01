import { Router, Request, Response } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { EgressStatus } from "@livekit/protocol";
import { appointmentsContainer } from "../config/cosmos";
import { livekitApiKey, livekitApiSecret } from "../config/livekit";

const router = Router();
const receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);

// ─── POST /api/livekit/webhook ────────────────────────────────────────────
// LiveKit calls this for room/egress lifecycle events. Only egress_ended is
// handled — that's when a recording's finished file has actually landed in
// Azure Blob. Signature-verified via WebhookReceiver (LiveKit's own HMAC
// auth over the raw body, unrelated to the x-internal-secret pattern
// internal.ts uses) — this needs the RAW request body, which the global
// express.json() in src/index.ts stashes on req.rawBody via its verify hook
// specifically so this route can read it before/without re-parsing.
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody?.toString("utf-8") ?? "";
    const event = await receiver.receive(rawBody, req.headers.authorization);

    if (event.event === "egress_ended" && event.egressInfo) {
      const { roomName, status, fileResults } = event.egressInfo;

      if (status !== EgressStatus.EGRESS_COMPLETE) {
        console.error(`[livekit-webhook] Egress for room ${roomName} ended with status ${status}, no recording saved`);
      } else if (fileResults.length > 0) {
        // The room name IS the appointment id — see transcript-agent's own
        // comment on the same convention.
        const appointmentId = roomName;
        const { resource: apt } = await appointmentsContainer.item(appointmentId, appointmentId).read().catch(() => ({ resource: undefined as any }));
        if (apt) {
          await appointmentsContainer.items.upsert({
            ...apt,
            recordingBlobPath: fileResults[0].filename,
            recordingSavedAt: new Date().toISOString(),
          });
        } else {
          console.error(`[livekit-webhook] Egress completed for unknown appointment ${appointmentId}`);
        }
      }
    }

    res.status(200).json({ status: "OK" });
  } catch (err) {
    console.error("[livekit-webhook] Failed to process webhook:", err);
    res.status(400).json({ error: "Invalid webhook" });
  }
});

export default router;
