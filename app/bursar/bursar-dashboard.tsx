"use client";

import { useState } from "react";

export type Debtor = {
  id: string;
  student: string;
  className: string;
  amountOwed: number;
};

export type Payment = {
  id: string;
  student: string;
  className: string;
  date: string;
  amount: number;
};

type BursarDashboardProps = {
  debtors: Debtor[];
  payments: Payment[];
};

const headingStyle = { fontFamily: "var(--font-poppins)" };

const primaryButtonClasses =
  "inline-flex h-12 items-center justify-center rounded-xl bg-[#0B1F3A] px-8 text-base font-semibold text-white shadow-sm transition hover:bg-[#14315C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 active:scale-[0.99]";

const secondaryButtonClasses =
  "inline-flex h-12 items-center justify-center rounded-xl border-2 border-[#0B1F3A] bg-white px-6 text-base font-semibold text-[#0B1F3A] transition hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 active:scale-[0.99]";

function formatNaira(amount: number) {
  const formatted = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(amount);

  return `₦${formatted}`;
}

function csvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function createDebtorsCsv(debtors: Debtor[]) {
  const header = ["Student", "Class", "Amount owed"];
  const rows = debtors.map((debtor) => [
    debtor.student,
    debtor.className,
    String(debtor.amountOwed),
  ]);

  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export default function BursarDashboard({
  debtors,
  payments,
}: BursarDashboardProps) {
  const [reminderCount, setReminderCount] = useState<number | null>(null);

  const totalCollected = payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const outstanding = debtors.reduce(
    (total, debtor) => total + debtor.amountOwed,
    0,
  );

  function handleSendReminder() {
    setReminderCount(debtors.length);
  }

  function handleExportList() {
    const blob = new Blob([createDebtorsCsv(debtors)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "debtors.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
          <p className="text-sm font-medium text-[#475569]">Total collected</p>
          <p
            className="mt-1 text-3xl font-semibold tracking-tight text-[#0B1F3A] tabular-nums"
            style={headingStyle}
          >
            {formatNaira(totalCollected)}
          </p>
        </section>

        <section className="rounded-2xl border border-[#C9A227]/40 bg-[#FFF9E6] p-5 sm:p-6">
          <p className="text-sm font-medium text-[#475569]">Outstanding</p>
          <p
            className="mt-1 text-3xl font-semibold tracking-tight text-[#0B1F3A] tabular-nums"
            style={headingStyle}
          >
            {formatNaira(outstanding)}
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleExportList}
          className={secondaryButtonClasses}
        >
          Export list
        </button>
        <button
          type="button"
          onClick={handleSendReminder}
          className={primaryButtonClasses}
        >
          Send reminder
        </button>
      </div>

      {reminderCount !== null && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-[#C9A227]/40 bg-[#FFF9E6] px-4 py-3 text-sm font-medium leading-relaxed text-[#0B1F3A]"
        >
          Reminder sent to {reminderCount} parents.
        </p>
      )}

      <div className="mt-8 space-y-6">
        <section
          aria-labelledby="debtors-heading"
          className="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6"
        >
          <h2
            id="debtors-heading"
            className="text-lg font-semibold tracking-tight text-[#0B1F3A]"
            style={headingStyle}
          >
            Debtors
          </h2>

          <table className="mt-4 w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[22%]" />
              <col className="w-[32%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th
                  scope="col"
                  className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-[#475569]"
                >
                  Student
                </th>
                <th
                  scope="col"
                  className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-[#475569]"
                >
                  Class
                </th>
                <th
                  scope="col"
                  className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-[#475569]"
                >
                  Amount owed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {debtors.map((debtor) => (
                <tr key={debtor.id}>
                  <td className="py-3 pr-3 text-sm font-medium text-[#0B1F3A]">
                    {debtor.student}
                  </td>
                  <td className="py-3 pr-3 text-sm text-[#475569]">
                    {debtor.className}
                  </td>
                  <td className="py-3 text-right text-sm font-semibold text-[#0B1F3A] tabular-nums">
                    {formatNaira(debtor.amountOwed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section
          aria-labelledby="payments-heading"
          className="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6"
        >
          <h2
            id="payments-heading"
            className="text-lg font-semibold tracking-tight text-[#0B1F3A]"
            style={headingStyle}
          >
            Payments
          </h2>

          <ul className="mt-2 divide-y divide-[#E2E8F0]">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#0B1F3A]">
                    {payment.student}
                  </p>
                  <p className="mt-0.5 text-sm text-[#475569]">
                    {payment.className} · {payment.date}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#0B1F3A] tabular-nums">
                  {formatNaira(payment.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
