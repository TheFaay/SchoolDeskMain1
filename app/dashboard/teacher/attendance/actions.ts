"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { saveClassAttendance } from "@/lib/attendance/repository";
import { getSchoolDate, isSchoolDate } from "@/lib/attendance/date";
import type { AttendanceSaveState } from "@/app/attendance/_components/attendance-roster";
import type { AttendanceStatus } from "@/lib/db/schema";

const STATUS_VALUES = new Set<AttendanceStatus>([
  "present",
  "absent",
  "late",
  "excused",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ATTENDANCE_PATH = "/dashboard/teacher/attendance";

export async function saveAttendanceAction(
  _previousState: AttendanceSaveState,
  formData: FormData,
): Promise<AttendanceSaveState> {
  const gate = await requireRole("teacher", "admin");
  if (gate.status === "forbidden") {
    return { message: "You do not have permission to mark attendance.", error: true };
  }

  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!UUID_PATTERN.test(classId) || !isSchoolDate(date) || date > getSchoolDate()) {
    return { message: "Choose a valid class and school date.", error: true };
  }

  const records: Array<{ studentId: string; status: AttendanceStatus }> = [];
  for (const [field, rawValue] of formData.entries()) {
    if (!field.startsWith("status:")) continue;
    const studentId = field.slice("status:".length);
    const status = String(rawValue);
    if (!UUID_PATTERN.test(studentId)) {
      return { message: "We could not identify one of the students. Reload the class and try again.", error: true };
    }
    if (status === "") continue;
    if (!STATUS_VALUES.has(status as AttendanceStatus)) {
      return { message: "Choose a valid attendance status for each student.", error: true };
    }
    records.push({ studentId, status: status as AttendanceStatus });
  }

  if (records.length === 0) {
    return { message: "Mark at least one student before saving.", error: true };
  }

  try {
    await saveClassAttendance({
      classId,
      date,
      markedBy: gate.user.id,
      records,
    });
  } catch {
    return {
      message: "We could not save attendance. Check the class list and try again.",
      error: true,
    };
  }

  revalidatePath(ATTENDANCE_PATH);
  revalidatePath("/dashboard/attendance");
  return { message: "Attendance saved.", error: false };
}

