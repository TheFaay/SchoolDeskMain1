// Feature 4: the standard Terminal Report Sheet (on-screen view).
// Printed on one A4 page: @page rules live in ReportSheetPageStyles.
// All data comes in through props; this file holds no data.
//
// NOTE: the PDF download (app/api/results/report-sheet) recreates this exact
// layout with pdf-lib. If you change order or wording here, change it there
// too, so both stay identical.

import {
  SCHOOL_NAME,
  subjectTotal,
  type TermResult,
} from "@/app/lib/results/sampleData";
import { gradeForTotal, GRADING_KEY, ordinal } from "@/app/lib/results/scoring";
import type { ClassStanding } from "@/app/lib/results/getResults";

const NAVY = "#12264F";
const GOLD = "#C9A227";

export interface ReportSheetProps {
  studentName: string;
  className: string;
  admissionNumber: string;
  term: string;
  session: string;
  result: TermResult;
  standing: ClassStanding;
}

export default function ReportSheet(props: ReportSheetProps) {
  const { result, standing } = props;

  return (
    <div className="report-sheet w-full rounded-lg border border-slate-300 bg-white p-5 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      {/* ---------- School crest, name and title ---------- */}
      <header className="flex flex-col items-center text-center">
        <svg
          width="52"
          height="52"
          viewBox="0 0 52 52"
          role="img"
          aria-label={`${SCHOOL_NAME} crest`}
        >
          <circle cx="26" cy="26" r="25" fill="#ffffff" stroke={NAVY} strokeWidth="2.5" />
          <circle cx="26" cy="26" r="20" fill={NAVY} />
          <text
            x="26"
            y="25"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="13"
            fontStyle="italic"
            fontWeight="bold"
            fill="#ffffff"
          >
            C·H
          </text>
          <text
            x="26"
            y="36"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="7"
            fontStyle="italic"
            fontWeight="bold"
            fill={GOLD}
          >
            ACADEMY
          </text>
        </svg>

        <h1
          className="mt-1 text-xl font-bold uppercase tracking-wide sm:text-2xl font-[family-name:var(--font-poppins)]"
          style={{ color: NAVY }}
        >
          {SCHOOL_NAME}
        </h1>

        <p className="mt-2 w-full border-y-2 py-1 text-sm font-semibold tracking-[0.25em] uppercase sm:text-base font-[family-name:var(--font-poppins)]" style={{ borderColor: GOLD, color: NAVY }}>
          Terminal Report Sheet
        </p>
      </header>

      {/* ---------- Student information ---------- */}
      <section aria-label="Student details" className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <SheetRow label="Student Name" value={props.studentName} />
        <SheetRow label="Class" value={props.className} />
        <SheetRow label="Admission Number" value={props.admissionNumber} />
        <SheetRow label="Number in Class" value={String(standing.numberInClass)} />
        <SheetRow label="Term" value={`${props.term} Term`} />
        <SheetRow label="Session" value={props.session} />
      </section>

      {/* ---------- Subjects table ---------- */}
      <table className="mt-4 w-full border-collapse text-sm print:text-[11px]">
        <thead>
          <tr style={{ backgroundColor: NAVY }}>
            {["Subject", "CA (30)", "Exam (70)", "Total (100)", "Grade", "Remark"].map(
              (h, i) => (
                <th
                  key={h}
                  className={`border border-slate-400 px-2 py-1.5 font-semibold text-white ${
                    i === 0 ? "text-left" : "text-center"
                  } ${i === 5 ? "text-left" : ""} print:px-1 print:py-1`}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((s) => {
            const total = subjectTotal(s);
            const { grade, remark } = gradeForTotal(total);
            return (
              <tr key={s.subject}>
                <td className="border border-slate-400 px-2 py-1.5 print:px-1 print:py-1">
                  {s.subject}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-center print:px-1 print:py-1">
                  {s.ca}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-center print:px-1 print:py-1">
                  {s.exam}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-center font-semibold print:px-1 print:py-1">
                  {total}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-center font-semibold print:px-1 print:py-1">
                  {grade}
                </td>
                <td className="border border-slate-400 px-2 py-1.5 print:px-1 print:py-1">
                  {remark}
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          <tr>
            <td className="border border-slate-400 px-2 py-1.5 font-semibold uppercase" colSpan={3}>
              Total
            </td>
            <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">
              {standing.grandTotal}
            </td>
            <td className="border border-slate-400 px-2 py-1.5 text-center font-semibold">
              Average
            </td>
            <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">
              {standing.average}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---------- Position and attendance ---------- */}
      <section aria-label="Summary" className="mt-2 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
        <p className="border-b border-slate-300 px-1 py-1.5">
          <span className="font-semibold">Position in Class:</span>{" "}
          <span className="font-bold">{ordinal(standing.position)}</span> of{" "}
          {standing.numberInClass}
        </p>
        <p className="border-b border-slate-300 px-1 py-1.5">
          <span className="font-semibold">Attendance:</span> Days Opened{" "}
          <b>{result.attendance.daysOpened}</b> · Present{" "}
          <b>{result.attendance.present}</b> · Absent <b>{result.attendance.absent}</b>
        </p>
      </section>

      {/* ---------- Conduct ratings ---------- */}
      <section aria-label="Conduct" className="mt-3 border border-slate-400 px-3 py-2">
        <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: NAVY }}>
          Affective and Psychomotor — Conduct Rating
        </p>
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-3 print:text-[11px]">
          {result.conduct.map((c) => (
            <li key={c.trait} className="flex justify-between gap-2 border-b border-dotted border-slate-300 py-0.5">
              <span>{c.trait}</span>
              <span className="font-semibold">{c.rating}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Comments ---------- */}
      <section aria-label="Comments" className="mt-3 space-y-2 text-sm">
        <div className="border border-slate-400 px-3 py-2">
          <p>
            <span className="font-semibold">Class Teacher&apos;s Comment:</span>{" "}
            {result.classTeacherComment}
          </p>
        </div>
        <div className="border border-slate-400 px-3 py-2">
          <p>
            <span className="font-semibold">Principal&apos;s Comment:</span>{" "}
            {result.principalComment}
          </p>
        </div>
      </section>

      {/* ---------- Signatures and next term ---------- */}
      <div className="mt-5 grid grid-cols-3 items-end gap-4 text-center text-xs sm:text-sm">
        <SignatureBlock role="Class Teacher's Signature" dateLabel="Date" />
        <SignatureBlock role="Principal's Signature" dateLabel="Date" />
        <SignatureBlock role="Parent/Guardian's Signature" dateLabel="Date" />
      </div>

      <p className="mt-4 text-center text-sm">
        <span className="font-semibold">Next term begins:</span>{" "}
        <b>{result.nextTermBegins}</b>
      </p>

      {/* ---------- Grading key ---------- */}
      <footer className="mt-3 border-t border-slate-300 pt-2">
        <p className="text-xs font-semibold uppercase" style={{ color: NAVY }}>
          Grading Key
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] sm:text-xs">
          {GRADING_KEY.map((g) => (
            <li key={g.grade}>
              <b>{g.grade}</b>: {g.band} ({g.remark})
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

function SheetRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="border-b border-slate-300 px-1 py-1">
      <span className="font-semibold">{label}:</span> {value}
    </p>
  );
}

function SignatureBlock({ role, dateLabel }: { role: string; dateLabel: string }) {
  return (
    <div>
      <div className="border-b border-slate-800" />
      <p className="mt-1 font-medium">{role}</p>
      <p className="text-slate-500">{dateLabel}: ____________</p>
    </div>
  );
}
