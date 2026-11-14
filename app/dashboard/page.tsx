import { and, asc, desc, eq, gt, inArray, or } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classes, events, notices, noticeRecipients, parentStudents, students } from "@/lib/db/schema";
import { getParentTermAttendance } from "@/lib/attendance/repository";
import { listInvoicesForStudent, listPaymentsForParent } from "@/lib/fees/repository";
import { formatNaira } from "@/lib/fees/format";
import { getFeeTotals, getInvoiceSummary } from "@/lib/fees/invoice";
import { getAvailableTerms, getChildren, getClassStanding, getCurrentSession, getTermResult } from "@/lib/results/getResults";
import PermissionDenied from "./PermissionDenied";

export const metadata: Metadata = { title: "Parent dashboard · Crown Heights Academy" };
export const instant = false;

const TERM_ORDER = ["First", "Second", "Third"] as const;
type SearchParams = Promise<{ child?: string | string[] }>;

export default function ParentDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<main className="mx-auto w-full max-w-4xl px-5 py-8"><p className="text-sm text-slate-500">Loading your dashboard…</p></main>}>
    <ParentPanel searchParams={searchParams} />
  </Suspense>;
}

async function ParentPanel({ searchParams }: { searchParams: SearchParams }) {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-4xl px-5 py-8"><PermissionDenied /></main>;

  const [{ child: requestedChild }, children, attendance, session] = await Promise.all([
    searchParams, getChildren(gate.user.id), getParentTermAttendance(gate.user.id), getCurrentSession(),
  ]);
  const selectedId = Array.isArray(requestedChild) ? requestedChild[0] : requestedChild;
  const child = children.find((item) => item.id === selectedId) ?? children[0];

  if (!child) return <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8">
    <header><h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Welcome, {gate.user.name}</h1><p className="mt-1 text-sm text-slate-600">Parent portal</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-[#12264F]">No children linked yet</h2><p className="mt-2 text-sm text-slate-600">Contact the school office to link your child to this account.</p></section>
  </main>;

  const [allInvoices, payments, terms] = await Promise.all([
    listInvoicesForStudent(child.id), listPaymentsForParent(gate.user.id), getAvailableTerms(child.id, session),
  ]);
  const invoices = allInvoices.filter((invoice) => invoice.status !== "cancelled");
  const totals = getFeeTotals(allInvoices, payments);
  const nextDue = allInvoices.map((invoice) => ({ invoice, summary: getInvoiceSummary(invoice, payments) }))
    .filter(({ summary }) => summary.balance > 0)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate))[0];
  const latestTerm = [...terms].sort((a, b) => TERM_ORDER.indexOf(b) - TERM_ORDER.indexOf(a))[0];
  const [result, noticeRows, eventRows] = await Promise.all([
    latestTerm ? getTermResult(child.id, latestTerm, session) : Promise.resolve(null),
    getParentNotices(gate.user.id), getUpcomingEvents(gate.user.id),
  ]);
  const standing = result ? await getClassStanding(result) : null;
  const childAttendance = attendance.summaries.find((item) => item.studentId === child.id);

  return <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8">
    <header><h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Welcome, {gate.user.name}</h1><p className="mt-1 text-sm text-slate-600">Your children’s school updates</p></header>

    {children.length > 1 ? <form action="/dashboard" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label htmlFor="child" className="grid gap-1 text-sm font-medium text-[#12264F]">View child
        <select id="child" name="child" defaultValue={child.id} className="min-h-11 min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{children.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </label><button className="min-h-11 rounded-lg bg-[#12264F] px-4 text-sm font-semibold text-white hover:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]">Show dashboard</button>
    </form> : null}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">{child.className}</p><h2 className="mt-1 font-[family-name:var(--font-poppins)] text-xl font-semibold text-[#12264F]">{child.name}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{child.admissionNumber}</span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-[#12264F]">Latest result</h3>{result && standing ? <><p className="mt-2 text-lg font-semibold">{result.term} term</p><p className="text-sm text-slate-600">Average {standing.average}% · Position {standing.position} of {standing.numberInClass}</p></> : <p className="mt-2 text-sm text-slate-600">Not yet published</p>}</article>
        <article className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-[#12264F]">Fees</h3><dl className="mt-2 space-y-1 text-sm"><div className="flex justify-between gap-2"><dt>Billed</dt><dd>{formatNaira(totals.amountDue)}</dd></div><div className="flex justify-between gap-2"><dt>Paid</dt><dd>{formatNaira(totals.amountPaid)}</dd></div><div className="flex justify-between gap-2 font-semibold"><dt>Balance</dt><dd>{formatNaira(totals.balance)}</dd></div></dl>{nextDue ? <p className="mt-2 text-xs text-slate-600">Next due {formatDate(nextDue.invoice.dueDate)}{nextDue.summary.status === "overdue" ? <span className="ml-1 font-semibold text-red-700">· Overdue</span> : null}</p> : <p className="mt-2 text-xs text-slate-600">No outstanding fees</p>}</article>
        <article className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-[#12264F]">Attendance · {attendance.term} term</h3>{attendance.daysOpened === null ? <p className="mt-2 text-sm text-slate-600">Term calendar not set</p> : <p className="mt-2 text-lg font-semibold">{childAttendance?.daysPresent ?? 0} <span className="text-sm font-normal text-slate-600">of {attendance.daysOpened} days</span></p>}</article>
      </div>
      <div className="mt-5"><Link className="inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-4 py-2 text-sm font-semibold text-white underline decoration-[#C9A227] underline-offset-4 hover:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]" href={`/dashboard/academics/results?child=${encodeURIComponent(child.id)}${latestTerm ? `&term=${encodeURIComponent(latestTerm)}` : ""}`}>View {child.name}&apos;s results</Link></div>
      {invoices.length === 0 ? <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">No invoices have been issued for this child.</p> : null}
    </section>

    <section className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Latest notices</h2>{noticeRows.length ? <ul className="mt-3 divide-y divide-slate-100">{noticeRows.map((notice) => <li key={notice.id} className="py-3 first:pt-0"><p className="font-medium text-slate-900">{notice.title}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{notice.body}</p><time className="mt-1 block text-xs text-slate-500">{formatDateTime(notice.createdAt)}</time></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No notices right now.</p>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Upcoming events</h2>{eventRows.length ? <ul className="mt-3 divide-y divide-slate-100">{eventRows.map((event) => <li key={event.id} className="py-3 first:pt-0"><time className="text-xs font-semibold text-[#806200]">{formatDateTime(event.startsAt)}</time><p className="mt-1 font-medium text-slate-900">{event.title}</p>{event.description ? <p className="mt-1 text-sm text-slate-600">{event.description}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No upcoming events.</p>}</div>
    </section>
  </main>;
}

async function getParentNotices(parentId: string) {
  const childClasses = await db.selectDistinct({ id: classes.id }).from(classes)
    .innerJoin(students, eq(classes.id, students.classId))
    .innerJoin(parentStudents, eq(students.id, parentStudents.studentId))
    .where(eq(parentStudents.parentUserId, parentId));
  const classIds = childClasses.map((item) => item.id);
  const individualNoticeIds = await db.select({ id: noticeRecipients.noticeId }).from(noticeRecipients).where(eq(noticeRecipients.userId, parentId));
  return db.select({ id: notices.id, title: notices.title, body: notices.body, createdAt: notices.createdAt }).from(notices)
    .where(or(eq(notices.audience, "all_parents"), ...(classIds.length ? [and(eq(notices.audience, "class"), inArray(notices.classId, classIds))] : []), ...(individualNoticeIds.length ? [and(eq(notices.audience, "individual"), inArray(notices.id, individualNoticeIds.map((row) => row.id)))] : [])))
    .orderBy(desc(notices.createdAt)).limit(3);
}

async function getUpcomingEvents(parentId: string) {
  const childClasses = await db.selectDistinct({ id: classes.id }).from(classes)
    .innerJoin(students, eq(classes.id, students.classId))
    .innerJoin(parentStudents, eq(students.id, parentStudents.studentId))
    .where(eq(parentStudents.parentUserId, parentId));
  const classIds = childClasses.map((item) => item.id);
  return db.select({ id: events.id, title: events.title, description: events.description, startsAt: events.startsAt }).from(events)
    .where(and(gt(events.startsAt, new Date()), or(eq(events.audience, "all_parents"), ...(classIds.length ? [and(eq(events.audience, "class"), inArray(events.classId, classIds))] : []))))
    .orderBy(asc(events.startsAt)).limit(3);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }).format(value);
}
