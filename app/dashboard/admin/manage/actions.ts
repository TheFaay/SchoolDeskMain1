"use server";

import { hashPassword } from "better-auth/crypto";
import { and, count, eq, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { account, academicSessions, academicTerms, attendanceRecords, classes, db, events, feeReminderLogs, invoices, notices, parentStudents, payments, resultsPublished, scores, schoolSettings, session, students, subjects, teacherAssignments, user } from "@/lib/db";
import { isValidCalendarDate } from "@/lib/fees/date";
import type { ScoreTerm } from "@/lib/db/schema";

export type AdminMutationState = { ok: boolean; message: string } | null;
const TERMS: ScoreTerm[] = ["first", "second", "third"];
const ROLES = ["parent", "teacher", "bursar", "admin", "applicant"] as const;
const STUDENT_STATUSES = ["active", "graduated", "withdrawn"] as const;

const value = (form: FormData, key: string, max = 200) => String(form.get(key) ?? "").trim().slice(0, max);
const uuid = (text: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
const sessionPattern = (text: string) => {
  const match = /^(\d{4})\/(\d{4})$/.exec(text);
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
};

async function adminId() {
  const actor = await getCurrentUser();
  return actor?.role === "admin" ? actor.id : null;
}

function invalid(message: string): AdminMutationState { return { ok: false, message }; }
function done(message: string): AdminMutationState {
  revalidatePath("/dashboard/admin", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/teacher", "layout");
  revalidatePath("/dashboard/attendance", "page");
  revalidatePath("/dashboard/academics/results", "page");
  revalidatePath("/dashboard/bursar", "page");
  return { ok: true, message };
}

export async function mutateAdminData(_previous: AdminMutationState, form: FormData): Promise<AdminMutationState> {
  void _previous;
  const actorId = await adminId();
  if (!actorId) return invalid("Only a school administrator can make this change.");
  const operation = value(form, "operation", 40);

  try {
    switch (operation) {
      case "create-class":
      case "update-class": {
        const id = value(form, "id", 36);
        const name = value(form, "name", 80);
        const level = value(form, "level", 40) || null;
        const academicYear = value(form, "academicYear", 9);
        const classTeacherUserId = value(form, "classTeacherUserId", 100) || null;
        if (!name || !sessionPattern(academicYear)) return invalid("Enter a class name and a valid academic year.");
        if (classTeacherUserId) {
          const [teacher] = await db.select({ id: user.id }).from(user).where(and(eq(user.id, classTeacherUserId), eq(user.role, "teacher"))).limit(1);
          if (!teacher) return invalid("Choose an existing teacher account.");
        }
        if (operation === "create-class") await db.insert(classes).values({ name, level, academicYear, classTeacherUserId });
        else {
          if (!uuid(id)) return invalid("Choose a valid class.");
          await db.update(classes).set({ name, level, academicYear, classTeacherUserId }).where(eq(classes.id, id));
        }
        return done(operation === "create-class" ? "Class created." : "Class updated.");
      }
      case "delete-class": {
        const id = value(form, "id", 36);
        if (!uuid(id)) return invalid("Choose a valid class.");
        const [studentRow, assignmentRow, scoreRow, publicationRow, noticeRow, eventRow] = await Promise.all([
          db.select({ value: count() }).from(students).where(eq(students.classId, id)),
          db.select({ value: count() }).from(teacherAssignments).where(eq(teacherAssignments.classId, id)),
          db.select({ value: count() }).from(scores).where(eq(scores.classId, id)),
          db.select({ value: count() }).from(resultsPublished).where(eq(resultsPublished.classId, id)),
          db.select({ value: count() }).from(notices).where(eq(notices.classId, id)),
          db.select({ value: count() }).from(events).where(eq(events.classId, id)),
        ]);
        if ([studentRow, assignmentRow, scoreRow, publicationRow, noticeRow, eventRow].some((rows) => Number(rows[0]?.value ?? 0) > 0)) return invalid("This class has students, assignments, scores, result history, notices, or events. Keep it for records instead of deleting it.");
        await db.delete(classes).where(eq(classes.id, id));
        return done("Empty class deleted.");
      }
      case "create-student":
      case "update-student": {
        const id = value(form, "id", 36);
        const firstName = value(form, "firstName", 80);
        const lastName = value(form, "lastName", 80);
        const classId = value(form, "classId", 36);
        const dateOfBirth = value(form, "dateOfBirth", 10) || null;
        const status = value(form, "status", 20) as typeof STUDENT_STATUSES[number];
        if (!firstName || !lastName || !uuid(classId) || (operation === "update-student" && !STUDENT_STATUSES.includes(status))) return invalid("Enter the student's name, class, and a valid status.");
        if (dateOfBirth && !isValidCalendarDate(dateOfBirth)) return invalid("Enter a valid date of birth.");
        const [classRow] = await db.select({ academicYear: classes.academicYear }).from(classes).where(eq(classes.id, classId)).limit(1);
        if (!classRow) return invalid("Choose an existing class.");
        if (operation === "create-student") {
          const year = classRow.academicYear.slice(0, 4);
          await db.transaction(async (tx) => {
            await tx.execute(sql`select pg_advisory_xact_lock(19840711)`);
            const [sequence] = await tx.select({ lastNumber: sql<number>`coalesce(max(split_part(${students.admissionNumber}, '/', 3)::integer), 0)::int` }).from(students).where(like(students.admissionNumber, `CHA/${year}/%`));
            const admissionNumber = `CHA/${year}/${String(Number(sequence.lastNumber) + 1).padStart(4, "0")}`;
            await tx.insert(students).values({ firstName, lastName, classId, dateOfBirth, admissionNumber, status: "active" });
          });
        } else {
          if (!uuid(id)) return invalid("Choose a valid student.");
          await db.update(students).set({ firstName, lastName, classId, dateOfBirth, status }).where(eq(students.id, id));
        }
        return done(operation === "create-student" ? "Student created." : "Student updated.");
      }
      case "create-account": {
        const name = value(form, "name", 120);
        const email = value(form, "email", 254).toLowerCase();
        const password = value(form, "password", 128);
        const role = value(form, "role", 20);
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(role as typeof ROLES[number]) || password.length < 12) return invalid("Enter a name, valid email, role, and an initial password of at least 12 characters.");
        const [duplicate] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
        if (duplicate) return invalid("An account already uses this email address.");
        const id = crypto.randomUUID();
        const hashedPassword = await hashPassword(password);
        await db.transaction(async (tx) => {
          await tx.insert(user).values({ id, name, email, role, emailVerified: false });
          await tx.insert(account).values({ id: crypto.randomUUID(), userId: id, accountId: id, providerId: "credential", password: hashedPassword });
        });
        return done("Account created. Give the initial password to the account holder through a secure channel.");
      }
      case "delete-student": {
        const id = value(form, "id", 36);
        if (!uuid(id)) return invalid("Choose a valid student.");
        const [invoiceCount, scoreCount, attendanceCount, linkCount] = await Promise.all([
          db.select({ value: count() }).from(invoices).where(eq(invoices.studentId, id)),
          db.select({ value: count() }).from(scores).where(eq(scores.studentId, id)),
          db.select({ value: count() }).from(attendanceRecords).where(eq(attendanceRecords.studentId, id)),
          db.select({ value: count() }).from(parentStudents).where(eq(parentStudents.studentId, id)),
        ]);
        if ([invoiceCount, scoreCount, attendanceCount, linkCount].some((rows) => Number(rows[0]?.value ?? 0) > 0)) return invalid("This student has invoices, scores, attendance, or parent links. Mark them withdrawn or graduated to preserve their school history.");
        await db.delete(students).where(eq(students.id, id));
        return done("Unused student record deleted.");
      }
      case "update-account": {
        const id = value(form, "id", 100);
        const name = value(form, "name", 120);
        const email = value(form, "email", 254).toLowerCase();
        const role = value(form, "role", 20);
        if (!id || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(role as typeof ROLES[number])) return invalid("Enter a name, valid email, and a supported role.");
        if (id === actorId && role !== "admin") return invalid("You cannot remove your own administrator role.");
        const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
        if (existing && existing.id !== id) return invalid("An account already uses this email address.");
        await db.update(user).set({ name, email, role, updatedAt: new Date() }).where(eq(user.id, id));
        return done("Account details updated.");
      }
      case "reset-password": {
        const id = value(form, "id", 100);
        const password = value(form, "password", 128);
        if (!id || password.length < 12) return invalid("Enter a replacement password of at least 12 characters.");
        const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1);
        if (!target) return invalid("Account not found.");
        const hashedPassword = await hashPassword(password);
        await db.transaction(async (tx) => {
          const [credential] = await tx.select({ id: account.id }).from(account).where(and(eq(account.userId, id), eq(account.providerId, "credential"))).limit(1);
          if (credential) await tx.update(account).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(account.id, credential.id));
          else await tx.insert(account).values({ id: crypto.randomUUID(), userId: id, accountId: id, providerId: "credential", password: hashedPassword });
          await tx.delete(session).where(eq(session.userId, id));
        });
        return done("Password reset and existing sessions signed out.");
      }
      case "delete-account": {
        const id = value(form, "id", 100);
        if (!id || id === actorId) return invalid("You cannot delete your own administrator account.");
        const [linkCount, scoreCount, assignmentCount, attendanceCount, noticeCount, publicationCount, reminderCount, paymentCount] = await Promise.all([
          db.select({ value: count() }).from(parentStudents).where(eq(parentStudents.parentUserId, id)),
          db.select({ value: count() }).from(scores).where(eq(scores.enteredBy, id)),
          db.select({ value: count() }).from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, id)),
          db.select({ value: count() }).from(attendanceRecords).where(eq(attendanceRecords.markedBy, id)),
          db.select({ value: count() }).from(notices).where(eq(notices.createdBy, id)),
          db.select({ value: count() }).from(resultsPublished).where(eq(resultsPublished.publishedBy, id)),
          db.select({ value: count() }).from(feeReminderLogs).where(or(eq(feeReminderLogs.sentBy, id), eq(feeReminderLogs.parentUserId, id))),
          db.select({ value: count() }).from(payments).where(eq(payments.recordedBy, id)),
        ]);
        if ([linkCount, scoreCount, assignmentCount, attendanceCount, noticeCount, publicationCount, reminderCount, paymentCount].some((rows) => Number(rows[0]?.value ?? 0) > 0)) return invalid("This account is linked to student, teaching, attendance, fee, notice, result, or reminder records and cannot be safely deleted.");
        await db.delete(user).where(eq(user.id, id));
        return done("Unused account deleted.");
      }
      case "create-subject":
      case "update-subject": {
        const id = value(form, "id", 36);
        const name = value(form, "name", 80);
        if (!name || (operation === "update-subject" && !uuid(id))) return invalid("Enter a valid subject name.");
        if (operation === "create-subject") await db.insert(subjects).values({ name });
        else await db.update(subjects).set({ name }).where(eq(subjects.id, id));
        return done(operation === "create-subject" ? "Subject created." : "Subject updated.");
      }
      case "delete-subject": {
        const id = value(form, "id", 36);
        if (!uuid(id)) return invalid("Choose a valid subject.");
        const [assignments, subjectScores] = await Promise.all([
          db.select({ value: count() }).from(teacherAssignments).where(eq(teacherAssignments.subjectId, id)),
          db.select({ value: count() }).from(scores).where(eq(scores.subjectId, id)),
        ]);
        if ([assignments, subjectScores].some((rows) => Number(rows[0]?.value ?? 0) > 0)) return invalid("This subject has teaching assignments or scores. Keep it for school records.");
        await db.delete(subjects).where(eq(subjects.id, id));
        return done("Unused subject deleted.");
      }
      case "create-assignment": {
        const teacherUserId = value(form, "teacherUserId", 100);
        const classId = value(form, "classId", 36);
        const subjectId = value(form, "subjectId", 36);
        if (!uuid(classId) || !uuid(subjectId)) return invalid("Choose a class and subject.");
        const [teacher] = await db.select({ id: user.id }).from(user).where(and(eq(user.id, teacherUserId), eq(user.role, "teacher"))).limit(1);
        if (!teacher) return invalid("Choose an existing teacher account.");
        await db.insert(teacherAssignments).values({ teacherUserId, classId, subjectId }).onConflictDoNothing();
        return done("Teacher assignment saved.");
      }
      case "delete-assignment": {
        const id = value(form, "id", 36);
        if (!uuid(id)) return invalid("Choose a valid teacher assignment.");
        await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
        return done("Teacher assignment removed.");
      }
      case "create-parent-link": {
        const parentUserId = value(form, "parentUserId", 100);
        const studentId = value(form, "studentId", 36);
        const relationship = value(form, "relationship", 40) || "guardian";
        if (!uuid(studentId)) return invalid("Choose a student.");
        const [parent] = await db.select({ id: user.id }).from(user).where(and(eq(user.id, parentUserId), eq(user.role, "parent"))).limit(1);
        if (!parent) return invalid("Choose an existing parent account.");
        await db.insert(parentStudents).values({ parentUserId, studentId, relationship }).onConflictDoUpdate({ target: [parentStudents.parentUserId, parentStudents.studentId], set: { relationship } });
        return done("Parent linked to student.");
      }
      case "delete-parent-link": {
        const parentUserId = value(form, "parentUserId", 100);
        const studentId = value(form, "studentId", 36);
        if (!parentUserId || !uuid(studentId)) return invalid("Choose a valid parent and student link.");
        await db.delete(parentStudents).where(and(eq(parentStudents.parentUserId, parentUserId), eq(parentStudents.studentId, studentId)));
        return done("Parent link removed.");
      }
      case "promote-class": {
        const sourceId = value(form, "sourceClassId", 36);
        const targetId = value(form, "targetClassId", 36);
        if (!uuid(sourceId) || !uuid(targetId) || sourceId === targetId) return invalid("Choose a source and next-session class.");
        await db.transaction(async (tx) => {
          const [source] = await tx.select({ academicYear: classes.academicYear }).from(classes).where(eq(classes.id, sourceId)).limit(1);
          const [target] = await tx.select({ academicYear: classes.academicYear }).from(classes).where(eq(classes.id, targetId)).limit(1);
          if (!source || !target || !sessionPattern(source.academicYear) || !sessionPattern(target.academicYear) || Number(target.academicYear.slice(0, 4)) !== Number(source.academicYear.slice(0, 4)) + 1) throw new Error("The target must be a class in the immediately following academic year.");
          await tx.update(students).set({ classId: targetId }).where(and(eq(students.classId, sourceId), eq(students.status, "active")));
        });
        return done("Active students moved to the next-session class. Historical scores remain attached to their original class.");
      }
      case "save-calendar": {
        const sessionName = value(form, "session", 9);
        const sessionStart = value(form, "sessionStart", 10);
        const sessionEnd = value(form, "sessionEnd", 10);
        const currentTerm = value(form, "currentTerm", 10) as ScoreTerm;
        if (!sessionPattern(sessionName) || !isValidCalendarDate(sessionStart) || !isValidCalendarDate(sessionEnd) || sessionStart >= sessionEnd || !TERMS.includes(currentTerm)) return invalid("Enter a valid academic session, date range and current term.");
        const calendars = TERMS.map((term) => ({ term, start: value(form, `${term}Start`, 10), end: value(form, `${term}End`, 10), days: Number(value(form, `${term}Days`, 4)) }));
        if (calendars.some((term) => !isValidCalendarDate(term.start) || !isValidCalendarDate(term.end) || term.start >= term.end || !Number.isInteger(term.days) || term.days < 0 || term.start < sessionStart || term.end > sessionEnd)) return invalid("Each term needs valid dates within the session and non-negative days open.");
        const ordered = [...calendars].sort((a, b) => a.start.localeCompare(b.start));
        if (ordered.some((term, index) => index > 0 && term.start < ordered[index - 1]!.end)) return invalid("Term date ranges cannot overlap.");
        await db.transaction(async (tx) => {
          await tx.insert(academicSessions).values({ name: sessionName, startsOn: sessionStart, endsOn: sessionEnd }).onConflictDoUpdate({ target: academicSessions.name, set: { startsOn: sessionStart, endsOn: sessionEnd } });
          for (const term of calendars) await tx.insert(academicTerms).values({ session: sessionName, term: term.term, startsOn: term.start, endsOn: term.end, daysSchoolWasOpen: term.days }).onConflictDoUpdate({ target: [academicTerms.session, academicTerms.term], set: { startsOn: term.start, endsOn: term.end, daysSchoolWasOpen: term.days } });
          await tx.insert(schoolSettings).values({ id: 1, currentSession: sessionName, currentTerm, updatedAt: new Date() }).onConflictDoUpdate({ target: schoolSettings.id, set: { currentSession: sessionName, currentTerm, updatedAt: new Date() } });
        });
        return done("Academic calendar and current session settings saved.");
      }
      default:
        return invalid("Unknown admin operation.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("immediately following")) return invalid(error.message);
    return invalid("The change could not be saved. Check for duplicate names or records that still depend on this item.");
  }
}
