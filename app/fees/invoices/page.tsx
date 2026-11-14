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
import { StatusBadge } from "../_components/status-badge";
import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata: Metadata = {
  title: "Invoices | Crown Heights Academy",
};

export default async function InvoicesPage() {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-xl px-5 py-8"><PermissionDenied /></main>;
  await connection();

  const parent = await getCurrentParent();
  const students = await getStudentsForParent(parent.id);
  const invoices = await listInvoicesForParent(parent.id);
  const payments = await listPaymentsForParent(parent.id);

  return (
    <div className="space-y-6">
      <section>
        <Link
          href="/fees"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Invoices
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Each invoice shows the full amount, what has been paid, and the
          remaining balance.
        </p>
      </section>

      {invoices.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          There are no invoices for this account yet.
        </p>
      ) : (
        <div className="space-y-8">
          {students.map((student) => {
            const childInvoices = invoices.filter(
              (invoice) => invoice.studentId === student.id,
            );
            const childTotals = getFeeTotals(childInvoices, payments);

            if (childInvoices.length === 0) {
              return null;
            }

            return (
              <section
                key={student.id}
                id={student.id}
                className="scroll-mt-6"
              >
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {student.fullName}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {student.className} · {student.admissionNumber}
                    </p>
                  </div>
                  <p className="rounded-full bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#7a5c0f] ring-1 ring-inset ring-[#c9a227]/30">
                    Balance to pay: {formatNaira(childTotals.balance)}
                  </p>
                </div>

                <ul className="space-y-3">
                  {childInvoices.map((invoice) => {
                    const summary = getInvoiceSummary(invoice, payments);

                    return (
                      <li key={invoice.id}>
                        <Link
                          href={`/fees/invoices/${invoice.id}`}
                          className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-bold text-slate-950">
                                {invoice.title}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-500">
                                {invoice.session} · {invoice.term} · Due{" "}
                                {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                            <StatusBadge status={summary.status} />
                          </div>

                          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-sm">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Billed
                              </dt>
                              <dd className="mt-1 font-semibold text-slate-900">
                                {formatNaira(summary.amountDue)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Paid
                              </dt>
                              <dd className="mt-1 font-semibold text-emerald-700">
                                {formatNaira(summary.amountPaid)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Balance to pay
                              </dt>
                              <dd className="mt-1 font-semibold text-slate-950">
                                {formatNaira(summary.balance)}
                              </dd>
                            </div>
                          </dl>

                          <p className="mt-3 text-sm font-semibold text-[#0b1f3a]">
                            {summary.balance > 0
                              ? "View invoice and pay →"
                              : summary.status === "cancelled"
                                ? "View cancelled invoice →"
                                : "View paid invoice →"}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
