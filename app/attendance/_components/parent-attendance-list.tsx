import Link from "next/link";
import type { AttendanceStatus } from "@/lib/db/schema";

export type ParentAttendanceEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  date: string;
  status: AttendanceStatus;
};

export type ParentTermSummary = {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string;
  daysPresent: number;
};

const statusStyle: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-800",
  absent: "bg-rose-50 text-rose-800",
  late: "bg-amber-50 text-amber-900",
  excused: "bg-sky-50 text-sky-800",
};

export function ParentAttendanceList({
  attendance,
  summaries,
  session,
  term,
  daysOpened,
  page,
  pageCount,
}: {
  attendance: ParentAttendanceEntry[];
  summaries: ParentTermSummary[];
  session: string;
  term: string;
  daysOpened: number | null;
  page: number;
  pageCount: number;
}) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="term-attendance-heading">
        <div className="mb-3">
          <h2 id="term-attendance-heading" className="text-lg font-semibold text-[#12264F]">Term summary</h2>
          <p className="text-sm text-slate-600">{term[0]?.toUpperCase()}{term.slice(1)} term · {session}</p>
        </div>
        {summaries.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No children are linked to this account.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {summaries.map((summary) => <li key={summary.studentId} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-semibold text-slate-900">{summary.firstName} {summary.lastName}</p>
              <p className="mt-1 text-sm text-slate-600">{summary.className}</p>
              <p className="mt-3 text-sm font-semibold text-[#12264F]">
                {daysOpened === null ? "School calendar not set" : `${summary.daysPresent} of ${daysOpened} days present`}
              </p>
            </li>)}
          </ul>
        )}
      </section>

      <section aria-labelledby="attendance-history-heading">
        <h2 id="attendance-history-heading" className="mb-3 text-lg font-semibold text-[#12264F]">Recent attendance records</h2>
        {attendance.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="font-semibold text-[#12264F]">No late, absent, or excused records to show</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Attendance records for children linked to your account will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {attendance.map((record) => <li key={`${record.studentId}-${record.date}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-semibold text-slate-900">{record.firstName} {record.lastName}</p>
                <p className="text-sm text-slate-600">{record.className}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle[record.status]}`}>{record.status}</span>
                <time className="text-sm font-medium text-slate-700" dateTime={record.date}>
                  {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(`${record.date}T12:00:00+01:00`))}
                </time>
              </div>
            </li>)}
          </ul>
        )}
        {pageCount > 1 ? <nav aria-label="Attendance history pages" className="mt-4 flex items-center justify-between gap-3">
          {page > 0 ? <Link href={`/dashboard/attendance?page=${page - 1}`} className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F]">Newer records</Link> : <span />}
          <p className="text-sm text-slate-600" role="status" aria-live="polite">Page {page + 1} of {pageCount}</p>
          {page + 1 < pageCount ? <Link href={`/dashboard/attendance?page=${page + 1}`} className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F]">Older records</Link> : <span />}
        </nav> : null}
      </section>
    </div>
  );
}
