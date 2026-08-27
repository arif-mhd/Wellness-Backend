// Canonical list of spoken languages a doctor can register (already the
// vocabulary used by the doctor-portal's language picker — see
// DoctorPersonalInfoForm.tsx / OwnersPersonalInfoForm.tsx) and, going
// forward, the same vocabulary patients/family members pick from. Keeping
// one list server-side (exposed via GET /api/meta/languages) means every
// client reads the same set instead of drifting hardcoded copies.
//
// bcp47 is the code Google Cloud Speech-to-Text expects for that language.
// deepgramCode is what the live-transcript agent currently uses instead
// (Deepgram was chosen as the first, easier-to-integrate STT vendor to prove
// out the transcript pipeline — see transcript-agent/README.md). Only
// populated where Deepgram's Nova-3 support was actually confirmed;
// languages with no deepgramCode fall back to Deepgram's own language
// auto-detection rather than guessing a code that might not exist.
// Malayalam has NO Deepgram code at all — Deepgram doesn't support it yet,
// which is the whole reason Google was the long-term pick; auto-detect is
// the best this vendor can do for it in the meantime.
export interface LanguageOption {
  name: string;
  bcp47: string;
  deepgramCode?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { name: "Arabic",     bcp47: "ar-AE",        deepgramCode: "ar-AE" },
  { name: "English",    bcp47: "en-US",        deepgramCode: "en-US" },
  { name: "Hindi",      bcp47: "hi-IN",        deepgramCode: "hi" },
  { name: "Urdu",       bcp47: "ur-PK",        deepgramCode: "ur" },
  { name: "Malayalam",  bcp47: "ml-IN" }, // not supported by Deepgram — auto-detect fallback
  { name: "Tamil",      bcp47: "ta-IN",        deepgramCode: "ta" },
  { name: "Tagalog",    bcp47: "fil-PH" },     // unverified on Deepgram — auto-detect fallback
  { name: "Bengali",    bcp47: "bn-IN" },      // unverified on Deepgram — auto-detect fallback
  { name: "Punjabi",    bcp47: "pa-Guru-IN" }, // unverified on Deepgram — auto-detect fallback
  { name: "Sinhalese",  bcp47: "si-LK" },      // unverified on Deepgram — auto-detect fallback
  { name: "Nepali",     bcp47: "ne-NP" },      // unverified on Deepgram — auto-detect fallback
  { name: "French",     bcp47: "fr-FR",        deepgramCode: "fr" },
  { name: "German",     bcp47: "de-DE" },      // unverified on Deepgram — auto-detect fallback
  { name: "Spanish",    bcp47: "es-ES" },      // unverified on Deepgram — auto-detect fallback
  { name: "Chinese",    bcp47: "cmn-Hans-CN" },// unverified on Deepgram — auto-detect fallback
  { name: "Japanese",   bcp47: "ja-JP" },      // unverified on Deepgram — auto-detect fallback
  { name: "Korean",     bcp47: "ko-KR" },      // unverified on Deepgram — auto-detect fallback
  { name: "Russian",    bcp47: "ru-RU" },      // unverified on Deepgram — auto-detect fallback
  { name: "Persian",    bcp47: "fa-IR" },      // unverified on Deepgram — auto-detect fallback
  { name: "Turkish",    bcp47: "tr-TR" },      // unverified on Deepgram — auto-detect fallback
  { name: "Amharic",    bcp47: "am-ET" },      // unverified on Deepgram — auto-detect fallback
];

export function bcp47ForLanguage(name: string | undefined | null): string | null {
  if (!name) return null;
  const match = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === name.toLowerCase());
  return match?.bcp47 ?? null;
}

export function deepgramCodeForLanguage(name: string | undefined | null): string | null {
  if (!name) return null;
  const match = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === name.toLowerCase());
  return match?.deepgramCode ?? null;
}
