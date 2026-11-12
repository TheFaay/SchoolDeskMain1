import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatDate, formatDateTime, formatNaira } from "@/lib/fees/format";
import {
  getCurrentParent,
  getInvoiceById,
  getPaymentForParent,
  getStudentById,
} from "@/lib/fees/repository";
import { PrintButton } from "../../_components/print-button";

export const metadata: Metadata = {
  title: "Receipt | Crown Heights Academy",
};

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  await connection();

  const { id } = await params;
  const { paid } = await searchParams;
  const parent = await getCurrentParent();
  const payment = await getPaymentForParent(parent.id, id);

  if (!payment) {
    notFound();
  }

  const invoice = await getInvoiceById(payment.invoiceId);

  if (!invoice) {
    notFound();
  }

  const student = await getStudentById(invoice.studentId);

  if (!student) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden">
        <Link
          href="/fees/receipts"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to receipts
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Receipt {payment.receiptNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {student.fullName} · {invoice.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <Link
              href={`/fees/invoices/${invoice.id}`}
              className="rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#132f55]"
            >
              View invoice
            </Link>
          </div>
        </div>
      </section>

      {paid === "1" ? (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 print:hidden"
        >
          Payment received. Your receipt is on its way.
        </p>
      ) : null}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-[#c9a227] bg-[#0b1f3a] px-5 py-5 text-white sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c94a]">
              Crown Heights Academy
            </p>
            <p className="mt-1 text-xl font-bold">School fees receipt</p>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Test payment
          </span>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Receipt number
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {payment.receiptNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment date
              </dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {formatDateTime(payment.paidAt)}
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
          </dl>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">
                      {invoice.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {invoice.session} · {invoice.term} · Due{" "}
                      {formatDate(invoice.dueDate)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-slate-950">
                    {formatNaira(payment.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Amount paid
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-slate-950">
                    {formatNaira(payment.amount)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Balance after this payment
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">
                    {formatNaira(payment.balanceAfter)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment reference
              </dt>
              <dd className="mt-1 font-mono text-xs font-semibold text-slate-950">
                {payment.reference}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Successful test payment
                </span>
              </dd>
            </div>
          </dl>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <span className="font-semibold">Test receipt.</span> This payment was
            simulated for testing. No real money was collected.
          </p>
        </div>
      </article>
    </div>
  );
}
