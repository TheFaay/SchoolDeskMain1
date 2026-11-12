import type { AttendanceStatus } from "@/lib/db/schema";
import type { AttendanceRosterStudent } from "@/app/attendance/_components/attendance-roster";
import type { ParentAbsence } from "@/app/attendance/_components/parent-absence-list";

export const DEMO_DATE = "2026-11-02";

export const DEMO_CLASSES = [
  { id: "demo-jss1a", name: "JSS 1A", level: "Junior Secondary" },
  { id: "demo-jss2b", name: "JSS 2B", level: "Junior Secondary" },
] as const;

export const DEMO_STUDENTS: Record<string, AttendanceRosterStudent[]> = {
  "demo-jss1a": [
    { studentId: "demo-student-amina", firstName: "Amina", lastName: "Okafor", admissionNumber: "SD-2026-014", status: null },
    { studentId: "demo-student-tunde", firstName: "Tunde", lastName: "Bello", admissionNumber: "SD-2026-021", status: null },
    { studentId: "demo-student-chidi", firstName: "Chidi", lastName: "Nwosu", admissionNumber: "SD-2026-032", status: null },
    { studentId: "demo-student-zainab", firstName: "Zainab", lastName: "Yusuf", admissionNumber: "SD-2026-045", status: null },
  ],
  "demo-jss2b": [
    { studentId: "demo-student-ngozi", firstName: "Ngozi", lastName: "Eze", admissionNumber: "SD-2025-008", status: null },
    { studentId: "demo-student-emeka", firstName: "Emeka", lastName: "Adeyemi", admissionNumber: "SD-2025-019", status: null },
    { studentId: "demo-student-fatima", firstName: "Fatima", lastName: "Musa", admissionNumber: "SD-2025-027", status: null },
  ],
};

export type DemoRecord = {
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
};

export const DEMO_RECORDS: DemoRecord[] = [
  { studentId: "demo-student-chidi", classId: "demo-jss1a", date: "2026-10-30", status: "absent" },
  { studentId: "demo-student-ngozi", classId: "demo-jss2b", date: "2026-10-30", status: "absent" },
  { studentId: "demo-student-tunde", classId: "demo-jss1a", date: "2026-10-29", status: "late" },
];

export function demoAbsences(records: DemoRecord[]): ParentAbsence[] {
  return records
    .filter((record) => record.status === "absent")
    .flatMap((record): ParentAbsence[] => {
      const student = Object.values(DEMO_STUDENTS).flat().find((item) => item.studentId === record.studentId);
      const classItem = DEMO_CLASSES.find((item) => item.id === record.classId);
      if (!student || !classItem) return [];
      return [{
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        className: classItem.name,
        date: record.date,
      }];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
