import { Router, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  clinicMessagesContainer,
  clinicsContainer,
  doctorsContainer,
  queryDocuments,
} from "../config/cosmos";
import { livekitApiKey, livekitApiSecret } from "../config/livekit";
import { devFallbackOrThrow } from "../utils/env";

const router = Router();

// Messaging between a clinic org owner, its branch-user "senior staff"
// accounts, and the doctors of a particular branch — kept entirely separate
// from patient<->doctor chat (messages.ts / messagesContainer): different
// container, different conversationId prefix, different authorization rules
// (there's no "appointment" concept here). Allowed pairs, matching what the
// clinic-portal UI offers each role:
//   org owner  <-> branch-user staff of that same org (any branch)
//   branch-user staff <-> doctors whose clinicId is that staff's own branch
//   branch-user staff <-> their own org owner
// Anything else (owner<->doctor directly, staff<->staff, cross-branch
// staff<->doctor) is rejected.

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `cmsg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** conversationId is "staffchat:{sortedIdA}:{sortedIdB}" — the two participant
 *  ids sorted lexicographically so it's deterministic regardless of who
 *  initiates (unlike patient<->doctor chat, neither side has a fixed slot). */
function makeConversationId(idA: string, idB: string): string {
  const [a, b] = [idA, idB].sort();
  return `staffchat:${a}:${b}`;
}

function parseConversationId(conversationId: string): { idA: string; idB: string } | null {
  const parts = conversationId.split(":");
  if (parts.length !== 3 || parts[0] !== "staffchat") return null;
  return { idA: parts[1], idB: parts[2] };
}

type Actor =
  | { type: "owner"; id: string; doc: any }
  | { type: "staff"; id: string; doc: any }
  | { type: "doctor"; id: string; doc: any }
  | null;

async function resolveActor(userId: string): Promise<Actor> {
  const { resource: clinicDoc } = await clinicsContainer.item(userId, userId).read().catch(() => ({ resource: undefined as any }));
  if (clinicDoc) {
    return clinicDoc.branchId
      ? { type: "staff", id: userId, doc: clinicDoc }
      : { type: "owner", id: userId, doc: clinicDoc };
  }
  const { resource: doctorDoc } = await doctorsContainer.item(userId, userId).read().catch(() => ({ resource: undefined as any }));
  if (doctorDoc) return { type: "doctor", id: userId, doc: doctorDoc };
  return null;
}

/** Verifies idA/idB are an allowed pair and returns their resolved actors. */
async function resolveAllowedPair(idA: string, idB: string): Promise<{ a: Actor; b: Actor } | null> {
  const [a, b] = await Promise.all([resolveActor(idA), resolveActor(idB)]);
  if (!a || !b) return null;

  const isOwnerStaffPair =
    (a.type === "owner" && b.type === "staff" && b.doc.orgId === a.id) ||
    (b.type === "owner" && a.type === "staff" && a.doc.orgId === b.id);
  if (isOwnerStaffPair) return { a, b };

  const isStaffDoctorPair =
    (a.type === "staff" && b.type === "doctor" && b.doc.clinicId === a.doc.branchId) ||
    (b.type === "staff" && a.type === "doctor" && a.doc.clinicId === b.doc.branchId);
  if (isStaffDoctorPair) return { a, b };

  return null;
}

function makeChatToken(userId: string, channel: string, name?: string): Promise<string> {
  const at = new AccessToken(livekitApiKey, livekitApiSecret, { identity: userId, name, ttl: 4 * 60 * 60 });
  at.addGrant({ roomJoin: true, room: channel, canPublish: true, canSubscribe: true, canPublishData: true });
  return at.toJwt();
}

function actorName(actor: Exclude<Actor, null>): string {
  if (actor.type === "doctor") return actor.doc.fullName ?? "Doctor";
  return actor.doc.fullName ?? actor.doc.clinicName ?? (actor.type === "owner" ? "Clinic Admin" : "Senior Staff");
}

function actorAvatar(actor: Exclude<Actor, null>): string | null {
  return actor.doc.avatarUrl ?? actor.doc.clinicImageUrl ?? null;
}

// ─── GET /api/clinic-messages/token ──────────────────────────────────────────
router.get("/token", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId  = req.session!.getUserId();
  const channel = req.query.channel as string;

  if (!channel) { res.status(400).json({ error: "channel query param is required" }); return; }
  const parsed = parseConversationId(channel);
  if (!parsed) { res.status(400).json({ error: "Invalid channel format." }); return; }
  if (userId !== parsed.idA && userId !== parsed.idB) { res.status(403).json({ error: "Not authorized for this channel." }); return; }

  const pair = await resolveAllowedPair(parsed.idA, parsed.idB);
  if (!pair) { res.status(403).json({ error: "Not authorized for this channel." }); return; }

  try {
    const self = pair.a!.id === userId ? pair.a! : pair.b!;
    const wsUrl = process.env.LIVEKIT_WS_URL_DOCTOR || process.env.LIVEKIT_WS_URL_PATIENT || process.env.LIVEKIT_WS_URL || devFallbackOrThrow("LIVEKIT_WS_URL", "ws://localhost:7880");
    const token = await makeChatToken(userId, channel, actorName(self));
    res.json({ token, wsUrl, channel });
  } catch (err) {
    console.error("Clinic chat token error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinic-messages/conversations ──────────────────────────────────
// Contact list depends entirely on the caller's own role — an org owner sees
// their staff, a staff account sees their branch's doctors plus their own
// owner, a doctor sees the senior staff of their own branch.
router.get("/conversations", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();

  try {
    const self = await resolveActor(userId);
    if (!self) { res.status(403).json({ error: "Not authorized." }); return; }

    let others: Exclude<Actor, null>[] = [];

    if (self.type === "owner") {
      const staff = await queryDocuments<any>(clinicsContainer, {
        query: "SELECT * FROM c WHERE c.orgId = @orgId AND c.status != 'deleted'",
        parameters: [{ name: "@orgId", value: self.id }],
      });
      others = staff.map((doc) => ({ type: "staff" as const, id: doc.id, doc }));
    } else if (self.type === "staff") {
      const doctors = await queryDocuments<any>(doctorsContainer, {
        query: "SELECT * FROM c WHERE c.clinicId = @clinicId AND c.status = 'approved'",
        parameters: [{ name: "@clinicId", value: self.doc.branchId }],
      });
      others = doctors.map((doc) => ({ type: "doctor" as const, id: doc.id, doc }));
      if (self.doc.orgId) {
        const owner = await resolveActor(self.doc.orgId);
        if (owner) others.push(owner);
      }
    } else if (self.type === "doctor") {
      const staff = await queryDocuments<any>(clinicsContainer, {
        query: "SELECT * FROM c WHERE c.branchId = @branchId AND c.status != 'deleted'",
        parameters: [{ name: "@branchId", value: self.doc.clinicId }],
      });
      others = staff.map((doc) => ({ type: "staff" as const, id: doc.id, doc }));
    }

    const conversations = await Promise.all(
      others.map(async (other) => {
        const conversationId = makeConversationId(userId, other.id);

        let lastMessage: any = null;
        try {
          const msgs = await queryDocuments<any>(clinicMessagesContainer, {
            query: "SELECT TOP 1 * FROM c WHERE c.conversationId = @cid ORDER BY c.createdAt DESC",
            parameters: [{ name: "@cid", value: conversationId }],
          });
          if (msgs.length > 0) lastMessage = msgs[0];
        } catch { /* no messages yet */ }

        let unreadCount = 0;
        try {
          const unread = await queryDocuments<any>(clinicMessagesContainer, {
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.conversationId = @cid AND c.senderId != @uid AND c.isRead = false",
            parameters: [{ name: "@cid", value: conversationId }, { name: "@uid", value: userId }],
          });
          unreadCount = unread[0] ?? 0;
        } catch { /* ignore */ }

        return {
          conversationId,
          otherPartyId: other.id,
          otherPartyName: actorName(other),
          otherPartyRole: other.type, // "owner" | "staff" | "doctor"
          otherPartySpecialty: other.type === "doctor" ? (other.doc.specialty ?? "") : "",
          otherPartyAvatarUrl: actorAvatar(other),
          lastMessage: lastMessage ? { text: lastMessage.text, createdAt: lastMessage.createdAt, senderId: lastMessage.senderId, senderRole: lastMessage.senderRole } : null,
          unreadCount,
        };
      })
    );

    conversations.sort((x, y) => (y.lastMessage?.createdAt ?? "").localeCompare(x.lastMessage?.createdAt ?? ""));
    res.json({ conversations, selfRole: self.type });
  } catch (err) {
    console.error("List clinic conversations error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/clinic-messages/:conversationId ────────────────────────────────
router.get("/:conversationId(*)", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { conversationId } = req.params;

  const parsed = parseConversationId(conversationId);
  if (!parsed) { res.status(400).json({ error: "Invalid conversationId format." }); return; }
  if (userId !== parsed.idA && userId !== parsed.idB) { res.status(403).json({ error: "Not authorized." }); return; }

  const pair = await resolveAllowedPair(parsed.idA, parsed.idB);
  if (!pair) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const messages = await queryDocuments<any>(clinicMessagesContainer, {
      query: "SELECT * FROM c WHERE c.conversationId = @cid ORDER BY c.createdAt ASC",
      parameters: [{ name: "@cid", value: conversationId }],
    });

    const unread = messages.filter((m: any) => m.senderId !== userId && !m.isRead);
    for (const msg of unread) {
      try { await clinicMessagesContainer.items.upsert({ ...msg, isRead: true }); } catch { /* ignore */ }
    }

    res.json({ messages, conversationId });
  } catch (err) {
    console.error("Fetch clinic messages error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/clinic-messages/:conversationId ───────────────────────────────
// Body: { text: string }
router.post("/:conversationId(*)", verifySession(), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  const { conversationId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) { res.status(400).json({ error: "text is required." }); return; }

  const parsed = parseConversationId(conversationId);
  if (!parsed) { res.status(400).json({ error: "Invalid conversationId format." }); return; }
  if (userId !== parsed.idA && userId !== parsed.idB) { res.status(403).json({ error: "Not authorized." }); return; }

  const pair = await resolveAllowedPair(parsed.idA, parsed.idB);
  if (!pair) { res.status(403).json({ error: "Not authorized." }); return; }

  try {
    const self = pair.a!.id === userId ? pair.a! : pair.b!;
    const message = {
      id: generateId(),
      conversationId,
      senderId: userId,
      senderRole: self.type, // "owner" | "staff" | "doctor"
      text: text.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await clinicMessagesContainer.items.create(message);
    res.status(201).json({ message });
  } catch (err) {
    console.error("Save clinic message error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
