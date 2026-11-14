import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("dev database ownership rejects another parent's student", {
  skip: process.env.RUN_OWNERSHIP_DB_TESTS !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(JSON.parse(readFileSync(".neon", "utf8")).branch, "dev");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const { assertParentOwnsStudent } = await import("./ownership");
  const childLinkedToFirstParent = "d0000000-0000-4000-8000-000000000001";

  assert.equal(await assertParentOwnsStudent("sample-parent-user-001", childLinkedToFirstParent), true);
  assert.equal(await assertParentOwnsStudent("demo-parent-user-002", childLinkedToFirstParent), false);
  assert.equal(await assertParentOwnsStudent("sample-parent-user-001", "not-a-student-id"), false);
});
