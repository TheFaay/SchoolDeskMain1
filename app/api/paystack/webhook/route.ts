import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { completePaystackPayment, failPaystackPayment } from "@/lib/fees/repository";
import { sendPaymentReceiptEmail } from "@/lib/fees/receiptEmail";
import { isVerifiedTestPayment, verifyPaystackTransaction } from "@/lib/paystack";
import { applicationPaymentReferencePattern, completeApplicationPayment, failApplicationPayment, findApplicationPayment } from "@/lib/admissions/payments";
import { parseNairaToKobo } from "@/lib/admissions/paymentAmount";
import { emailTemplates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { formatNaira } from "@/lib/fees/format";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!secret?.startsWith("sk_test_") || !/^[a-f0-9]{128}$/i.test(signature)) return new Response("Unauthorized", { status: 401 });
  const rawBody = await request.text();
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response("Unauthorized", { status: 401 });

  let event: { event?: string; data?: { reference?: string; amount?: number; status?: string; currency?: string; domain?: string } };
  try { event = JSON.parse(rawBody) as typeof event; } catch { return new Response("Invalid event", { status: 400 }); }
  if (event.event !== "charge.success" && event.event !== "charge.failed" && event.event !== "charge.abandoned") return Response.json({ received: true });
  const reference = event.data?.reference ?? "";
  const applicationPayment = applicationPaymentReferencePattern.test(reference);
  if (!applicationPayment && !/^CHA-PAY-[0-9a-f-]{36}$/i.test(reference)) return Response.json({ received: true });
  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (event.event !== "charge.success") {
      if (transaction.status === "failed" || transaction.status === "abandoned") {
        if (applicationPayment) await failApplicationPayment(reference, event);
        else await failPaystackPayment(reference);
      }
      return Response.json({ received: true });
    }
    if (applicationPayment) {
      const payment = await findApplicationPayment(reference);
      const expectedKobo = payment ? parseNairaToKobo(payment.amount) ?? -1 : -1;
      if (!payment || event.data?.amount !== expectedKobo || !isVerifiedTestPayment(transaction, { reference, amountKobo: expectedKobo })) {
        return new Response("Transaction verification failed", { status: 503 });
      }
      const completed = await completeApplicationPayment({ reference, amountKobo: transaction.amount, rawEvent: event });
      if (completed?.created) {
        try {
          await sendEmail({ to: completed.application.parentEmail, ...emailTemplates.admissionsFeeReceived(completed.application.parentFullName, completed.application.referenceNumber, formatNaira(expectedKobo / 100)) });
        } catch { /* Payment is committed; the email failure is recorded for admin review. */ }
        revalidatePath("/dashboard/admin/admissions");
      }
      return Response.json({ received: true, applied: Boolean(completed) });
    }
    if (!transaction || !isVerifiedTestPayment(transaction, { reference, amountKobo: event.data?.amount ?? -1 })) return new Response("Transaction verification failed", { status: 503 });
    const completed = await completePaystackPayment({ reference, amountKobo: transaction.amount });
    if (!completed) return Response.json({ received: true, applied: false });
    if (completed.created) {
      await sendPaymentReceiptEmail(completed.id);
      revalidatePath("/fees", "layout");
    }
    return Response.json({ received: true, applied: true });
  } catch {
    return new Response("Temporary processing failure", { status: 503 });
  }
}
