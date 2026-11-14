import { formatNaira } from "./format";
import { getLagosDate } from "./date";
import type {
  FeeItemStatus,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Payment,
} from "./types";

export type InvoiceSummary = {
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
};

export type FeeTotals = {
  amountDue: number;
  amountPaid: number;
  balance: number;
};

export type InvoiceLineItemView = InvoiceLineItem & {
  status: FeeItemStatus;
};

export type PaymentValidation =
  | {
      ok: true;
      amountKobo: number;
      balanceBeforeKobo: number;
      balanceAfterKobo: number;
    }
  | { ok: false; error: string };

export function parseNairaToKobo(value: string): number | null {
  const normalized = value.trim();
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const wholeNaira = Number(match[1]);
  const kobo = Number((match[2] ?? "").padEnd(2, "0"));
  const amountKobo = wholeNaira * 100 + kobo;
  return Number.isSafeInteger(amountKobo) ? amountKobo : null;
}

export function nairaToKobo(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function koboToNaira(value: number): number {
  return value / 100;
}

export function koboToDecimal(value: number): string {
  const whole = Math.floor(value / 100);
  const cents = String(value % 100).padStart(2, "0");
  return `${whole}.${cents}`;
}

export function koboToInput(value: number): string {
  const whole = Math.floor(value / 100);
  const cents = String(value % 100).padStart(2, "0");
  return cents === "00" ? String(whole) : `${whole}.${cents}`;
}

export function decimalToKobo(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Invalid money value in the database.");
  const kobo = BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (kobo > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Money value exceeds the safe kobo range.");
  return Number(kobo);
}

export function deriveInvoiceStatus(input: {
  amountDueKobo: number;
  amountPaidKobo: number;
  dueDate: string;
  cancelled?: boolean;
  today?: string;
}): InvoiceStatus {
  if (input.cancelled) return "cancelled";
  if (input.amountPaidKobo >= input.amountDueKobo) return "paid";
  if (input.dueDate < (input.today ?? getLagosDate())) return "overdue";
  if (input.amountPaidKobo > 0) return "partial";
  return "unpaid";
}

export function getSuccessfulPayments(
  invoiceId: string,
  payments: Payment[],
): Payment[] {
  return payments.filter(
    (payment) =>
      payment.invoiceId === invoiceId && payment.status === "success",
  );
}

export function getAmountPaidKobo(invoiceId: string, payments: Payment[]): number {
  return getSuccessfulPayments(invoiceId, payments).reduce(
    (total, payment) => total + nairaToKobo(payment.amount),
    0,
  );
}

export function getInvoiceSummary(
  invoice: Invoice,
  payments: Payment[],
  today = getLagosDate(),
): InvoiceSummary {
  const amountDueKobo = nairaToKobo(invoice.amountDue);
  const amountPaidKobo = getAmountPaidKobo(invoice.id, payments);
  const balanceKobo = invoice.status === "cancelled"
    ? 0
    : Math.max(0, amountDueKobo - amountPaidKobo);

  return {
    amountDue: koboToNaira(amountDueKobo),
    amountPaid: koboToNaira(amountPaidKobo),
    balance: koboToNaira(balanceKobo),
    status: deriveInvoiceStatus({
      amountDueKobo,
      amountPaidKobo,
      dueDate: invoice.dueDate,
      cancelled: invoice.status === "cancelled",
      today,
    }),
  };
}

export function getInvoiceLineItems(
  invoice: Invoice,
  payments: Payment[],
): InvoiceLineItemView[] {
  const fullyPaid = getInvoiceSummary(invoice, payments).status === "paid";
  return invoice.lineItems.map((lineItem) => ({
    ...lineItem,
    status: fullyPaid ? "paid" : lineItem.status,
  }));
}

export function getPaidPercentage(
  invoice: Invoice,
  payments: Payment[],
): number {
  const amountDueKobo = nairaToKobo(invoice.amountDue);
  if (amountDueKobo <= 0) return 100;
  const amountPaidKobo = getAmountPaidKobo(invoice.id, payments);
  return Math.min(100, Math.round((amountPaidKobo / amountDueKobo) * 100));
}

export function getFeeTotals(
  invoices: Invoice[],
  payments: Payment[],
): FeeTotals {
  const totals = invoices.reduce(
    (result, invoice) => {
      if (invoice.status === "cancelled") return result;
      const summary = getInvoiceSummary(invoice, payments);
      result.amountDueKobo += nairaToKobo(summary.amountDue);
      result.amountPaidKobo += nairaToKobo(summary.amountPaid);
      result.balanceKobo += nairaToKobo(summary.balance);
      return result;
    },
    { amountDueKobo: 0, amountPaidKobo: 0, balanceKobo: 0 },
  );

  return {
    amountDue: koboToNaira(totals.amountDueKobo),
    amountPaid: koboToNaira(totals.amountPaidKobo),
    balance: koboToNaira(totals.balanceKobo),
  };
}

export function validatePayment(input: {
  invoice: Invoice;
  payments: Payment[];
  amountKobo: number;
}): PaymentValidation {
  const { invoice, payments, amountKobo } = input;
  if (invoice.status === "cancelled") {
    return { ok: false, error: "Cancelled invoices cannot be paid." };
  }
  const amountDueKobo = nairaToKobo(invoice.amountDue);
  const amountPaidKobo = getAmountPaidKobo(invoice.id, payments);
  const balanceKobo = Math.max(0, amountDueKobo - amountPaidKobo);

  if (balanceKobo <= 0) {
    return { ok: false, error: "This invoice is already fully paid." };
  }
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 1) {
    return { ok: false, error: "Enter an amount of at least ₦0.01." };
  }
  if (amountKobo > balanceKobo) {
    return {
      ok: false,
      error: `The outstanding balance is ${formatNaira(koboToNaira(balanceKobo))}. You cannot pay more than that.`,
    };
  }

  return {
    ok: true,
    amountKobo,
    balanceBeforeKobo: balanceKobo,
    balanceAfterKobo: balanceKobo - amountKobo,
  };
}
