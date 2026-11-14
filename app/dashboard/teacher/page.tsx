import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";

import PermissionDenied from "../PermissionDenied";

export const metadata: Metadata = {
  title: "Teacher dashboard · Crown Heights Academy",
};

// Feature 10: teacher-only page. Any other role (or signed-out visitor)
// cannot see this content — wrong roles get the exact access-denied message.

export default function TeacherPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <TeacherPanel />
      </Suspense>
    </main>
  );
}

async function TeacherPanel() {
  const gate = await requireRole("teacher", "admin");

  if (gate.status === "forbidden") {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">
          Teacher dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {gate.user.name} ({gate.user.email}).
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
            Enter scores
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Enter CA and exam marks for the classes and subjects assigned to you.
          </p>
          <Link href="/dashboard/teacher/scores" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b3a]">Open score entry</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
            Mark attendance
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Record daily attendance for a class.
          </p>
          <Link
            href="/dashboard/teacher/attendance"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]"
          >
            Take attendance
          </Link>
        </article>
      </section>

      <p className="text-xs text-slate-500">
        You can only open the pages assigned to your role.
      </p>
    </div>
  );
}
