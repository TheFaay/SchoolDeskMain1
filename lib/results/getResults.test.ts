import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("dev results are parent-scoped, published-only, class-aware, and reconcile with raw scores", {
  skip: process.env.RUN_RESULTS_DB_TESTS !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(JSON.parse(readFileSync(".neon", "utf8")).branch, "dev");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const [{ db }, schema, results, { eq, and }] = await Promise.all([
    import("@/lib/db/index"), import("@/lib/db/schema"), import("./getResults"), import("drizzle-orm"),
  ]);
  const studentId = "d0000000-0000-4000-8000-000000000001";
  const parentId = "sample-parent-user-001";
  const otherParentId = "demo-parent-user-002";
  const [student] = await db.select({ classId: schema.students.classId }).from(schema.students).where(eq(schema.students.id, studentId)).limit(1);
  assert.ok(student);
  const rawScores = await db.select({ ca: schema.scores.caScore, exam: schema.scores.examScore }).from(schema.scores).where(and(eq(schema.scores.studentId, studentId), eq(schema.scores.session, "2026/2027"), eq(schema.scores.term, "first")));
  assert.equal(rawScores.length, 8);
  try {
    assert.equal(await results.canParentView(parentId, studentId), true);
    assert.equal(await results.canParentView(otherParentId, studentId), false);
    assert.deepEqual(await results.getAvailableTerms(studentId, "2026/2027"), ["First"]);
    assert.equal(await results.getTermAvailability(studentId, "Second", "2026/2027"), "unpublished");
    assert.equal(await results.getTermResult(studentId, "Second", "2026/2027"), null);

    await db.update(schema.students).set({ classId: "c0000000-0000-4000-8000-000000000002" }).where(eq(schema.students.id, studentId));
    const result = await results.getTermResult(studentId, "First", "2026/2027");
    assert.ok(result);
    assert.equal(result.className, "JSS 1A", "report class comes from the term's score rows after a later class move");
    assert.equal(result.subjects.length, rawScores.length);
    const standing = await results.getClassStanding(result);
    const rawTotal = rawScores.reduce((sum, row) => sum + Number(row.ca) + Number(row.exam), 0);
    assert.equal(standing.grandTotal, rawTotal);
    assert.equal(standing.numberInClass, 6);
    assert.equal(standing.average, Math.round(rawTotal / rawScores.length * 10) / 10);
  } finally {
    await db.update(schema.students).set({ classId: student.classId }).where(eq(schema.students.id, studentId));
  }
});
