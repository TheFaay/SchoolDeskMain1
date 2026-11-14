import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { parentStudents } from "@/lib/db/schema";
import { isStudentId } from "./student-id";

/** Returns true only when the parent account is linked to this student. */
export async function assertParentOwnsStudent(
  parentUserId: string,
  studentId: string,
): Promise<boolean> {
  if (!isStudentId(studentId)) {
    return false;
  }
  const [link] = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(and(eq(parentStudents.parentUserId, parentUserId), eq(parentStudents.studentId, studentId)))
    .limit(1);
  return Boolean(link);
}
