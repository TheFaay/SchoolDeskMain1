import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("dev attendance enforces assignments and holidays and appears in parent and report summaries", {
  skip: process.env.RUN_ATTENDANCE_DB_TESTS !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(JSON.parse(readFileSync(".neon", "utf8")).branch, "dev");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const [{ db }, schema, attendance, results, { eq, and }] = await Promise.all([
    import("@/lib/db/index"), import("@/lib/db/schema"), import("./repository"), import("@/lib/results/getResults"), import("drizzle-orm"),
  ]);
  const teacherId = "demo-teacher-user-001";
  const adminId = "demo-admin-user-001";
  const parentId = "sample-parent-user-001";
  const classOne = "c0000000-0000-4000-8000-000000000001";
  const classThree = "c0000000-0000-4000-8000-000000000003";
  const childId = "d0000000-0000-4000-8000-000000000001";
  const markDate = "2026-10-05";
  const holidayDate = "2026-10-06";
  const [child] = await db.select({ id: schema.students.id }).from(schema.students).where(and(eq(schema.students.id, childId), eq(schema.students.classId, classOne))).limit(1);
  const [classThreeStudent] = await db.select({ id: schema.students.id }).from(schema.students).where(eq(schema.students.classId, classThree)).limit(1);
  assert.ok(child && classThreeStudent);
  const originalMarks = await db.select().from(schema.attendanceRecords).where(and(eq(schema.attendanceRecords.studentId, childId), eq(schema.attendanceRecords.attendanceDate, markDate))).limit(1);
  const originalAssignments = await db.select().from(schema.teacherAssignments).where(and(eq(schema.teacherAssignments.teacherUserId, teacherId), eq(schema.teacherAssignments.classId, classThree)));
  const holidayId = crypto.randomUUID();
  try {
    await db.insert(schema.events).values({ id: holidayId, title: "Temporary attendance holiday test", startsAt: new Date("2026-10-06T00:00:00+01:00"), isSchoolHoliday: true, audience: "all_parents", createdBy: adminId });
    assert.equal(await attendance.isAttendanceSchoolDay("2026-10-03"), false, "Saturday is not markable");
    assert.equal(await attendance.isAttendanceSchoolDay(holidayDate), false, "calendar holidays are not markable");
    assert.equal(await attendance.isAttendanceSchoolDay(markDate), true, "ordinary weekdays are markable");

    await db.delete(schema.teacherAssignments).where(and(eq(schema.teacherAssignments.teacherUserId, teacherId), eq(schema.teacherAssignments.classId, classThree)));
    const teacherClasses = await attendance.listAttendanceClasses(teacherId, false);
    assert.ok(!teacherClasses.some((row) => row.id === classThree));
    await assert.rejects(attendance.saveClassAttendance({ classId: classThree, date: markDate, markedBy: teacherId, isAdmin: false, records: [{ studentId: classThreeStudent.id, status: "present" }] }), /not assigned/);

    await attendance.saveClassAttendance({ classId: classOne, date: markDate, markedBy: teacherId, isAdmin: false, records: [{ studentId: childId, status: "late" }] });
    const parentHistory = await attendance.listAttendanceHistoryForParent(parentId);
    assert.ok(parentHistory.attendance.some((row) => row.studentId === childId && row.date === markDate && row.status === "late"));
    const [parentSummary, termResult] = await Promise.all([
      attendance.getParentTermAttendance(parentId),
      results.getTermResult(childId, "First", "2026/2027"),
    ]);
    assert.ok(termResult);
    const summary = parentSummary.summaries.find((row) => row.studentId === childId);
    assert.ok(summary);
    assert.equal(summary.daysPresent, termResult.attendance.present);
    assert.equal(parentSummary.daysOpened, termResult.attendance.daysOpened);
  } finally {
    if (originalMarks[0]) {
      await db.update(schema.attendanceRecords).set({ status: originalMarks[0].status, note: originalMarks[0].note, markedBy: originalMarks[0].markedBy, markedAt: originalMarks[0].markedAt }).where(eq(schema.attendanceRecords.id, originalMarks[0].id));
    } else {
      await db.delete(schema.attendanceRecords).where(and(eq(schema.attendanceRecords.studentId, childId), eq(schema.attendanceRecords.attendanceDate, markDate)));
    }
    if (originalAssignments.length) await db.insert(schema.teacherAssignments).values(originalAssignments).onConflictDoNothing();
    await db.delete(schema.events).where(eq(schema.events.id, holidayId));
  }
});
