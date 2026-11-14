import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { lockClassTerm } from "@/lib/db/result-lock";
import { calculateScore } from "@/lib/scores/grading";
import {
  classes,
  resultsPublished,
  scores,
  schoolSettings,
  students,
  subjects,
  teacherAssignments,
} from "@/lib/db/schema";

export type ScoreTerm = "first" | "second" | "third";

export type ScoreRecord = {
  studentId: string;
  subjectId: string;
  classId: string;
  term: ScoreTerm;
  caScore: number;
  examScore: number;
  total: number;
  grade: string;
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SubjectRecord = { id: string; name: string };
export type AssignmentRecord = {
  teacherUserId: string;
  classId: string;
  subjectId: string;
};

async function currentSession() {
  const rows = await db
    .select({ session: schoolSettings.currentSession })
    .from(schoolSettings)
    .where(eq(schoolSettings.id, 1))
    .limit(1);
  if (!rows[0]) throw new Error("School session is not configured.");
  return rows[0].session;
}

export async function getClasses() {
  return db.select({ id: classes.id, name: classes.name, level: classes.level, academicYear: classes.academicYear }).from(classes).orderBy(asc(classes.name));
}

export async function getStudents(classId: string) {
  return db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      classId: students.classId,
    })
    .from(students)
    .where(eq(students.classId, classId))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

export async function getSubjects(): Promise<SubjectRecord[]> {
  return db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.name));
}

export async function getTeacherAssignments(teacherUserId: string): Promise<AssignmentRecord[]> {
  return db
    .select({
      teacherUserId: teacherAssignments.teacherUserId,
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
    })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.teacherUserId, teacherUserId));
}

export async function getScoreOptionsForTeacher(teacherUserId: string, isAdmin: boolean) {
  const assignments = isAdmin
    ? await db.select({ classId: teacherAssignments.classId, subjectId: teacherAssignments.subjectId }).from(teacherAssignments)
    : await db.select({ classId: teacherAssignments.classId, subjectId: teacherAssignments.subjectId }).from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, teacherUserId));
  if (isAdmin) {
    const [allClasses, allSubjects] = await Promise.all([getClasses(), getSubjects()]);
    const adminAssignments = allClasses.flatMap((classRow) => allSubjects.map((subjectRow) => ({ classId: classRow.id, subjectId: subjectRow.id })));
    return { classes: allClasses, subjects: allSubjects, assignments: adminAssignments };
  }
  const classIds = [...new Set(assignments.map((row) => row.classId))];
  const subjectIds = [...new Set(assignments.map((row) => row.subjectId))];
  const [classRows, subjectRows] = await Promise.all([
    classIds.length ? db.select({ id: classes.id, name: classes.name, level: classes.level, academicYear: classes.academicYear }).from(classes).where(inArray(classes.id, classIds)).orderBy(asc(classes.name)) : Promise.resolve([]),
    subjectIds.length ? db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(inArray(subjects.id, subjectIds)).orderBy(asc(subjects.name)) : Promise.resolve([]),
  ]);
  return { classes: classRows, subjects: subjectRows, assignments };
}

export async function getScores(classId: string, subjectId: string, term: ScoreTerm): Promise<ScoreRecord[]> {
  const session = await currentSession();
  const rows = await db
    .select({
      studentId: scores.studentId,
      subjectId: scores.subjectId,
      classId: scores.classId,
      term: scores.term,
      caScore: scores.caScore,
      examScore: scores.examScore,
      total: scores.total,
      grade: scores.grade,
      enteredBy: scores.enteredBy,
      createdAt: scores.createdAt,
      updatedAt: scores.updatedAt,
    })
    .from(scores)
    .where(and(eq(scores.classId, classId), eq(scores.subjectId, subjectId), eq(scores.session, session), eq(scores.term, term)))
    .orderBy(asc(scores.studentId));
  return rows.map((row) => ({
    ...row,
    caScore: Number(row.caScore),
    examScore: Number(row.examScore),
    total: Number(row.total),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function saveScores(input: { classId: string; subjectId: string; term: ScoreTerm; actorId: string; isAdmin: boolean; rows: { studentId: string; caScore: number; examScore: number }[] }) {
  const { rows } = input;
  if (!rows.length) return;
  await db.transaction(async (tx) => {
    const [settings] = await tx.select({ session: schoolSettings.currentSession }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1);
    if (!settings) throw new Error("School session is not configured.");
    if (!input.isAdmin) {
      const [assignment] = await tx.select({ id: teacherAssignments.id }).from(teacherAssignments).where(and(eq(teacherAssignments.teacherUserId, input.actorId), eq(teacherAssignments.classId, input.classId), eq(teacherAssignments.subjectId, input.subjectId))).limit(1);
      if (!assignment) throw new Error("You are not assigned to this class and subject.");
    }
    await lockClassTerm(tx, input.classId, settings.session, input.term);
    const [publication] = await tx.select({ published: resultsPublished.published }).from(resultsPublished).where(and(eq(resultsPublished.classId, input.classId), eq(resultsPublished.session, settings.session), eq(resultsPublished.term, input.term))).for("update").limit(1);
    if (publication?.published) throw new Error("Results for this term are published and locked.");
    const studentIds = rows.map((row) => row.studentId);
    const validStudents = await tx.select({ id: students.id }).from(students).where(and(eq(students.classId, input.classId), inArray(students.id, studentIds)));
    if (validStudents.length !== studentIds.length) throw new Error("One or more students are not in the selected class.");
    const now = new Date();
    await tx.insert(scores).values(rows.map((row) => {
      const calculated = calculateScore(row.caScore, row.examScore);
      return {
      studentId: row.studentId, subjectId: input.subjectId, classId: input.classId, session: settings.session, term: input.term,
      caScore: row.caScore.toFixed(2), examScore: row.examScore.toFixed(2),
      total: calculated.total.toFixed(2), grade: calculated.grade,
      enteredBy: input.actorId, updatedAt: now,
      };
    }))
      .onConflictDoUpdate({ target: [scores.studentId, scores.subjectId, scores.session, scores.term], set: { classId: sql`excluded.class_id`, caScore: sql`excluded.ca_score`, examScore: sql`excluded.exam_score`, total: sql`excluded.total`, grade: sql`excluded.grade`, enteredBy: sql`excluded.entered_by`, updatedAt: now } });
  });
}

export async function isResultsPublished(classId: string, term: ScoreTerm) {
  const session = await currentSession();
  const rows = await db
    .select({ id: resultsPublished.id })
    .from(resultsPublished)
    .where(and(
      eq(resultsPublished.classId, classId),
      eq(resultsPublished.session, session),
      eq(resultsPublished.term, term),
      eq(resultsPublished.published, true),
    ))
    .limit(1);
  return rows.length > 0;
}
