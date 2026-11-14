import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateScoresRequest } from "./validation";
import { calculateScore, getGrade } from "./grading";

const base = { classId: "class-1", subjectId: "subject-1", term: "first" };

test("blank rows are skipped while zero is a valid score", () => {
  const result = validateScoresRequest({ ...base, rows: [
    { studentId: "student-1", caScore: "", examScore: "" },
    { studentId: "student-2", caScore: "0", examScore: "0" },
  ] });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.rows, [{ studentId: "student-2", caScore: 0, examScore: 0, total: 0, grade: "F" }]);
});

test("one blank half of a score is rejected", () => {
  const result = validateScoresRequest({ ...base, rows: [{ studentId: "student-1", caScore: "0", examScore: "" }] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors["student-1"], /both CA and exam/);
});

test("total and grade come from submitted CA and exam values", () => {
  const result = validateScoresRequest({ ...base, rows: [{ studentId: "student-1", caScore: "30", examScore: "35", total: 0, grade: "F" }] });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.rows[0], { studentId: "student-1", caScore: 30, examScore: 35, total: 65, grade: "B" });
  assert.deepEqual(calculateScore(40, 60), { total: 100, grade: "A" });
  assert.equal(getGrade(39.99), "F");
});

test("more than two decimal places are rejected", () => {
  const result = validateScoresRequest({ ...base, rows: [{ studentId: "student-1", caScore: 1.234, examScore: 2 }] });
  assert.equal(result.ok, false);
});

test("dev database preserves saves, enforces assignments, and locks published scores", {
  skip: process.env.RUN_SCORE_DB_TESTS !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(JSON.parse(readFileSync(".neon", "utf8")).branch, "dev");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const [{ db }, schema, { getScoreOptionsForTeacher, getScores, saveScores }, { eq, and }] = await Promise.all([
    import("@/lib/db/index"), import("@/lib/db/schema"), import("./data"), import("drizzle-orm"),
  ]);
  const teacherId = "demo-teacher-user-001";
  const classId = "c0000000-0000-4000-8000-000000000002";
  const subjectId = "c0000000-0000-4000-8000-0000000007d0";
  const studentId = "d0000000-0000-4000-8000-000000000002";
  const [before] = await db.select().from(schema.scores).where(and(eq(schema.scores.studentId, studentId), eq(schema.scores.subjectId, subjectId), eq(schema.scores.session, "2026/2027"), eq(schema.scores.term, "first")));
  assert.ok(before, "the seeded score row must exist");
  try {
    const options = await getScoreOptionsForTeacher(teacherId, false);
    assert.ok(options.assignments.some((row) => row.classId === classId && row.subjectId === subjectId));
    const unassignedSubject = "c0000000-0000-4000-8000-0000000007d1";
    assert.ok(!options.assignments.some((row) => row.classId === classId && row.subjectId === unassignedSubject));
    await assert.rejects(saveScores({ classId, subjectId: unassignedSubject, term: "first", actorId: teacherId, isAdmin: false, rows: [{ studentId, caScore: 10, examScore: 10 }] }), /not assigned/);
    await saveScores({ classId, subjectId, term: "first", actorId: teacherId, isAdmin: false, rows: [{ studentId, caScore: 17, examScore: 29 }] });
    assert.deepEqual(await getScores(classId, subjectId, "first").then((rows) => rows.find((row) => row.studentId === studentId)).then((row) => ({ ca: row?.caScore, exam: row?.examScore, total: row?.total, grade: row?.grade })), { ca: 17, exam: 29, total: 46, grade: "D" });
    const publishedClass = "c0000000-0000-4000-8000-000000000001";
    await assert.rejects(saveScores({ classId: publishedClass, subjectId, term: "first", actorId: teacherId, isAdmin: false, rows: [{ studentId: "d0000000-0000-4000-8000-000000000001", caScore: 1, examScore: 1 }] }), /published and locked/);
  } finally {
    await db.update(schema.scores).set({ caScore: before.caScore, examScore: before.examScore, total: before.total, grade: before.grade, enteredBy: before.enteredBy, updatedAt: before.updatedAt }).where(eq(schema.scores.id, before.id));
  }
});
