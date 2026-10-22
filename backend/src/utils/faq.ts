import { faqsContainer } from "../config/cosmos";
import { pool } from "../config/database";

// ── Help & FAQ ───────────────────────────────────────────────────────────────
// A two-level tree per brand: categories, each holding question/answer
// entries. Patients browse it in the assistant and in Profile → Help and
// Support; the assistant also answers typed app questions from it, but only
// ever from this text (see wellness.ts) — the canned answers are the point.

export interface FaqCategoryDoc {
  id: string;
  orgId: string;
  docType: "category";
  title: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqEntryDoc {
  id: string;
  orgId: string;
  docType: "entry";
  categoryId: string;
  question: string;
  answer: string;
  /** Other entries shown as "View related issues" under this answer. */
  relatedIds: string[];
  /** A key from FAQ_DEEP_LINKS, or null. Never a raw route — see below. */
  deepLink: string | null;
  order: number;
  isActive: boolean;
  /** Set on drafts that state business policy the system can't confirm.
   *  Shown to admins only; such entries are seeded hidden. */
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// "Open this screen" targets an answer may offer. Stored as a key rather than
// a route so an admin can only ever point a patient at a screen the app
// knows how to open; the app holds the key → route map and drops any key it
// doesn't recognise. `feature` hides the button for brands without it.
export const FAQ_DEEP_LINKS: Record<string, { label: string; feature?: string }> = {
  book_consultation:   { label: "Book a consultation", feature: "appointments" },
  my_records:          { label: "My records" },
  orders:              { label: "My orders" },
  family:              { label: "Family members" },
  addresses:           { label: "Addresses" },
  insurance:           { label: "Insurance", feature: "insurance" },
  reminders:           { label: "Reminders" },
  medicines:           { label: "Pharmacy", feature: "pharmacy" },
  lab_tests:           { label: "Lab tests", feature: "lab_booking" },
  vaccination:         { label: "Vaccination", feature: "vaccination" },
  fitness:             { label: "Fitness & nutrition", feature: "fitness" },
  assessments:         { label: "Health assessments" },
  articles:            { label: "Health articles", feature: "articles" },
  account_settings:    { label: "Account settings" },
  language:            { label: "Language" },
  notifications:       { label: "Notification settings" },
  raise_issue:         { label: "Raise an issue" },
  my_medications:      { label: "My medications" },
  profile_details:     { label: "My profile" },
};

export const isKnownDeepLink = (key: unknown): key is string =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(FAQ_DEEP_LINKS, key);

// A known key is still only usable by an org that actually has the screen it
// points to — FAQ answers' own "Take me there" chip already hides itself for
// a disabled feature client-side (FaqAnswerActions' hasFeature check), but
// the assistant's general chat navigation has no such per-answer gate, so it
// must be filtered at the source instead of relying on the client to hide a
// dead-end reply after the fact.
export function isNavigationTargetAllowed(key: string, enabledFeatureKeys: Set<string>): boolean {
  if (!isKnownDeepLink(key)) return false;
  const feature = FAQ_DEEP_LINKS[key].feature;
  return !feature || enabledFeatureKeys.has(feature);
}

// ── Reading ──────────────────────────────────────────────────────────────────

export async function readOrgFaq(orgId: string): Promise<{ categories: FaqCategoryDoc[]; entries: FaqEntryDoc[] }> {
  const { resources } = await faqsContainer.items
    .query(
      { query: "SELECT * FROM c WHERE c.orgId = @orgId", parameters: [{ name: "@orgId", value: orgId }] },
      { partitionKey: orgId }
    )
    .fetchAll();
  const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
  return {
    categories: (resources as any[]).filter((d) => d.docType === "category").sort(byOrder) as FaqCategoryDoc[],
    entries: (resources as any[]).filter((d) => d.docType === "entry").sort(byOrder) as FaqEntryDoc[],
  };
}

export interface PublicFaqEntry {
  id: string;
  question: string;
  answer: string;
  relatedIds: string[];
  deepLink: string | null;
}
export interface PublicFaqCategory {
  id: string;
  title: string;
  entries: PublicFaqEntry[];
}

/** What a patient may see: visible entries in visible categories, with
 *  related links pruned to entries that are themselves visible. Empty
 *  categories are dropped rather than shown as dead ends. */
export function toPublicFaq(categories: FaqCategoryDoc[], entries: FaqEntryDoc[]): PublicFaqCategory[] {
  const liveCategoryIds = new Set(categories.filter((c) => c.isActive).map((c) => c.id));
  const liveEntries = entries.filter((e) => e.isActive && liveCategoryIds.has(e.categoryId));
  const liveIds = new Set(liveEntries.map((e) => e.id));

  return categories
    .filter((c) => liveCategoryIds.has(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title,
      entries: liveEntries
        .filter((e) => e.categoryId === c.id)
        .map((e) => ({
          id: e.id,
          question: e.question,
          answer: e.answer,
          relatedIds: (e.relatedIds ?? []).filter((id) => id !== e.id && liveIds.has(id)),
          deepLink: isKnownDeepLink(e.deepLink) ? e.deepLink : null,
        })),
    }))
    .filter((c) => c.entries.length > 0);
}

// ── Assistant cache ──────────────────────────────────────────────────────────
// The assistant needs the brand's FAQ on every message. A short TTL keeps
// that off Cosmos without making admin edits wait long to take effect;
// invalidateFaqCache clears it at once on the instance that took the edit.

const FAQ_CACHE_TTL_MS = 60_000;
const faqCache = new Map<string, { at: number; entries: PublicFaqEntry[] }>();

export async function getFaqForAssistant(orgId: string): Promise<PublicFaqEntry[]> {
  const hit = faqCache.get(orgId);
  if (hit && Date.now() - hit.at < FAQ_CACHE_TTL_MS) return hit.entries;
  const { categories, entries } = await readOrgFaq(orgId);
  const flat = toPublicFaq(categories, entries).flatMap((c) => c.entries);
  faqCache.set(orgId, { at: Date.now(), entries: flat });
  return flat;
}

export function invalidateFaqCache(orgId: string): void {
  faqCache.delete(orgId);
}

export async function getEnabledFeatureKeys(orgId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT feature_key FROM org_features WHERE org_id = $1 AND enabled = true`,
    [orgId]
  );
  return new Set(rows.map((r: { feature_key: string }) => r.feature_key));
}
