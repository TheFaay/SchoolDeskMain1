import assert from "node:assert/strict";
import test from "node:test";
import { isSchoolDate, isWeekendSchoolDate } from "./date";

test("school date validation accepts ISO calendar dates only", () => {
  assert.equal(isSchoolDate("2026-11-12"), true);
  assert.equal(isSchoolDate("2026-02-30"), false);
  assert.equal(isSchoolDate("11/12/2026"), false);
});

test("weekends are non-school dates", () => {
  assert.equal(isWeekendSchoolDate("2026-11-14"), true);
  assert.equal(isWeekendSchoolDate("2026-11-15"), true);
  assert.equal(isWeekendSchoolDate("2026-11-13"), false);
});
