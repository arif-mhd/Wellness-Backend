import path from "path";
import PDFDocument from "pdfkit";

// Same renderer + branding convention as adminReports.ts's PDF export
// (pdfkit, streamed directly as the HTTP response) — a separate, small
// module rather than importing adminReports.ts's own private constants,
// since a prescription has nothing else to do with the admin analytics
// report route it would otherwise be coupled to.
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

export interface PrescriptionMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
  durationDays?: number | null;
  quantity?: number | null;
  instructions?: string;
}

export interface PrescriptionData {
  // Independent doctors (no clinic) leave this null — the header then just
  // carries the doctor's own name instead of a fabricated clinic name.
  clinicName: string | null;
  clinicAddress?: string | null;
  doctorName: string;
  doctorSpecialty?: string | null;
  doctorLicense?: string | null;
  patientName: string;
  date: string;
  medicines: PrescriptionMedicine[];
}

function drawHeader(doc: PDFKit.PDFDocument, data: PrescriptionData) {
  try {
    doc.image(LOGO_PATH, doc.page.margins.left, doc.y, { width: 90 });
  } catch {
    // logo missing — proceed without it rather than failing the document
  }

  // Independent doctor: no clinic to name here at all — just their own
  // name, which the info block below already covers, so this whole block
  // is skipped rather than showing a placeholder clinic name.
  const rightX = doc.page.width - doc.page.margins.right - 220;
  if (data.clinicName) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND.textDark)
      .text(data.clinicName, rightX, doc.y, { width: 220, align: "right" });
    if (data.clinicAddress) {
      doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted)
        .text(data.clinicAddress, rightX, doc.y, { width: 220, align: "right" });
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND.textDark)
      .text(`Dr. ${data.doctorName}`.replace(/^Dr\. Dr\./, "Dr."), rightX, doc.y, { width: 220, align: "right" });
  }

  doc.y += 40;
  const ruleY = doc.y;
  const grad = doc.linearGradient(doc.page.margins.left, ruleY, doc.page.width - doc.page.margins.right, ruleY);
  grad.stop(0, BRAND.gradientFrom).stop(1, BRAND.gradientTo);
  doc.rect(doc.page.margins.left, ruleY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 2).fill(grad);
  doc.y = ruleY + 20;
}

function drawInfoBlock(doc: PDFKit.PDFDocument, data: PrescriptionData) {
  doc.font("Helvetica-Bold").fontSize(20).fillColor(BRAND.textDark).text("Prescription");
  doc.moveDown(0.8);

  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
  const startY = doc.y;

  doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text("PATIENT", doc.page.margins.left, startY);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.textDark).text(data.patientName, doc.page.margins.left, doc.y);

  doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text("DATE", doc.page.margins.left + colWidth, startY);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.textDark)
    .text(new Date(data.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), doc.page.margins.left + colWidth, doc.y);

  doc.moveDown(1);
  const row2Y = doc.y;

  doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text("PRESCRIBED BY", doc.page.margins.left, row2Y);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.textDark)
    .text(`Dr. ${data.doctorName}`.replace(/^Dr\. Dr\./, "Dr."), doc.page.margins.left, doc.y);
  if (data.doctorSpecialty) {
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text(data.doctorSpecialty, doc.page.margins.left, doc.y);
  }

  if (data.doctorLicense) {
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.textMuted).text("LICENSE NO.", doc.page.margins.left + colWidth, row2Y);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.textDark).text(data.doctorLicense, doc.page.margins.left + colWidth, doc.y);
  }

  doc.moveDown(1.5);
}

function drawMedicinesTable(doc: PDFKit.PDFDocument, medicines: PrescriptionMedicine[]) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  // name | dosage | frequency & timing | duration | qty | instructions
  const widths = [pageWidth * 0.18, pageWidth * 0.12, pageWidth * 0.20, pageWidth * 0.12, pageWidth * 0.10, pageWidth * 0.28];
  const columns = ["Medicine", "Dosage", "Frequency", "Duration", "Qty", "Instructions"];

  function ensureSpace(rowHeight: number) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
    }
  }

  function drawRow(values: string[], opts: { header?: boolean; alt?: boolean; rowHeight?: number } = {}) {
    const rowHeight = opts.rowHeight ?? 22;
    ensureSpace(rowHeight);
    const y = doc.y;
    const bg = opts.header ? BRAND.tableHeaderBg : opts.alt ? BRAND.rowAltBg : undefined;
    if (bg) doc.rect(startX, y, pageWidth, rowHeight).fill(bg);

    doc.font(opts.header ? "Helvetica-Bold" : "Helvetica").fontSize(8)
      .fillColor(opts.header ? BRAND.textDark : "#334155");
    let x = startX;
    values.forEach((v, i) => {
      doc.text(v || "—", x + 6, y + 6, { width: widths[i] - 10, height: rowHeight, ellipsis: true });
      x += widths[i];
    });
    doc.y = y + rowHeight;
  }

  doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.textDark)
    .text(`Medicines  ·  ${medicines.length} item${medicines.length === 1 ? "" : "s"}`);
  doc.moveDown(0.5);

  drawRow(columns, { header: true });

  medicines.forEach((m, i) => {
    drawRow([
      m.name,
      m.dosage ?? "",
      [m.frequency, m.timing].filter(Boolean).join(" · "),
      m.durationDays ? `${m.durationDays} day${m.durationDays === 1 ? "" : "s"}` : "",
      m.quantity ? String(m.quantity) : "",
      m.instructions ?? "",
    ], { alt: i % 2 === 1 });
  });
}

function drawFooter(doc: PDFKit.PDFDocument, data: PrescriptionData) {
  doc.moveDown(2);
  ensureFooterSpace(doc);
  doc.font("Helvetica").fontSize(8).fillColor(BRAND.textMuted)
    .text(
      "This is a computer-generated prescription issued following a video consultation and does not require a physical signature.",
      doc.page.margins.left,
      doc.y,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    );
  doc.moveDown(0.5);
  const footerName = data.clinicName ?? `Dr. ${data.doctorName}`.replace(/^Dr\. Dr\./, "Dr.");
  doc.text(`Generated ${new Date().toLocaleString()} · ${footerName}`, doc.page.margins.left, doc.y);
}

function ensureFooterSpace(doc: PDFKit.PDFDocument) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
    doc.addPage();
  }
}

export function drawPrescriptionPdf(doc: PDFKit.PDFDocument, data: PrescriptionData) {
  doc.fillColor(BRAND.white).rect(0, 0, doc.page.width, doc.page.height).fill();
  drawHeader(doc, data);
  drawInfoBlock(doc, data);
  drawMedicinesTable(doc, data.medicines);
  drawFooter(doc, data);
}
