import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailLogs, user } from "@/lib/db/schema";

import { requireRole } from "@/lib/auth/session";
import {
  listClassesWithCounts,
  listStudentsWithClasses,
  listTeachers,
} from "@/lib/schoolAdmin/repository";
import { listPublishedResults } from "@/lib/results/repository";
import { listClassResultProgress } from "@/lib/results/repository";
import { getCurrentSession } from "@/lib/results/getResults";

import PermissionDenied from "../PermissionDenied";
import PublishResultForm from "./PublishResultForm";
import PublishedResults from "./PublishedResults";
import SendNoticeForm from "./SendNoticeForm";

export const metadata: Metadata = {
  title: "School admin · Crown Heights Academy",
};

// Admin's own page: a welcome, links to every other dashboard page, and the
// notice form that emails parents. Admin can open all portal pages.

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <AdminPanel />
      </Suspense>
    </main>
  );
}

async function AdminPanel() {
  const gate = await requireRole("admin");

  if (gate.status === "forbidden") {
    return <PermissionDenied />;
  }

  const [classList, studentList, teacherList, publishedList, currentSession, parents, failedEmails] = await Promise.all([
    listClassesWithCounts(),
    listStudentsWithClasses(),
    listTeachers(),
    listPublishedResults(),
    getCurrentSession(),
    db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.role, "parent")).orderBy(asc(user.name)),
    db.select({ to: emailLogs.to, subject: emailLogs.subject, error: emailLogs.error, createdAt: emailLogs.createdAt }).from(emailLogs).where(eq(emailLogs.status, "failed")).orderBy(desc(emailLogs.createdAt)).limit(20),
  ]);
  const progressList = currentSession ? await listClassResultProgress(currentSession) : [];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">
          Welcome, {gate.user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          You are signed in as the school admin. Admin can open every dashboard
          page.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">Class result progress · {currentSession || "No current session"}</h2>
        {progressList.length ? <>
          <ul className="space-y-3 md:hidden">
            {progressList.map((row) => <li key={`${row.classId}-${row.term}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-[#12264F]">{row.className} <span className="font-normal capitalize text-slate-500">· {row.term} term</span></h3>
                <ProgressStatus row={row} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{row.enteredScores} of {row.expectedScores} scores entered</p>
              <p className="mt-1 text-xs text-slate-500">{row.students} students · {row.subjects} subjects</p>
            </li>)}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Score progress</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{progressList.map((row) => <tr key={`${row.classId}-${row.term}`}><td className="px-4 py-3 font-medium">{row.className}</td><td className="px-4 py-3 capitalize">{row.term}</td><td className="px-4 py-3">{row.enteredScores} / {row.expectedScores} scores · {row.students} students · {row.subjects} subjects</td><td className="px-4 py-3"><ProgressStatus row={row} /></td></tr>)}</tbody></table></div>
        </> : <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No classes are configured for this session yet.</p>}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Classes
        </h2>
        {classList.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            No classes yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {classList.map((klass) => (
              <li
                key={klass.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
                  {klass.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {klass.level ? `${klass.level} · ` : ""}
                  {klass.academicYear} ·{" "}
                  {klass.studentCount}{" "}
                  {klass.studentCount === 1 ? "student" : "students"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Students ({studentList.length})
        </h2>
        {studentList.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            No students yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {studentList.map((student) => (
              <li
                key={student.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-3"
              >
                <span className="text-sm font-medium text-slate-800">
                  {student.lastName}, {student.firstName}
                </span>
                <span className="text-xs text-slate-500">
                  {student.className} · {student.admissionNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Teachers ({teacherList.length})
        </h2>
        {teacherList.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            No teacher accounts yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {teacherList.map((teacher) => (
              <li
                key={teacher.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 py-3"
              >
                <span className="text-sm font-medium text-slate-800">
                  {teacher.name}
                </span>
                <span className="text-xs text-slate-500">{teacher.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Send a notice to parents
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:max-w-lg">
          <SendNoticeForm classes={classList.map((item) => ({ id: item.id, name: item.name }))} parents={parents} />
        </div>
      </section>

      <section><h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">Recent email failures</h2><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{failedEmails.length ? <ul className="space-y-3">{failedEmails.map((item, index) => <li key={`${item.to}-${item.createdAt.toISOString()}-${index}`} className="border-b border-slate-100 pb-3 text-sm"><p className="font-medium">{item.subject} · {item.to}</p><p className="text-red-700">{item.error ?? "Delivery failed"}</p><time className="text-xs text-slate-500">{item.createdAt.toLocaleString()}</time></li>)}</ul> : <p className="text-sm text-slate-600">No email failures recorded.</p>}</div></section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Approve results
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:max-w-lg">
          <PublishResultForm
            classes={classList.map((klass) => ({
              id: klass.id,
              name: klass.name,
            }))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Published results
        </h2>
        <PublishedResults
          items={publishedList.map((row) => ({
            id: row.id,
            className: row.className,
            academicYear: row.academicYear,
            term: row.term,
            session: row.session,
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Admin tools
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Link href="/dashboard/admin/manage" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"><p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Manage records</p><p className="mt-2 text-sm text-slate-600">Classes, students, accounts, subjects and links.</p></Link>
          <Link href="/dashboard/admin/settings" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"><p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Session settings</p><p className="mt-2 text-sm text-slate-600">Academic calendar, term dates and days open.</p></Link>
          <Link href="/dashboard/admin/admissions" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"><p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Admissions review</p><p className="mt-2 text-sm text-slate-600">Review applications and update status.</p></Link>
          <Link
            href="/dashboard"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"
          >
            <p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
              Parent dashboard
            </p>
            <p className="mt-2 text-sm text-slate-600">
              The view each parent gets, scoped to their own children.
            </p>
          </Link>
          <Link
            href="/dashboard/teacher"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"
          >
            <p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
              Teacher dashboard
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Score entry and attendance for class teachers.
            </p>
          </Link>
          <Link
            href="/dashboard/bursar"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#12264F] focus-visible:outline-2 focus-visible:outline-[#C9A227]"
          >
            <p className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
              Bursar dashboard
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Fees, receipts and payment tracking.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ProgressStatus({ row }: { row: { published: boolean; calendarConfigured: boolean; complete: boolean; expectedScores: number } }) {
  if (row.published) return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Published</span>;
  if (!row.calendarConfigured) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Calendar missing</span>;
  if (row.complete) return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#806200]">Ready to publish</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{row.expectedScores ? "Incomplete" : "Setup required"}</span>;
}
