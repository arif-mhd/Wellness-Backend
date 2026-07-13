import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import {
  appointmentsContainer,
  feedbackContainer,
  doctorsContainer,
  pharmaciesContainer,
  supportContainer,
  queryDocuments,
} from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { pool } from "../config/database";

const router = Router();

type Range = "day" | "week" | "month";

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

// Calendar-aligned period boundaries for the requested range, anchored to "now".
// day:   today, midnight to midnight
// week:  current week, Monday 00:00 to next Monday 00:00
// month: current calendar month, 1st 00:00 to 1st of next month 00:00
function periodBounds(range: Range, now: Date): { start: Date; end: Date } {
  if (range === "day") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (range === "week") {
    // Monday-start week
    const dow = now.getDay(); // 0 = Sunday
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

// Previous period of the same length, immediately before the current one — used for % change.
function previousPeriodBounds(range: Range, now: Date): { start: Date; end: Date } {
  if (range === "day") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }
  if (range === "week") {
    const dow = now.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const start = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const end = thisWeekStart;
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end };
}

// Builds the bucket boundaries + labels within the calendar-aligned period.
// day:   24 buckets, one per hour (00:00 .. 23:00)
// week:  7 buckets, one per day (Mon..Sun)
// month: one bucket per day of the month (28-31 buckets)
function buildBuckets(range: Range, now: Date): Bucket[] {
  const { start: periodStart } = periodBounds(range, now);
  const buckets: Bucket[] = [];

  if (range === "day") {
    for (let h = 0; h < 24; h++) {
      const start = new Date(periodStart.getTime() + h * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      buckets.push({ label: `${h.toString().padStart(2, "0")}:00`, start, end });
    }
  } else if (range === "week") {
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    for (let i = 0; i < 7; i++) {
      const start = new Date(periodStart.getTime() + i * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      buckets.push({ label: dayLabels[i], start, end });
    }
  } else {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 0; d < daysInMonth; d++) {
      const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + d);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      buckets.push({ label: String(d + 1), start, end });
    }
  }

  return buckets;
}

function bucketCounts(buckets: Bucket[], timestamps: string[]): number[] {
  const dates = timestamps.map((t) => new Date(t).getTime()).filter((t) => !isNaN(t));
  return buckets.map((b) => dates.filter((t) => t >= b.start.getTime() && t < b.end.getTime()).length);
}

function countInRange(timestamps: string[], start: Date, end: Date): number {
  return timestamps.filter((t) => {
    const ts = new Date(t).getTime();
    return !isNaN(ts) && ts >= start.getTime() && ts < end.getTime();
  }).length;
}

// % change of current period total vs the immediately preceding period of the same length.
function pctChangeVsPrevious(currentTotal: number, previousTotal: number): { value: number; positive: boolean } {
  if (previousTotal === 0) {
    if (currentTotal === 0) return { value: 0, positive: true };
    return { value: 100, positive: true };
  }
  const change = ((currentTotal - previousTotal) / previousTotal) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, positive: change >= 0 };
}

function avgChangeVsPrevious(currentAvg: number, previousAvg: number): { value: number; positive: boolean } {
  if (previousAvg === 0) {
    if (currentAvg === 0) return { value: 0, positive: true };
    return { value: 100, positive: true };
  }
  const change = ((currentAvg - previousAvg) / previousAvg) * 100;
  return { value: Math.round(Math.abs(change) * 10) / 10, positive: change >= 0 };
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

// ─── GET /api/admin/dashboard/stats?range=day|week|month ───────────────────
router.get("/stats", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const range = (["day", "week", "month"].includes(req.query.range as string) ? req.query.range : "week") as Range;
    const now = new Date();
    const buckets = buildBuckets(range, now);
    const { start: periodStart, end: periodEnd } = periodBounds(range, now);
    const { start: prevStart, end: prevEnd } = previousPeriodBounds(range, now);

    // Fetch current + previous period in one query (previous period is always earlier and contiguous)
    const fetchSince = prevStart.toISOString();

    const allAppointments = await queryDocuments<any>(appointmentsContainer, {
      query: "SELECT c.id, c.scheduledAt, c.createdAt, c.status, c.reason, c.doctorId, c.patientId, c.emr FROM c WHERE c.createdAt >= @since",
      parameters: [{ name: "@since", value: fetchSince }],
    });

    const allFeedbackDocs = await queryDocuments<any>(feedbackContainer, {
      query: "SELECT c.rating, c.folder, c.createdAt FROM c WHERE c.createdAt >= @since",
      parameters: [{ name: "@since", value: fetchSince }],
    });

    const inCurrent = (createdAt: string) => {
      const t = new Date(createdAt).getTime();
      return !isNaN(t) && t >= periodStart.getTime() && t < periodEnd.getTime();
    };
    const inPrevious = (createdAt: string) => {
      const t = new Date(createdAt).getTime();
      return !isNaN(t) && t >= prevStart.getTime() && t < prevEnd.getTime();
    };

    const appointments = allAppointments.filter((a) => inCurrent(a.createdAt));
    const prevAppointments = allAppointments.filter((a) => inPrevious(a.createdAt));
    const feedbackDocs = allFeedbackDocs.filter((f) => inCurrent(f.createdAt));
    const prevFeedbackDocs = allFeedbackDocs.filter((f) => inPrevious(f.createdAt));

    // ── Appointments Booked (bar) ──────────────────────────────────────────
    const bookedTimestamps = appointments.map((a) => a.createdAt);
    const bookedData = bucketCounts(buckets, bookedTimestamps);
    const bookedTotal = appointments.length;
    const bookedChange = pctChangeVsPrevious(bookedTotal, prevAppointments.length);

    // ── Appointment Booking Trends (line) — booked per bucket, same series ─
    const trendsData = bookedData;
    const trendsChange = bookedChange;

    // ── Cancellation & Rescheduling ─────────────────────────────────────────
    const cancelled = appointments.filter((a) => a.status === "cancelled");
    const prevCancelled = prevAppointments.filter((a) => a.status === "cancelled");
    const cancelledData = bucketCounts(buckets, cancelled.map((a) => a.createdAt));
    const totalBookingCount = appointments.length;
    const cancelledCount = cancelled.length;
    const cancelPct = totalBookingCount > 0 ? Math.round((cancelledCount / totalBookingCount) * 100) : 0;
    const bookingPct = 100 - cancelPct;
    const cancelChange = pctChangeVsPrevious(cancelledCount, prevCancelled.length);
    const bookingChangeForCard = bookedChange;

    // ── Number of Consultations (completed appointments) ───────────────────
    const consultations = appointments.filter((a) => a.status === "completed" || a.status === "in_progress");
    const prevConsultations = prevAppointments.filter((a) => a.status === "completed" || a.status === "in_progress");
    const consultData = bucketCounts(buckets, consultations.map((a) => a.createdAt));
    const consultChange = pctChangeVsPrevious(consultations.length, prevConsultations.length);

    // ── Patient Satisfaction Ratings (doctor feedback average per bucket) ───
    const doctorFeedback = feedbackDocs.filter((f) => f.folder === "appointment");
    const prevDoctorFeedback = prevFeedbackDocs.filter((f) => f.folder === "appointment");
    const satisfactionData = buckets.map((b) => {
      const inBucket = doctorFeedback.filter((f) => {
        const t = new Date(f.createdAt).getTime();
        return t >= b.start.getTime() && t < b.end.getTime();
      });
      if (inBucket.length === 0) return 0;
      return Math.round((inBucket.reduce((s, f) => s + (f.rating ?? 0), 0) / inBucket.length) * 10) / 10;
    });
    const avgSatisfaction = doctorFeedback.length > 0
      ? Math.round((doctorFeedback.reduce((s, f) => s + (f.rating ?? 0), 0) / doctorFeedback.length) * 10) / 10
      : 0;
    const prevAvgSatisfaction = prevDoctorFeedback.length > 0
      ? Math.round((prevDoctorFeedback.reduce((s, f) => s + (f.rating ?? 0), 0) / prevDoctorFeedback.length) * 10) / 10
      : 0;
    const satisfactionChange = avgChangeVsPrevious(avgSatisfaction, prevAvgSatisfaction);

    // ── Number of Prescriptions Issued (appointments with emr.medicines) ───
    const withPrescriptions = appointments.filter((a) => Array.isArray(a.emr?.medicines) && a.emr.medicines.length > 0);
    const prevWithPrescriptions = prevAppointments.filter((a) => Array.isArray(a.emr?.medicines) && a.emr.medicines.length > 0);
    const prescriptionsData = bucketCounts(buckets, withPrescriptions.map((a) => a.createdAt));
    const prescriptionsChange = pctChangeVsPrevious(withPrescriptions.length, prevWithPrescriptions.length);

    // ── Number of Appointments (patient activity — same as booked) ─────────
    const apptActivityData = bookedData;
    const apptActivityChange = bookedChange;

    // ── Primary Appointment Reasons ─────────────────────────────────────────
    const reasonCounts: Record<string, number> = {};
    for (const a of appointments) {
      if (a.reason) {
        const key = String(a.reason).trim();
        reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
      }
    }
    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const reasonsTotal = Object.values(reasonCounts).reduce((s, v) => s + v, 0);

    // ── Patient Satisfaction Ratings 2 (all feedback, not just doctor) ──────
    const allSatisfactionData = buckets.map((b) => {
      const inBucket = feedbackDocs.filter((f) => {
        const t = new Date(f.createdAt).getTime();
        return t >= b.start.getTime() && t < b.end.getTime();
      });
      if (inBucket.length === 0) return 0;
      return Math.round((inBucket.reduce((s, f) => s + (f.rating ?? 0), 0) / inBucket.length) * 10) / 10;
    });
    const avgAllSatisfaction = feedbackDocs.length > 0
      ? Math.round((feedbackDocs.reduce((s, f) => s + (f.rating ?? 0), 0) / feedbackDocs.length) * 10) / 10
      : 0;
    const prevAvgAllSatisfaction = prevFeedbackDocs.length > 0
      ? Math.round((prevFeedbackDocs.reduce((s, f) => s + (f.rating ?? 0), 0) / prevFeedbackDocs.length) * 10) / 10
      : 0;
    const allSatisfactionChange = avgChangeVsPrevious(avgAllSatisfaction, prevAvgAllSatisfaction);

    const labels = buckets.map((b) => b.label);

    res.json({
      range,
      labels,
      appointmentsBooked: {
        data: bookedData,
        total: bookedTotal,
        totalLabel: formatCompact(bookedTotal),
        change: bookedChange,
        hasData: bookedTotal > 0,
      },
      bookingTrends: {
        data: trendsData,
        value: trendsData.length ? trendsData[trendsData.length - 1] : 0,
        change: trendsChange,
        hasData: bookedTotal > 0,
      },
      cancellation: {
        totalBooking: totalBookingCount,
        totalBookingLabel: formatCompact(totalBookingCount),
        cancellations: cancelledCount,
        cancellationsLabel: formatCompact(cancelledCount),
        bookingPct,
        cancelPct,
        change: cancelChange,
        bookingChange: bookingChangeForCard,
        total: totalBookingCount,
        totalLabel: formatCompact(totalBookingCount),
        hasData: totalBookingCount > 0,
      },
      consultations: {
        data: consultData,
        total: consultations.length,
        totalLabel: formatCompact(consultations.length),
        change: consultChange,
        hasData: consultations.length > 0,
      },
      doctorSatisfaction: {
        data: satisfactionData,
        value: avgSatisfaction,
        change: satisfactionChange,
        hasData: doctorFeedback.length > 0,
      },
      prescriptions: {
        data: prescriptionsData,
        total: withPrescriptions.length,
        totalLabel: formatCompact(withPrescriptions.length),
        change: prescriptionsChange,
        hasData: withPrescriptions.length > 0,
      },
      patientAppointments: {
        data: apptActivityData,
        value: apptActivityData.length ? apptActivityData[apptActivityData.length - 1] : 0,
        change: apptActivityChange,
        hasData: bookedTotal > 0,
      },
      primaryReasons: {
        reasons: topReasons,
        total: reasonsTotal,
        totalLabel: formatCompact(reasonsTotal),
        hasData: topReasons.length > 0,
      },
      patientSatisfaction: {
        data: allSatisfactionData,
        value: avgAllSatisfaction,
        change: allSatisfactionChange,
        hasData: feedbackDocs.length > 0,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/dashboard/tasks ──────────────────────────────────────────
// Aggregates pending admin action items from across the platform into a single
// task list. Tasks are derived live from source data — there is no separate
// "task" record. A task disappears once the underlying item is resolved
// (doctor approved/rejected, pharmacy approved/rejected, ticket closed).
router.get("/tasks", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const [pendingDoctors, pendingPharmacies, openTickets, pendingSlotChanges] = await Promise.all([
      queryDocuments<any>(doctorsContainer, {
        query: "SELECT c.id, c.fullName, c.email, c.specialty, c.registeredAt FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "pending_approval" }],
      }),
      queryDocuments<any>(pharmaciesContainer, {
        query: "SELECT c.id, c.pharmacyName, c.ownerName, c.email, c.registeredAt FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "pending_approval" }],
      }),
      queryDocuments<any>(supportContainer, {
        query: "SELECT c.id, c.subject, c.description, c.submitterRole, c.category, c.createdAt FROM c WHERE c.status = @status",
        parameters: [{ name: "@status", value: "Open" }],
      }),
      queryDocuments<any>(doctorsContainer, {
        query: "SELECT c.id, c.fullName, c.email, c.specialty, c.updatedAt FROM c WHERE c.slotsPending = true",
      }),
    ]);

    const tasks = [
      ...pendingDoctors.map((d) => ({
        id: `doctor:${d.id}`,
        type: "doctor_approval" as const,
        title: d.fullName ?? "New doctor application",
        email: d.email ?? "",
        summary: `${d.specialty ?? "Specialty pending"} — awaiting onboarding approval`,
        priority: "High Priority" as const,
        createdAt: d.registeredAt ?? new Date(0).toISOString(),
        link: `/dashboard/doctors?id=${d.id}`,
      })),
      ...pendingPharmacies.map((p) => ({
        id: `pharmacy:${p.id}`,
        type: "pharmacy_approval" as const,
        title: p.pharmacyName ?? "New pharmacy application",
        email: p.email ?? "",
        summary: `Owner: ${p.ownerName ?? "Unknown"} — awaiting onboarding approval`,
        priority: "High Priority" as const,
        createdAt: p.registeredAt ?? new Date(0).toISOString(),
        link: `/dashboard/pharmacy?id=${p.id}`,
      })),
      ...openTickets.map((t) => ({
        id: `ticket:${t.id}`,
        type: "support_ticket" as const,
        title: t.subject ?? "Support ticket",
        email: "",
        summary: `${t.submitterRole === "doctor" ? "Doctor" : "Patient"} request — ${(t.description ?? "").slice(0, 80)}`,
        priority: null,
        createdAt: t.createdAt ?? new Date(0).toISOString(),
        link: `/dashboard/support?id=${t.id}`,
      })),
      ...pendingSlotChanges.map((d) => ({
        id: `slots:${d.id}`,
        type: "slot_change" as const,
        title: d.fullName ?? "Doctor availability update",
        email: d.email ?? "",
        summary: `${d.specialty ?? "Doctor"} — updated weekly availability, awaiting verification`,
        priority: "High Priority" as const,
        createdAt: d.updatedAt ?? new Date(0).toISOString(),
        link: `/dashboard/doctors?id=${d.id}`,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      tasks,
      counts: {
        doctorApprovals: pendingDoctors.length,
        pharmacyApprovals: pendingPharmacies.length,
        openTickets: openTickets.length,
        slotChanges: pendingSlotChanges.length,
        total: tasks.length,
      },
    });
  } catch (err) {
    console.error("Dashboard tasks error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/admin/dashboard/2fa/status ─────────────────────────────────────
router.get("/2fa/status", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  try {
    const result = await pool.query(
      "SELECT two_factor_enabled FROM user_profiles WHERE supertokens_id = $1",
      [userId]
    );
    res.json({ twoFactorEnabled: result.rows[0]?.two_factor_enabled === true });
  } catch (err) {
    console.error("Admin 2FA status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/dashboard/2fa/enable ────────────────────────────────────
router.post("/2fa/enable", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  try {
    await pool.query(
      "UPDATE user_profiles SET two_factor_enabled = true WHERE supertokens_id = $1",
      [userId]
    );
    res.json({ status: "OK", twoFactorEnabled: true });
  } catch (err) {
    console.error("Admin 2FA enable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/admin/dashboard/2fa/disable ───────────────────────────────────
router.post("/2fa/disable", requireRole("admin"), async (req: SessionRequest, res: Response) => {
  const userId = req.session!.getUserId();
  try {
    await pool.query(
      "UPDATE user_profiles SET two_factor_enabled = false WHERE supertokens_id = $1",
      [userId]
    );
    res.json({ status: "OK", twoFactorEnabled: false });
  } catch (err) {
    console.error("Admin 2FA disable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;

