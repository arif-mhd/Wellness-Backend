import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { otpCodesContainer, patientsContainer, pharmaciesContainer } from "../config/cosmos";
import { sendOtpEmail } from "../config/resend";

const router = Router();

const MAX_ATTEMPTS = 5;

// ── POST /api/otp/send ───────────────────────────────────────────────────────
// Public. Generates a 6-digit code, stores it in otpCodesContainer (TTL 600s), sends via Resend.
// purpose:
//   "registration"   — blocks if email already exists in patients
//   "reset"          — blocks if email NOT in patients
//   "pharmacy_reset" — blocks if email NOT in pharmacies
//   "login_2fa"      — no existence check (doctor already authenticated)
//   "enable_2fa"     — no existence check (doctor already authenticated)
//   "doctor_reset"   — no existence check (used by doctor forgot-password flow)
router.post("/send", async (req: Request, res: Response) => {
  try {
    const { email, purpose = "registration" } = req.body;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "INVALID_EMAIL" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Email existence checks only for patient-facing purposes
    if (purpose === "registration" || purpose === "reset") {
      const { resources: existing } = await patientsContainer.items
        .query({
          query: "SELECT c.id FROM c WHERE c.email = @email",
          parameters: [{ name: "@email", value: normalizedEmail }],
        })
        .fetchAll();

      if (purpose === "registration" && existing.length > 0) {
        res.status(409).json({ error: "EMAIL_EXISTS" });
        return;
      }
      if (purpose === "reset" && existing.length === 0) {
        res.status(404).json({ error: "EMAIL_NOT_FOUND" });
        return;
      }
    } else if (purpose === "pharmacy_reset") {
      const { resources: existing } = await pharmaciesContainer.items
        .query({
          query: "SELECT c.id FROM c WHERE c.email = @email",
          parameters: [{ name: "@email", value: normalizedEmail }],
        })
        .fetchAll();

      if (existing.length === 0) {
        res.status(404).json({ error: "EMAIL_NOT_FOUND" });
        return;
      }
    }
    // login_2fa, enable_2fa, doctor_reset — no existence check needed

    // Rate-limit: one send per 60 seconds per email+purpose
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { resources: recent } = await otpCodesContainer.items
      .query({
        query: "SELECT c.createdAt FROM c WHERE c.email = @email AND c.purpose = @purpose AND c.createdAt > @since",
        parameters: [
          { name: "@email",   value: normalizedEmail },
          { name: "@purpose", value: purpose },
          { name: "@since",   value: since },
        ],
      })
      .fetchAll();

    if (recent.length > 0) {
      const createdAt = new Date(recent[0].createdAt).getTime();
      const retryAfter = Math.ceil((createdAt + 60000 - Date.now()) / 1000);
      res.status(429).json({ error: "TOO_SOON", retryAfter });
      return;
    }

    // Delete any existing OTP docs for this email+purpose (cleanup)
    const { resources: oldDocs } = await otpCodesContainer.items
      .query({
        query: "SELECT c.id, c.email FROM c WHERE c.email = @email AND c.purpose = @purpose",
        parameters: [
          { name: "@email",   value: normalizedEmail },
          { name: "@purpose", value: purpose },
        ],
      })
      .fetchAll();

    for (const doc of oldDocs) {
      try { await otpCodesContainer.item(doc.id, doc.email).delete(); } catch { /* TTL-expired */ }
    }

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const now       = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await otpCodesContainer.items.create({
      id:        uuidv4(),
      email:     normalizedEmail,
      code,
      purpose,
      expiresAt,
      attempts:  0,
      verified:  false,
      createdAt: now,
      ttl:       600,
    });

    // Map purpose to sendOtpEmail purpose type
    const emailPurpose: "login" | "enable_2fa" | "registration" | "reset" =
      purpose === "enable_2fa"   ? "enable_2fa"   :
      purpose === "registration" ? "registration" :
      purpose === "reset"        ? "reset"        :
      "login";

    await sendOtpEmail(normalizedEmail, code, emailPurpose);

    res.json({ sent: true });
  } catch (err) {
    console.error("[otp/send] error:", err);
    res.status(500).json({ error: "SEND_FAILED" });
  }
});

// ── POST /api/otp/verify ─────────────────────────────────────────────────────
// Public. Checks the code and marks the OTP document as verified.
// Body: { email, code, purpose? }
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { email, code, purpose } = req.body;

    if (!email || !code) {
      res.status(400).json({ verified: false, reason: "MISSING_FIELDS" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Build query — if purpose provided, match it; otherwise match latest across all purposes
    const querySpec = purpose
      ? {
          query: "SELECT * FROM c WHERE c.email = @email AND c.purpose = @purpose ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
          parameters: [
            { name: "@email",   value: normalizedEmail },
            { name: "@purpose", value: purpose },
          ],
        }
      : {
          query: "SELECT * FROM c WHERE c.email = @email ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
          parameters: [{ name: "@email", value: normalizedEmail }],
        };

    const { resources } = await otpCodesContainer.items.query(querySpec).fetchAll();

    if (!resources.length) {
      res.json({ verified: false, reason: "NO_OTP" });
      return;
    }

    const doc = resources[0];

    if (new Date(doc.expiresAt) < new Date()) {
      res.json({ verified: false, reason: "EXPIRED" });
      return;
    }

    if (doc.attempts >= MAX_ATTEMPTS) {
      res.json({ verified: false, reason: "TOO_MANY_ATTEMPTS" });
      return;
    }

    if (doc.code !== String(code).trim()) {
      await otpCodesContainer.item(doc.id, doc.email).replace({ ...doc, attempts: doc.attempts + 1 });
      const attemptsLeft = MAX_ATTEMPTS - (doc.attempts + 1);
      res.json({ verified: false, reason: attemptsLeft <= 0 ? "TOO_MANY_ATTEMPTS" : "INVALID_CODE", attemptsLeft });
      return;
    }

    // Code matches — mark as verified (don't delete; doctor_reset flow reads verified flag later)
    await otpCodesContainer.item(doc.id, doc.email).replace({ ...doc, verified: true });

    res.json({ verified: true });
  } catch (err) {
    console.error("[otp/verify] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
