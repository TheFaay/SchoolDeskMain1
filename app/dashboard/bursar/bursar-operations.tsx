"use client";

import { useActionState } from "react";
import { formatDateTime, formatNaira } from "@/lib/fees/format";
import { sendReminderAction, type ReminderState } from "./reminders";

export type DebtorRow = {
  studentId: string;
  student: string;
  className: string;
  parents: string;
  parentEmails: string[];
  invoiceCount: number;
  balance: number;
  daysOverdue: number;
};

export type PaymentRow = {
  id: string;
  invoiceNumber: string;
  student: string;
  className: string;
  amount: number;
  paidAt: string;
  method: string;
  status: string;
  receiptNumber: string;
};

const fieldClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900";

function ReminderFeedback({ state }: { state: ReminderState }) {
  if (!state) return null;
  return <p role={state.error ? "alert" : "status"} className={`mt-3 text-sm ${state.error ? "text-rose-700" : "text-emerald-700"}`}>{state.error ?? state.message}</p>;
}

export function BursarOperations({
  session, sessions, term, search, className, sort, dateFrom, dateTo, classes, debtors, payments,
}: {
  session: string; sessions: string[]; term: string; search: string; className: string; sort: string; dateFrom: string; dateTo: string;
  classes: string[]; debtors: DebtorRow[]; payments: PaymentRow[];
}) {
  const [state, action, pending] = useActionState(sendReminderAction, null);
  return <div className="space-y-7">
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <form method="get" action="/dashboard/bursar" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Session<select className={fieldClass} name="session" defaultValue={session}>{sessions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Term<select className={fieldClass} name="term" defaultValue={term}><option value="first">First term</option><option value="second">Second term</option><option value="third">Third term</option></select></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Search students / parents<input className={fieldClass} name="search" defaultValue={search} placeholder="Name or invoice" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Class<select className={fieldClass} name="class" defaultValue={className}><option value="">All classes</option>{classes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Sort debtors<select className={fieldClass} name="sort" defaultValue={sort}><option value="balance">Highest balance</option><option value="overdue">Longest overdue</option><option value="student">Student name</option></select></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Payments from<input className={fieldClass} name="from" type="date" defaultValue={dateFrom} /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Payments to<input className={fieldClass} name="to" type="date" defaultValue={dateTo} /></label>
        <div className="flex items-end"><button className="min-h-11 rounded-lg bg-[#12264F] px-5 text-sm font-semibold text-white hover:bg-[#0d1b3a]">Apply filters</button></div>
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-[#12264F]">Outstanding balances</h2><p className="mt-1 text-sm text-slate-600">{debtors.length} matching students</p></div><a className="text-sm font-semibold text-[#12264F] underline decoration-[#C9A227] underline-offset-4" href={exportUrl("debtors", session, term, search, className, sort, dateFrom, dateTo)}>Export debtors CSV</a></div>
      <form action={action} className="p-5"><input type="hidden" name="session" value={session} /><input type="hidden" name="term" value={term} />
        {debtors.length === 0 ? <p className="text-sm text-slate-600">No matching outstanding balances.</p> : <>
          <ul className="space-y-3 lg:hidden">
            {debtors.map((row) => <li key={row.studentId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold text-slate-900">{row.student}</p><p className="mt-1 text-sm text-slate-600">{row.className} · {row.invoiceCount} {row.invoiceCount === 1 ? "invoice" : "invoices"}</p></div>
                <p className="shrink-0 text-right font-semibold tabular-nums text-[#12264F]">{formatNaira(row.balance)}<span className={`mt-1 block text-xs font-normal ${row.daysOverdue ? "text-red-700" : "text-slate-500"}`}>{row.daysOverdue ? `${row.daysOverdue} days overdue` : "Not overdue"}</span></p>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-sm"><p className="font-medium text-slate-700">{row.parents || "No linked parent"}</p>{row.parentEmails.map((email) => <a key={email} className="mt-1 block break-all text-sm text-[#12264F] underline" href={`mailto:${email}`}>{email}</a>)}</div>
              <label className="mt-3 flex min-h-11 items-center gap-2 border-t border-slate-100 pt-3 text-sm font-medium text-slate-700"><input aria-label={`Select ${row.student} for reminder`} type="checkbox" name="studentId" value={row.studentId} className="h-5 w-5 accent-[#12264F]" />Select for reminder</label>
            </li>)}
          </ul>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 px-3 py-3"><span className="sr-only">Select</span></th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Parent contact</th><th className="px-3 py-3 text-right">Invoices</th><th className="px-3 py-3 text-right">Balance</th><th className="px-3 py-3 text-right">Days overdue</th></tr></thead><tbody className="divide-y divide-slate-100">{debtors.map((row) => <tr key={row.studentId}><td className="px-3 py-3"><input aria-label={`Select ${row.student} for reminder`} type="checkbox" name="studentId" value={row.studentId} className="h-4 w-4 accent-[#12264F]" /></td><td className="px-3 py-3 font-medium text-slate-900">{row.student}</td><td className="px-3 py-3">{row.className}</td><td className="px-3 py-3"><p>{row.parents || "No linked parent"}</p>{row.parentEmails.map((email) => <a key={email} className="block text-xs text-[#12264F] underline" href={`mailto:${email}`}>{email}</a>)}</td><td className="px-3 py-3 text-right">{row.invoiceCount}</td><td className="px-3 py-3 text-right font-semibold">{formatNaira(row.balance)}</td><td className={`px-3 py-3 text-right ${row.daysOverdue ? "font-semibold text-red-700" : "text-slate-500"}`}>{row.daysOverdue || "—"}</td></tr>)}</tbody></table></div>
        </>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button disabled={pending || debtors.length === 0} className="min-h-11 rounded-lg bg-[#12264F] px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Sending…" : "Send reminder to selected"}</button><p className="text-xs text-slate-500">One reminder per parent and child per day. Reminders go to the parent account email.</p></div><ReminderFeedback state={state} />
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-[#12264F]">Payments</h2><p className="mt-1 text-sm text-slate-600">{payments.length} matching payment records, including pending and failed payments</p></div><a className="text-sm font-semibold text-[#12264F] underline decoration-[#C9A227] underline-offset-4" href={exportUrl("payments", session, term, search, className, sort, dateFrom, dateTo)}>Export payments CSV</a></div>
      {payments.length === 0 ? <p className="p-5 text-sm text-slate-600">No payments match the selected filters.</p> : <>
        <ul className="space-y-3 p-4 lg:hidden">
          {payments.map((payment) => <li key={payment.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{payment.student}</p><p className="text-sm text-slate-600">{payment.className} · {payment.invoiceNumber}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${payment.status === "success" ? "bg-emerald-50 text-emerald-800" : payment.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>{payment.status}</span></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><dt className="text-xs text-slate-500">Date</dt><dd className="mt-1">{formatDateTime(payment.paidAt)}</dd></div><div><dt className="text-xs text-slate-500">Method</dt><dd className="mt-1 capitalize">{payment.method.replaceAll("_", " ")}</dd></div><div><dt className="text-xs text-slate-500">Amount</dt><dd className="mt-1 font-semibold tabular-nums">{formatNaira(payment.amount)}</dd></div><div><dt className="text-xs text-slate-500">Receipt</dt><dd className="mt-1">{payment.status === "success" && payment.receiptNumber ? <a className="font-medium text-[#12264F] underline" href={`/fees/receipts/${payment.id}`}>{payment.receiptNumber}</a> : "Not issued"}</dd></div></dl>
          </li>)}
        </ul>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date / receipt</th><th className="px-4 py-3">Student / invoice</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3">{payment.status === "success" && payment.receiptNumber ? <a className="font-medium text-[#12264F] underline" href={`/fees/receipts/${payment.id}`}>{payment.receiptNumber}</a> : <span>{formatDateTime(payment.paidAt)}</span>}<p className="text-xs text-slate-500">{formatDateTime(payment.paidAt)}</p></td><td className="px-4 py-3"><p className="font-medium">{payment.student} · {payment.className}</p><p className="text-xs text-slate-500">{payment.invoiceNumber}</p></td><td className="px-4 py-3 capitalize">{payment.method.replaceAll("_", " ")}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payment.status === "success" ? "bg-emerald-50 text-emerald-800" : payment.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>{payment.status}</span></td><td className="px-4 py-3 text-right font-semibold">{formatNaira(payment.amount)}</td></tr>)}</tbody></table></div>
      </>}
    </section>
  </div>;
}

function exportUrl(type: string, session: string, term: string, search: string, className: string, sort: string, dateFrom: string, dateTo: string) {
  const params = new URLSearchParams({ type, session, term, search, sort, from: dateFrom, to: dateTo });
  if (className) params.set("class", className);
  return `/dashboard/bursar/export?${params}`;
}
