import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { otpCodesContainer, patientsContainer, pharmaciesContainer } from "../config/cosmos";
import { resend, FROM_EMAIL } from "../config/resend";

const router = Router();

// ── POST /api/otp/send ───────────────────────────────────────────────────────
// Public. Generates a 6-digit code, stores it in Cosmos (TTL 600s), sends via Resend.
// purpose: "registration" (default) blocks if email exists in patients; "reset" blocks if NOT in patients;
//          "pharmacy_reset" blocks if NOT in pharmacies.
router.post("/send", async (req: Request, res: Response) => {
  try {
    const { email, purpose = "registration" } = req.body;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "INVALID_EMAIL" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

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

    // Rate-limit: one send per 60 seconds per email
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { resources: recent } = await otpCodesContainer.items
      .query({
        query:
          "SELECT c.createdAt FROM c WHERE c.email = @email AND c.createdAt > @since",
        parameters: [
          { name: "@email", value: normalizedEmail },
          { name: "@since", value: since },
        ],
      })
      .fetchAll();

    if (recent.length > 0) {
      const createdAt = new Date(recent[0].createdAt).getTime();
      const retryAfter = Math.ceil((createdAt + 60000 - Date.now()) / 1000);
      res.status(429).json({ error: "TOO_SOON", retryAfter });
      return;
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing OTP docs for this email (cleanup old ones)
    const { resources: oldDocs } = await otpCodesContainer.items
      .query({
        query: "SELECT c.id, c.email FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    for (const doc of oldDocs) {
      try {
        await otpCodesContainer.item(doc.id, doc.email).delete();
      } catch {
        // ignore — may already be TTL-expired
      }
    }

    // Store new OTP document
    await otpCodesContainer.items.create({
      id: uuidv4(),
      email: normalizedEmail,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: now,
      ttl: 600,
    });

    const isReset = purpose === "reset";
    // Send email via Resend
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: isReset
        ? "Reset your Methuselah password"
        : "Your Methuselah verification code",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1E293B; margin-bottom: 8px;">
            ${isReset ? "Reset your password" : "Verify your email"}
          </h2>
          <p style="color: #64748B; margin-bottom: 24px;">
            ${isReset
              ? "Use the code below to reset your password. It expires in <strong>10 minutes</strong>."
              : "Use the code below to complete your registration. It expires in <strong>10 minutes</strong>."}
          </p>
          <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #6182FF;">
              ${code}
            </span>
          </div>
          <p style="color: #94A3B8; font-size: 13px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    res.json({ sent: true });
  } catch (err) {
    console.error("[otp/send] error:", err);
    res.status(500).json({ error: "SEND_FAILED" });
  }
});

// ── POST /api/otp/verify ─────────────────────────────────────────────────────
// Public. Checks the code and marks the OTP document as verified.
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: "MISSING_FIELDS" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the latest OTP doc for this email
    const { resources } = await otpCodesContainer.items
      .query({
        query:
          "SELECT * FROM c WHERE c.email = @email ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@email", value: normalizedEmail }],
      })
      .fetchAll();

    if (!resources.length) {
      res.json({ verified: false, reason: "NO_OTP" });
      return;
    }

    const doc = resources[0];

    if (new Date(doc.expiresAt) < new Date()) {
      res.json({ verified: false, reason: "EXPIRED" });
      return;
    }

    if (doc.attempts >= 5) {
      res.json({ verified: false, reason: "TOO_MANY_ATTEMPTS" });
      return;
    }

    if (doc.code !== code.trim()) {
      // Increment attempts
      await otpCodesContainer.item(doc.id, doc.email).replace({
        ...doc,
        attempts: doc.attempts + 1,
      });
      res.json({
        verified: false,
        reason: "INVALID_CODE",
        attemptsLeft: 5 - (doc.attempts + 1),
      });
      return;
    }

    // Code matches — mark as verified
    await otpCodesContainer.item(doc.id, doc.email).replace({
      ...doc,
      verified: true,
    });

    res.json({ verified: true });
  } catch (err) {
    console.error("[otp/verify] error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
