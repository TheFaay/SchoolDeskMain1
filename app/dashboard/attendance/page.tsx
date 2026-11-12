import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentAbsenceList } from "@/app/attendance/_components/parent-absence-list";
import { listAbsencesForParent } from "@/lib/attendance/repository";
import { requireRole } from "@/lib/auth/session";

import PermissionDenied from "../PermissionDenied";

export const metadata: Metadata = {
  title: "Attendance · Crown Heights Academy",
};

export default function ParentAttendancePage(
  props: PageProps<"/dashboard/attendance">,
) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading attendance…</p>}>
        <ParentAttendancePanel searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function ParentAttendancePanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await requireRole("parent");
  if (gate.status === "forbidden") return <PermissionDenied />;

  const query = await searchParams;
  const requestedPage = Number(first(query.page) ?? "0");
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0
    ? requestedPage
    : 0;
  const history = await listAbsencesForParent(gate.user.id, page);

  return (
    <>
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#806200] uppercase">
          Your children
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#12264F] sm:text-3xl">
          Attendance
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          See absences recorded by the school for children linked to your account.
        </p>
      </header>
      <ParentAbsenceList
        absences={history.absences}
        page={history.page}
        pageCount={history.pageCount}
      />
    </>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
