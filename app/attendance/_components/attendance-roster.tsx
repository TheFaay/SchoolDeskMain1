"use client";

import { useActionState, useMemo, useState } from "react";

import type { AttendanceStatus } from "@/lib/db/schema";

export type AttendanceRosterStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  status: AttendanceStatus | null;
};

export type AttendanceSaveState = {
  message: string;
  error: boolean;
};

type AttendanceRosterProps = {
  classId: string;
  className: string;
  date: string;
  students: AttendanceRosterStudent[];
  saveAction: (
    state: AttendanceSaveState,
    formData: FormData,
  ) => Promise<AttendanceSaveState>;
};

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

const EMPTY_STATE: AttendanceSaveState = { message: "", error: false };

export function AttendanceRoster({
  classId,
  className,
  date,
  students,
  saveAction,
}: AttendanceRosterProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((student) => [student.studentId, student.status ?? ""])),
  );
  const [state, formAction, pending] = useActionState(saveAction, EMPTY_STATE);

  const unmarkedCount = useMemo(
    () => Object.values(statuses).filter((status) => status === "").length,
    [statuses],
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />

      <div className="flex flex-col gap-1 rounded-xl bg-[#12264F]/5 px-4 py-3 text-sm text-[#12264F] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">{className}</p>
        <p aria-live="polite" aria-atomic="true">
          {students.length === 0
            ? "No students enrolled"
            : `${students.length - unmarkedCount} of ${students.length} students marked${
                unmarkedCount > 0 ? ` · ${unmarkedCount} unmarked` : " · All marked"
              }`}
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
          No students are enrolled in this class yet.
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setStatuses(
                Object.fromEntries(
                  students.map((student) => [student.studentId, "present"]),
                ),
              )
            }
            className="min-h-11 rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark everyone present
          </button>

          <ul className="space-y-3" aria-label={`Attendance for ${className}`}>
            {students.map((student) => {
              const controlId = `attendance-${student.studentId}`;
              const fullName = `${student.firstName} ${student.lastName}`;

              return (
                <li
                  key={student.studentId}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{fullName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Admission no. {student.admissionNumber}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor={controlId}
                      className="mb-1.5 block text-sm font-medium text-slate-800"
                    >
                      Attendance for {fullName}
                    </label>
                    <select
                      id={controlId}
                      name={`status:${student.studentId}`}
                      value={statuses[student.studentId]}
                      disabled={pending}
                      onChange={(event) =>
                        setStatuses((current) => ({
                          ...current,
                          [student.studentId]: event.target.value,
                        }))
                      }
                      className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200] disabled:bg-slate-100"
                    >
                      <option value="" disabled={student.status !== null}>
                        Unmarked
                      </option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || students.length === 0}
          className="min-h-12 rounded-xl bg-[#12264F] px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving attendance…" : "Save attendance"}
        </button>
        {state.error ? (
          <p className="text-sm font-medium text-red-900" role="alert">
            {state.message}
          </p>
        ) : (
          <p className="text-sm text-slate-600" aria-live="polite" role="status">
            {pending ? "Saving this class attendance." : state.message}
          </p>
        )}
      </div>
    </form>
  );
}
