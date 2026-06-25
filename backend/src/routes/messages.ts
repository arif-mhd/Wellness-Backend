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

/** conversationId is always "chat:{profileId}:{doctorId}" — deterministic regardless of who initiates */
function makeConversationId(profileId: string, doctorId: string): string {
  return `chat:${profileId}:${doctorId}`;
}

/** Parse a conversationId back into parts */
function parseConversationId(conversationId: string): { profileId: string; doctorId: string } | null {
  const parts = conversationId.split(":");
  if (parts.length !== 3 || parts[0] !== "chat") return null;
  return { profileId: parts[1], doctorId: parts[2] };
}

/**
 * Resolve which account (real patientId / session owner) a profileId belongs
 * to. profileId === patientId for the account owner; for a family member,
 * profileId is NOT a session/login id, so we look up which patient document
 * lists it in familyMembers. Returns null if no patient owns this profileId.
 */
async function resolveAccountOwner(profileId: string): Promise<string | null> {
  try {
    const results = await queryDocuments<any>(patientsContainer, {
      query: `SELECT VALUE c.id FROM c
              WHERE c.id = @pid
                 OR EXISTS(SELECT VALUE m FROM m IN c.familyMembers WHERE m.id = @pid)`,
      parameters: [{ name: "@pid", value: profileId }],
    });
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

/** Check if a profile has a non-cancelled appointment with the given doctor */
async function hasAppointment(accountOwnerId: string, profileId: string, doctorId: string): Promise<boolean> {
  try {
    const results = await queryDocuments<any>(appointmentsContainer, {
      query: `SELECT TOP 1 c.id FROM c
              WHERE c.patientId = @patientId
                AND c.doctorId = @doctorId
                AND c.status != 'cancelled'
                AND (
                  (@isSelf = true AND (NOT IS_DEFINED(c.familyMemberId) OR c.familyMemberId = null))
                  OR (@isSelf = false AND c.familyMemberId = @profileId)
                )`,
      parameters: [
        { name: "@patientId", value: accountOwnerId },
        { name: "@doctorId",  value: doctorId  },
        { name: "@isSelf",    value: profileId === accountOwnerId },
        { name: "@profileId", value: profileId },
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
    res.status(400).json({ error: "Invalid channel format. Expected: chat:profileId:doctorId" });
    return;
  }

  const { profileId, doctorId } = parsed;
  const accountOwnerId = await resolveAccountOwner(profileId);

  // Caller must be the account that owns this profile, or the doctor
  const isPatientSide = accountOwnerId !== null && userId === accountOwnerId;
  if (!isPatientSide && userId !== doctorId) {
    res.status(403).json({ error: "Not authorized for this channel." });
    return;
  }

  // Patient-initiated: check the profile has an appointment with the doctor
  if (isPatientSide) {
    const allowed = await hasAppointment(accountOwnerId!, profileId, doctorId);
    if (!allowed) {
      res.status(403).json({ error: "No appointment found with this doctor. Please book an appointment first." });
      return;
    }
  }

  try {
    let displayName: string | undefined;
    try {
      if (isPatientSide) {
        const { resource: p } = await patientsContainer.item(accountOwnerId!, accountOwnerId!).read();
        if (profileId === accountOwnerId) {
          displayName = p?.fullName;
        } else {
          const member = p?.familyMembers?.find((m: any) => m.id === profileId);
          displayName = member?.fullName ?? p?.fullName;
        }
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
      // Get all of this account's appointments (self + family members), then
      // group by profile so we can enumerate every profile's conversations.
      const appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT c.doctorId, c.familyMemberId FROM c WHERE c.patientId = @patientId AND c.status != 'cancelled'`,
        parameters: [{ name: "@patientId", value: userId }],
      });

      const patientDoc = await patientsContainer.item(userId, userId).read().then(r => r.resource).catch(() => null);

      // Unique (profileId, doctorId) pairs across all profiles on this account
      const pairKeys = new Set<string>();
      const pairs: { profileId: string; doctorId: string }[] = [];
      for (const apt of appointments) {
        const profileId = apt.familyMemberId ?? userId;
        const key = `${profileId}::${apt.doctorId}`;
        if (!pairKeys.has(key)) {
          pairKeys.add(key);
          pairs.push({ profileId, doctorId: apt.doctorId });
        }
      }

      const conversations = await Promise.all(
        pairs.map(async ({ profileId, doctorId }) => {
          const conversationId = makeConversationId(profileId, doctorId);

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

          // Resolve which profile (self or which family member) this thread belongs to
          let profileName = patientDoc?.fullName ?? "Me";
          if (profileId !== userId) {
            const member = patientDoc?.familyMembers?.find((m: any) => m.id === profileId);
            profileName = member?.fullName ?? "Family Member";
          }

          return {
            conversationId,
            profileId,
            profileName,
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
      // Doctor: get all profiles (account owner or family member) they have
      // appointments with, across every patient account.
      const appointments = await queryDocuments<any>(appointmentsContainer, {
        query: `SELECT c.patientId, c.familyMemberId FROM c WHERE c.doctorId = @doctorId AND c.status != 'cancelled'`,
        parameters: [{ name: "@doctorId", value: userId }],
      });

      const pairKeys = new Set<string>();
      const pairs: { patientId: string; profileId: string }[] = [];
      for (const apt of appointments) {
        const profileId = apt.familyMemberId ?? apt.patientId;
        const key = `${apt.patientId}::${profileId}`;
        if (!pairKeys.has(key)) {
          pairKeys.add(key);
          pairs.push({ patientId: apt.patientId, profileId });
        }
      }

      const conversations = await Promise.all(
        pairs.map(async ({ patientId, profileId }) => {
          const conversationId = makeConversationId(profileId, userId);

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
            if (profileId === patientId) {
              patientName     = pat?.fullName ?? patientName;
              patientAvatarUrl = pat?.avatarUrl ?? null;
            } else {
              const member = pat?.familyMembers?.find((m: any) => m.id === profileId);
              patientName     = member?.fullName ?? patientName;
              patientAvatarUrl = member?.avatarUrl ?? null;
            }
          } catch { /* use defaults */ }

          return {
            conversationId,
            profileId,
            profileName:        patientName,
            otherPartyId:       profileId,
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

  const { profileId, doctorId } = parsed;
  const accountOwnerId = await resolveAccountOwner(profileId);
  const isPatientSide = accountOwnerId !== null && userId === accountOwnerId;
  if (!isPatientSide && userId !== doctorId) {
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

  const { profileId, doctorId } = parsed;
  const accountOwnerId = await resolveAccountOwner(profileId);
  const isPatientSide = accountOwnerId !== null && userId === accountOwnerId;
  if (!isPatientSide && userId !== doctorId) {
    res.status(403).json({ error: "Not authorized." });
    return;
  }

  // Patient needs an appointment to message the doctor
  if (isPatientSide) {
    const allowed = await hasAppointment(accountOwnerId!, profileId, doctorId);
    if (!allowed) {
      res.status(403).json({ error: "No appointment found with this doctor." });
      return;
    }
  }

  try {
    const senderRole = isPatientSide ? "patient" : "doctor";

    let profileName: string | undefined;
    if (isPatientSide) {
      try {
        const { resource: p } = await patientsContainer.item(accountOwnerId!, accountOwnerId!).read();
        if (profileId === accountOwnerId) {
          profileName = p?.fullName;
        } else {
          const member = p?.familyMembers?.find((m: any) => m.id === profileId);
          profileName = member?.fullName ?? p?.fullName;
        }
      } catch { /* use undefined */ }
    }

    const message = {
      id:             generateId(),
      conversationId,
      patientId:      accountOwnerId ?? profileId,
      doctorId,
      profileId,
      profileName:    profileName ?? null,
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
