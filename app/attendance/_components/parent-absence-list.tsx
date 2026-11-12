import Link from "next/link";

export type ParentAbsence = {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  date: string;
};

export function ParentAbsenceList({
  absences,
  page,
  pageCount,
}: {
  absences: ParentAbsence[];
  page: number;
  pageCount: number;
}) {
  if (absences.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-[#12264F]">No absences to show</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          There are no recorded absences for your children yet.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="absence-heading">
      <h2 id="absence-heading" className="mb-3 text-lg font-semibold text-[#12264F]">
        Absence history
      </h2>
      <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {absences.map((absence) => (
          <li
            key={`${absence.studentId}-${absence.date}`}
            className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {absence.firstName} {absence.lastName}
              </p>
              <p className="text-sm text-slate-600">{absence.className}</p>
            </div>
            <time
              className="text-sm font-medium text-slate-700"
              dateTime={absence.date}
            >
              {new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Africa/Lagos",
              }).format(new Date(`${absence.date}T12:00:00+01:00`))}
            </time>
          </li>
        ))}
      </ul>
      {pageCount > 1 ? (
        <nav
          aria-label="Attendance history pages"
          className="mt-4 flex items-center justify-between gap-3"
        >
          {page > 0 ? (
            <Link
              href={`/dashboard/attendance?page=${page - 1}`}
              className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
            >
              Newer absences
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-slate-600" role="status" aria-live="polite">
            Page {page + 1} of {pageCount}
          </p>
          {page + 1 < pageCount ? (
            <Link
              href={`/dashboard/attendance?page=${page + 1}`}
              className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
            >
              Older absences
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
