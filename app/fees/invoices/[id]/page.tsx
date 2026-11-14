import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatDate, formatDateTime, formatNaira } from "@/lib/fees/format";
import {
  getInvoiceLineItems,
  getInvoiceSummary,
  getPaidPercentage,
} from "@/lib/fees/invoice";
import {
  getCurrentParent,
  getInvoiceForParent,
  getStudentById,
  listPaymentsForInvoice,
} from "@/lib/fees/repository";
import { PaymentForm } from "../../_components/payment-form";
import { StatusBadge } from "../../_components/status-badge";
import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata: Metadata = {
  title: "Invoice | Crown Heights Academy",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-xl px-5 py-8"><PermissionDenied /></main>;
  await connection();

  const { id } = await params;
  const parent = await getCurrentParent();
  const invoice = await getInvoiceForParent(parent.id, id);

  if (!invoice) {
    notFound();
  }

  const student = await getStudentById(invoice.studentId);

  if (!student) {
    notFound();
  }

  const payments = await listPaymentsForInvoice(invoice.id);
  const summary = getInvoiceSummary(invoice, payments);
  const paidPercentage = getPaidPercentage(invoice, payments);
  const lineItems = getInvoiceLineItems(invoice, payments);
  const overdue = summary.status === "overdue";
  const latestSuccessfulPayment = payments.find((payment) => payment.status === "success");

  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/fees/invoices"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {invoice.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {student.fullName} · {student.className} ·{" "}
              {student.admissionNumber}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge status={summary.status} />
            <Link
              href={`/fees/invoices/${invoice.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0b1f3a] transition-colors hover:bg-slate-100"
            >
              Download invoice
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {invoice.session} · {invoice.term} · Issued{" "}
          {formatDate(invoice.issuedAt)} ·{" "}
          <span className={overdue ? "font-semibold text-rose-700" : ""}>
            Due {formatDate(invoice.dueDate)}
            {overdue ? " (overdue)" : ""}
          </span>
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount billed
            </dt>
            <dd className="mt-1 text-xl font-bold text-slate-950">
              {formatNaira(summary.amountDue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount paid
            </dt>
            <dd className="mt-1 text-xl font-bold text-emerald-700">
              {formatNaira(summary.amountPaid)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Balance to pay
            </dt>
            <dd className="mt-1 text-xl font-bold text-slate-950">
              {formatNaira(summary.balance)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Due date
            </dt>
            <dd
              className={`mt-1 text-xl font-bold ${
                overdue ? "text-rose-700" : "text-slate-950"
              }`}
            >
              {formatDate(invoice.dueDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700">
            Paid so far: {paidPercentage}%
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0b1f3a]"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">Fee breakdown</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every item on this invoice and whether it has been paid.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-semibold">Fee item</th>
                <th className="py-3 pr-4 font-semibold">Category</th>
                <th className="py-3 pr-4 text-right font-semibold">
                  Amount (in naira)
                </th>
                <th className="py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((lineItem) => (
                <tr key={lineItem.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {lineItem.item}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {lineItem.category}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-slate-950">
                    {formatNaira(lineItem.amount)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        lineItem.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}
                    >
                      {lineItem.status === "paid" ? "Paid" : "Not paid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200">
              <tr>
                <td
                  colSpan={2}
                  className="py-3 pr-4 text-sm font-semibold text-slate-700"
                >
                  Total
                </td>
                <td className="py-3 pr-4 text-right text-base font-bold text-slate-950">
                  {formatNaira(summary.amountDue)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">Payment history</h2>
          <p className="mt-1 text-sm text-slate-600">
            Payment attempts for this invoice. Only successful payments reduce the balance.
          </p>

          {payments.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No payment has been made on this invoice yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatNaira(payment.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(payment.paidAt)} · {payment.method.replaceAll("_", " ")} · {payment.status}
                    </p>
                  </div>
                  {payment.status === "success" ? (
                    <Link
                      href={`/fees/receipts/${payment.id}`}
                      className="text-sm font-semibold text-[#0b1f3a] underline decoration-[#c9a227] decoration-2 underline-offset-4 hover:text-[#132f55]"
                    >
                      {payment.receiptNumber}
                    </Link>
                  ) : <span className="text-xs font-medium capitalize text-slate-500">{payment.status}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-950">
            {summary.balance > 0 ? "Pay the balance" : summary.status === "cancelled" ? "Invoice cancelled" : "Invoice settled"}
          </h2>

          {summary.balance > 0 ? (
            <>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Pay the current outstanding balance securely through Paystack.
              </p>
              <div className="mt-4">
                <PaymentForm
                  invoiceId={invoice.id}
                  balance={summary.balance}
                />
              </div>
            </>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {summary.status === "cancelled" ? "This invoice was cancelled and is not payable." : "All fees are paid. Thank you!"}
              </p>
              {latestSuccessfulPayment ? (
                <Link
                  href={`/fees/receipts/${latestSuccessfulPayment.id}`}
                  className="inline-block rounded-xl bg-[#0b1f3a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#132f55]"
                >
                  View latest receipt
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
