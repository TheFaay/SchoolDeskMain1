import assert from "node:assert/strict";
import test from "node:test";

import { isStudentId } from "./student-id";

test("accepts a valid UUID student ID", () => {
  assert.equal(isStudentId("d0000000-0000-4000-8000-000000000001"), true);
});

test("rejects malformed IDs before any ownership lookup", () => {
  for (const value of ["", "student-1", "00000000-0000-0000-0000-000000000000", "d0000000-0000-4000-8000-00000000000z"]) {
    assert.equal(isStudentId(value), false, `${value} should not be accepted`);
  }
});
