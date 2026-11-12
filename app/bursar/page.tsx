import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Suspense } from "react";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { classes, db, invoices, payments, students } from "@/lib/db";
import BursarDashboard, { type Debtor, type Payment } from "./bursar-dashboard";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bursar Dashboard",
};

async function getDashboardData() {
  const paidByInvoice = db
    .select({
      invoiceId: payments.invoiceId,
      amountPaid: sql<string>`sum(${payments.amount})`.as("amount_paid"),
    })
    .from(payments)
    .groupBy(payments.invoiceId)
    .as("paid_by_invoice");

  const [invoiceRows, paymentRows] = await Promise.all([
    db
      .select({
        studentId: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        className: classes.name,
        totalAmount: invoices.totalAmount,
        amountPaid: sql<string>`coalesce(${paidByInvoice.amountPaid}, 0)`,
      })
      .from(invoices)
      .innerJoin(students, eq(invoices.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .leftJoin(paidByInvoice, eq(paidByInvoice.invoiceId, invoices.id))
      .where(inArray(invoices.status, ["unpaid", "partial", "overdue"])),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidAt: payments.paidAt,
        firstName: students.firstName,
        lastName: students.lastName,
        className: classes.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(students, eq(invoices.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .orderBy(desc(payments.paidAt)),
  ]);

  const debtorsById = new Map<string, Debtor>();

  for (const invoice of invoiceRows) {
    const balance =
      Math.round(
        (Number(invoice.totalAmount) - Number(invoice.amountPaid)) * 100,
      ) / 100;

    if (balance <= 0) {
      continue;
    }

    const existing = debtorsById.get(invoice.studentId);

    if (existing) {
      existing.amountOwed += balance;
      continue;
    }

    debtorsById.set(invoice.studentId, {
      id: invoice.studentId,
      student: `${invoice.firstName} ${invoice.lastName}`,
      className: invoice.className,
      amountOwed: balance,
    });
  }

  const debtors = [...debtorsById.values()].sort(
    (a, b) => b.amountOwed - a.amountOwed,
  );

  const paymentList: Payment[] = paymentRows.map((payment) => ({
    id: payment.id,
    student: `${payment.firstName} ${payment.lastName}`,
    className: payment.className,
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(payment.paidAt),
    amount: Number(payment.amount),
  }));

  return { debtors, payments: paymentList };
}

async function BursarDashboardData() {
  const data = await getDashboardData();

  return <BursarDashboard debtors={data.debtors} payments={data.payments} />;
}

export default function BursarPage() {
  return (
    <div
      className={`${inter.variable} ${poppins.variable} flex min-h-screen flex-1 flex-col bg-white text-[#0B1F3A] [color-scheme:light] [font-family:var(--font-inter)]`}
    >
      <header className="relative bg-[#0B1F3A] print:hidden">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-[#C9A227]"
        />
        <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <span
            aria-hidden="true"
            className="mb-4 block h-1 w-12 rounded-full bg-[#C9A227]"
          />
          <h1
            className={`${poppins.className} text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl`}
          >
            Bursar Dashboard
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6 print:mx-0 print:max-w-none print:px-0 print:pb-0">
        <div className="relative z-10 -mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(11,31,58,0.35)] sm:-mt-10 sm:p-8 print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <Suspense fallback={null}>
            <BursarDashboardData />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
