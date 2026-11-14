import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { academicSessions, schoolSettings } from "@/lib/db/schema";
import { getFeeTotals, getInvoiceSummary } from "@/lib/fees/invoice";
import { formatNaira } from "@/lib/fees/format";
import { getLagosDate, isValidCalendarDate } from "@/lib/fees/date";
import { getFeeManagementSnapshot } from "@/lib/fees/repository";
import { FeeManagement } from "./fee-management";
import { BursarOperations, type DebtorRow, type PaymentRow } from "./bursar-operations";
import PermissionDenied from "../PermissionDenied";

export const metadata: Metadata = { title: "Bursar dashboard · Crown Heights Academy" };
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Term = "first" | "second" | "third";
const TERMS: Term[] = ["first", "second", "third"];

export default function BursarPage({ searchParams }: PageProps<"/dashboard/bursar">) {
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <Suspense fallback={<p className="text-sm text-slate-500">Loading bursar dashboard…</p>}><BursarPanel searchParams={searchParams} /></Suspense>
  </main>;
}

async function BursarPanel({ searchParams }: { searchParams: SearchParams }) {
  const gate = await requireRole("bursar", "admin");
  if (gate.status === "forbidden") return <PermissionDenied />;
  const params = await searchParams;
  const first = (key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];
  const [snapshot, sessions, settings] = await Promise.all([
    getFeeManagementSnapshot(),
    db.select({ name: academicSessions.name }).from(academicSessions).orderBy(desc(academicSessions.startsOn)),
    db.select({ session: schoolSettings.currentSession, term: schoolSettings.currentTerm }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1),
  ]);
  const current = settings[0];
  const availableSessions = sessions.map((row) => row.name);
  const session = availableSessions.includes(first("session") ?? "") ? first("session")! : current?.session ?? availableSessions[0] ?? "";
  const term = TERMS.includes(first("term") as Term) ? first("term") as Term : current?.term ?? "first";
  const search = (first("search") ?? "").trim().slice(0, 100);
  const selectedClass = first("class") ?? "";
  const sort = ["balance", "overdue", "student"].includes(first("sort") ?? "") ? first("sort")! : "balance";
  const candidateFrom = first("from") ?? "";
  const candidateTo = first("to") ?? "";
  const normalizedFrom = isValidCalendarDate(candidateFrom) ? candidateFrom : "";
  const normalizedTo = isValidCalendarDate(candidateTo) ? candidateTo : "";
  const invalidRange = normalizedFrom && normalizedTo && normalizedFrom > normalizedTo;
  const dateFrom = invalidRange ? "" : normalizedFrom;
  const dateTo = invalidRange ? "" : normalizedTo;

  const invoices = snapshot.invoices.filter((invoice) => invoice.session === session && invoice.term.toLowerCase() === term && invoice.status !== "cancelled");
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const periodPayments = snapshot.payments.filter((payment) => invoiceIds.has(payment.invoiceId));
  const totals = getFeeTotals(invoices, periodPayments);
  const summaries = invoices.map((invoice) => ({ invoice, summary: getInvoiceSummary(invoice, periodPayments) }));
  const overdue = summaries.filter(({ summary }) => summary.status === "overdue");
  const today = getLagosDate();
  const weekStart = startOfWeek(today);
  const successfulPayments = periodPayments.filter((payment) => payment.status === "success");
  const collectedToday = successfulPayments.filter((payment) => getLagosDate(new Date(payment.paidAt)) === today).reduce((sum, payment) => sum + payment.amount, 0);
  const collectedThisWeek = successfulPayments.filter((payment) => {
    const day = getLagosDate(new Date(payment.paidAt));
    return day >= weekStart && day <= today;
  }).reduce((sum, payment) => sum + payment.amount, 0);
  const collectionRate = totals.amountDue > 0 ? Math.round(totals.amountPaid / totals.amountDue * 1000) / 10 : 0;

  const parentByStudent = new Map<string, typeof snapshot.familyLinks>();
  for (const link of snapshot.familyLinks) parentByStudent.set(link.studentId, [...(parentByStudent.get(link.studentId) ?? []), link]);
  const debtorsByStudent = new Map<string, DebtorRow>();
  for (const { invoice, summary } of summaries) {
    if (summary.balance <= 0 || !invoice.student) continue;
    const existing = debtorsByStudent.get(invoice.studentId);
    const linkedParents = parentByStudent.get(invoice.studentId) ?? [];
    const overdueDays = summary.status === "overdue" ? daysBetween(invoice.dueDate, today) : 0;
    if (existing) {
      existing.balance += summary.balance;
      existing.invoiceCount += 1;
      existing.daysOverdue = Math.max(existing.daysOverdue, overdueDays);
    } else {
      debtorsByStudent.set(invoice.studentId, {
        studentId: invoice.studentId,
        student: `${invoice.student.firstName} ${invoice.student.lastName}`,
        className: invoice.student.className,
        parents: [...new Set(linkedParents.map((row) => row.parentName))].join(", "),
        parentEmails: [...new Set(linkedParents.map((row) => row.parentEmail))],
        invoiceCount: 1,
        balance: summary.balance,
        daysOverdue: overdueDays,
      });
    }
  }
  const allDebtors = [...debtorsByStudent.values()];
  const classes = [...new Set(allDebtors.map((row) => row.className))].sort((a, b) => a.localeCompare(b));
  const debtors = allDebtors.filter((row) => (!selectedClass || row.className === selectedClass) && (!search || `${row.student} ${row.className} ${row.parents} ${row.parentEmails.join(" ")}`.toLowerCase().includes(search.toLowerCase())));
  debtors.sort(sort === "student" ? (a, b) => a.student.localeCompare(b.student) : sort === "overdue" ? (a, b) => b.daysOverdue - a.daysOverdue || b.balance - a.balance : (a, b) => b.balance - a.balance);

  const outstandingByClass = new Map<string, number>();
  for (const debtor of allDebtors) outstandingByClass.set(debtor.className, (outstandingByClass.get(debtor.className) ?? 0) + debtor.balance);
  const paymentsForList: PaymentRow[] = periodPayments.filter((payment) => {
    const day = getLagosDate(new Date(payment.paidAt));
    const studentName = payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "";
    return (!dateFrom || day >= dateFrom) && (!dateTo || day <= dateTo)
      && (!selectedClass || payment.student?.className === selectedClass)
      && (!search || `${studentName} ${payment.student?.className ?? ""} ${payment.invoice?.invoiceNumber ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  }).map((payment) => ({
    id: payment.id,
    invoiceNumber: payment.invoice?.invoiceNumber ?? "Invoice",
    student: payment.student?.firstName ? `${payment.student.firstName} ${payment.student.lastName}` : "Student",
    className: payment.student?.className ?? "",
    amount: payment.amount,
    paidAt: payment.paidAt,
    method: payment.method,
    status: payment.status,
    receiptNumber: payment.receiptNumber,
  }));

  const managementInvoiceRows = snapshot.invoices.map((invoice) => {
    const summary = getInvoiceSummary(invoice, snapshot.payments);
    return {
    id: invoice.id, invoiceNumber: invoice.invoiceNumber,
    studentLabel: invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName} · ${invoice.student.className}` : "Student",
    amountDue: summary.amountDue, balance: summary.balance, dueDate: invoice.dueDate, session: invoice.session, term: invoice.term, status: summary.status,
    };
  });
  const managementPaymentRows = snapshot.payments.map((payment) => ({
    ...payment, invoiceNumber: payment.invoice?.invoiceNumber ?? "Invoice",
    studentLabel: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Student",
  }));
  const familyMap = new Map<string, { parentName: string; children: Map<string, string> }>();
  for (const link of snapshot.familyLinks) {
    const family = familyMap.get(link.parentId) ?? { parentName: link.parentName, children: new Map<string, string>() };
    family.children.set(link.studentId, `${link.studentName} · ${link.className}`);
    familyMap.set(link.parentId, family);
  }
  const families = [...familyMap.entries()].map(([id, family]) => {
    const studentIds = new Set([...family.children.keys()]);
    const familyInvoices = snapshot.invoices.filter((invoice) => studentIds.has(invoice.studentId));
    return { id, parentName: family.parentName, children: [...family.children.values()], ...getFeeTotals(familyInvoices, snapshot.payments) };
  });

  const csvParams = new URLSearchParams({ session, term, search, sort, from: dateFrom, to: dateTo });
  if (selectedClass) csvParams.set("class", selectedClass);
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">Finance</p><h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F] sm:text-3xl">Bursar dashboard</h1><p className="mt-1 text-sm text-slate-600">{gate.user.name} · {session} · {term} term</p></header>

    <section aria-label="Fee metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: "Total billed", value: totals.amountDue }, { label: "Collected", value: totals.amountPaid }, { label: "Outstanding", value: totals.balance }, { label: "Collection rate", display: `${collectionRate}%` },
        { label: "Overdue balance", value: overdue.reduce((sum, row) => sum + row.summary.balance, 0), hint: `${overdue.length} invoices` }, { label: "Collected today", value: collectedToday }, { label: "Collected this week", value: collectedThisWeek },
      ].map((metric) => <article key={metric.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"><p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{metric.label}</p><p className="mt-2 break-words text-base font-bold tabular-nums text-[#12264F] sm:text-xl">{metric.display ?? formatNaira(metric.value ?? 0)}</p>{metric.hint ? <p className="mt-1 text-xs text-slate-500">{metric.hint}</p> : null}</article>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Outstanding by class</h2>{outstandingByClass.size ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[...outstandingByClass].sort((a, b) => b[1] - a[1]).map(([name, amount]) => <div key={name} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{name}</span><strong>{formatNaira(amount)}</strong></div>)}</div> : <p className="mt-2 text-sm text-slate-600">No outstanding balances in this period.</p>}</section>

    <BursarOperations session={session} sessions={availableSessions} term={term} search={search} className={selectedClass} sort={sort} dateFrom={dateFrom} dateTo={dateTo} classes={classes} debtors={debtors} payments={paymentsForList} />
    <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">Manage invoices and manual payments</summary><div className="mt-5"><FeeManagement students={snapshot.students} invoices={managementInvoiceRows} payments={managementPaymentRows} families={families} today={today} /></div></details>
  </div>;
}

function startOfWeek(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000));
}
