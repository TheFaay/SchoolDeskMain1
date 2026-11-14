import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { lockClassTerm } from "@/lib/db/result-lock";
import {
  classes,
  academicTerms,
  parentStudents,
  resultsPublished,
  scores,
  schoolSettings,
  students,
  teacherAssignments,
  user,
  type ResultsPublished,
} from "@/lib/db/schema";
import type { ScoreTerm } from "@/lib/db/schema";

export type PublishedRow = {
  id: string;
  classId: string;
  className: string;
  academicYear: string;
  term: ScoreTerm;
  session: string;
  updatedAt: Date;
};

/** Every class + term whose results are currently visible to parents. */
export async function listPublishedResults(): Promise<PublishedRow[]> {
  return db
    .select({
      id: resultsPublished.id,
      classId: resultsPublished.classId,
      className: classes.name,
      academicYear: classes.academicYear,
      term: resultsPublished.term,
      session: resultsPublished.session,
      updatedAt: resultsPublished.updatedAt,
    })
    .from(resultsPublished)
    .innerJoin(classes, eq(resultsPublished.classId, classes.id))
    .where(eq(resultsPublished.published, true))
    .orderBy(asc(classes.name), asc(resultsPublished.term));
}

/**
 * Marks one class + term published (or hides it again). Safe to run twice:
 * the class_id + term pair is unique, so this updates the existing row.
 */
export async function setResultsPublished(
  classId: string,
  session: string,
  term: ScoreTerm,
  published: boolean,
  publishedBy: string,
): Promise<ResultsPublished | undefined> {
  return db.transaction(async (tx) => {
    await lockClassTerm(tx, classId, session, term);
    const rows = await tx
      .insert(resultsPublished)
      .values({ classId, session, term, published, publishedBy, publishedAt: published ? new Date() : null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [resultsPublished.classId, resultsPublished.session, resultsPublished.term],
        set: { published: sql`excluded.published`, publishedBy: sql`excluded.published_by`, publishedAt: sql`excluded.published_at`, updatedAt: sql`now()` },
      })
      .returning();
    return rows[0];
  });
}

export type ClassResultProgress = {
  classId: string;
  className: string;
  session: string;
  term: ScoreTerm;
  students: number;
  subjects: number;
  expectedScores: number;
  enteredScores: number;
  published: boolean;
  calendarConfigured: boolean;
  complete: boolean;
};

export async function getClassResultProgress(classId: string, sessionValue: string, term: ScoreTerm): Promise<ClassResultProgress | undefined> {
  const [classRow, studentCount, subjectRows, scoreCount, publication, calendar] = await Promise.all([
    db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1),
    db.select({ value: count() }).from(students).where(eq(students.classId, classId)),
    db.selectDistinct({ subjectId: teacherAssignments.subjectId }).from(teacherAssignments).where(eq(teacherAssignments.classId, classId)),
    db.select({ value: count() }).from(scores).where(and(eq(scores.classId, classId), eq(scores.session, sessionValue), eq(scores.term, term))),
    db.select({ published: resultsPublished.published }).from(resultsPublished).where(and(eq(resultsPublished.classId, classId), eq(resultsPublished.session, sessionValue), eq(resultsPublished.term, term))).limit(1),
    db.select({ session: academicTerms.session }).from(academicTerms).where(and(eq(academicTerms.session, sessionValue), eq(academicTerms.term, term))).limit(1),
  ]);
  const klass = classRow[0];
  if (!klass) return undefined;
  const studentsCount = Number(studentCount[0]?.value ?? 0);
  const subjectCount = subjectRows.length;
  const enteredScores = Number(scoreCount[0]?.value ?? 0);
  const expectedScores = studentsCount * subjectCount;
  const calendarConfigured = calendar.length > 0;
  return { classId, className: klass.name, session: sessionValue, term, students: studentsCount, subjects: subjectCount, expectedScores, enteredScores, published: publication[0]?.published ?? false, calendarConfigured, complete: calendarConfigured && expectedScores > 0 && enteredScores >= expectedScores };
}

export async function listClassResultProgress(sessionValue: string): Promise<ClassResultProgress[]> {
  const classRows = await db.select({ id: classes.id }).from(classes).where(eq(classes.academicYear, sessionValue)).orderBy(asc(classes.name));
  const progress = await Promise.all(classRows.flatMap((klass) => (["first", "second", "third"] as const).map((term) => getClassResultProgress(klass.id, sessionValue, term))));
  return progress.filter((item): item is ClassResultProgress => Boolean(item));
}

/** Hides one previously published class + term row by its id. */
export async function unpublishResults(
  id: string,
): Promise<ResultsPublished | undefined> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(resultsPublished).where(eq(resultsPublished.id, id)).limit(1);
    if (!existing) return undefined;
    await lockClassTerm(tx, existing.classId, existing.session, existing.term);
    const rows = await tx.update(resultsPublished).set({ published: false, updatedAt: new Date() }).where(eq(resultsPublished.id, id)).returning();
    return rows[0];
  });
}

export type ParentRecipient = {
  parentUserId: string;
  email: string;
  studentId: string;
  childName: string;
  parentName: string;
};

/**
 * The children of one class who have a linked parent account. Children with
 * no parent account are left out because there is nobody to notify.
 */
export async function listClassParentRecipients(
  classId: string,
): Promise<ParentRecipient[]> {
  return db
    .select({
      studentId: students.id,
      parentUserId: user.id,
      email: user.email,
      childName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      parentName: user.name,
    })
    .from(students)
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .innerJoin(user, eq(user.id, parentStudents.parentUserId))
    .where(and(eq(students.classId, classId), eq(user.role, "parent")))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

export async function getClassSession(classId: string): Promise<string | undefined> {
  const [classRow, settings] = await Promise.all([
    db.select({ id: classes.id }).from(classes).where(eq(classes.id, classId)).limit(1),
    db.select({ session: schoolSettings.currentSession }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1),
  ]);
  return classRow[0] && settings[0] ? settings[0].session : undefined;
}
