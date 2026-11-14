import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentParent } from "@/lib/fees/repository";
import { completePaystackPayment, failPaystackPayment } from "@/lib/fees/repository";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { sendPaymentReceiptEmail } from "@/lib/fees/receiptEmail";
import { isVerifiedTestPayment, verifyPaystackTransaction } from "@/lib/paystack";
import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata = { title: "Payment status | Crown Heights Academy" };

export default async function PaystackCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-xl px-5 py-8"><PermissionDenied /></main>;
  const parent = await getCurrentParent();
  const query = await searchParams;
  const reference = query.reference || query.trxref || "";
  const validRef = /^CHA-PAY-[0-9a-f-]{36}$/i.test(reference);
  const [payment] = validRef ? await db.select({ id: payments.id, amount: payments.amount, status: payments.status })
    .from(payments).where(and(eq(payments.paystackReference, reference), eq(payments.recordedBy, parent.id))).limit(1) : [];
  if (!payment) return <Status title="Payment not found" message="We could not match this payment to your account. Your invoice remains available in the parent portal." />;
  if (payment.status === "success") redirect(`/fees/receipts/${payment.id}?paid=1`);
  if (payment.status === "failed") return <Status title="Payment was not completed" message="No payment was recorded. Return to your invoice to try again." />;

  const transaction = await verifyPaystackTransaction(reference).catch(() => null);
  if (!transaction) return <Status title="Checking payment status" message="We could not reach Paystack to verify this payment. Refresh this page shortly; do not start another payment while this one is pending." />;
  if (transaction.status === "success") {
    if (!isVerifiedTestPayment(transaction, { reference, amountKobo: Math.round(Number(payment.amount) * 100) })) {
      return <Status title="Payment could not be verified" message="The verified amount or currency did not match the invoice. Contact the school office before retrying." />;
    }
    const completed = await completePaystackPayment({ reference, amountKobo: transaction.amount });
    if (!completed) return <Status title="Payment requires review" message="The transaction was verified, but could not be applied to this invoice. Please contact the school office." />;
    if (completed.created) await sendPaymentReceiptEmail(completed.id);
    revalidatePath("/fees", "layout");
    redirect(`/fees/receipts/${completed.id}?paid=1`);
  }
  if (["failed", "abandoned"].includes(transaction.status)) {
    await failPaystackPayment(reference);
    return <Status title="Payment was not completed" message="No payment was recorded. Return to your invoice to try again." />;
  }
  return <Status title="Payment is still processing" message="Paystack has not confirmed a final result yet. Refresh this page in a moment; your invoice will update after confirmation." />;
}

function Status({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-xl px-5 py-16"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-[#12264F]">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p><a href="/fees" className="mt-5 inline-flex rounded-lg bg-[#12264F] px-4 py-2.5 text-sm font-semibold text-white">Return to fees</a></section></main>;
}
