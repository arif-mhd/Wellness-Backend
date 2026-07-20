import { Router, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { requireRole } from "../middleware/requireRole";
import {
  menstrualProfilesContainer,
  menstrualLogsContainer,
  menstrualDailyContainer,
} from "../config/cosmos";

const router = Router();
router.use(requireRole("patient"));

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Cycle computation ────────────────────────────────────────────────────────
//
// Ovulation consistently occurs ~14 days BEFORE the next period (luteal phase
// is fixed at ~14 days regardless of cycle length). So for a 35-day cycle:
//   Ovulation day  = cycleLength - 14  = 21
//   Fertile window = ovulation - 5 → ovulation + 1  (sperm survive ~5 days)
//
// Phase boundaries (1-indexed cycle day):
//   Menstrual   : 1 → periodLength (default 5, or actual if endDate known)
//   Follicular  : periodLength+1 → ovulationDay-1
//   Ovulation   : ovulationDay-1 → ovulationDay+1  (±1 day window)
//   PMS/Late Luteal: last 5 days before next period
//   Luteal      : ovulationDay+2 → cycleLength-5
//   PMS         : cycleLength-4 → cycleLength

export interface CycleInfo {
  cycleDay: number;          // 1-based day within current cycle
  cycleLength: number;       // used cycle length
  periodLength: number;      // estimated period duration in days
  ovulationDay: number;      // cycle day of predicted ovulation
  fertileWindowStart: number;// cycle day fertile window opens
  fertileWindowEnd: number;  // cycle day fertile window closes
  phase: string;             // current phase name
  nextPeriodDate: string;    // YYYY-MM-DD
  nextOvulationDate: string; // YYYY-MM-DD
  fertileWindowStartDate: string;
  fertileWindowEndDate: string;
  isLate: boolean;           // today is past expected next period
  daysLate: number;          // how many days past expected period (0 if not late)
  daysUntilNextPeriod: number; // negative if late
  detectedCycleLength: number | null; // learned from history (null if <2 periods)
}

function computeCycleInfo(
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number,
  today: string = localTodayStr()
): CycleInfo {
  const diffDays = daysBetween(lastPeriodStart, today);

  // Day within the current cycle (1-based, never resets past cycleLength even if late)
  const cycleDay = (diffDays % cycleLength) + 1;

  // Next period = lastPeriodStart + cycleLength (just ONE cycle ahead, not rolled forward)
  // If today is already past that date, the period is late — we do NOT advance further.
  const nextPeriodDate = addDays(lastPeriodStart, cycleLength);
  const daysUntilNextPeriod = daysBetween(today, nextPeriodDate);
  const isLate  = daysUntilNextPeriod < 0;
  const daysLate = isLate ? Math.abs(daysUntilNextPeriod) : 0;

  // Ovulation: fixed 14 days before expected next period
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  const nextOvulationDate = addDays(lastPeriodStart, ovulationDay - 1);

  // Fertile window: ovulation-5 → ovulation+1
  const fertileWindowStart = Math.max(periodLength + 1, ovulationDay - 5);
  const fertileWindowEnd   = ovulationDay + 1;
  const fertileWindowStartDate = addDays(lastPeriodStart, fertileWindowStart - 1);
  const fertileWindowEndDate   = addDays(lastPeriodStart, fertileWindowEnd - 1);

  // Phase — if late, stay in "Late" bucket rather than wrapping back
  let phase: string;
  if (isLate) {
    phase = "Late Period";
  } else if (cycleDay <= periodLength) {
    phase = "Menstrual Phase";
  } else if (cycleDay < fertileWindowStart) {
    phase = "Follicular Phase";
  } else if (cycleDay <= fertileWindowEnd) {
    phase = "Ovulation Phase";
  } else if (cycleDay >= cycleLength - 4) {
    phase = "PMS Phase";
  } else {
    phase = "Luteal Phase";
  }

  return {
    cycleDay: Math.max(1, cycleDay),
    cycleLength,
    periodLength,
    ovulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    phase,
    nextPeriodDate,
    nextOvulationDate,
    fertileWindowStartDate,
    fertileWindowEndDate,
    isLate,
    daysLate,
    daysUntilNextPeriod,
    detectedCycleLength: null, // filled in by learnCycleLength
  };
}

// ─── Cycle length learning from period history ────────────────────────────────
// Uses median of gaps (robust to outliers). Also returns irregularity flag.

function learnCycleLength(periods: { startDate: string }[]): number | null {
  if (periods.length < 2) return null;
  const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1].startDate, sorted[i].startDate);
    if (gap >= 18 && gap <= 60) gaps.push(gap);
  }
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? Math.round((gaps[mid - 1] + gaps[mid]) / 2) : gaps[mid];
}

function getCycleGaps(periods: { startDate: string }[]): number[] {
  const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1].startDate, sorted[i].startDate);
    if (gap >= 18 && gap <= 60) gaps.push(gap);
  }
  return gaps;
}

// Irregular cycle detection — three independent signals, any one triggers it:
// 1. Std deviation of gaps > 7 days (clinical threshold, needs ≥3 periods)
// 2. Any single gap outside the 21–35 day "normal" window (needs ≥2 periods)
// 3. Max gap − min gap > 9 days (needs ≥2 periods)
function isIrregularCycle(gaps: number[]): boolean {
  if (gaps.length === 0) return false;

  // Signal 2: any gap outside normal range
  if (gaps.some(g => g < 21 || g > 35)) return true;

  // Signal 3: spread between shortest and longest cycle
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  if (maxGap - minGap > 9) return true;

  // Signal 1: std deviation (only meaningful with ≥2 gaps)
  if (gaps.length >= 2) {
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + Math.pow(g - mean, 2), 0) / gaps.length;
    if (Math.sqrt(variance) > 7) return true;
  }

  return false;
}

// Median period length from endDate - startDate
function learnPeriodLength(periods: { startDate: string; endDate?: string | null }[]): number {
  const durations = periods
    .filter(p => p.endDate)
    .map(p => daysBetween(p.startDate, p.endDate!))
    .filter(d => d >= 1 && d <= 10);
  if (!durations.length) return 5;
  durations.sort((a, b) => a - b);
  const mid = Math.floor(durations.length / 2);
  return durations.length % 2 === 0
    ? Math.round((durations[mid - 1] + durations[mid]) / 2)
    : durations[mid];
}

// ─── BBT ovulation detection ──────────────────────────────────────────────────
// A sustained BBT rise (≥0.2°C above the previous 6-day average) for 3+ days
// confirms ovulation occurred. Returns the cycle day of the thermal shift.

function detectOvulationFromBBT(
  dailyLogs: { date: string; basalTempC?: number }[],
  cycleStart: string
): number | null {
  const temps = dailyLogs
    .filter(l => l.basalTempC != null && l.basalTempC! > 35 && l.date >= cycleStart)
    .map(l => ({ day: daysBetween(cycleStart, l.date) + 1, temp: l.basalTempC! }))
    .sort((a, b) => a.day - b.day);

  if (temps.length < 9) return null; // need enough readings

  for (let i = 6; i < temps.length - 2; i++) {
    const baseline = temps.slice(i - 6, i).reduce((s, t) => s + t.temp, 0) / 6;
    const rise = temps.slice(i, i + 3).every(t => t.temp >= baseline + 0.2);
    if (rise) return temps[i].day;
  }
  return null;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function getProfile(patientId: string, profileId: string): Promise<Record<string, unknown>> {
  try {
    const { resource } = await menstrualProfilesContainer.item(profileId, patientId).read();
    return resource ?? { id: profileId, patientId, profileId };
  } catch {
    return { id: profileId, patientId, profileId };
  }
}

async function getDaily(patientId: string, profileId: string, date: string): Promise<Record<string, unknown>> {
  const docId = `${profileId}_${date}`;
  try {
    const { resource } = await menstrualDailyContainer.item(docId, patientId).read();
    return resource ?? { id: docId, patientId, profileId, date };
  } catch {
    return { id: docId, patientId, profileId, date };
  }
}

async function getAllPeriods(patientId: string, profileId: string) {
  const { resources } = await menstrualLogsContainer.items.query(
    {
      query: "SELECT * FROM c WHERE c.patientId = @pid AND c.profileId = @profileId ORDER BY c.startDate ASC",
      parameters: [
        { name: "@pid", value: patientId },
        { name: "@profileId", value: profileId },
      ],
    },
    { partitionKey: patientId }
  ).fetchAll();
  return resources as { startDate: string; endDate?: string | null }[];
}

// ─── Rebuild & persist computed cycle info into profile ───────────────────────
// Called after any period log/update so profile always has fresh computed fields.

async function recomputeAndSaveProfile(
  patientId: string,
  profileId: string,
  existing: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const periods = await getAllPeriods(patientId, profileId);

  const detectedCycleLength = learnCycleLength(periods);
  const detectedPeriodLength = learnPeriodLength(periods);

  // Use detected length if available, else user-set, else 28
  const cycleLength  = detectedCycleLength ?? (existing.cycleLength as number | undefined) ?? 28;
  const periodLength = detectedPeriodLength;

  const lastPeriod = periods.length ? periods[periods.length - 1] : null;

  let cycleInfo: Partial<CycleInfo> = {};
  if (lastPeriod) {
    cycleInfo = computeCycleInfo(lastPeriod.startDate, cycleLength, periodLength);
    cycleInfo.detectedCycleLength = detectedCycleLength;
  }

  const updated = {
    ...existing,
    id: profileId,
    patientId,
    profileId,
    lastPeriodStart:  lastPeriod?.startDate ?? existing.lastPeriodStart,
    lastPeriodEnd:    lastPeriod?.endDate   ?? existing.lastPeriodEnd,
    cycleLength,
    periodLength,
    detectedCycleLength,
    ...cycleInfo,
    updatedAt: new Date().toISOString(),
  };

  await menstrualProfilesContainer.items.upsert(updated);
  return updated;
}

// ─── GET /api/menstrual/profile ───────────────────────────────────────────────
router.get("/profile", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const profile = await getProfile(patientId, profileId);

    // Always recompute fresh — use most recent period from history as anchor
    const periods = await getAllPeriods(patientId, profileId);
    if (periods.length > 0) {
      const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const lastPeriod = sorted[sorted.length - 1];
      const detectedLen = learnCycleLength(periods);
      const periodLen   = learnPeriodLength(periods);
      const cycleLen    = detectedLen ?? (profile as any).cycleLength ?? 28;
      const fresh = computeCycleInfo(lastPeriod.startDate, cycleLen, periodLen);
      fresh.detectedCycleLength = detectedLen;
      const gaps = getCycleGaps(periods);
      res.json({ profile: { ...profile, ...fresh, isIrregular: isIrregularCycle(gaps) } });
      return;
    }

    res.json({ profile });
  } catch (err) {
    console.error("Menstrual profile fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/menstrual/profile ───────────────────────────────────────────────
// Accepts user-set fields. Computed fields are always re-derived from period history.
router.put("/profile", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { cycleLength, waterTarget, waterContainerVolume, waterReminderEnabled, profileId: bodyProfileId } = req.body;
    const profileId = bodyProfileId ?? patientId;
    const existing = await getProfile(patientId, profileId);

    const patched = {
      ...existing,
      ...(cycleLength            !== undefined && { cycleLength }),
      ...(waterTarget            !== undefined && { waterTarget }),
      ...(waterContainerVolume   !== undefined && { waterContainerVolume }),
      ...(waterReminderEnabled   !== undefined && { waterReminderEnabled }),
    };

    const updated = await recomputeAndSaveProfile(patientId, profileId, patched);
    res.json({ status: "OK", profile: updated });
  } catch (err) {
    console.error("Menstrual profile update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/menstrual/period ───────────────────────────────────────────────
router.post("/period", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { startDate, endDate, profileId: bodyProfileId } = req.body;
    if (!startDate) { res.status(400).json({ error: "startDate is required" }); return; }
    const profileId = bodyProfileId ?? patientId;

    const docId = `${profileId}_${startDate}`;
    const periodDoc = {
      id: docId, patientId, profileId, startDate,
      endDate: endDate ?? null,
      loggedAt: new Date().toISOString(),
    };
    await menstrualLogsContainer.items.upsert(periodDoc);

    const existing = await getProfile(patientId, profileId);
    const updatedProfile = await recomputeAndSaveProfile(patientId, profileId, existing);

    res.json({ status: "OK", period: periodDoc, profile: updatedProfile });
  } catch (err) {
    console.error("Period log error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/menstrual/period/:startDate ───────────────────────────────────
router.patch("/period/:startDate", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { startDate } = req.params;
    const { endDate, profileId: bodyProfileId } = req.body;
    const profileId = bodyProfileId ?? patientId;

    const docId = `${profileId}_${startDate}`;
    let existing: any = {};
    try {
      const { resource } = await menstrualLogsContainer.item(docId, patientId).read();
      existing = resource ?? {};
    } catch { /* new */ }

    const updated = { ...existing, id: docId, patientId, profileId, startDate, endDate, updatedAt: new Date().toISOString() };
    await menstrualLogsContainer.items.upsert(updated);

    const profile = await getProfile(patientId, profileId);
    const updatedProfile = await recomputeAndSaveProfile(patientId, profileId, profile);

    res.json({ status: "OK", period: updated, profile: updatedProfile });
  } catch (err) {
    console.error("Period update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/menstrual/period/:startDate ─────────────────────────────────
router.delete("/period/:startDate", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { startDate } = req.params;
    const profileId = (req.query.profileId as string) || patientId;
    const docId = `${profileId}_${startDate}`;
    try {
      await menstrualLogsContainer.item(docId, patientId).delete();
    } catch { /* already gone */ }
    const existing = await getProfile(patientId, profileId);
    const updatedProfile = await recomputeAndSaveProfile(patientId, profileId, existing);
    res.json({ status: "OK", profile: updatedProfile });
  } catch (err) {
    console.error("Period delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/menstrual/all ────────────────────────────────────────────────
// Wipes all periods and profile — useful for testing
router.delete("/all", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const periods = await getAllPeriods(patientId, profileId);
    for (const p of periods) {
      const docId = `${profileId}_${p.startDate}`;
      try { await menstrualLogsContainer.item(docId, patientId).delete(); } catch { /* ignore */ }
    }
    try { await menstrualProfilesContainer.item(profileId, patientId).delete(); } catch { /* ignore */ }
    res.json({ status: "OK", deleted: periods.length });
  } catch (err) {
    console.error("Menstrual delete all error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/menstrual/periods ───────────────────────────────────────────────
router.get("/periods", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;

    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.startDate DESC";

    const { resources } = await menstrualLogsContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();
    res.json({ periods: resources });
  } catch (err) {
    console.error("Period history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/menstrual/daily?date= ──────────────────────────────────────────
router.get("/daily", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const date = (req.query.date as string) || localTodayStr();
    const log = await getDaily(patientId, profileId, date);
    res.json({ log });
  } catch (err) {
    console.error("Menstrual daily fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/menstrual/daily ─────────────────────────────────────────────────
// After saving, attempt BBT-based ovulation detection and update profile.
router.put("/daily", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const date = req.body.date || localTodayStr();
    const profileId = req.body.profileId ?? patientId;
    const existing = await getDaily(patientId, profileId, date);

    const {
      moods, topSymptom, symptoms, pregnancyTest,
      waterIntakeLiters, weightKg, basalTempC,
      menstrualFlow, sexActivity, physicalActivity,
      ovulationTest, otherFactors, oralContraceptive,
      vaginalDischarge, digestion, pills,
    } = req.body;

    const updated = {
      ...existing,
      patientId,
      profileId,
      ...(moods               !== undefined && { moods }),
      ...(topSymptom          !== undefined && { topSymptom }),
      ...(symptoms            !== undefined && { symptoms }),
      ...(pregnancyTest       !== undefined && { pregnancyTest }),
      ...(waterIntakeLiters   !== undefined && { waterIntakeLiters }),
      ...(weightKg            !== undefined && { weightKg }),
      ...(basalTempC          !== undefined && { basalTempC }),
      ...(menstrualFlow       !== undefined && { menstrualFlow }),
      ...(sexActivity         !== undefined && { sexActivity }),
      ...(physicalActivity    !== undefined && { physicalActivity }),
      ...(ovulationTest       !== undefined && { ovulationTest }),
      ...(otherFactors        !== undefined && { otherFactors }),
      ...(oralContraceptive   !== undefined && { oralContraceptive }),
      ...(vaginalDischarge    !== undefined && { vaginalDischarge }),
      ...(digestion           !== undefined && { digestion }),
      ...(pills               !== undefined && { pills }),
      updatedAt: new Date().toISOString(),
    };

    await menstrualDailyContainer.items.upsert(updated);

    // If BBT was logged, attempt ovulation detection and update profile
    if (basalTempC !== undefined) {
      try {
        const profile = await getProfile(patientId, profileId) as any;
        if (profile.lastPeriodStart) {
          // Fetch recent daily logs for BBT analysis
          const sinceStr = addDays(profile.lastPeriodStart, -7);
          const { resources: recentLogs } = await menstrualDailyContainer.items.query(
            {
              query: "SELECT c.date, c.basalTempC FROM c WHERE c.patientId = @pid AND c.profileId = @profileId AND c.date >= @since ORDER BY c.date ASC",
              parameters: [
                { name: "@pid", value: patientId },
                { name: "@profileId", value: profileId },
                { name: "@since", value: sinceStr },
              ],
            },
            { partitionKey: patientId }
          ).fetchAll();

          const bbtOvulationDay = detectOvulationFromBBT(recentLogs, profile.lastPeriodStart);
          if (bbtOvulationDay !== null) {
            await menstrualProfilesContainer.items.upsert({
              ...profile,
              bbtConfirmedOvulationDay: bbtOvulationDay,
              bbtConfirmedOvulationDate: addDays(profile.lastPeriodStart, bbtOvulationDay - 1),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch { /* non-critical — don't fail the daily save */ }
    }

    res.json({ status: "OK", log: updated });
  } catch (err) {
    console.error("Menstrual daily update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/menstrual/daily/history?days=90 ────────────────────────────────
router.get("/daily/history", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;
    const days = parseInt((req.query.days as string) || "90", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,"0")}-${String(since.getDate()).padStart(2,"0")}`;

    let query = "SELECT * FROM c WHERE c.patientId = @pid AND c.date >= @since";
    const parameters = [{ name: "@pid", value: patientId }, { name: "@since", value: sinceStr }];
    if (profileId) {
      query += " AND c.profileId = @profileId";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.date ASC";

    const { resources } = await menstrualDailyContainer.items.query(
      { query, parameters },
      { partitionKey: patientId }
    ).fetchAll();

    res.json({ history: resources });
  } catch (err) {
    console.error("Menstrual daily history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/menstrual/insights ─────────────────────────────────────────────
// Full computed cycle analysis — used by both patient app and doctor portal.
router.get("/insights", async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = (req.query.profileId as string) || patientId;
    const periods   = await getAllPeriods(patientId, profileId);

    if (periods.length === 0) {
      res.json({ insights: null, message: "No period logged yet" });
      return;
    }

    // Always use the most recent period as the anchor
    const sorted = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const lastPeriod = sorted[sorted.length - 1];

    const detectedCycleLen  = learnCycleLength(periods);
    const detectedPeriodLen = learnPeriodLength(periods);
    const profile = await getProfile(patientId, profileId) as any;
    const cycleLen  = detectedCycleLen ?? profile.cycleLength ?? 28;
    const periodLen = detectedPeriodLen;

    const cycleInfo = computeCycleInfo(lastPeriod.startDate, cycleLen, periodLen);
    cycleInfo.detectedCycleLength = detectedCycleLen;

    const gaps       = getCycleGaps(periods);
    const irregular  = isIrregularCycle(gaps);
    const avgCycle   = gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null;
    console.log(`[menstrual/insights] periods=${periods.length} gaps=${JSON.stringify(gaps)} irregular=${irregular} lastPeriod=${lastPeriod.startDate}`);

    res.json({
      insights: {
        ...cycleInfo,
        periodCount: periods.length,
        isIrregular: irregular,
        cycleLengthHistory: gaps,
        avgCycleLength: avgCycle,
        bbtConfirmedOvulationDay: profile.bbtConfirmedOvulationDay ?? null,
        bbtConfirmedOvulationDate: profile.bbtConfirmedOvulationDate ?? null,
      }
    });
  } catch (err) {
    console.error("Menstrual insights error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
