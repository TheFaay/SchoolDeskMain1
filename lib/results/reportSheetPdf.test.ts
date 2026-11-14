import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { buildReportSheetPdf } from "./reportSheetPdf";
import { reportSheetFileName } from "./reportSheetFileName";
import type { TermResult } from "./types";
import type { ClassStanding } from "./getResults";

function fixture(subjectCount: number, studentName: string) {
  const result: TermResult = {
    studentId: "student-1", classId: "class-1", className: "JSS 1A", term: "First", session: "2026/2027", published: true,
    subjects: Array.from({ length: subjectCount }, (_, index) => ({ subject: index === 0 ? "Mathematics & Long Subject Name" : `Subject ${index + 1}`, ca: index, exam: 60 - index })),
    attendance: { daysOpened: 60, present: 55, absent: 2 }, conduct: [], nextTermBegins: "Monday, 12 January 2027",
  };
  const standing: ClassStanding = { numberInClass: 6, position: 1, grandTotal: 420, average: 52.5 };
  return { studentName, className: result.className, admissionNumber: "CHA/2026/001", term: "First", session: result.session, result, standing };
}

async function assertOnePage(props: ReturnType<typeof fixture>) {
  const bytes = await buildReportSheetPdf(props);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  return pdf;
}

test("report PDF renders one subject", async () => {
  await assertOnePage(fixture(1, "Ada Okafor"));
});

test("report PDF fits twelve subjects and handles long names and special characters", async () => {
  const props = fixture(12, "José O’Connor — 長い名前");
  const pdf = await assertOnePage(props);
  assert.equal(pdf.getTitle(), "Terminal Report Sheet — José O’Connor — 長い名前");
  assert.equal(reportSheetFileName(props.studentName, props.term), "Jose-O-Connor-First-Term-Report-Sheet.pdf");
  assert.match(reportSheetFileName("../\"Ada/Okafor", "First"), /^[A-Za-z0-9-]+\.pdf$/);
});
