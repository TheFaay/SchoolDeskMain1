import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { db } from "@/lib/db";
import { classes, parentStudents, students } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/session";

import PermissionDenied from "./PermissionDenied";

export const metadata: Metadata = {
  title: "Parent dashboard · Crown Heights Academy",
};

// Feature 10: the parent's home page.
// - parent / teacher / bursar / admin all land here after sign-in
// - only parents get content; everybody else gets "You do not have
//   permission to open this page."
// - parents see ONLY their own children, matched server-side through
//   parent_students.parent_user_id = the signed-in user's id.
//
// The dynamic work (session check + database query) runs inside the
// <Suspense> boundary so the static shell can prerender.

export default function ParentDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <ParentPanel />
      </Suspense>
    </main>
  );
}

async function ParentPanel() {
  const gate = await requireRole("parent", "admin");

  if (gate.status === "forbidden") {
    return <PermissionDenied />;
  }

  const children = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      level: classes.level,
    })
    .from(parentStudents)
    .innerJoin(students, eq(students.id, parentStudents.studentId))
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(parentStudents.parentUserId, gate.user.id));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">
          Welcome, {gate.user.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Parent portal · your own children only.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          My children ({children.length})
        </h2>
        {children.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            No children are linked to your account yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {children.map((child) => (
              <li
                key={child.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
                  {child.firstName} {child.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {child.className}
                  {child.level ? ` · ${child.level}` : ""} ·{" "}
                  <span className="font-mono text-xs">
                    {child.admissionNumber}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-poppins)] text-base font-semibold text-[#12264F]">
          Notices
        </h2>
        <p className="text-sm text-slate-600">
          School notices will also be sent to your email.
        </p>
      </section>

      {gate.user.role === "parent" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
            Attendance
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Check recorded absences for your children.
          </p>
          <Link
            href="/dashboard/attendance"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border-2 border-[#12264F] px-4 py-2 text-sm font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
          >
            View attendance
          </Link>
        </section>
      ) : null}
    </div>
  );
}
