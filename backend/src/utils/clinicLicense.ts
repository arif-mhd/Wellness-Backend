// Clinic licence reading + automatic checks.
//
// The licence is read with Gemini to prefill the registration form, then the
// file and what was read from it are stored on the clinic so an admin can
// compare it against the regulator's register (e.g. DOH Abu Dhabi's TAMM
// health facility licence lookup) before marking it verified. Nothing here
// marks a licence verified on its own — only an admin does that.

export interface ExtractedLicense {
  isLicenseDocument: boolean;
  licenseNumber: string | null;
  secondaryLicense: string | null;
  clinicName: string | null;
  address: string | null;
  region: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;   // YYYY-MM-DD
  expiryDate: string | null;  // YYYY-MM-DD
  ownerNames: string[];
  specialties: string[];
  verificationUrl: string | null;
}

export const LICENSE_MIME = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]);

const LICENSE_EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    isLicenseDocument: { type: "BOOLEAN" },
    licenseNumber:     { type: "STRING", nullable: true },
    secondaryLicense:  { type: "STRING", nullable: true },
    clinicName:        { type: "STRING", nullable: true },
    address:           { type: "STRING", nullable: true },
    region:            { type: "STRING", nullable: true },
    issuingAuthority:  { type: "STRING", nullable: true },
    issueDate:         { type: "STRING", nullable: true },
    expiryDate:        { type: "STRING", nullable: true },
    ownerNames:        { type: "ARRAY", items: { type: "STRING" } },
    specialties:       { type: "ARRAY", items: { type: "STRING" } },
    verificationUrl:   { type: "STRING", nullable: true },
  },
  required: ["isLicenseDocument"],
};

function buildPrompt(secondaryLabel: string): string {
  return `You are reading a healthcare facility (clinic) license or registration certificate. It may be bilingual (e.g. English + Arabic) — read the English side and use the other side only to confirm values.
Extract the following and respond with JSON only:
- isLicenseDocument: true if this is a clinic/healthcare facility license, trade license or registration certificate; false otherwise.
- licenseNumber: the main license / registration / trade license number.
- secondaryLicense: the "${secondaryLabel}" number if it is shown separately from the main license number. If the document only has one license number and it is issued by a health authority, put it here as well.
- clinicName: the registered facility / establishment name, exactly as printed.
- address: the facility's street address as one line. Only fill this if an actual street/building address is printed — if the document only gives a region, emirate, state or city, set address to null and put that in region instead.
- region: the region / emirate / state / city the facility is licensed in.
- issuingAuthority: the authority that issued the license (e.g. "Department of Health - Abu Dhabi").
- issueDate and expiryDate: the license's own "Date of Issue" and "Date of Expiry", converted to YYYY-MM-DD. Dates on UAE and Indian documents are printed day-first (DD/MM/YYYY), so "08/12/2026" is 8 December 2026 → "2026-12-08". If the other-language side prints the same date year-first (e.g. 2026/12/08), use it to confirm. Ignore print dates and insurance-scheme dates.
- ownerNames: each facility owner's name in English, one per entry.
- specialties: the licensed specialties / services listed (English names), one per entry.
- verificationUrl: the URL the document says to use to verify the license, if one is printed.
Copy numbers exactly as printed (keep letters, dashes and slashes). Use null (or an empty list) for anything not clearly visible — never guess.`;
}

/** Normalise a date the model returned to YYYY-MM-DD, or null. Accepts
 *  YYYY-MM-DD / YYYY/MM/DD and day-first DD/MM/YYYY / DD-MM-YYYY (the format
 *  UAE and Indian licences use) as a fallback if the model echoed it raw. */
export function normalizeLicenseDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { d = +match[1]; m = +match[2]; y = +match[3]; }
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null);
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => !!x).slice(0, 20) : []);

/** Shape the model's JSON into an ExtractedLicense. Exported for tests. */
export function shapeExtractedLicense(parsed: any): ExtractedLicense {
  const verificationUrl = str(parsed?.verificationUrl);
  return {
    isLicenseDocument: parsed?.isLicenseDocument !== false,
    licenseNumber:     str(parsed?.licenseNumber),
    secondaryLicense:  str(parsed?.secondaryLicense),
    clinicName:        str(parsed?.clinicName),
    address:           str(parsed?.address),
    region:            str(parsed?.region),
    issuingAuthority:  str(parsed?.issuingAuthority),
    issueDate:         normalizeLicenseDate(parsed?.issueDate),
    expiryDate:        normalizeLicenseDate(parsed?.expiryDate),
    ownerNames:        strList(parsed?.ownerNames),
    specialties:       strList(parsed?.specialties),
    verificationUrl:   verificationUrl && /^https:\/\//i.test(verificationUrl) ? verificationUrl : null,
  };
}

export class LicenseReadError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Read a licence document with Gemini. Throws LicenseReadError with a
 *  user-facing message on failure. */
export async function extractLicense(file: Buffer, mimeType: string, secondaryLabel: string): Promise<ExtractedLicense> {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    console.error("[extract-license] GEMINI_API_KEY is not set");
    throw new LicenseReadError("License reading is not configured. Please fill in the details manually.", 500);
  }

  const body = JSON.stringify({
    contents: [{ parts: [
      { text: buildPrompt(secondaryLabel) },
      { inlineData: { mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType, data: file.toString("base64") } },
    ] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: LICENSE_EXTRACT_SCHEMA, temperature: 0 },
  });

  let responseText: string | null = null;
  let lastError: any = null;
  for (const model of ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).replace(/\s+/g, " ").trim()}`);
      const data = await r.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No text in Gemini response");
      responseText = text;
      break;
    } catch (err: any) {
      console.warn(`[extract-license] ${model} failed:`, err?.message);
      lastError = err;
    }
  }
  if (!responseText) {
    console.error("[extract-license] all models failed:", lastError?.message);
    throw new LicenseReadError("Couldn't read the license right now. Please fill in the details manually.", 502);
  }

  let parsed: any = null;
  const trimmed = responseText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const braced = trimmed.match(/\{[\s\S]*\}/);
    try { parsed = braced ? JSON.parse(braced[0]) : null; } catch { parsed = null; }
  }
  if (!parsed) {
    console.error("[extract-license] unparseable response:", responseText);
    throw new LicenseReadError("Couldn't read the license. Please fill in the details manually.", 502);
  }
  return shapeExtractedLicense(parsed);
}

// ─── Automatic checks ────────────────────────────────────────────────────────

export const LICENSE_EXPIRY_WARNING_DAYS = 30;

export interface LicenseCheck {
  level: "error" | "warning" | "ok";
  code: "missing_file" | "expired" | "expiring_soon" | "valid_until" | "number_mismatch" | "name_mismatch" | "unread";
  message: string;
}

const todayUtc = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

/** Whole days from today until the given YYYY-MM-DD date (negative = past). */
export function daysUntil(isoDate: string, now = new Date()): number | null {
  const n = normalizeLicenseDate(isoDate);
  if (!n) return null;
  const [y, m, d] = n.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - todayUtc(now)) / 86_400_000);
}

const normId = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
// Legal-form suffixes and filler words that differ between a licence and what
// a clinic types as its name ("TAHA MEDICAL CENTRE L.L.C" vs "Taha Medical Center").
const NAME_NOISE = new Set(["LLC", "LL", "FZ", "FZE", "FZCO", "FZLLC", "PVT", "PRIVATE", "LTD", "LIMITED", "CO", "COMPANY", "THE", "AND", "OF", "WLL", "SOLE", "PROPRIETORSHIP", "EST", "ESTABLISHMENT", "BRANCH",
  // Generic healthcare words — "Taha Medical Centre" vs "Al Noor Medical Centre"
  // must not match just because both are medical centres.
  "AL", "EL", "MEDICAL", "CENTRE", "CLINIC", "CLINICS", "POLYCLINIC", "HOSPITAL", "HEALTH", "HEALTHCARE", "CARE",
  "DENTAL", "DIAGNOSTIC", "DIAGNOSTICS", "SPECIALITY", "SPECIALTY", "MULTI", "SPECIALIST", "CENTRES"]);
function nameTokens(s: string): Set<string> {
  return new Set(
    s.toUpperCase()
      .replace(/L\.?\s*L\.?\s*C\.?/g, " ")
      .replace(/CENTER/g, "CENTRE")
      .split(/[^A-Z0-9]+/)
      .filter((t) => t.length > 1 && !NAME_NOISE.has(t))
  );
}
/** True if the two names plausibly refer to the same facility. */
export function namesMatch(a: string, b: string): boolean {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.size || !tb.size) return true; // nothing to compare — don't flag
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  let hit = 0;
  small.forEach((t) => { if (big.has(t)) hit++; });
  return hit / small.size >= 0.6;
}

/** Checks an admin sees next to a clinic's (or branch's) licence. Computed on
 *  read so "expiring soon" stays current. */
export function computeLicenseChecks(rec: {
  licenseNumber?: string | null;
  dohLicense?: string | null;
  licenseFileUrl?: string | null;
  licenseDetails?: Partial<ExtractedLicense> | null;
}, registeredName: string | null | undefined, now = new Date()): LicenseCheck[] {
  const checks: LicenseCheck[] = [];
  const details = rec.licenseDetails ?? null;

  if (!rec.licenseFileUrl) {
    checks.push({ level: "warning", code: "missing_file", message: "No licence document was uploaded." });
  }
  if (!details) {
    if (rec.licenseFileUrl) checks.push({ level: "warning", code: "unread", message: "The licence couldn't be read automatically — check the document by hand." });
    return checks;
  }

  if (details.expiryDate) {
    const days = daysUntil(details.expiryDate, now);
    if (days !== null && days < 0) {
      checks.push({ level: "error", code: "expired", message: `Licence expired on ${details.expiryDate}.` });
    } else if (days !== null && days <= LICENSE_EXPIRY_WARNING_DAYS) {
      checks.push({ level: "warning", code: "expiring_soon", message: `Licence expires on ${details.expiryDate} (${days} day${days === 1 ? "" : "s"} left).` });
    } else if (days !== null) {
      checks.push({ level: "ok", code: "valid_until", message: `Valid until ${details.expiryDate}.` });
    }
  }

  const docNumbers = [details.licenseNumber, details.secondaryLicense].filter((x): x is string => !!x).map(normId);
  const entered = [rec.licenseNumber, rec.dohLicense].filter((x): x is string => !!x && !!x.trim());
  if (docNumbers.length) {
    for (const n of entered) {
      if (!docNumbers.includes(normId(n))) {
        checks.push({ level: "warning", code: "number_mismatch", message: `"${n}" doesn't match the number on the licence (${[details.licenseNumber, details.secondaryLicense].filter(Boolean).join(" / ")}).` });
      }
    }
  }

  if (details.clinicName && registeredName && !namesMatch(details.clinicName, registeredName)) {
    checks.push({ level: "warning", code: "name_mismatch", message: `Licence is for "${details.clinicName}", but the clinic registered as "${registeredName}".` });
  }
  return checks;
}

/** Sanitise licence details the client sends back on profile submit (it got
 *  them from /extract-license) before storing. */
export function sanitizeLicenseDetails(v: unknown): ExtractedLicense | null {
  if (!v || typeof v !== "object") return null;
  const shaped = shapeExtractedLicense(v);
  return { ...shaped, isLicenseDocument: true };
}

// ─── Profile save helpers ────────────────────────────────────────────────────

// Licence fields for a clinic / branch record on profile save. Stores the
// uploaded licence file + what was read from it, and drops any admin
// verification whenever the licence number or document changes — a verified
// badge must always refer to the licence currently on file.
const normLicenseNo = (v: any) => (typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");
export function licenseFieldsFor(prev: any, input: { licenseNumber?: any; dohLicense?: any; licenseFileUrl?: any; licenseDetails?: any }) {
  const nextLicense = input.licenseNumber ?? prev?.licenseNumber ?? null;
  const nextDoh = input.dohLicense ?? prev?.dohLicense ?? null;
  const fileChanged = !!input.licenseFileUrl && input.licenseFileUrl !== prev?.licenseFileUrl;
  const licenseChanged = fileChanged || normLicenseNo(nextLicense) !== normLicenseNo(prev?.licenseNumber);
  const dohChanged = fileChanged || normLicenseNo(nextDoh) !== normLicenseNo(prev?.dohLicense);
  const keepLicense = !licenseChanged && !!prev?.licenseVerified;
  const keepDoh = !dohChanged && !!prev?.dohLicenseVerified;
  return {
    licenseFileUrl: input.licenseFileUrl ?? prev?.licenseFileUrl ?? null,
    licenseDetails: input.licenseDetails !== undefined && input.licenseDetails !== null
      ? sanitizeLicenseDetails(input.licenseDetails)
      : (fileChanged ? null : prev?.licenseDetails ?? null),
    licenseVerified: keepLicense,
    dohLicenseVerified: keepDoh,
    licenseVerifiedAt: keepLicense || keepDoh ? prev?.licenseVerifiedAt ?? null : null,
    licenseVerifiedBy: keepLicense || keepDoh ? prev?.licenseVerifiedBy ?? null : null,
  };
}

/** Error message if the licence details on this submission show it expired. */
export function expiredLicenseError(details: any, label?: string): string | null {
  const d = sanitizeLicenseDetails(details);
  const days = d?.expiryDate ? daysUntil(d.expiryDate) : null;
  return days !== null && days < 0
    ? `${label ? `${label}: t` : "T"}he uploaded licence expired on ${d!.expiryDate}. Please upload a current licence.`
    : null;
}
