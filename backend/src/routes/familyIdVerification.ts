import { Response, Router } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { v4 as uuidv4 } from "uuid";
import { requireRole } from "../middleware/requireRole";

// ─────────────────────────────────────────────────────────────────────────────
// Family-member Emirates ID verification — MOCK
//
// Real flow (not built yet): read the uploaded Emirates ID (OCR / ICP / UAE
// PASS lookup) to get the holder's date of birth and registered mobile, and
// if the holder is 18+ send an SMS OTP to that mobile which must be entered
// before the member can be added. Under-18s need no OTP.
//
// Mock flow (this file):
//   • "Reading" the card derives the birth year from the ID number itself —
//     the second block of a UAE ID (784-YYYY-NNNNNNN-N) is the birth year. If
//     the form's DOB falls in that year it's used as the full date, otherwise
//     1 Jan of that year.
//   • The member's phone number from the form stands in for "the mobile
//     registered on the Emirates ID".
//   • The OTP is printed in this backend's terminal, the same way dev
//     registration OTPs are (see routes/otp.ts), instead of being sent by SMS.
//   • State lives in memory — fine for a mock, lost on restart.
//
// Disabled in production unless EID_VERIFICATION_MOCK=true, so real users'
// codes are never written to production logs by accident.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

const VERIFICATION_TTL_MS = 30 * 60 * 1000; // a read result is usable for 30 min
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const ADULT_AGE = 18;

export function isFamilyIdVerificationEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.EID_VERIFICATION_MOCK === "true";
}

interface VerificationRecord {
  id: string;
  userId: string;
  emiratesId: string; // normalised: 784-YYYY-NNNNNNN-N
  dob: string; // dd/mm/yyyy, as read from the card
  age: number;
  isAdult: boolean;
  mobile: string; // digits only
  verified: boolean;
  otp?: { code: string; expiresAt: number; sentAt: number; attemptsLeft: number };
  expiresAt: number;
}

const records = new Map<string, VerificationRecord>();

function purgeExpired() {
  const now = Date.now();
  for (const [id, rec] of records) if (rec.expiresAt < now) records.delete(id);
}

// 15 digits starting 784, dashes optional. Returns the canonical dashed form.
export function normalizeEmiratesId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^784\d{12}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`;
}

function parseDdMmYyyy(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageOn(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatDob = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const maskMobile = (digits: string) => `•••• ${digits.slice(-4)}`;

function getOwnRecord(req: SessionRequest, res: Response): VerificationRecord | null {
  purgeExpired();
  const userId = req.session!.getUserId();
  const id = req.body?.verificationId;
  const rec = typeof id === "string" ? records.get(id) : undefined;
  if (!rec || rec.userId !== userId) {
    res.status(404).json({ error: "VERIFICATION_NOT_FOUND" });
    return null;
  }
  return rec;
}

router.use((_req, res, next) => {
  if (!isFamilyIdVerificationEnabled()) {
    res.status(503).json({ error: "VERIFICATION_UNAVAILABLE" });
    return;
  }
  next();
});

// ── POST /api/family-id-verification/read ────────────────────────────────────
// Body: { emiratesId, phone?, dob? }  (dob as dd/mm/yyyy, from the form)
// "Reads" the uploaded Emirates ID and reports the holder's age. Under-18s
// come back already verified; adults come back needing an OTP.
router.post("/read", requireRole("patient"), (req: SessionRequest, res: Response) => {
  purgeExpired();
  const userId = req.session!.getUserId();
  const emiratesId = normalizeEmiratesId(req.body?.emiratesId);
  if (!emiratesId) {
    res.status(400).json({ error: "INVALID_EMIRATES_ID" });
    return;
  }

  const birthYear = Number(emiratesId.slice(4, 8));
  const thisYear = new Date().getFullYear();
  if (birthYear < 1900 || birthYear > thisYear) {
    res.status(422).json({ error: "UNREADABLE_EMIRATES_ID" });
    return;
  }

  const formDob = parseDdMmYyyy(req.body?.dob);
  let dob = formDob && formDob.getFullYear() === birthYear ? formDob : new Date(birthYear, 0, 1);
  if (dob.getTime() > Date.now()) dob = new Date(birthYear, 0, 1);
  const age = ageOn(dob);
  const isAdult = age >= ADULT_AGE;

  const mobile = typeof req.body?.phone === "string" ? req.body.phone.replace(/\D/g, "") : "";
  if (isAdult && mobile.length < 7) {
    res.status(400).json({ error: "MOBILE_REQUIRED" });
    return;
  }

  // One live verification per user + ID — a re-read replaces the old one.
  for (const [id, rec] of records) {
    if (rec.userId === userId && rec.emiratesId === emiratesId) records.delete(id);
  }

  const rec: VerificationRecord = {
    id: uuidv4(),
    userId,
    emiratesId,
    dob: formatDob(dob),
    age,
    isAdult,
    mobile,
    verified: !isAdult,
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
  };
  records.set(rec.id, rec);

  console.log(
    `[eid-verify] MOCK read ${emiratesId} → dob ${rec.dob}, age ${age} ` +
      (isAdult ? "(adult — OTP required)" : "(minor — no OTP needed, verified)")
  );

  res.json({
    verificationId: rec.id,
    emiratesId,
    dob: rec.dob,
    age,
    isAdult,
    requiresOtp: isAdult,
    verified: rec.verified,
    registeredMobile: isAdult ? maskMobile(mobile) : null,
    mock: true,
  });
});

// ── POST /api/family-id-verification/otp/send ────────────────────────────────
// Body: { verificationId }
router.post("/otp/send", requireRole("patient"), (req: SessionRequest, res: Response) => {
  const rec = getOwnRecord(req, res);
  if (!rec) return;
  if (!rec.isAdult) {
    res.status(400).json({ error: "OTP_NOT_REQUIRED" });
    return;
  }
  if (rec.verified) {
    res.json({ sent: false, verified: true });
    return;
  }
  const now = Date.now();
  if (rec.otp && now - rec.otp.sentAt < OTP_RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - rec.otp.sentAt)) / 1000);
    res.status(429).json({ error: "TOO_SOON", retryAfter });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  rec.otp = { code, sentAt: now, expiresAt: now + OTP_TTL_MS, attemptsLeft: OTP_MAX_ATTEMPTS };

  // Stand-in for the SMS to the Emirates ID's registered mobile.
  console.warn(
    `[eid-verify] MOCK SMS — OTP for Emirates ID ${rec.emiratesId} ` +
      `(mobile ${maskMobile(rec.mobile)}) is: ${code}`
  );

  res.json({ sent: true, registeredMobile: maskMobile(rec.mobile), expiresInSeconds: OTP_TTL_MS / 1000 });
});

// ── POST /api/family-id-verification/otp/verify ──────────────────────────────
// Body: { verificationId, code }
router.post("/otp/verify", requireRole("patient"), (req: SessionRequest, res: Response) => {
  const rec = getOwnRecord(req, res);
  if (!rec) return;
  if (rec.verified) {
    res.json({ verified: true });
    return;
  }
  if (!rec.otp) {
    res.status(400).json({ verified: false, reason: "NO_OTP" });
    return;
  }
  if (rec.otp.expiresAt < Date.now()) {
    res.status(400).json({ verified: false, reason: "EXPIRED" });
    return;
  }
  if (rec.otp.attemptsLeft <= 0) {
    res.status(429).json({ verified: false, reason: "TOO_MANY_ATTEMPTS" });
    return;
  }
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (code !== rec.otp.code) {
    rec.otp.attemptsLeft--;
    res.status(400).json({
      verified: false,
      reason: rec.otp.attemptsLeft > 0 ? "INVALID_CODE" : "TOO_MANY_ATTEMPTS",
      attemptsLeft: rec.otp.attemptsLeft,
    });
    return;
  }
  rec.verified = true;
  rec.otp = undefined;
  console.log(`[eid-verify] MOCK OTP verified for Emirates ID ${rec.emiratesId}`);
  res.json({ verified: true });
});

// ── Used by POST /api/patients/family ───────────────────────────────────────
// Checks that `verificationId` is this user's completed verification of this
// exact Emirates ID. Does not consume it — call consumeFamilyIdVerification
// once the member has actually been saved, so a failed save can be retried.
export function checkFamilyIdVerification(
  userId: string,
  verificationId: unknown,
  emiratesId: unknown
): { ok: true; record: VerificationRecord } | { ok: false; error: string } {
  purgeExpired();
  const normalized = normalizeEmiratesId(emiratesId);
  if (!normalized) return { ok: false, error: "INVALID_EMIRATES_ID" };
  const rec = typeof verificationId === "string" ? records.get(verificationId) : undefined;
  if (!rec || rec.userId !== userId || rec.emiratesId !== normalized) {
    return { ok: false, error: "EMIRATES_ID_NOT_VERIFIED" };
  }
  if (!rec.verified) return { ok: false, error: "EMIRATES_ID_OTP_PENDING" };
  return { ok: true, record: rec };
}

export function consumeFamilyIdVerification(verificationId: string) {
  records.delete(verificationId);
}

export default router;
