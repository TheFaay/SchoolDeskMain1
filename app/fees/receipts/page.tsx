import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { formatDate, formatNaira } from "@/lib/fees/format";
import {
  getCurrentParent,
  getStudentsForParent,
  listInvoicesForParent,
  listPaymentsForParent,
} from "@/lib/fees/repository";
import { koboToNaira, nairaToKobo } from "@/lib/fees/invoice";
import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata: Metadata = {
  title: "Receipts | Crown Heights Academy",
};

export default async function ReceiptsPage() {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-xl px-5 py-8"><PermissionDenied /></main>;
  await connection();

  const parent = await getCurrentParent();
  const students = await getStudentsForParent(parent.id);
  const invoices = await listInvoicesForParent(parent.id);
  const payments = await listPaymentsForParent(parent.id);

  const successfulPayments = payments.filter((payment) => payment.status === "success");
  const receipts = successfulPayments.flatMap((payment) => {
    const invoice = invoices.find((item) => item.id === payment.invoiceId);
    const student = students.find((item) => item.id === invoice?.studentId);

    return invoice && student ? [{ payment, invoice, student }] : [];
  });

  const totalPaid = koboToNaira(successfulPayments.reduce((total, payment) => total + nairaToKobo(payment.amount), 0));

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
          Receipts
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Every successful payment gets a receipt. Open one to print it or
          check the balance after that payment.
        </p>
        <p className="mt-3 inline-block rounded-full bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#7a5c0f] ring-1 ring-inset ring-[#c9a227]/30">
          {receipts.length} receipt{receipts.length === 1 ? "" : "s"} ·{" "}
          {formatNaira(totalPaid)} paid in total
        </p>
      </section>

      {receipts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No receipts yet. Make a test payment on an invoice to create one.
        </p>
      ) : (
        <ul className="space-y-3">
          {receipts.map(({ payment, invoice, student }) => (
            <li key={payment.id}>
              <Link
                href={`/fees/receipts/${payment.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-950">
                      {payment.receiptNumber}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {student.fullName} · {student.className}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {invoice.title} · {formatDate(payment.paidAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-950">
                      {formatNaira(payment.amount)}
                    </p>
                    <p className="mt-0.5 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                      {payment.method.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0b1f3a]">
                  View receipt →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
