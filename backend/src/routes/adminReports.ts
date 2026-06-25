import path from "path";
import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { requireRole } from "../middleware/requireRole";
import {
  appointmentsContainer,
  doctorsContainer,
  patientsContainer,
  feedbackContainer,
  queryDocuments,
} from "../config/cosmos";

const router = Router();

const LOGO_PATH = path.join(__dirname, "..", "assets", "wellness-logo.png");
const BRAND = {
  gradientFrom: "#8AA0FF",
  gradientTo: "#5476FC",
  textDark: "#1e293b",
  textMuted: "#64748B",
  tableHeaderBg: "#eef2f7",
  rowAltBg: "#f8fafd",
  border: "#e2e8f0",
  white: "#ffffff",
};

type ReportType =
  | "appointment-booking-trends"
  | "primary-appointment-reasons-1"
  | "appointment-cancellation"
  | "number-of-consultations"
  | "patient-satisfaction-doctor"
  | "number-of-prescriptions"
  | "number-of-appointments"
  | "primary-appointment-reasons-2"
  | "patient-satisfaction-patient";

const REPORT_TITLES: Record<ReportType, string> = {
  "appointment-booking-trends": "Appointment Booking Trends",
  "primary-appointment-reasons-1": "Primary Appointment Reasons",
  "appointment-cancellation": "Appointment Cancellation and Rescheduling",
  "number-of-consultations": "Number of Consultations",
  "patient-satisfaction-doctor": "Patient Satisfaction Ratings (Doctor Activity)",
  "number-of-prescriptions": "Number of Prescriptions Issued",
  "number-of-appointments": "Number of Appointments",
  "primary-appointment-reasons-2": "Primary Appointment Reasons",
  "patient-satisfaction-patient": "Patient Satisfaction Ratings (Patient Activity)",
};

interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  status?: string;       // appointment status
  specialty?: string;    // doctor specialty
  paymentStatus?: string;
  gender?: string;       // patient gender
  durationMins?: number;
}

function parseFilters(body: any): ReportFilters {
  return {
    fromDate: body.fromDate || undefined,
    toDate: body.toDate || undefined,
    status: body.status || undefined,
    specialty: body.specialty || undefined,
    paymentStatus: body.paymentStatus || undefined,
    gender: body.gender || undefined,
    durationMins: body.durationMins ? Number(body.durationMins) : undefined,
  };
}

async function fetchFilteredAppointments(filters: ReportFilters) {
  const conditions: string[] = [];
  const parameters: any[] = [];

  if (filters.fromDate) {
    conditions.push("c.scheduledAt >= @fromDate");
    parameters.push({ name: "@fromDate", value: filters.fromDate });
  }
  if (filters.toDate) {
    conditions.push("c.scheduledAt <= @toDate");
    parameters.push({ name: "@toDate", value: filters.toDate });
  }
  if (filters.status) {
    conditions.push("c.status = @status");
    parameters.push({ name: "@status", value: filters.status });
  }
  if (filters.paymentStatus) {
    conditions.push("c.paymentStatus = @paymentStatus");
    parameters.push({ name: "@paymentStatus", value: filters.paymentStatus });
  }
  if (filters.durationMins) {
    conditions.push("c.durationMins = @durationMins");
    parameters.push({ name: "@durationMins", value: filters.durationMins });
  }

  const query = `SELECT * FROM c${conditions.length ? " WHERE " + conditions.join(" AND ") : ""} ORDER BY c.scheduledAt DESC`;
  let appointments = await queryDocuments<any>(appointmentsContainer, { query, parameters });

  // specialty/gender require a join against doctors/patients — filter in-memory afterward.
  if (filters.specialty || filters.gender) {
    const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId).filter(Boolean)));
    const patientIds = Array.from(new Set(appointments.map((a) => a.patientId).filter(Boolean)));

    const doctorSpecialty: Record<string, string> = {};
    const patientGender: Record<string, string> = {};

    await Promise.all([
      ...doctorIds.map(async (id) => {
        try {
          const { resource } = await doctorsContainer.item(id, id).read();
          doctorSpecialty[id] = resource?.specialty ?? "";
        } catch { doctorSpecialty[id] = ""; }
      }),
      ...patientIds.map(async (id) => {
        try {
          const { resource } = await patientsContainer.item(id, id).read();
          patientGender[id] = resource?.gender ?? "";
        } catch { patientGender[id] = ""; }
      }),
    ]);

    if (filters.specialty) {
      appointments = appointments.filter((a) => doctorSpecialty[a.doctorId] === filters.specialty);
    }
    if (filters.gender) {
      appointments = appointments.filter((a) => patientGender[a.patientId] === filters.gender);
    }
  }

  return appointments;
}

async function resolveNames(appointments: any[]) {
  const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId).filter(Boolean)));
  const patientIds = Array.from(new Set(appointments.map((a) => a.patientId).filter(Boolean)));

  const doctorNames: Record<string, string> = {};
  const patientNames: Record<string, string> = {};

  await Promise.all([
    ...doctorIds.map(async (id) => {
      try {
        const { resource } = await doctorsContainer.item(id, id).read();
        doctorNames[id] = resource?.fullName ?? "Unknown Doctor";
      } catch { doctorNames[id] = "Unknown Doctor"; }
    }),
    ...patientIds.map(async (id) => {
      try {
        const { resource } = await patientsContainer.item(id, id).read();
        patientNames[id] = resource?.fullName ?? "Unknown Patient";
      } catch { patientNames[id] = "Unknown Patient"; }
    }),
  ]);

  return { doctorNames, patientNames };
}

// Builds the report's tabular rows + summary depending on report type.
async function buildReportData(reportType: ReportType, filters: ReportFilters) {
  const appointments = await fetchFilteredAppointments(filters);

  switch (reportType) {
    case "appointment-booking-trends":
    case "number-of-appointments": {
      const { doctorNames, patientNames } = await resolveNames(appointments);
      const byDay: Record<string, number> = {};
      for (const a of appointments) {
        const day = a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "Unknown";
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      const chartEntries = Object.entries(byDay).slice(-10);
      return {
        summary: [{ label: "Total appointments", value: String(appointments.length) }],
        chart: chartEntries.length > 1 ? { type: "bar" as const, data: chartEntries.map(([label, value]) => ({ label, value })) } : undefined,
        columns: ["Date", "Patient", "Doctor", "Status"],
        rows: appointments.map((a) => [
          a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
          patientNames[a.patientId] ?? "—",
          doctorNames[a.doctorId] ?? "—",
          a.status ?? "—",
        ]),
      };
    }

    case "appointment-cancellation": {
      const cancelled = appointments.filter((a) => a.status === "cancelled");
      const notCancelled = appointments.length - cancelled.length;
      const { doctorNames, patientNames } = await resolveNames(cancelled);
      const pct = appointments.length > 0 ? Math.round((cancelled.length / appointments.length) * 100) : 0;
      return {
        summary: [
          { label: "Total appointments", value: String(appointments.length) },
          { label: "Cancelled", value: String(cancelled.length) },
          { label: "Cancellation rate", value: `${pct}%` },
        ],
        chart: appointments.length > 0 ? {
          type: "donut" as const,
          data: [
            { label: "Kept", value: notCancelled },
            { label: "Cancelled", value: cancelled.length },
          ],
        } : undefined,
        columns: ["Date", "Patient", "Doctor", "Reason"],
        rows: cancelled.map((a) => [
          a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
          patientNames[a.patientId] ?? "—",
          doctorNames[a.doctorId] ?? "—",
          a.reason ?? "—",
        ]),
      };
    }

    case "number-of-consultations": {
      const consultations = appointments.filter((a) => a.status === "completed" || a.status === "in_progress");
      const { doctorNames, patientNames } = await resolveNames(consultations);
      const byDoctor: Record<string, number> = {};
      for (const a of consultations) {
        const name = doctorNames[a.doctorId] ?? "Unknown";
        byDoctor[name] = (byDoctor[name] ?? 0) + 1;
      }
      const chartEntries = Object.entries(byDoctor).sort((a, b) => b[1] - a[1]).slice(0, 8);
      return {
        summary: [{ label: "Total consultations", value: String(consultations.length) }],
        chart: chartEntries.length > 1 ? { type: "bar" as const, data: chartEntries.map(([label, value]) => ({ label, value })) } : undefined,
        columns: ["Date", "Patient", "Doctor", "Status"],
        rows: consultations.map((a) => [
          a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
          patientNames[a.patientId] ?? "—",
          doctorNames[a.doctorId] ?? "—",
          a.status ?? "—",
        ]),
      };
    }

    case "number-of-prescriptions": {
      const withRx = appointments.filter((a) => Array.isArray(a.emr?.medicines) && a.emr.medicines.length > 0);
      const withoutRx = appointments.length - withRx.length;
      const { doctorNames, patientNames } = await resolveNames(withRx);
      return {
        summary: [{ label: "Appointments with prescriptions", value: String(withRx.length) }],
        chart: appointments.length > 0 ? {
          type: "donut" as const,
          data: [
            { label: "Prescribed", value: withRx.length },
            { label: "No prescription", value: withoutRx },
          ],
        } : undefined,
        columns: ["Date", "Patient", "Doctor", "Medicines"],
        rows: withRx.map((a) => [
          a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—",
          patientNames[a.patientId] ?? "—",
          doctorNames[a.doctorId] ?? "—",
          (a.emr?.medicines ?? []).map((m: any) => m.name).filter(Boolean).join(", ") || "—",
        ]),
      };
    }

    case "primary-appointment-reasons-1":
    case "primary-appointment-reasons-2": {
      const reasonCounts: Record<string, number> = {};
      for (const a of appointments) {
        if (a.reason) {
          const key = String(a.reason).trim();
          reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
        }
      }
      const sorted = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
      return {
        summary: [{ label: "Distinct reasons", value: String(sorted.length) }],
        chart: sorted.length > 1 ? { type: "bar" as const, data: sorted.slice(0, 8).map(([label, value]) => ({ label, value })) } : undefined,
        columns: ["Reason", "Count"],
        rows: sorted.map(([reason, count]) => [reason, String(count)]),
      };
    }

    case "patient-satisfaction-doctor":
    case "patient-satisfaction-patient": {
      const apptIds = new Set(appointments.map((a) => a.id));
      const allFeedback = await queryDocuments<any>(feedbackContainer, {
        query: "SELECT * FROM c WHERE c.folder = 'appointment' ORDER BY c.createdAt DESC",
        parameters: [],
      });
      const relevant = filters.fromDate || filters.toDate || filters.status || filters.specialty || filters.paymentStatus || filters.gender || filters.durationMins
        ? allFeedback.filter((f) => apptIds.has(f.appointmentId))
        : allFeedback;

      const avg = relevant.length > 0
        ? Math.round((relevant.reduce((s, f) => s + (f.rating ?? 0), 0) / relevant.length) * 10) / 10
        : 0;

      const byRating: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      for (const f of relevant) {
        const r = String(Math.round(f.rating ?? 0));
        if (byRating[r] !== undefined) byRating[r]++;
      }

      return {
        summary: [
          { label: "Total reviews", value: String(relevant.length) },
          { label: "Average rating", value: `${avg} / 5` },
        ],
        chart: relevant.length > 0 ? {
          type: "bar" as const,
          data: Object.entries(byRating).map(([label, value]) => ({ label: `${label}★`, value })),
        } : undefined,
        columns: ["Date", "Reviewer", "Provider", "Rating", "Comment"],
        rows: relevant.map((f) => [
          f.createdAt ? new Date(f.createdAt).toLocaleString() : "—",
          f.reviewer?.name ?? "—",
          f.provider?.name ?? "—",
          `${f.rating ?? "—"}/5`,
          (f.comment ?? "").slice(0, 80) || "—",
        ]),
      };
    }
  }
}

const FILTER_LABELS: Record<string, string> = {
  fromDate: "From date",
  toDate: "To date",
  status: "Appointment status",
  specialty: "Specialization",
  paymentStatus: "Payment status",
  gender: "Gender",
  durationMins: "Duration (mins)",
};

function drawLogoHeader(doc: PDFKit.PDFDocument) {
  try {
    doc.image(LOGO_PATH, doc.page.margins.left, 24, { width: 90 });
  } catch {
    // logo missing — proceed without it rather than failing the whole report
  }
}

function drawCoverPage(doc: PDFKit.PDFDocument, title: string, filters: ReportFilters) {
  const { width, height } = doc.page;

  // White background, brand-colored text/accents only.
  doc.rect(0, 0, width, height).fill(BRAND.white);

  // Logo, centered.
  try {
    const logoWidth = 180;
    doc.image(LOGO_PATH, (width - logoWidth) / 2, height * 0.28, { width: logoWidth });
  } catch {
    // logo missing — proceed without it rather than failing the whole report
  }

  doc.fillColor(BRAND.textDark);
  doc.font("Helvetica-Bold").fontSize(28)
    .text(title, 60, height * 0.46, { width: width - 120, align: "center", height: 40 });

  doc.font("Helvetica").fontSize(11).fillColor(BRAND.textMuted);
  doc.text(`Generated ${new Date().toLocaleString()}`, 60, height * 0.46 + 50, { width: width - 120, align: "center", height: 16 });

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== undefined && v !== "");
  if (activeFilters.length > 0) {
    const filterText = activeFilters.map(([k, v]) => `${FILTER_LABELS[k] ?? k}: ${v}`).join("   •   ");
    doc.fontSize(9).fillColor(BRAND.gradientTo).text(filterText, 60, height * 0.46 + 80, { width: width - 120, align: "center", height: 14 });
  }

  // Accent rule under the filters, echoing the dashboard's brand gradient.
  const ruleWidth = 120;
  const ruleY = height * 0.46 + 110;
  const grad = doc.linearGradient((width - ruleWidth) / 2, ruleY, (width + ruleWidth) / 2, ruleY);
  grad.stop(0, BRAND.gradientFrom).stop(1, BRAND.gradientTo);
  doc.rect((width - ruleWidth) / 2, ruleY, ruleWidth, 3).fill(grad);

  // Footer — pinned to the bottom of the cover page itself, never its own page.
  doc.fontSize(9).fillColor(BRAND.textMuted)
    .text("Wellness Central — Admin Analytics", 0, height - 36, { width, align: "center", height: 14 });
}

function drawSummaryCards(doc: PDFKit.PDFDocument, summary: { label: string; value: string }[]) {
  if (summary.length === 0) return;

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const gap = 14;
  const cardWidth = (pageWidth - gap * (summary.length - 1)) / summary.length;
  const cardHeight = 60;
  const y = doc.y;

  summary.forEach((s, i) => {
    const x = startX + i * (cardWidth + gap);
    doc.roundedRect(x, y, cardWidth, cardHeight, 10).fillAndStroke(BRAND.rowAltBg, BRAND.border);
    doc.fillColor(BRAND.textMuted).font("Helvetica").fontSize(8).text(s.label, x + 12, y + 12, { width: cardWidth - 24 });
    doc.fillColor(BRAND.gradientTo).font("Helvetica-Bold").fontSize(16).text(s.value, x + 12, y + 28, { width: cardWidth - 24 });
  });

  doc.y = y + cardHeight + 20;
}

function drawBarChart(doc: PDFKit.PDFDocument, data: { label: string; value: number }[]) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const chartHeight = 160;
  const y = doc.y;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const barGap = 10;
  const barWidth = (pageWidth - barGap * (data.length - 1)) / data.length;

  data.forEach((d, i) => {
    const barHeight = Math.max((d.value / maxVal) * (chartHeight - 30), 2);
    const x = startX + i * (barWidth + barGap);
    const barY = y + (chartHeight - 30) - barHeight;

    const grad = doc.linearGradient(x, barY, x, barY + barHeight);
    grad.stop(0, BRAND.gradientFrom).stop(1, BRAND.gradientTo);
    doc.roundedRect(x, barY, barWidth, barHeight, 4).fill(grad);

    doc.fillColor(BRAND.textDark).font("Helvetica-Bold").fontSize(8)
      .text(String(d.value), x, barY - 12, { width: barWidth, align: "center" });

    doc.fillColor(BRAND.textMuted).font("Helvetica").fontSize(7)
      .text(d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label, x, y + chartHeight - 22, { width: barWidth, align: "center" });
  });

  doc.y = y + chartHeight + 15;
}

function drawDonutChart(doc: PDFKit.PDFDocument, data: { label: string; value: number }[]) {
  const colors = [BRAND.gradientTo, "#C7D5FF", "#FFB199", "#A0E7B0"];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const chartHeight = 150;
  const y = doc.y;

  const cx = startX + 75;
  const cy = y + chartHeight / 2;
  const outerR = 65;
  const innerR = 38;

  let startAngle = -Math.PI / 2;
  data.forEach((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;
    const color = colors[i % colors.length];

    doc.save();
    doc.path(describeDonutSlice(cx, cy, innerR, outerR, startAngle, endAngle)).fill(color);
    doc.restore();

    startAngle = endAngle;
  });

  // Legend
  const legendX = startX + 180;
  let legendY = y + 10;
  data.forEach((d, i) => {
    const pct = Math.round((d.value / total) * 100);
    doc.rect(legendX, legendY, 10, 10).fill(colors[i % colors.length]);
    doc.fillColor(BRAND.textDark).font("Helvetica").fontSize(9)
      .text(`${d.label} — ${d.value} (${pct}%)`, legendX + 16, legendY - 1, { width: pageWidth - 200 });
    legendY += 20;
  });

  doc.y = y + chartHeight + 15;
}

// Builds an SVG-style path string for one donut slice between two angles.
function describeDonutSlice(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [ox1, oy1] = p(outerR, startAngle);
  const [ox2, oy2] = p(outerR, endAngle);
  const [ix2, iy2] = p(innerR, endAngle);
  const [ix1, iy1] = p(innerR, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    "Z",
  ].join(" ");
}

function drawDataTable(doc: PDFKit.PDFDocument, columns: string[], rows: string[][]) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / Math.max(columns.length, 1);
  const startX = doc.page.margins.left;
  const rowHeight = 20;

  function ensureSpace() {
    if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
    }
  }

  function drawRow(values: string[], opts: { header?: boolean; alt?: boolean } = {}) {
    ensureSpace();
    const y = doc.y;
    const bg = opts.header ? BRAND.tableHeaderBg : opts.alt ? BRAND.rowAltBg : undefined;
    if (bg) doc.rect(startX, y, pageWidth, rowHeight).fill(bg);

    doc.font(opts.header ? "Helvetica-Bold" : "Helvetica").fontSize(8)
      .fillColor(opts.header ? BRAND.textDark : "#334155");
    values.forEach((v, i) => {
      doc.text(v || "—", startX + i * colWidth + 6, y + 5, { width: colWidth - 10, height: rowHeight, ellipsis: true });
    });
    doc.y = y + rowHeight;
  }

  doc.fontSize(11).font("Helvetica-Bold").fillColor(BRAND.textDark)
    .text(`Details  ·  ${rows.length} record${rows.length === 1 ? "" : "s"}`);
  doc.moveDown(0.5);

  drawRow(columns, { header: true });

  if (rows.length === 0) {
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text("No records match the selected filters.");
    return;
  }

  rows.forEach((row, i) => drawRow(row, { alt: i % 2 === 1 }));
}

function drawPdfReport(
  doc: PDFKit.PDFDocument,
  title: string,
  filters: ReportFilters,
  summary: { label: string; value: string }[],
  chart: { type: "bar" | "donut"; data: { label: string; value: number }[] } | undefined,
  columns: string[],
  rows: string[][]
) {
  drawCoverPage(doc, title, filters);

  // Every page added after the cover (including ones from table overflow)
  // gets the logo drawn in its top-left corner, and the cursor pushed below
  // it so table rows never start underneath the logo.
  const CONTENT_TOP = 24 + 30 + 20;
  doc.on("pageAdded", () => {
    drawLogoHeader(doc);
    doc.y = CONTENT_TOP;
  });

  doc.addPage();

  doc.fillColor(BRAND.textDark).font("Helvetica-Bold").fontSize(16).text(title);
  doc.moveDown(0.8);

  drawSummaryCards(doc, summary);

  if (chart && chart.data.length > 0) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.textDark).text(
      chart.type === "donut" ? "Breakdown" : "Trend"
    );
    doc.moveDown(0.4);
    if (chart.type === "donut") {
      drawDonutChart(doc, chart.data);
    } else {
      drawBarChart(doc, chart.data);
    }
  }

  drawDataTable(doc, columns, rows);
}

// ─── POST /api/admin/reports/generate ───────────────────────────────────────
// Body: { reportType: ReportType, ...filters }
// Streams back a PDF built from real, filtered platform data.
router.post("/generate", requireRole("admin"), async (req: Request, res: Response) => {
  const reportType = req.body.reportType as ReportType;
  if (!reportType || !REPORT_TITLES[reportType]) {
    res.status(400).json({ error: "Invalid or missing reportType." });
    return;
  }

  const filters = parseFilters(req.body);

  try {
    const data = await buildReportData(reportType, filters);
    if (!data) {
      res.status(400).json({ error: "Unable to build report." });
      return;
    }

    const title = REPORT_TITLES[reportType];
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${reportType}-${Date.now()}.pdf"`);

    doc.pipe(res);
    drawPdfReport(doc, title, filters, data.summary, data.chart, data.columns, data.rows);
    doc.end();
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
