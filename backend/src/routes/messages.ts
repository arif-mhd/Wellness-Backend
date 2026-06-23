import { Router, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  messagesContainer,
  appointmentsContainer,
  patientsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeChatToken(userId: string, channel: string, name?: string): Promise<string> {
  const apiKey    = process.env.LIVEKIT_API_KEY    || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret0000000000000000000000";
  const at = new AccessToken(apiKey, apiSecret, { identity: userId, name, ttl: 4 * 60 * 60 });
  at.addGrant({ roomJoin: true, room: channel, canPublish: true, canSubscribe: true, canPublishData: true });
  return at.toJwt();
}

function generateId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** conversationId is always "chat:{patientId}:{doctorId}" — deterministic regardless of who initiates */
function makeConversationId(patientId: string, doctorId: string): string {
  return `chat:${patientId}:${doctorId}`;
}

/** Parse a conversationId back into parts */
function parseConversationId(conversationId: string): { patientId: string; doctorId: string } | null {
  const parts = conversationId.split(":");
  if (parts.length !== 3 || parts[0] !== "chat") return null;
  return { patientId: parts[1], doctorId: parts[2] };
}

/** Check if the caller has an appointment with the other party */
async function hasAppointment(patientId: string, doctorId: string): Promise<boolean> {
  try {
    const results = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT TOP 1 c.id FROM c
              WHERE c.patientId = @patientId
                AND c.doctorId = @doctorId
                AND c.status != 'cancelled'`,
      parameters: [
        { name: "@patientId", value: patientId },
        { name: "@doctorId",  value: doctorId  },
      ],
    });
    return results.length > 0;
  } catch {
    return false;
  }
}

// ─── GET /api/messages/token ─────────────────────────────────────────────────
// Generate a LiveKit token for a chat channel.
// Query params: ?channel=chat:patientId:doctorId
// The caller must be one of the two parties (patient or doctor) in the channel.
router.get("/token", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId  = req.session!.getUserId();
  const channel = req.query.channel as string;

  if (!channel) {
    res.status(400).json({ error: "channel query param is required" });
    return;
  }

  const parsed = parseConversationId(channel);
  if (!parsed) {
    res.status(400).json({ error: "Invalid channel format. Expected: chat:patientId:doctorId" });
    return;
  }

  const { patientId, doctorId } = parsed;

  // Caller must be one of the two parties
  if (userId !== patientId && userId !== doctorId) {
    res.status(403).json({ error: "Not authorized for this channel." });
    return;
  }

  // Patient-initiated: check they have an appointment with the doctor
  if (userId === patientId) {
    const allowed = await hasAppointment(patientId, doctorId);
    if (!allowed) {
      res.status(403).json({ error: "No appointment found with this doctor. Please book an appointment first." });
      return;
    }
  }

  try {
    let displayName: string | undefined;
    try {
      if (userId === patientId) {
        const { resource: p } = await patientsContainer.item(userId, userId).read();
        displayName = p?.fullName;
      } else {
        const { resource: d } = await doctorsContainer.item(userId, userId).read();
        displayName = d?.fullName;
      }
    } catch { /* use undefined */ }

    const wsUrl = process.env.LIVEKIT_WS_URL_DOCTOR || process.env.LIVEKIT_WS_URL_PATIENT || process.env.LIVEKIT_WS_URL || "ws://localhost:7880";
    const token = await makeChatToken(userId, channel, displayName);

    res.json({ token, wsUrl, channel });
  } catch (err) {
    console.error("Chat token error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/messages/conversations ────────────────────────────────────────
// List all conversations (unique doctor-patient pairs) for the caller.
// For patients: returns doctors they have chatted with.
// For doctors: returns patients they have chatted with.
// We derive conversations from appointments (a patient can message any doctor
// they have an appointment with, even if no messages yet).
router.get("/conversations", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();

  try {
    // Determine if this is a patient or doctor call by checking both containers
    let isPatient = false;
    let isDoctor  = false;

    try {
      const { resource } = await patientsContainer.item(userId, userId).read();
      if (resource) isPatient = true;
    } catch { /* not a patient */ }

    if (!isPatient) {
      try {
        const { resource } = await doctorsContainer.item(userId, userId).read();
        if (resource) isDoctor = true;
      } catch { /* not a doctor */ }
    }

    if (!isPatient && !isDoctor) {
      res.status(403).json({ error: "Caller is neither a patient nor a doctor." });
      return;
    }

    if (isPatient) {
      // Get all doctors this patient has appointments with
      const appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT DISTINCT c.doctorId FROM c WHERE c.patientId = @patientId AND c.status != 'cancelled'`,
        parameters: [{ name: "@patientId", value: userId }],
      });

      const uniqueDoctorIds = Array.from(new Set(appointments.map((a: any) => a.doctorId)));

      const conversations = await Promise.all(
        uniqueDoctorIds.map(async (doctorId: string) => {
          const conversationId = makeConversationId(userId, doctorId);

          // Get last message for this conversation
          let lastMessage: any = null;
          try {
            const msgs = await queryDocuments<any>(messagesContainer, {
              query: `SELECT TOP 1 * FROM c WHERE c.conversationId = @cid ORDER BY c.createdAt DESC`,
              parameters: [{ name: "@cid", value: conversationId }],
            });
            if (msgs.length > 0) lastMessage = msgs[0];
          } catch { /* no messages yet */ }

          // Get unread count
          let unreadCount = 0;
          try {
            const unread = await queryDocuments<any>(messagesContainer, {
              query: `SELECT VALUE COUNT(1) FROM c WHERE c.conversationId = @cid AND c.senderId != @uid AND c.isRead = false`,
              parameters: [
                { name: "@cid", value: conversationId },
                { name: "@uid", value: userId },
              ],
            });
            unreadCount = unread[0] ?? 0;
          } catch { /* ignore */ }

          // Get doctor info
          let doctorName = "Doctor";
          let doctorSpecialty = "";
          let doctorAvatarUrl: string | null = null;
          try {
            const { resource: doc } = await doctorsContainer.item(doctorId, doctorId).read();
            doctorName     = doc?.fullName  ?? doctorName;
            doctorSpecialty = doc?.specialty ?? "";
            doctorAvatarUrl = doc?.avatarUrl ?? null;
          } catch { /* use defaults */ }

          return {
            conversationId,
            otherPartyId:   doctorId,
            otherPartyName: doctorName,
            otherPartyRole: "doctor",
            otherPartySpecialty: doctorSpecialty,
            otherPartyAvatarUrl: doctorAvatarUrl,
            lastMessage: lastMessage ? { text: lastMessage.text, createdAt: lastMessage.createdAt, senderRole: lastMessage.senderRole } : null,
            unreadCount,
          };
        })
      );

      // Sort by last message time (most recent first), then alphabetically
      conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? "";
        const bTime = b.lastMessage?.createdAt ?? "";
        return bTime.localeCompare(aTime);
      });

      res.json({ conversations });

    } else {
      // Doctor: get all patients they have appointments with
      const appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT DISTINCT c.patientId FROM c WHERE c.doctorId = @doctorId AND c.status != 'cancelled'`,
        parameters: [{ name: "@doctorId", value: userId }],
      });

      const uniquePatientIds = Array.from(new Set(appointments.map((a: any) => a.patientId)));

      const conversations = await Promise.all(
        uniquePatientIds.map(async (patientId: string) => {
          const conversationId = makeConversationId(patientId, userId);

          let lastMessage: any = null;
          try {
            const msgs = await queryDocuments<any>(messagesContainer, {
              query: `SELECT TOP 1 * FROM c WHERE c.conversationId = @cid ORDER BY c.createdAt DESC`,
              parameters: [{ name: "@cid", value: conversationId }],
            });
            if (msgs.length > 0) lastMessage = msgs[0];
          } catch { /* no messages yet */ }

          let unreadCount = 0;
          try {
            const unread = await queryDocuments<any>(messagesContainer, {
              query: `SELECT VALUE COUNT(1) FROM c WHERE c.conversationId = @cid AND c.senderId != @uid AND c.isRead = false`,
              parameters: [
                { name: "@cid", value: conversationId },
                { name: "@uid", value: userId },
              ],
            });
            unreadCount = unread[0] ?? 0;
          } catch { /* ignore */ }

          let patientName = "Patient";
          let patientAvatarUrl: string | null = null;
          try {
            const { resource: pat } = await patientsContainer.item(patientId, patientId).read();
            patientName     = pat?.fullName ?? patientName;
            patientAvatarUrl = pat?.avatarUrl ?? null;
          } catch { /* use defaults */ }

          return {
            conversationId,
            otherPartyId:       patientId,
            otherPartyName:     patientName,
            otherPartyRole:     "patient",
            otherPartyAvatarUrl: patientAvatarUrl,
            lastMessage: lastMessage ? { text: lastMessage.text, createdAt: lastMessage.createdAt, senderRole: lastMessage.senderRole } : null,
            unreadCount,
          };
        })
      );

      conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? "";
        const bTime = b.lastMessage?.createdAt ?? "";
        return bTime.localeCompare(aTime);
      });

      res.json({ conversations });
    }
  } catch (err) {
    console.error("List conversations error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/messages/:conversationId ──────────────────────────────────────
// Fetch full message history for a conversation.
// Also marks all messages from the other party as read.
router.get("/:conversationId(*)", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId         = req.session!.getUserId();
  const { conversationId } = req.params;

  const parsed = parseConversationId(conversationId);
  if (!parsed) {
    res.status(400).json({ error: "Invalid conversationId format." });
    return;
  }

  const { patientId, doctorId } = parsed;
  if (userId !== patientId && userId !== doctorId) {
    res.status(403).json({ error: "Not authorized." });
    return;
  }

  try {
    const messages = await queryDocuments<any>(messagesContainer, {
      query: `SELECT * FROM c WHERE c.conversationId = @cid ORDER BY c.createdAt ASC`,
      parameters: [{ name: "@cid", value: conversationId }],
    });

    // Mark unread messages from the other party as read (best-effort, non-fatal)
    const unread = messages.filter((m: any) => m.senderId !== userId && !m.isRead);
    for (const msg of unread) {
      try {
        await messagesContainer.items.upsert({ ...msg, isRead: true });
      } catch { /* ignore */ }
    }

    res.json({ messages, conversationId });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/messages/:conversationId ─────────────────────────────────────
// Persist a new message in a conversation.
// Body: { text: string }
router.post("/:conversationId(*)", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId             = req.session!.getUserId();
  const { conversationId } = req.params;
  const { text }           = req.body;

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required." });
    return;
  }

  const parsed = parseConversationId(conversationId);
  if (!parsed) {
    res.status(400).json({ error: "Invalid conversationId format." });
    return;
  }

  const { patientId, doctorId } = parsed;
  if (userId !== patientId && userId !== doctorId) {
    res.status(403).json({ error: "Not authorized." });
    return;
  }

  // Patient needs an appointment to message the doctor
  if (userId === patientId) {
    const allowed = await hasAppointment(patientId, doctorId);
    if (!allowed) {
      res.status(403).json({ error: "No appointment found with this doctor." });
      return;
    }
  }

  try {
    const senderRole = userId === patientId ? "patient" : "doctor";

    const message = {
      id:             generateId(),
      conversationId,
      patientId,
      doctorId,
      senderId:       userId,
      senderRole,
      text:           text.trim(),
      isRead:         false,
      createdAt:      new Date().toISOString(),
    };

    await messagesContainer.items.create(message);

    res.status(201).json({ message });
  } catch (err) {
    console.error("Save message error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
