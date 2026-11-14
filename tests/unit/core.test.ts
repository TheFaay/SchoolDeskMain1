import { describe, expect, it } from "vitest";

import { getInvoiceSummary, validatePayment } from "../../lib/fees/invoice";
import type { Invoice, Payment } from "../../lib/fees/types";
import { calculateScore, getGrade } from "../../lib/scores/grading";
import { isStudentId } from "../../lib/auth/student-id";

const invoice: Invoice = {
  id: "invoice-stage15",
  invoiceNumber: "INV-STAGE15",
  studentId: "d0000000-0000-4000-8000-000000000001",
  title: "First term fees",
  session: "2026/2027",
  term: "first",
  amountDue: 100_000,
  dueDate: "2026-12-01",
  issuedAt: "2026-09-01",
  status: "unpaid",
  lineItems: [],
};

function successfulPayment(amount: number): Payment {
  return {
    id: "payment-stage15",
    invoiceId: invoice.id,
    amount,
    balanceAfter: 100_000 - amount,
    paidAt: "2026-11-01T12:00:00.000Z",
    method: "test",
    reference: "stage15-test-reference",
    receiptNumber: "CHA-2026-0001",
    status: "success",
    recordedBy: null,
  };
}

describe("money, grading, and ownership validation", () => {
  it("keeps invoice summaries exact and rejects an overpayment", () => {
    expect(getInvoiceSummary(invoice, [successfulPayment(40_000)], "2026-11-12")).toMatchObject({
      amountDue: 100_000,
      amountPaid: 40_000,
      balance: 60_000,
      status: "partial",
    });
    expect(validatePayment({ invoice, payments: [successfulPayment(99_999.99)], amountKobo: 2 }).ok).toBe(false);
  });

  it("calculates grades from the centralized score thresholds", () => {
    expect(calculateScore(40, 60)).toEqual({ total: 100, grade: "A" });
    expect(calculateScore(30, 35)).toEqual({ total: 65, grade: "B" });
    expect(getGrade(39.99)).toBe("F");
  });

  it("accepts UUID student IDs and rejects malformed identifiers", () => {
    expect(isStudentId("d0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isStudentId("student-1")).toBe(false);
    expect(isStudentId("00000000-0000-0000-0000-000000000000")).toBe(false);
  });
});
