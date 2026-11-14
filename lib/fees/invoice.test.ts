import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  decimalToKobo,
  deriveInvoiceStatus,
  getFeeTotals,
  getInvoiceSummary,
  parseNairaToKobo,
  validatePayment,
} from "./invoice";
import { getLagosDate } from "./date";
import type { Invoice, Payment } from "./types";

const invoice: Invoice = {
  id: "invoice-1",
  invoiceNumber: "INV-2026-TEST",
  studentId: "student-1",
  title: "First term fees",
  session: "2026/2027",
  term: "first",
  amountDue: 100_000,
  dueDate: "2026-12-01",
  issuedAt: "2026-09-01",
  status: "unpaid",
  lineItems: [],
};

function payment(amount: number, status: Payment["status"]): Payment {
  return {
    id: `payment-${status}-${amount}`,
    invoiceId: invoice.id,
    amount,
    balanceAfter: 0,
    paidAt: "2026-11-01T12:00:00.000Z",
    method: "test",
    reference: "test-reference",
    receiptNumber: "CHA-2026-0001",
    status,
    recordedBy: null,
  };
}

test("parses Naira to kobo without fractional floating-point rounding", () => {
  assert.equal(parseNairaToKobo("0.01"), 1);
  assert.equal(parseNairaToKobo("0.29"), 29);
  assert.equal(decimalToKobo("125.69"), 12_569);
  assert.equal(parseNairaToKobo("10.999"), null);
  assert.equal(validatePayment({ invoice, payments: [], amountKobo: 1 }).ok, true);
});

test("school dates use the Africa/Lagos calendar", () => {
  assert.equal(getLagosDate(new Date("2026-11-11T23:30:00.000Z")), "2026-11-12");
});

test("only successful payments count and a partial payment leaves the exact balance", () => {
  const payments = [payment(40_000, "success"), payment(30_000, "pending"), payment(20_000, "failed")];
  const summary = getInvoiceSummary(invoice, payments, "2026-11-12");
  assert.deepEqual(summary, { amountDue: 100_000, amountPaid: 40_000, balance: 60_000, status: "partial" });
});

test("an exact payment settles the invoice", () => {
  const summary = getInvoiceSummary(invoice, [payment(100_000, "success")], "2026-11-12");
  assert.equal(summary.balance, 0);
  assert.equal(summary.status, "paid");
});

test("overpayment is rejected", () => {
  const result = validatePayment({ invoice, payments: [payment(99_999.99, "success")], amountKobo: 2 });
  assert.equal(result.ok, false);
});

test("a balance still owed after the Lagos due date is overdue, including part-payments", () => {
  assert.equal(deriveInvoiceStatus({ amountDueKobo: 100, amountPaidKobo: 0, dueDate: "2026-11-11", today: "2026-11-12" }), "overdue");
  assert.equal(deriveInvoiceStatus({ amountDueKobo: 100, amountPaidKobo: 25, dueDate: "2026-11-11", today: "2026-11-12" }), "overdue");
});

test("cancelled invoices are excluded from every fee total", () => {
  const cancelled = { ...invoice, id: "invoice-cancelled", status: "cancelled" as const };
  const totals = getFeeTotals([invoice, cancelled], [payment(25_000, "success")]);
  assert.deepEqual(totals, { amountDue: 100_000, amountPaid: 25_000, balance: 75_000 });
  assert.equal(getInvoiceSummary(cancelled, []).status, "cancelled");
});

test("concurrent payments cannot overpay a shared invoice", {
  skip: process.env.RUN_FEE_DB_TESTS !== "1",
}, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  assert.equal(JSON.parse(readFileSync(".neon", "utf8")).branch, "dev");
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const [{ db }, schema, { createFeeInvoice, recordManualPayment }, { getLagosDate }] = await Promise.all([
    import("@/lib/db/index"),
    import("@/lib/db/schema"),
    import("@/lib/fees/repository"),
    import("@/lib/fees/date"),
  ]);
  const [{ eq }, { decimalToKobo }] = await Promise.all([
    import("drizzle-orm"),
    import("@/lib/fees/invoice"),
  ]);
  const [student] = await db.select({ id: schema.students.id }).from(schema.students).limit(1);
  const [actor] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.role, "bursar")).limit(1);
  assert.ok(student && actor, "seed one student and bursar before this integration check");

  const created = await createFeeInvoice({
    studentId: student.id,
    title: "Temporary concurrency check",
    dueDate: getLagosDate(),
    items: [{ description: "Temporary test item", amountKobo: 3 }],
  });
  try {
    const attempts = await Promise.allSettled([
      recordManualPayment({ invoiceId: created.id, amountKobo: 2, method: "cash", reference: `CONCURRENCY-${crypto.randomUUID()}`, recordedBy: actor.id }),
      recordManualPayment({ invoiceId: created.id, amountKobo: 2, method: "cash", reference: `CONCURRENCY-${crypto.randomUUID()}`, recordedBy: actor.id }),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
    const [row] = await db.select({ amount: schema.payments.amount }).from(schema.payments).where(eq(schema.payments.invoiceId, created.id));
    assert.ok(row);
    assert.equal(decimalToKobo(row.amount), 2);
  } finally {
    await db.transaction(async (tx) => {
      await tx.delete(schema.payments).where(eq(schema.payments.invoiceId, created.id));
      await tx.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, created.id));
      await tx.delete(schema.invoices).where(eq(schema.invoices.id, created.id));
    });
  }
});
