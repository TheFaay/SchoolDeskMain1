import "server-only";

import { and, asc, count, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  attendanceRecords,
  classes,
  academicTerms,
  events,
  parentStudents,
  schoolSettings,
  students,
  teacherAssignments,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/db/schema";
import { isSchoolDate, isWeekendSchoolDate } from "./date";

export type ClassAttendanceRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  status: AttendanceStatus | null;
};

/** Lists a class roster and any attendance already recorded for that day. */
export async function listClassAttendance(
  classId: string,
  date: string,
): Promise<ClassAttendanceRow[]> {
  return db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      status: attendanceRecords.status,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.studentId, students.id),
        eq(attendanceRecords.attendanceDate, date),
      ),
    )
    .where(eq(classes.id, classId))
    .orderBy(asc(students.lastName), asc(students.firstName));
}

/** Lists the classes available to an attendance form. */
export async function listAttendanceClasses(actorUserId: string, isAdmin: boolean) {
  if (isAdmin) return db
    .select({ id: classes.id, name: classes.name, level: classes.level })
    .from(classes)
    .orderBy(asc(classes.name));
  const [assigned, homeroom] = await Promise.all([
    db.selectDistinct({ id: classes.id, name: classes.name, level: classes.level }).from(classes)
      .innerJoin(teacherAssignments, eq(teacherAssignments.classId, classes.id))
      .where(eq(teacherAssignments.teacherUserId, actorUserId)),
    db.select({ id: classes.id, name: classes.name, level: classes.level }).from(classes)
      .where(eq(classes.classTeacherUserId, actorUserId)),
  ]);
  return [...new Map([...assigned, ...homeroom].map((item) => [item.id, item])).values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Weekends and explicitly flagged calendar events are not school days. */
export async function isAttendanceSchoolDay(date: string): Promise<boolean> {
  if (!isSchoolDate(date) || isWeekendSchoolDate(date)) return false;
  const start = new Date(`${date}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const [holiday] = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.isSchoolHoliday, true), lt(events.startsAt, end), gte(sql`coalesce(${events.endsAt}, ${events.startsAt})`, start)))
    .limit(1);
  return !holiday;
}

/**
 * Creates or corrects one daily record per student. Call only after the
 * server-side auth layer confirms the actor is allowed to mark this class.
 */
export async function saveClassAttendance(input: {
  classId: string;
  date: string;
  markedBy: string;
  isAdmin: boolean;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    note?: string | null;
  }>;
}): Promise<AttendanceRecord[]> {
  if (input.records.length === 0) return [];

  const studentIds = input.records.map((record) => record.studentId);
  if (new Set(studentIds).size !== studentIds.length) {
    throw new Error("A student can only have one attendance status per day.");
  }

  if (!await isAttendanceSchoolDay(input.date)) throw new Error("Attendance can only be marked on a school day.");
  return db.transaction(async (tx) => {
    if (!input.isAdmin) {
      const [assignment] = await tx.select({ id: teacherAssignments.id }).from(teacherAssignments)
        .where(and(eq(teacherAssignments.teacherUserId, input.markedBy), eq(teacherAssignments.classId, input.classId))).limit(1);
      if (!assignment) {
        const [classTeacher] = await tx.select({ id: classes.id }).from(classes)
          .where(and(eq(classes.id, input.classId), eq(classes.classTeacherUserId, input.markedBy))).limit(1);
        if (!classTeacher) throw new Error("You are not assigned to this class.");
      }
    }
    const classStudents = await tx.select({ id: students.id }).from(students)
      .where(and(eq(students.classId, input.classId), inArray(students.id, studentIds)));
    if (classStudents.length !== studentIds.length) throw new Error("One or more students do not belong to this class.");
    const now = new Date();
    return tx.insert(attendanceRecords).values(input.records.map((record) => ({
      studentId: record.studentId, attendanceDate: input.date, status: record.status,
      note: record.note?.trim() || null, markedBy: input.markedBy, markedAt: now,
    }))).onConflictDoUpdate({
      target: [attendanceRecords.studentId, attendanceRecords.attendanceDate],
      set: { status: sql`excluded.status`, note: sql`excluded.note`, markedBy: sql`excluded.marked_by`, markedAt: sql`excluded.marked_at` },
    }).returning();
  });
}

/**
 * Returns late, absent and excused records for a parent-linked child set. The caller must pass the
 * parent's authenticated Better Auth user ID, never an ID supplied by a form.
 */
const PARENT_ATTENDANCE_PAGE_SIZE = 50;

export async function listAttendanceHistoryForParent(
  parentUserId: string,
  requestedPage = 0,
) {
  const visibleStatuses = ["absent", "late", "excused"] as const;
  const [countRow] = await db
    .select({ total: count() })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(
      and(
        eq(parentStudents.parentUserId, parentUserId),
        inArray(attendanceRecords.status, visibleStatuses),
      ),
    );

  const total = countRow?.total ?? 0;
  const pageCount = Math.ceil(total / PARENT_ATTENDANCE_PAGE_SIZE);
  const page = Math.min(
    Math.max(0, requestedPage),
    Math.max(0, pageCount - 1),
  );
  const attendance = await db
    .select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      className: classes.name,
      date: attendanceRecords.attendanceDate,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .innerJoin(students, eq(attendanceRecords.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(
      and(
        eq(parentStudents.parentUserId, parentUserId),
        inArray(attendanceRecords.status, visibleStatuses),
      ),
    )
    .orderBy(
      desc(attendanceRecords.attendanceDate),
      asc(students.lastName),
      asc(students.firstName),
      asc(students.id),
    )
    .limit(PARENT_ATTENDANCE_PAGE_SIZE)
    .offset(page * PARENT_ATTENDANCE_PAGE_SIZE);

  return { attendance, page, pageCount, total };
}

export async function getParentTermAttendance(parentUserId: string) {
  const [links, settings] = await Promise.all([
    db.select({ studentId: students.id, firstName: students.firstName, lastName: students.lastName, className: classes.name })
      .from(parentStudents).innerJoin(students, eq(parentStudents.studentId, students.id)).innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(parentStudents.parentUserId, parentUserId)).orderBy(asc(students.lastName), asc(students.firstName)),
    db.select({ session: schoolSettings.currentSession, term: schoolSettings.currentTerm }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1),
  ]);
  const setting = settings[0];
  if (!links.length) return { session: setting?.session ?? "", term: setting?.term ?? "first", daysOpened: null, summaries: [] };
  if (!setting) return { session: "", term: "first" as const, daysOpened: null, summaries: links.map((link) => ({ ...link, daysPresent: 0 })) };
  const [calendar] = await db.select({ startsOn: academicTerms.startsOn, endsOn: academicTerms.endsOn, daysSchoolWasOpen: academicTerms.daysSchoolWasOpen })
    .from(academicTerms).where(and(eq(academicTerms.session, setting.session), eq(academicTerms.term, setting.term))).limit(1);
  if (!calendar) return { session: setting.session, term: setting.term, daysOpened: null, summaries: links.map((link) => ({ ...link, daysPresent: 0 })) };
  const marks = await db.select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status }).from(attendanceRecords)
    .where(and(inArray(attendanceRecords.studentId, links.map((link) => link.studentId)), gte(attendanceRecords.attendanceDate, calendar.startsOn), lte(attendanceRecords.attendanceDate, calendar.endsOn)));
  const daysPresent = new Map<string, number>();
  for (const mark of marks) if (mark.status === "present" || mark.status === "late") daysPresent.set(mark.studentId, (daysPresent.get(mark.studentId) ?? 0) + 1);
  return {
    session: setting.session, term: setting.term, daysOpened: calendar.daysSchoolWasOpen,
    summaries: links.map((link) => ({ ...link, daysPresent: daysPresent.get(link.studentId) ?? 0 })),
  };
}
