import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { formatDate, formatNaira } from "@/lib/fees/format";
import { getFeeTotals, getInvoiceSummary } from "@/lib/fees/invoice";
import {
  getCurrentParent,
  getStudentsForParent,
  listInvoicesForParent,
  listPaymentsForParent,
} from "@/lib/fees/repository";
import { StatusBadge } from "./_components/status-badge";
import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata: Metadata = {
  title: "Fees and payments | Crown Height Academy",
};

export default async function FeesOverviewPage() {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-xl px-5 py-8"><PermissionDenied /></main>;
  await connection();

  const parent = await getCurrentParent();
  const students = await getStudentsForParent(parent.id);
  const invoices = await listInvoicesForParent(parent.id);
  const payments = await listPaymentsForParent(parent.id);
  const totals = getFeeTotals(invoices, payments);

  const summaryCards = [
    {
      label: "Total billed",
      value: formatNaira(totals.amountDue),
      hint: `${invoices.filter((invoice) => invoice.status !== "cancelled").length} invoices`,
    },
    {
      label: "Total paid",
      value: formatNaira(totals.amountPaid),
      hint: `${payments.filter((payment) => payment.status === "success").length} successful payments`,
    },
    {
      label: "Balance to pay",
      value: formatNaira(totals.balance),
      hint: totals.amountDue === 0 ? "No billable invoices" : totals.balance > 0 ? "Needs attention" : "All fees are paid",
    },
  ];

  const recentReceipts = payments.filter((payment) => payment.status === "success").slice(0, 3).flatMap((payment) => {
    const invoice = invoices.find((item) => item.id === payment.invoiceId);
    const student = students.find((item) => item.id === invoice?.studentId);

    return invoice && student ? [{ payment, invoice, student }] : [];
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-[#9a7619]">
          Welcome, {parent.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Fees and payments
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          See what has been paid, what is part-paid, and what is still
          outstanding for your children.
        </p>
      </section>

      {totals.balance === 0 ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          All fees are paid. Thank you!
        </p>
      ) : null}

      <section
        aria-label="Fee summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {summaryCards.map((card, index) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 sm:p-5 ${
              `${index === 2 ? "border-[#c9a227]/40 bg-[#fffaf0]" : "border-slate-200 bg-white"} ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Your children</h2>
            <p className="text-sm text-slate-600">
              A quick look at each child&apos;s fee position.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {students.map((student) => {
            const childInvoices = invoices.filter(
              (invoice) => invoice.studentId === student.id,
            );
            const childTotals = getFeeTotals(childInvoices, payments);
            const statuses = childInvoices.map(
              (invoice) => getInvoiceSummary(invoice, payments).status,
            );
            const paidCount = statuses.filter(
              (status) => status === "paid",
            ).length;
            const partialCount = statuses.filter(
              (status) => status === "partial",
            ).length;
            const unpaidCount = statuses.filter(
              (status) => status === "unpaid" || status === "overdue",
            ).length;
            const cancelledCount = statuses.filter((status) => status === "cancelled").length;
            const nextInvoice = childInvoices.find(
              (invoice) => getInvoiceSummary(invoice, payments).balance > 0,
            );

            return (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {student.fullName}
                    </h3>
                    <p className="text-sm text-slate-500">{student.className}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {student.admissionNumber}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Balance to pay
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-950">
                    {formatNaira(childTotals.balance)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {childInvoices.length} invoice
                    {childInvoices.length === 1 ? "" : "s"} · {paidCount} paid,{" "}
                    {partialCount} part-paid, {unpaidCount} unpaid or overdue, {cancelledCount} cancelled
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {nextInvoice
                      ? `Next due: ${formatDate(nextInvoice.dueDate)}`
                      : "No outstanding invoice"}
                  </p>
                  <Link
                    href={`/fees/invoices#${student.id}`}
                    className="text-sm font-semibold text-[#0b1f3a] underline decoration-[#c9a227] decoration-2 underline-offset-4 hover:text-[#132f55]"
                  >
                    View invoices
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Recent receipts
            </h2>
            <p className="text-sm text-slate-600">
          Your latest successful payments.
            </p>
          </div>
          <Link
            href="/fees/receipts"
            className="text-sm font-semibold text-[#0b1f3a] underline decoration-[#c9a227] decoration-2 underline-offset-4 hover:text-[#132f55]"
          >
            All receipts
          </Link>
        </div>

        {recentReceipts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          No receipts yet. Successful payments will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {recentReceipts.map(({ payment, invoice, student }) => (
              <li key={payment.id}>
                <Link
                  href={`/fees/receipts/${payment.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {payment.receiptNumber} · {student.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {invoice.title} · {formatDate(payment.paidAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-950">
                    {formatNaira(payment.amount)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Invoice status at a glance
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Unpaid means no payment yet. Part-paid means some money has been
              paid. Paid means the balance is zero.
            </p>
          </div>
          <Link
            href="/fees/invoices"
            className="rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#132f55]"
          >
            View all invoices
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {invoices.slice(0, 5).map((invoice) => {
            const summary = getInvoiceSummary(invoice, payments);
            const student = students.find(
              (item) => item.id === invoice.studentId,
            );

            return (
              <Link
                key={invoice.id}
                href={`/fees/invoices/${invoice.id}`}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <span>{student?.fullName ?? "Student"}</span>
                <StatusBadge status={summary.status} />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
