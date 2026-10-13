import { CrisisSupportConfig } from "../config/countries";

// ── Crisis layer ─────────────────────────────────────────────────────────────
// Self-harm / suicide language is checked deterministically BEFORE the model
// call and before the off-topic filter, so a patient in crisis always gets a
// safe, fixed response with real support numbers — never a model hallucination,
// a symptom-triage question, or an "off-topic" redirect. The model's own
// riskLevel (MENTAL HEALTH & SAFETY prompt section in routes/wellness.ts) is a second layer
// for subtler phrasing these patterns can't catch; the two are OR-ed.
//
// Patterns favour recall on unambiguous phrases, but deliberately skip
// everyday ones like a bare "hurt myself" / "cut myself" ("I cut myself
// cooking") or "overdose" (accidental double dose) — those need context, so
// they are left to the model.
export type CrisisLevel = "concern" | "imminent";

const SELF_HARM_PATTERNS: RegExp[] = [
  /\bsuicid(e|al)\b/i,
  /\bkill(ing)?\s+my\s*self\b/i,
  /\bself[\s-]?harm(ing)?\b/i,
  /\b(end|ending|take|taking)\s+my\s+(own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
  /\b(want|wanna|wanted|wish|ready)\s+(to\s+)?die\b/i,
  /\bwish\s+i\s+(was|were)\s+(dead|never\s+born)\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|wake\s+up)\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on)\b/i,
  /\b(want|wanna|urge|urges|thinking\s+(of|about)|thoughts?\s+of|tempted)\b[^.?!]{0,20}\b(hurt|hurting|harm|harming|cut|cutting)\s+my\s*self\b/i,
];

const IMMINENT_PATTERNS: RegExp[] = [
  /\b(going\s+to|gonna|about\s+to|plan(ning)?\s+to|decided\s+to|will)\s+(kill\s+my\s*self|end\s+(it|my\s+life)|take\s+my\s+(own\s+)?life)\b/i,
  /\b(tonight|right\s+now|today)\b[^.?!]{0,40}\b(kill\s+my\s*self|end\s+(it\s+all|my\s+life)|suicide)\b/i,
  /\b(kill\s+my\s*self|end\s+(it\s+all|my\s+life)|suicide)\b[^.?!]{0,40}\b(tonight|right\s+now|today)\b/i,
];

// Access to means / preparation. Only escalates to "imminent" alongside a
// SELF_HARM_PATTERNS match — on its own "I have pills" is usually medication.
const MEANS_PATTERNS: RegExp[] = [
  /\b(have|got|bought|collected|saved\s+up|stockpiled)\s+(the\s+|enough\s+|some\s+)?(pills|tablets|rope|gun|blade)\b/i,
  /\b(wrote|written|writing)\s+(a\s+|my\s+)?(suicide\s+note|goodbye\s+(letter|note))\b/i,
];

export function detectCrisisLanguage(message: string): CrisisLevel | null {
  if (IMMINENT_PATTERNS.some((re) => re.test(message))) return "imminent";
  if (SELF_HARM_PATTERNS.some((re) => re.test(message))) {
    return MEANS_PATTERNS.some((re) => re.test(message)) ? "imminent" : "concern";
  }
  return null;
}

// Explicit requests for a mental-health check-in — guarantees the in-chat
// screening offer even if the model forgets to set suggestScreening.
export const SCREENING_REQUEST_PATTERN =
  /\b(mental\s+health|mood|depression|anxiety)\s+(check[\s-]?in|check|screening|assessment|test|quiz)\b|\bam\s+i\s+(depressed|anxious)\b/i;

export function buildCrisisReply(level: CrisisLevel, support: CrisisSupportConfig): string {
  const line = support.lines[0];
  const lineText = line ? ` You can also call the ${line.label} on ${line.number} — it's free and confidential.` : "";
  if (level === "imminent") {
    return `I'm really glad you told me, and I'm worried about your safety right now. Please call ${support.emergencyNumber} or go to the nearest emergency department now.${lineText} If you can, stay with someone you trust until help arrives — you don't have to go through this alone.`;
  }
  return `Thank you for telling me — that took courage, and I'm sorry you're going through this. You deserve support, and talking to someone can really help.${lineText} If you ever feel you might act on these thoughts, call ${support.emergencyNumber} straight away. I'm here to keep talking too.`;
}

export function crisisPayload(level: CrisisLevel, support: CrisisSupportConfig) {
  return { level, emergencyNumber: support.emergencyNumber, lines: support.lines };
}
