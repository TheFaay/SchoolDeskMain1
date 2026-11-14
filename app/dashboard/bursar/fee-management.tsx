"use client";

import { useActionState } from "react";
import { formatDate, formatDateTime, formatNaira } from "@/lib/fees/format";
import type { InvoiceStatus, Payment } from "@/lib/fees/types";
import { StatusBadge } from "@/app/fees/_components/status-badge";
import {
  cancelInvoiceAction,
  createInvoiceAction,
  manualPaymentAction,
  type FeeActionState,
} from "./actions";

type StudentOption = { id: string; label: string };
type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  studentLabel: string;
  amountDue: number;
  balance: number;
  dueDate: string;
  session: string;
  term: string;
  status: InvoiceStatus;
};
type PaymentRow = Payment & { invoiceNumber: string; studentLabel: string };
type FamilyRow = { id: string; parentName: string; children: string[]; amountDue: number; amountPaid: number; balance: number };

const fieldClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0b1f3a] focus:ring-2 focus:ring-[#0b1f3a]/20";
const buttonClass = "rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#132f55] disabled:opacity-60";

function ActionFeedback({ state }: { state: FeeActionState }) {
  if (!state) return null;
  const success = Boolean(state.success);
  return <p role={success ? "status" : "alert"} className={`mt-3 text-sm ${success ? "text-emerald-700" : "text-rose-700"}`}>{state.success ?? state.error}</p>;
}

function InvoiceForm({ students, today }: { students: StudentOption[]; today: string }) {
  const [state, action, pending] = useActionState(createInvoiceAction, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">Student
        <select className={fieldClass} name="studentId" required defaultValue="">
          <option value="" disabled>Select a student</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">Fee template
        <select className={fieldClass} name="template" defaultValue="term">
          <option value="term">Term fees · tuition and learning materials</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">Invoice title
        <input className={fieldClass} name="title" required maxLength={120} defaultValue="School fees" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Tuition (₦)
          <input className={fieldClass} name="tuitionAmount" type="number" min="0.01" step="0.01" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Learning materials (₦)
          <input className={fieldClass} name="materialsAmount" type="number" min="0.01" step="0.01" required />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Due date
        <input className={fieldClass} name="dueDate" type="date" min={today} required />
      </label>
      <button className={buttonClass} disabled={pending || students.length === 0} type="submit">{pending ? "Creating…" : "Create invoice"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ManualPaymentForm({ invoices }: { invoices: InvoiceRow[] }) {
  const [state, action, pending] = useActionState(manualPaymentAction, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">Invoice
        <select className={fieldClass} name="invoiceId" required defaultValue="">
          <option value="" disabled>Select an outstanding invoice</option>
          {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {invoice.studentLabel} · {formatNaira(invoice.balance)} due</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Amount (₦)
          <input className={fieldClass} name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">Method
          <select className={fieldClass} name="method" required defaultValue="cash">
            <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Payment reference
        <input className={fieldClass} name="reference" maxLength={100} required />
      </label>
      <button className={buttonClass} disabled={pending || invoices.length === 0} type="submit">{pending ? "Recording…" : "Record payment"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

function CancelInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const boundAction = cancelInvoiceAction.bind(null, invoiceId);
  const [state, action, pending] = useActionState(boundAction, null);
  return (
    <form action={action} className="text-right">
      <button className="text-xs font-semibold text-rose-700 underline underline-offset-2 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Cancelling…" : "Cancel invoice"}</button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function FeeManagement({
  students,
  invoices,
  payments,
  families,
  today,
}: {
  students: StudentOption[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  families: FamilyRow[];
  today: string;
}) {
  const payable = invoices.filter((invoice) => invoice.balance > 0 && invoice.status !== "cancelled");
  const recentSuccessfulPayments = payments.filter((payment) => payment.status === "success").slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Create invoice</h2>
          <InvoiceForm students={students} today={today} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Record a manual payment</h2>
          <ManualPaymentForm invoices={payable} />
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-950">Family fee totals</h2><p className="mt-1 text-sm text-slate-600">Compare a parent&apos;s totals with the combined figures on their portal.</p></div>
        {families.length === 0 ? <p className="p-5 text-sm text-slate-600">No parent accounts are linked to students yet.</p> : <>
          <ul className="space-y-3 p-4 lg:hidden">{families.map((family) => <li key={family.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{family.parentName}</p><p className="mt-1 text-xs text-slate-500">{family.children.join(", ")}</p><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><dt className="text-xs text-slate-500">Billed</dt><dd className="mt-1 font-medium tabular-nums">{formatNaira(family.amountDue)}</dd></div><div><dt className="text-xs text-slate-500">Paid</dt><dd className="mt-1 font-medium tabular-nums">{formatNaira(family.amountPaid)}</dd></div><div><dt className="text-xs text-slate-500">Balance</dt><dd className="mt-1 font-semibold tabular-nums">{formatNaira(family.balance)}</dd></div></dl></li>)}</ul>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Parent / children</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{families.map((family) => <tr key={family.id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{family.parentName}</p><p className="text-xs text-slate-500">{family.children.join(", ")}</p></td><td className="px-4 py-3 text-right">{formatNaira(family.amountDue)}</td><td className="px-4 py-3 text-right">{formatNaira(family.amountPaid)}</td><td className="px-4 py-3 text-right font-semibold">{formatNaira(family.balance)}</td></tr>)}</tbody></table></div>
        </>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-950">Invoices</h2><p className="mt-1 text-sm text-slate-600">Balances include successful payments only. Cancelled invoices are excluded from totals.</p></div>
        {invoices.length === 0 ? <p className="p-5 text-sm text-slate-600">No invoices yet.</p> : (
          <>
          <ul className="space-y-3 p-4 lg:hidden">{invoices.map((invoice) => <li key={invoice.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p><p className="mt-1 text-sm text-slate-600">{invoice.studentLabel}</p></div><StatusBadge status={invoice.status} /></div><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm"><div><dt className="text-xs text-slate-500">Session · term</dt><dd className="mt-1">{invoice.session} · {invoice.term}</dd></div><div><dt className="text-xs text-slate-500">Due</dt><dd className="mt-1">{formatDate(invoice.dueDate)}</dd></div><div><dt className="text-xs text-slate-500">Billed</dt><dd className="mt-1 tabular-nums">{formatNaira(invoice.amountDue)}</dd></div><div><dt className="text-xs text-slate-500">Balance</dt><dd className="mt-1 font-semibold tabular-nums">{formatNaira(invoice.balance)}</dd></div></dl>{invoice.status !== "cancelled" ? <div className="mt-3 border-t border-slate-100 pt-3"><CancelInvoiceForm invoiceId={invoice.id} /></div> : null}</li>)}</ul>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Invoice / student</th><th className="px-4 py-3">Session · term</th><th className="px-4 py-3">Due</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => <tr key={invoice.id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p><p className="text-xs text-slate-500">{invoice.studentLabel}</p></td>
              <td className="px-4 py-3">{invoice.session} · {invoice.term}</td><td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
              <td className="px-4 py-3 text-right">{formatNaira(invoice.amountDue)}</td><td className="px-4 py-3 text-right font-semibold">{formatNaira(invoice.balance)}</td>
              <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td><td className="px-4 py-3">{invoice.status !== "cancelled" ? <CancelInvoiceForm invoiceId={invoice.id} /> : null}</td>
            </tr>)}</tbody>
          </table></div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-950">Recent successful payments</h2></div>
        {recentSuccessfulPayments.length === 0 ? <p className="p-5 text-sm text-slate-600">No successful payments yet.</p> : <ul className="divide-y divide-slate-100">{recentSuccessfulPayments.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-slate-900">{payment.invoiceNumber} · {payment.studentLabel}</p><p className="text-xs capitalize text-slate-500">{payment.method.replaceAll("_", " ")} · {payment.reference} · {formatDateTime(payment.paidAt)}</p></div><p className="font-bold text-slate-950">{formatNaira(payment.amount)}</p></li>)}</ul>}
      </section>
    </div>
  );
}
