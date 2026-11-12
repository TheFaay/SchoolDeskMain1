import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatDate, formatNaira } from "@/lib/fees/format";
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
import { PrintButton } from "../../../_components/print-button";

export const metadata: Metadata = {
  title: "Invoice (print) | Crown Heights Academy",
};

export default async function PrintableInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  return (
    <div className="space-y-6">
      <section className="print:hidden">
        <Link
          href={`/fees/invoices/${invoice.id}`}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to invoice
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Printable invoice
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {student.fullName} · {invoice.title}
            </p>
          </div>
          <PrintButton label="Print or save as PDF" />
        </div>
      </section>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-[#c9a227] bg-[#0b1f3a] px-5 py-5 text-white sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c94a]">
              Crown Heights Academy
            </p>
            <p className="mt-1 text-xl font-bold">Fee invoice</p>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Sample invoice
          </span>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Invoice number
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {invoice.id.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Issued date
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {formatDate(invoice.issuedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Parent
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {parent.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Student
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {student.fullName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Class
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {student.className}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Admission number
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {student.admissionNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Session
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {invoice.session} · {invoice.term}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Due date
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
          </dl>

          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount billed
              </dt>
              <dd className="mt-1 text-lg font-bold text-slate-950">
                {formatNaira(summary.amountDue)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount paid
              </dt>
              <dd className="mt-1 text-lg font-bold text-emerald-700">
                {formatNaira(summary.amountPaid)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Balance to pay
              </dt>
              <dd className="mt-1 text-lg font-bold text-slate-950">
                {formatNaira(summary.balance)}
              </dd>
            </div>
          </dl>

          <p className="text-sm font-semibold text-slate-700">
            Paid so far: {paidPercentage}%
          </p>

          <div className="overflow-x-auto">
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
                    <td className="py-3 font-semibold text-slate-950">
                      {lineItem.status === "paid" ? "Paid" : "Not paid"}
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

          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            This is a sample invoice for testing. No real student data is used.
          </p>
        </div>
      </article>
    </div>
  );
}
