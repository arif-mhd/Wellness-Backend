import { Router, Request, Response } from "express";
import { doctorsContainer, patientsContainer } from "../config/cosmos";
import { sendOtpEmail } from "../config/resend";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const OTP_TTL_MS       = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN  = 60 * 1000;       // 1 minute between sends
const MAX_ATTEMPTS     = 5;

// ── Interfaces ────────────────────────────────────────────────────────────────
interface OtpRecord {
  code:        string;
  expiresAt:   number; // epoch ms
  attempts:    number;
  lastSentAt:  number; // epoch ms
  purpose:     "register" | "login_2fa" | "enable_2fa";
}

/**
 * Reads the OTP record embedded in a Cosmos document.
 * We store it in the document under a `_otpStore` map keyed by email.
 *
 * We use a dedicated `otp_store` document in the doctors container with
 * id = "otp_<email_hash>" so it works for both patients (pre-register) and
 * doctors (login 2FA).
 */
async function getOtpDoc(email: string) {
  const id = "otp_" + Buffer.from(email).toString("base64").replace(/=/g, "").slice(0, 40);
  try {
    const { resource } = await doctorsContainer.item(id, id).read();
    return { id, doc: resource ?? null };
  } catch {
    return { id, doc: null };
  }
}

async function saveOtpDoc(id: string, record: OtpRecord, email: string) {
  await doctorsContainer.items.upsert({
    id,
    _type: "otp_store",
    email,
    record,
    updatedAt: new Date().toISOString(),
  });
}

// ── POST /api/otp/send ────────────────────────────────────────────────────────
// Body: { email, purpose?: "register" | "login_2fa" | "enable_2fa" }
// Used by:
//   - Patient registration (purpose = "register")
//   - Doctor 2FA login (purpose = "login_2fa")
//   - Doctor 2FA setup  (purpose = "enable_2fa")
router.post("/send", async (req: Request, res: Response) => {
  const { email, purpose = "register" } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required." });
    return;
  }

  const normalised = email.trim().toLowerCase();
  const { id, doc } = await getOtpDoc(normalised);

  // Rate-limit: don't send again within the cooldown window
  if (doc?.record) {
    const elapsed = Date.now() - (doc.record.lastSentAt ?? 0);
    if (elapsed < RESEND_COOLDOWN) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN - elapsed) / 1000);
      res.status(429).json({ error: "TOO_SOON", retryAfter });
      return;
    }
  }

  const code = generateCode();
  const record: OtpRecord = {
    code,
    expiresAt:  Date.now() + OTP_TTL_MS,
    attempts:   0,
    lastSentAt: Date.now(),
    purpose:    purpose as OtpRecord["purpose"],
  };

  try {
    await saveOtpDoc(id, record, normalised);
    await sendOtpEmail(normalised, code, purpose === "enable_2fa" ? "enable_2fa" : "login");
    res.json({ sent: true });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// ── POST /api/otp/verify ─────────────────────────────────────────────────────
// Body: { email, code }
// Returns: { verified: bool, reason?, attemptsLeft? }
router.post("/verify", async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ verified: false, reason: "MISSING_FIELDS" });
    return;
  }

  const normalised = email.trim().toLowerCase();
  const { id, doc } = await getOtpDoc(normalised);

  if (!doc?.record) {
    res.json({ verified: false, reason: "NO_OTP" });
    return;
  }

  const record: OtpRecord = doc.record;

  if (Date.now() > record.expiresAt) {
    res.json({ verified: false, reason: "EXPIRED" });
    return;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    res.json({ verified: false, reason: "TOO_MANY_ATTEMPTS" });
    return;
  }

  if (record.code !== String(code).trim()) {
    record.attempts += 1;
    await saveOtpDoc(id, record, normalised);
    const attemptsLeft = MAX_ATTEMPTS - record.attempts;
    if (attemptsLeft <= 0) {
      res.json({ verified: false, reason: "TOO_MANY_ATTEMPTS" });
    } else {
      res.json({ verified: false, reason: "INVALID_CODE", attemptsLeft });
    }
    return;
  }

  // ✅ Valid — clear the OTP record so it can't be reused
  await doctorsContainer.item(id, id).delete().catch(() => {});

  res.json({ verified: true });
});

export default router;
