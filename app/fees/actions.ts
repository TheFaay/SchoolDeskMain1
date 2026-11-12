"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePayment } from "@/lib/fees/invoice";
import {
  getCurrentParent,
  getInvoiceForParent,
  listPaymentsForInvoice,
  recordTestPayment,
} from "@/lib/fees/repository";

export type PayInvoiceState = {
  error: string;
} | null;

// FEATURE 10 HOOK: connect the receipt email inside this function later.
async function sendReceiptEmailLater(paymentId: string) {
  void paymentId;
}

export async function payInvoiceAction(
  _previousState: PayInvoiceState,
  formData: FormData,
): Promise<PayInvoiceState> {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const rawAmount = String(formData.get("amount") ?? "")
    .replace(/,/g, "")
    .trim();
  const amount = Number(rawAmount);

  const parent = await getCurrentParent();
  const invoice = await getInvoiceForParent(parent.id, invoiceId);

  if (!invoice) {
    return { error: "We could not find that invoice." };
  }

  const payments = await listPaymentsForInvoice(invoiceId);
  const validation = validatePayment({ invoice, payments, amount });

  if (!validation.ok) {
    return { error: validation.error };
  }

  const payment = await recordTestPayment({
    invoiceId,
    amount: validation.amount,
    balanceAfter: validation.balanceAfter,
  });

  await sendReceiptEmailLater(payment.id);

  revalidatePath("/fees", "layout");
  redirect(`/fees/receipts/${payment.id}?paid=1`);
}
