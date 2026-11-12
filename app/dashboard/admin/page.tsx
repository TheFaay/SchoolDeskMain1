import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import {
  listClassesWithCounts,
  listStudentsWithClasses,
  listTeachers,
} from "@/lib/schoolAdmin/repository";
import { listPublishedResults } from "@/lib/results/repository";

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

  const [classList, studentList, teacherList, publishedList] = await Promise.all([
    listClassesWithCounts(),
    listStudentsWithClasses(),
    listTeachers(),
    listPublishedResults(),
  ]);

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
          <SendNoticeForm />
        </div>
      </section>

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
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Open the other pages
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
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
