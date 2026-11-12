import { CrisisSupportConfig } from "../config/countries";

// The app ships 4 locales (see i18n/locales in the frontend repo). The chat
// UI's own widgets (CrisisSupportCard etc.) already read from that i18n
// bundle, but the free-text chat reply for these fixed, safety-critical
// messages is generated here on the server, which has no access to it — so
// it needs its own small set of translations rather than silently staying
// English for a patient using the app in Arabic/Spanish/French.
export type SupportedLocale = "en" | "ar" | "es" | "fr";
const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["en", "ar", "es", "fr"];

export function normalizeLocale(raw: unknown): SupportedLocale {
  const code = typeof raw === "string" ? raw.trim().slice(0, 2).toLowerCase() : "";
  return (SUPPORTED_LOCALES as readonly string[]).includes(code) ? (code as SupportedLocale) : "en";
}

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
// "concern"/"imminent" are self-harm levels; "emergency" is a time-critical
// PHYSICAL emergency (chest pain, stroke signs, anaphylaxis, etc.) — a
// separate axis from self-harm risk, but sharing the same crisis payload
// shape/UI (CrisisSupportCard) since both mean "stop triage, get real help now".
export type CrisisLevel = "concern" | "imminent" | "emergency";

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
  /\b(going\s+to|gonna|about\s+to|plan(ning)?\s+to|decided\s+to|will)\s+(kill\s+my\s*self|harm\s+my\s*self|end\s+(it|my\s+life)|take\s+my\s+(own\s+)?life)\b/i,
  /\b(tonight|right\s+now|today)\b[^.?!]{0,40}\b(kill\s+my\s*self|harm\s+my\s*self|end\s+(it\s+all|my\s+life)|suicide)\b/i,
  /\b(kill\s+my\s*self|harm\s+my\s*self|end\s+(it\s+all|my\s+life)|suicide)\b[^.?!]{0,40}\b(tonight|right\s+now|today)\b/i,
];

// Access to means / preparation. Only escalates to "imminent" alongside a
// SELF_HARM_PATTERNS match — on its own "I have pills" is usually medication.
const MEANS_PATTERNS: RegExp[] = [
  /\b(have|got|bought|collected|saved\s+up|stockpiled)\s+(the\s+|enough\s+|some\s+)?(pills|tablets|rope|gun|blade)\b/i,
  /\b(wrote|written|writing)\s+(a\s+|my\s+)?(suicide\s+note|goodbye\s+(letter|note))\b/i,
];

// A plain substring match ("going to end my life" inside "I am NOT going to
// end my life") can't tell a real statement from its own negation. Checked
// against the text immediately before a match only — a negation from much
// earlier/unrelated in a longer message must not suppress a real statement
// later on (e.g. "I don't know why, but I'm going to end my life tonight"
// still correctly fires: "don't" is 20+ chars away from the actual match).
const NEGATION_WORDS = /\b(not|n't|never|no\s+longer)\b/i;
const NEGATION_LOOKBACK_CHARS = 20;

function isNegated(message: string, matchIndex: number): boolean {
  const windowStart = Math.max(0, matchIndex - NEGATION_LOOKBACK_CHARS);
  return NEGATION_WORDS.test(message.slice(windowStart, matchIndex));
}

function firstUnnegatedMatch(message: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const re of patterns) {
    const match = re.exec(message);
    if (match && !isNegated(message, match.index)) return match;
  }
  return null;
}

export function detectCrisisLanguage(message: string): CrisisLevel | null {
  if (firstUnnegatedMatch(message, IMMINENT_PATTERNS)) return "imminent";
  if (firstUnnegatedMatch(message, SELF_HARM_PATTERNS)) {
    return MEANS_PATTERNS.some((re) => re.test(message)) ? "imminent" : "concern";
  }
  return null;
}

// Explicit requests for a mental-health check-in — guarantees the in-chat
// screening offer even if the model forgets to set suggestScreening.
export const SCREENING_REQUEST_PATTERN =
  /\b(mental\s+health|mood|depression|anxiety)\s+(check[\s-]?in|check|screening|assessment|test|quiz)\b|\bam\s+i\s+(depressed|anxious)\b/i;

// ── Medical emergency layer ──────────────────────────────────────────────────
// Deterministic, checked BEFORE the model call, same reasoning as the
// self-harm layer above: a patient describing a time-critical physical
// emergency must always get an immediate "get help now" response — never a
// symptom-triage question, a model hallucination, or an off-topic redirect.
// The model's own MEDICAL EMERGENCY prompt rule (routes/wellness.ts) is a
// second layer for phrasing these patterns miss; the two are OR-ed, exactly
// like the self-harm layer.
//
// Patterns favour recall on unambiguous, canonical presentations (classic
// cardiac/stroke/anaphylaxis/pediatric red flags) over precision — a false
// positive here just shows an unnecessary "call emergency services" card,
// which is a far smaller harm than a missed one.
const CHEST_PAIN_EMERGENCY =
  /\bchest\s+(pain|pressure|tightness)\b[^.?!]{0,60}\b(crushing|radiat(?:e|ing)|sweat(?:ing)?|short(?:ness)?\s+of\s+breath|can'?t\s+breathe|difficulty\s+breathing)\b|\b(crushing|radiat(?:e|ing)|sweat(?:ing)?)\b[^.?!]{0,60}\bchest\s+(pain|pressure|tightness)\b/i;

const STROKE_SIGNS =
  /\b(face|facial)\b[^.?!]{0,30}\b(droop(?:ed|ing)?|numb(?:ness)?)\b|\b(arm|leg|one\s+side)\b[^.?!]{0,40}\b(weak(?:ness)?|numb(?:ness)?|can'?t\s+move)\b|\bslurred?\s+speech\b/i;

const ANAPHYLAXIS_SIGNS = /\bthroat\b[^.?!]{0,30}\b(swell(?:ing)?|closing|tight(?:ening)?)\b|\banaphyla/i;

const SEVERE_BREATHING_DIFFICULTY =
  /\b(struggling|unable)\s+to\s+breathe\b|\bcan'?t\s+breathe\b|\b(stopped|not)\s+breathing\b/i;

const SEVERE_BLEEDING =
  /\b(severe|heavy|uncontrolled|uncontrollable)\s+bleeding\b|\bbleeding\b[^.?!]{0,20}\b(won'?t\s+stop|not\s+stopping|heavily)\b/i;

const UNCONSCIOUS_UNRESPONSIVE =
  /\b(unconscious|unresponsive|passed\s+out|won'?t\s+wake\s+up|can'?t\s+wake\s+(?:him|her|them|up))\b/i;

const MEDICAL_EMERGENCY_PATTERNS: RegExp[] = [
  CHEST_PAIN_EMERGENCY,
  STROKE_SIGNS,
  ANAPHYLAXIS_SIGNS,
  SEVERE_BREATHING_DIFFICULTY,
  SEVERE_BLEEDING,
  UNCONSCIOUS_UNRESPONSIVE,
];

// A feverish child alone isn't an emergency — this requires all three: a
// child is mentioned, AND a fever term, AND a genuine danger/lethargy sign,
// so "my child has a mild fever" alone never trips it.
const CHILD_TERMS = /\b(child|baby|infant|toddler|kid|my\s+son|my\s+daughter)\b/i;
const CHILD_FEVER_TERMS = /\b(high\s+fever|burning\s+up|fever)\b/i;
const CHILD_DANGER_TERMS =
  /\b(very|extremely)\s+drowsy|unresponsive|won'?t\s+wake|hard\s+to\s+wake|floppy|lethargic|limp|difficulty\s+breathing|struggling\s+to\s+breathe|blue\s+lips|seizure|convulsion\b/i;

function isPediatricEmergency(message: string): boolean {
  return CHILD_TERMS.test(message) && CHILD_FEVER_TERMS.test(message) && CHILD_DANGER_TERMS.test(message);
}

export function detectMedicalEmergency(message: string): boolean {
  if (MEDICAL_EMERGENCY_PATTERNS.some((re) => re.test(message))) return true;
  return isPediatricEmergency(message);
}

// UAE's config lists a dedicated "Ambulance" line separate from the generic
// emergencyNumber (police); a country with one unified emergency number (e.g.
// India's 112) has no such line, so this falls back to emergencyNumber —
// generic across countries, no hardcoded country logic here.
function resolveAmbulanceNumber(support: CrisisSupportConfig): string {
  return support.lines.find((l) => /ambulance/i.test(l.label))?.number ?? support.emergencyNumber;
}

const MEDICAL_EMERGENCY_REPLY: Record<SupportedLocale, (number: string) => string> = {
  en: (n) => `This could be a medical emergency. Please call ${n} now or get to the nearest emergency department right away — don't wait. If you're with someone else, ask them to help you get there.`,
  ar: (n) => `قد تكون هذه حالة طوارئ طبية. يرجى الاتصال بالرقم ${n} الآن أو التوجه إلى أقرب قسم طوارئ على الفور — لا تنتظر. إذا كان معك شخص آخر، فاطلب منه مساعدتك في الوصول إلى هناك.`,
  es: (n) => `Esto podría ser una emergencia médica. Llama al ${n} ahora mismo o acude de inmediato al servicio de urgencias más cercano — no esperes. Si estás con alguien, pídele que te ayude a llegar.`,
  fr: (n) => `Il pourrait s'agir d'une urgence médicale. Appelez le ${n} dès maintenant ou rendez-vous immédiatement aux urgences les plus proches — n'attendez pas. Si vous êtes avec quelqu'un, demandez-lui de vous aider à vous y rendre.`,
};

export function buildMedicalEmergencyReply(support: CrisisSupportConfig, locale: SupportedLocale = "en"): string {
  return MEDICAL_EMERGENCY_REPLY[locale](resolveAmbulanceNumber(support));
}

// No mental-health hotlines here — they're irrelevant to a physical
// emergency, and the "Call Emergency" button should dial the ambulance
// number specifically, not the generic ${emergencyNumber} self-harm uses.
export function medicalEmergencyPayload(support: CrisisSupportConfig) {
  return { level: "emergency" as const, emergencyNumber: resolveAmbulanceNumber(support), lines: [] as { label: string; number: string }[] };
}

const LINE_TEXT: Record<SupportedLocale, (label: string, number: string) => string> = {
  en: (label, number) => ` You can also call the ${label} on ${number} — it's free and confidential.`,
  ar: (label, number) => ` يمكنك أيضًا الاتصال بـ${label} على الرقم ${number} — إنه مجاني وسري.`,
  es: (label, number) => ` También puedes llamar a ${label} al ${number} — es gratuito y confidencial.`,
  fr: (label, number) => ` Vous pouvez aussi appeler ${label} au ${number} — c'est gratuit et confidentiel.`,
};

const CRISIS_IMMINENT_REPLY: Record<SupportedLocale, (emergencyNumber: string, lineText: string) => string> = {
  en: (n, l) => `I'm really glad you told me, and I'm worried about your safety right now. Please call ${n} or go to the nearest emergency department now.${l} If you can, stay with someone you trust until help arrives — you don't have to go through this alone.`,
  ar: (n, l) => `يسعدني أنك أخبرتني، وأنا قلق بشأن سلامتك الآن. يرجى الاتصال بالرقم ${n} أو التوجه إلى أقرب قسم طوارئ الآن.${l} إذا استطعت، ابقَ مع شخص تثق به حتى تصل المساعدة — لست مضطرًا لمواجهة هذا وحدك.`,
  es: (n, l) => `Me alegra mucho que me lo hayas contado, y me preocupa tu seguridad en este momento. Llama al ${n} o acude ahora mismo al servicio de urgencias más cercano.${l} Si puedes, quédate con alguien de confianza hasta que llegue ayuda — no tienes que pasar por esto solo/a.`,
  fr: (n, l) => `Je suis vraiment content(e) que vous me l'ayez dit, et je m'inquiète pour votre sécurité en ce moment. Appelez le ${n} ou rendez-vous immédiatement aux urgences les plus proches.${l} Si possible, restez avec une personne de confiance jusqu'à l'arrivée des secours — vous n'avez pas à traverser cela seul(e).`,
};

const CRISIS_CONCERN_REPLY: Record<SupportedLocale, (emergencyNumber: string, lineText: string) => string> = {
  en: (n, l) => `Thank you for telling me — that took courage, and I'm sorry you're going through this. You deserve support, and talking to someone can really help.${l} If you ever feel you might act on these thoughts, call ${n} straight away. I'm here to keep talking too.`,
  ar: (n, l) => `شكرًا لإخباري — كان ذلك يتطلب شجاعة، وأنا آسف لما تمر به. أنت تستحق الدعم، والتحدث مع شخص ما يمكن أن يساعد كثيرًا.${l} إذا شعرت في أي وقت أنك قد تتصرف بناءً على هذه الأفكار، اتصل بالرقم ${n} على الفور. أنا هنا أيضًا لمواصلة الحديث.`,
  es: (n, l) => `Gracias por contármelo — eso requiere valentía, y lamento que estés pasando por esto. Mereces apoyo, y hablar con alguien realmente puede ayudar.${l} Si en algún momento sientes que podrías actuar según estos pensamientos, llama al ${n} de inmediato. Yo también estoy aquí para seguir hablando.`,
  fr: (n, l) => `Merci de me l'avoir dit — cela demande du courage, et je suis désolé(e) que vous traversiez cela. Vous méritez du soutien, et parler à quelqu'un peut vraiment aider.${l} Si vous sentez à un moment que vous pourriez agir selon ces pensées, appelez le ${n} immédiatement. Je suis aussi là pour continuer à parler.`,
};

export function buildCrisisReply(level: CrisisLevel, support: CrisisSupportConfig, locale: SupportedLocale = "en"): string {
  const line = support.lines[0];
  const lineText = line ? LINE_TEXT[locale](line.label, line.number) : "";
  return level === "imminent"
    ? CRISIS_IMMINENT_REPLY[locale](support.emergencyNumber, lineText)
    : CRISIS_CONCERN_REPLY[locale](support.emergencyNumber, lineText);
}

export function crisisPayload(level: CrisisLevel, support: CrisisSupportConfig) {
  return { level, emergencyNumber: support.emergencyNumber, lines: support.lines };
}
