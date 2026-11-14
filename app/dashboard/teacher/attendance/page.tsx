import type { Metadata } from "next";
import { Suspense } from "react";

import { AttendanceScreen } from "@/app/attendance/_components/attendance-screen";
import { saveAttendanceAction } from "./actions";
import { requireRole } from "@/lib/auth/session";
import { isAttendanceSchoolDay, listAttendanceClasses, listClassAttendance } from "@/lib/attendance/repository";
import { getSchoolDate, isSchoolDate } from "@/lib/attendance/date";

import PermissionDenied from "../../PermissionDenied";

export const metadata: Metadata = {
  title: "Take attendance · Crown Heights Academy",
};

export default function TeacherAttendancePage(
  props: PageProps<"/dashboard/teacher/attendance">,
) {
  return (
    <Suspense fallback={<p className="px-5 py-8 text-sm text-slate-500">Loading attendance…</p>}>
      <AttendancePanel searchParams={props.searchParams} />
    </Suspense>
  );
}

async function AttendancePanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requireRole("teacher", "admin");
  if (gate.status === "forbidden") return <PermissionDenied />;

  const query = await searchParams;
  const classes = await listAttendanceClasses(gate.user.id, gate.user.role === "admin");
  const requestedClassId = first(query.classId) ?? "";
  const selectedClassId = classes.some((item) => item.id === requestedClassId)
    ? requestedClassId
    : "";
  const today = getSchoolDate();
  const requestedDate = first(query.date) ?? today;
  const date = isSchoolDate(requestedDate) && requestedDate <= today
    ? requestedDate
    : today;
  const schoolDay = selectedClassId ? await isAttendanceSchoolDay(date) : false;
  const students = selectedClassId && schoolDay
    ? await listClassAttendance(selectedClassId, date)
    : [];

  return (
    <AttendanceScreen
      classes={classes}
      selectedClassId={selectedClassId}
      date={date}
      today={today}
      schoolDay={schoolDay}
      students={students}
      saveAction={saveAttendanceAction}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

