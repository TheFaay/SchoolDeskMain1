// Feature 4: builds the Terminal Report Sheet PDF (A4 portrait, one page)
// with pdf-lib. Layout mirrors the on-screen ReportSheet component in
// app/dashboard/academics/results/report-sheet/ReportSheet.tsx — keep the two
// in sync (same wording, same order).
//
// Pure function: data in via props, bytes out. No database, no network, no
// secrets. Scores: CA 40 + Exam 60 = 100.

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { GRADING_KEY, gradeForTotal } from "./scoring";
import {
  SCHOOL_NAME,
  subjectTotal,
  type TermResult,
} from "./types";
import type { ClassStanding } from "./getResults";

// A4 portrait in PostScript points: 210 x 297 mm.
const W = 595.28;
const H = 841.89;
const MARGIN = 36;

const NAVY = rgb(18 / 255, 38 / 255, 79 / 255);
const GOLD = rgb(201 / 255, 162 / 255, 39 / 255);
const INK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.45, 0.45, 0.5);
const LINE = rgb(0.55, 0.55, 0.6);
const WHITE = rgb(1, 1, 1);
const SOFT = rgb(0.965, 0.965, 0.98);

export interface ReportSheetPdfProps {
  studentName: string;
  className: string;
  admissionNumber: string;
  term: string;
  session: string;
  result: TermResult;
  standing: ClassStanding;
}

export async function buildReportSheetPdf(
  props: ReportSheetPdfProps,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Terminal Report Sheet — ${props.studentName}`);
  doc.setAuthor(SCHOOL_NAME);
  doc.setCreator("SchoolDesk");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const page = doc.addPage([W, H]);
  const { result, standing } = props;

  /* ---------------- primitive helpers (flat, no state) ---------------- */

  const txt = (
    s: string,
    x: number,
    y: number,
    size: number,
    f: PDFFont = font,
    color = INK,
  ) => page.drawText(toPdfText(s), { x, y, size, font: f, color });

  const centre = (
    s: string,
    y: number,
    size: number,
    f: PDFFont = font,
    color = INK,
  ) => {
    const text = toPdfText(s);
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - w) / 2, y, size, font: f, color });
  };

  /** Same as centre, but centred on an x position (e.g. a signature column). */
  const centreAt = (
    cx: number,
    s: string,
    y: number,
    size: number,
    f: PDFFont = font,
    color = INK,
  ) => {
    const text = toPdfText(s);
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: cx - w / 2, y, size, font: f, color });
  };

  const tracked = (s: string, spacing: number) =>
    toPdfText(s).split("").join(" ".repeat(spacing));

  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: ReturnType<typeof rgb>,
  ) => {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: fill,
      borderColor: LINE,
      borderWidth: 0.8,
    });
  };

  const hline = (x1: number, x2: number, y: number, width = 0.8) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: width, color: LINE });

  const fitText = (value: string, size: number, f: PDFFont, maxWidth: number) => {
    let text = toPdfText(value);
    if (f.widthOfTextAtSize(text, size) <= maxWidth) return text;
    while (text.length > 4 && f.widthOfTextAtSize(`${text.slice(0, -4)}...`, size) > maxWidth) text = text.slice(0, -1);
    return text.length > 4 ? `${text.slice(0, -4)}...` : "...";
  };

  /* ---------------- running cursor, top -> bottom ---------------- */

  let y = H - MARGIN; // 805.89 — y is always the baseline of the NEXT line

  // --- Crest (vector, matches the on-screen SVG) ---
  const cx = W / 2;
  const cy = y - 20;
  page.drawCircle({ x: cx, y: cy, size: 20, color: WHITE, borderColor: NAVY, borderWidth: 2 });
  page.drawCircle({ x: cx, y: cy, size: 16, color: NAVY });
  centre("C·H", cy + 3, 12.5, italic, WHITE);
  centre("ACADEMY", cy - 9, 6.5, italic, GOLD);
  y = cy - 20;

  // --- School name ---
  y -= 26;
  centre(SCHOOL_NAME.toLocaleUpperCase(), y, 17, bold, NAVY);

  // --- Title band with gold rules ---
  const bandTop = y - 8;
  const bandBottom = bandTop - 24;
  hline(MARGIN, W - MARGIN, bandTop, 1.4);
  const bandStroke = (bandTop + bandBottom) / 2 - 3.5;
  page.drawLine({
    start: { x: MARGIN, y: bandStroke },
    end: { x: W - MARGIN, y: bandStroke },
    thickness: 1.4,
    color: GOLD,
  });
  centre(tracked("TERMINAL REPORT SHEET", 1), bandBottom + 7, 11, bold, NAVY);
  hline(MARGIN, W - MARGIN, bandBottom, 1.4);
  y = bandBottom - 14;

  // --- Student details: 2 columns x 3 rows ---
  const detailRow = (x: number, label: string, value: string) => {
    txt(label, x, y, 9.5, bold);
    const lw = bold.widthOfTextAtSize(`${label}: `, 9.5);
    txt(fitText(value, 9.5, font, 230 - lw), x + lw, y, 9.5);
    hline(x, x + 230, y - 3, 0.5);
  };
  const col2 = W / 2 + 20;
  const detailRowY = y;
  detailRow(MARGIN, "Student Name", props.studentName);
  detailRow(col2, "Class", props.className);
  y -= 15;
  detailRow(MARGIN, "Admission Number", props.admissionNumber);
  detailRow(col2, "Number in Class", String(standing.numberInClass));
  y -= 15;
  detailRow(MARGIN, "Term", `${props.term} Term`);
  detailRow(col2, "Session", props.session);
  y = detailRowY - 45 - 8; // 3 rows + breathing room

  // --- Subjects table ---
  const cols = [175, 55, 55, 60, 55, 123]; // sums to 523 (inner width)
  const xs: number[] = [];
  cols.reduce((acc, w) => {
    xs.push(acc);
    return acc + w;
  }, MARGIN);
  const aligns: Array<"left" | "center"> = ["left", "center", "center", "center", "center", "left"];
  const heads = ["Subject", "CA (40)", "Exam (60)", "Total (100)", "Grade", "Remark"];
  const headH = 20;
  const rowH = 16.5;

  const headTop = y;
  box(MARGIN, headTop - headH, W - 2 * MARGIN, headH, NAVY);
  heads.forEach((h, i) => {
    const w = bold.widthOfTextAtSize(h, 9);
    const x = aligns[i] === "center" ? xs[i] + (cols[i] - w) / 2 : xs[i] + 6;
    page.drawText(h, { x, y: headTop - headH + 6.5, size: 9, font: bold, color: WHITE });
  });
  y = headTop - headH;

  for (const s of result.subjects) {
    const total = subjectTotal(s); // CA 40 + Exam 60 = 100
    const { grade, remark } = gradeForTotal(total);
    const cells = [s.subject, String(s.ca), String(s.exam), String(total), grade, remark];
    cells.forEach((c, i) => {
      const f = i === 3 || i === 4 ? bold : font;
      const display = fitText(c, 9, f, cols[i] - 12);
      const w = f.widthOfTextAtSize(display, 9);
      const x = aligns[i] === "center" ? xs[i] + (cols[i] - w) / 2 : xs[i] + 6;
      txt(display, x, y - rowH + 4.5, 9, f);
    });
    y -= rowH;
  }

  // Total row: mirrors the on-screen sheet (Total | grandTotal | Average | value)
  const totalRowH = 18;
  box(MARGIN, y - totalRowH, W - 2 * MARGIN, totalRowH, SOFT);
  txt("TOTAL", xs[0] + 6, y - totalRowH + 5.5, 9, bold);
  {
    const t = String(standing.grandTotal);
    const w = bold.widthOfTextAtSize(t, 9);
    txt(t, xs[3] + (cols[3] - w) / 2, y - totalRowH + 5.5, 9, bold);
    const a = "Average";
    txt(a, xs[4] + (cols[4] - a.length * 5) / 2, y - totalRowH + 5.5, 9, bold);
    const v = String(standing.average);
    const vw = bold.widthOfTextAtSize(v, 9);
    txt(v, xs[5] + (cols[5] - vw) / 2, y - totalRowH + 5.5, 9, bold);
  }
  y -= totalRowH;

  // Table grid lines
  tableLines(page, xs, y, headTop, aligns.length);

  y -= 4;
  hline(MARGIN, W - MARGIN, y, 0.5);

  // --- Position and attendance ---
  y -= 15;
  txt("Position in Class:", MARGIN, y, 9.5, bold);
  txt(positionOf(standing.position, standing.numberInClass), MARGIN + 82, y, 9.5);
  txt("Attendance:", col2, y, 9.5, bold);
  const attX = col2 + bold.widthOfTextAtSize("Attendance: ", 9.5);
  txt(
    `Days Opened ${result.attendance.daysOpened} · Present ${result.attendance.present} · Absent ${result.attendance.absent}`,
    attX,
    y,
    9.5,
  );
  y -= 8;
  hline(MARGIN, W - MARGIN, y, 0.5);

  // --- Conduct box ---
  y -= 14;
  const conduct = result.conduct;
  if (conduct.length) {
    const conductRows = Math.ceil(conduct.length / 3);
    const conductH = 10 + 12 + 4 + conductRows * 13 + 4;
    box(MARGIN, y - conductH, W - 2 * MARGIN, conductH);
    txt("AFFECTIVE AND PSYCHOMOTOR - CONDUCT RATING", MARGIN + 120, y - 14, 8, bold, NAVY);
    conduct.forEach((c, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cellX = MARGIN + 12 + col * 175;
      const cellY = y - 14 - 16 - row * 13;
      txt(c.trait, cellX, cellY, 9);
      const rw = bold.widthOfTextAtSize(c.rating, 9);
      txt(c.rating, cellX + 150 - rw, cellY, 9, bold);
    });
    y -= conductH;
  }

  // --- Signatures (3 columns) ---
  const sigLineY = y - 34;
  const sigWidth = 150;
  const colCentres = [W / 6, W / 2, (5 * W) / 6];
  ["Class Teacher's Signature", "Principal's Signature", "Parent/Guardian's Signature"].forEach(
    (label, i) => {
      const centreX = colCentres[i];
      hline(centreX - sigWidth / 2, centreX + sigWidth / 2, sigLineY, 1);
      centreAt(centreX, label, sigLineY - 11, 8.5, bold);
      centreAt(centreX, "Date: ____________", sigLineY - 23, 8.5, font, GREY);
    },
  );
  y = sigLineY - 30;

  // --- Next term begins ---
  y -= 16;
  const nextTerm = `Next term begins: ${result.nextTermBegins}`;
  const nw = bold.widthOfTextAtSize(nextTerm, 9.5);
  page.drawText(nextTerm, { x: (W - nw) / 2, y, size: 9.5, font: bold, color: INK });

  // --- Grading key ---
  y -= 22;
  page.drawText(tracked("GRADING KEY", 1), { x: MARGIN, y, size: 7.5, font: bold, color: NAVY });
  const keyLine = (items: typeof GRADING_KEY, lineY: number) => {
    let x = MARGIN + 4;
    for (const g of items) {
      const piece = `${g.grade}: ${g.band} (${g.remark})`;
      txt(piece, x, lineY, 8.5);
      x += font.widthOfTextAtSize(piece, 8.5) + 24;
    }
  };
  y -= 13;
  keyLine(GRADING_KEY.slice(0, 3), y);
  y -= 11;
  keyLine(GRADING_KEY.slice(3), y);

  return await doc.save();
}

/** Standard PDF fonts support WinAnsi only. Transliterate common punctuation and accents safely. */
function toPdfText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, "-")
    .replace(/[·•]/g, ".").replace(/₦/g, "NGN").replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "?");
}

/* ------------------------------------------------------------------ */
/* Helpers with no page state                                          */
/* ------------------------------------------------------------------ */

function positionOf(position: number, numberInClass: number): string {
  const rem100 = position % 100;
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? "th"
      : position % 10 === 1
        ? "st"
        : position % 10 === 2
          ? "nd"
          : position % 10 === 3
            ? "rd"
            : "th";
  return `${position}${suffix} of ${numberInClass}`;
}

/** Outer border, horizontal row lines and vertical column lines of the table. */
function tableLines(
  page: PDFPage,
  xs: number[],
  bottom: number,
  top: number,
  columnCount: number,
) {
  const w = xs[columnCount - 1] + 123; // subject..remark total width = 523
  page.drawRectangle({ x: xs[0], y: bottom, width: w - xs[0], height: top - bottom, borderColor: LINE, borderWidth: 0.8 });
  for (const x of xs.slice(1)) {
    page.drawLine({ start: { x, y: bottom }, end: { x, y: top }, thickness: 0.8, color: LINE });
  }
  page.drawLine({ start: { x: xs[0], y: top - 20 }, end: { x: w, y: top - 20 }, thickness: 0.8, color: LINE });
}
