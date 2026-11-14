import { AttendanceRoster } from "./attendance-roster";
import type {
  AttendanceRosterStudent,
  AttendanceSaveState,
} from "./attendance-roster";

export type AttendanceClassOption = {
  id: string;
  name: string;
  level: string | null;
};

export function AttendanceScreen({
  classes,
  selectedClassId,
  date,
  today,
  schoolDay,
  students,
  saveAction,
}: {
  classes: AttendanceClassOption[];
  selectedClassId: string;
  date: string;
  today: string;
  schoolDay: boolean;
  students: AttendanceRosterStudent[];
  saveAction: (
    state: AttendanceSaveState,
    formData: FormData,
  ) => Promise<AttendanceSaveState>;
}) {
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#806200] uppercase">
          School day
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#12264F] sm:text-3xl">
          Take attendance
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          Choose a class and date, then mark each student. Students left unmarked
          will not be saved as present or absent.
        </p>
      </header>

      <form
        method="get"
        className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_auto] sm:items-end sm:p-5"
      >
        <div>
          <label
            htmlFor="attendance-class"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            Class
          </label>
          <select
            id="attendance-class"
            name="classId"
            required
            defaultValue={selectedClassId}
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
          >
            <option value="">Choose a class</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
                {classItem.level ? ` · ${classItem.level}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="attendance-date"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            School date
          </label>
          <input
            id="attendance-date"
            name="date"
            type="date"
            required
            max={today}
            defaultValue={date}
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
          />
        </div>

        <button
          type="submit"
          className="min-h-12 rounded-xl border-2 border-[#12264F] px-5 py-2.5 text-base font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
        >
          Load class
        </button>
      </form>

      {classes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-600">
          No classes are available yet. Contact the school administrator.
        </p>
      ) : selectedClass && !schoolDay ? (
        <p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          Attendance cannot be marked on weekends or school holidays. Choose a school day from the calendar.
        </p>
      ) : selectedClass ? (
        <section aria-label="Class attendance roster">
          <h2 className="mb-4 text-lg font-semibold text-[#12264F]">
            {new Intl.DateTimeFormat("en-NG", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Lagos",
            }).format(new Date(`${date}T12:00:00+01:00`))}
          </h2>
          <AttendanceRoster
            classId={selectedClass.id}
            className={selectedClass.name}
            date={date}
            students={students}
            saveAction={saveAction}
          />
        </section>
      ) : null}
    </main>
  );
}
