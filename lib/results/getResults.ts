import "server-only";

import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicTerms, attendanceRecords, classes, parentStudents, resultsPublished, scores, schoolSettings, students, subjects } from "@/lib/db/schema";
import type { ScoreTerm } from "@/lib/db/schema";
import { TERM_LABELS, type Student, type TermLabel, type TermResult } from "./types";

export interface ClassStanding {
  numberInClass: number;
  position: number;
  grandTotal: number;
  average: number;
}

export type TermAvailability = "ready" | "unpublished" | "no-scores" | "no-student" | "no-calendar";

const TERM_BY_LABEL: Record<TermLabel, ScoreTerm> = { First: "first", Second: "second", Third: "third" };
const LABEL_BY_TERM: Record<ScoreTerm, TermLabel> = { first: "First", second: "Second", third: "Third" };

export async function getChildren(parentId: string): Promise<Student[]> {
  const rows = await db.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, className: classes.name, admissionNumber: students.admissionNumber })
    .from(parentStudents).innerJoin(students, eq(parentStudents.studentId, students.id)).innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(parentStudents.parentUserId, parentId)).orderBy(asc(students.lastName), asc(students.firstName));
  return rows.map((row) => ({ id: row.id, name: `${row.firstName} ${row.lastName}`, className: row.className, admissionNumber: row.admissionNumber }));
}

export async function getAvailableTerms(studentId: string, session: string): Promise<TermLabel[]> {
  const rows = await db.selectDistinct({ term: scores.term }).from(scores)
    .innerJoin(resultsPublished, and(eq(resultsPublished.classId, scores.classId), eq(resultsPublished.session, scores.session), eq(resultsPublished.term, scores.term), eq(resultsPublished.published, true)))
    .where(and(eq(scores.studentId, studentId), eq(scores.session, session)));
  return rows.map((row) => LABEL_BY_TERM[row.term]);
}

export async function getTermAvailability(studentId: string, term: TermLabel, session: string): Promise<TermAvailability> {
  const termValue = TERM_BY_LABEL[term];
  const [studentRows, calendarRows, scoreRows] = await Promise.all([
    db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).limit(1),
    db.select({ session: academicTerms.session }).from(academicTerms).where(and(eq(academicTerms.session, session), eq(academicTerms.term, termValue))).limit(1),
    db.select({ classId: scores.classId }).from(scores).where(and(eq(scores.studentId, studentId), eq(scores.session, session), eq(scores.term, termValue))).limit(1),
  ]);
  if (!studentRows[0]) return "no-student";
  if (!calendarRows[0]) return "no-calendar";
  const classIds = [...new Set(scoreRows.map((row) => row.classId))];
  const publicationClassIds = classIds.length ? classIds : [studentRows[0].classId];
  const [published] = await db.select({ id: resultsPublished.id }).from(resultsPublished)
    .where(and(inArray(resultsPublished.classId, publicationClassIds), eq(resultsPublished.session, session), eq(resultsPublished.term, termValue), eq(resultsPublished.published, true))).limit(1);
  if (!published) return "unpublished";
  return scoreRows.length ? "ready" : "no-scores";
}

export async function getTermResult(studentId: string, term: TermLabel, session: string): Promise<TermResult | null> {
  const termValue = TERM_BY_LABEL[term];
  const [studentRows, calendarRows, rawScores] = await Promise.all([
    db.select({ id: students.id }).from(students).where(eq(students.id, studentId)).limit(1),
    db.select({ startsOn: academicTerms.startsOn, endsOn: academicTerms.endsOn, daysSchoolWasOpen: academicTerms.daysSchoolWasOpen }).from(academicTerms).where(and(eq(academicTerms.session, session), eq(academicTerms.term, termValue))).limit(1),
    db.select({ classId: scores.classId, className: classes.name, subject: subjects.name, caScore: scores.caScore, examScore: scores.examScore })
      .from(scores).innerJoin(classes, eq(scores.classId, classes.id)).innerJoin(subjects, eq(scores.subjectId, subjects.id))
      .where(and(eq(scores.studentId, studentId), eq(scores.session, session), eq(scores.term, termValue))).orderBy(asc(subjects.name)),
  ]);
  if (!studentRows[0] || !calendarRows[0] || rawScores.length === 0) return null;

  // A child may move classes after this term. Use the class stored on that term's
  // score rows and require that exact class/session/term to have been published.
  const rawClassIds = [...new Set(rawScores.map((row) => row.classId))];
  const publishedRows = await db.select({ classId: resultsPublished.classId }).from(resultsPublished)
    .where(and(inArray(resultsPublished.classId, rawClassIds), eq(resultsPublished.session, session), eq(resultsPublished.term, termValue), eq(resultsPublished.published, true)));
  const publishedClassIds = new Set(publishedRows.map((row) => row.classId));
  const firstPublishedScore = rawScores.find((row) => publishedClassIds.has(row.classId));
  const classId = firstPublishedScore?.classId;
  const className = firstPublishedScore?.className ?? "";
  if (!classId) return null;
  const scoreRows = rawScores.filter((row) => row.classId === classId);
  const calendar = calendarRows[0];
  const [attendanceRows, nextTermRows] = await Promise.all([
    db.select({ status: attendanceRecords.status }).from(attendanceRecords)
      .where(and(eq(attendanceRecords.studentId, studentId), gte(attendanceRecords.attendanceDate, calendar.startsOn), lte(attendanceRecords.attendanceDate, calendar.endsOn))),
    nextCalendarTerm(session, termValue),
  ]);
  return {
    studentId, classId, className, term, session, published: true,
    subjects: scoreRows.map((row) => ({ subject: row.subject, ca: Number(row.caScore), exam: Number(row.examScore) })),
    attendance: {
      daysOpened: calendar.daysSchoolWasOpen,
      present: attendanceRows.filter((row) => row.status === "present" || row.status === "late").length,
      absent: attendanceRows.filter((row) => row.status === "absent").length,
    },
    nextTermBegins: nextTermRows ? formatDate(nextTermRows.startsOn) : "Next session to be announced",
    conduct: [],
  };
}

async function nextCalendarTerm(session: string, term: ScoreTerm) {
  const order: ScoreTerm[] = ["first", "second", "third"];
  const next = order[order.indexOf(term) + 1];
  if (!next) return undefined;
  const rows = await db.select({ startsOn: academicTerms.startsOn }).from(academicTerms).where(and(eq(academicTerms.session, session), eq(academicTerms.term, next))).limit(1);
  return rows[0];
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export async function canParentView(parentId: string, studentId: string): Promise<boolean> {
  const rows = await db.select({ studentId: parentStudents.studentId }).from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, parentId), eq(parentStudents.studentId, studentId))).limit(1);
  return rows.length > 0;
}

/** Competition ranking: equal totals share a rank, and the next rank skips (1, 1, 3). */
export async function getClassStanding(result: TermResult): Promise<ClassStanding> {
  const totals = await db.select({ studentId: scores.studentId, total: sql<string>`sum(${scores.caScore} + ${scores.examScore})`, subjectCount: sql<number>`count(*)::int` })
    .from(scores).where(and(eq(scores.classId, result.classId), eq(scores.session, result.session), eq(scores.term, TERM_BY_LABEL[result.term])))
    .groupBy(scores.studentId);
  const own = totals.find((row) => row.studentId === result.studentId);
  if (!own) return { numberInClass: 0, position: 0, grandTotal: 0, average: 0 };
  const ownTotal = Number(own.total);
  return {
    numberInClass: totals.length,
    position: 1 + totals.filter((row) => Number(row.total) > ownTotal).length,
    grandTotal: ownTotal,
    average: Math.round((ownTotal / own.subjectCount) * 10) / 10,
  };
}

export async function getCurrentSession(): Promise<string> {
  const rows = await db.select({ currentSession: schoolSettings.currentSession }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1);
  return rows[0]?.currentSession ?? "";
}

export { TERM_LABELS };
