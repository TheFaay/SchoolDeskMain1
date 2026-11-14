import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationPayments, applications } from "@/lib/db/schema";
import { initializePaystackTransaction } from "@/lib/paystack";
import { koboToDecimal, parseNairaToKobo } from "./paymentAmount";

export const applicationPaymentReferencePattern = /^CHA-APP-PAY-[0-9a-f-]{36}$/i;

export function getAdmissionsFeeKobo(): number | null {
  const value = process.env.ADMISSIONS_FEE_NAIRA;
  return value ? parseNairaToKobo(value) : null;
}

function getPublicAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (!value) throw new Error("The application URL is not configured.");
  const url = new URL(value);
  const localHttpTest = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !localHttpTest) {
    throw new Error("The public payment URL must use HTTPS.");
  }
  return url;
}

export async function startApplicationPayment(input: { referenceNumber: string; parentEmail: string }) {
  const configuredFeeKobo = getAdmissionsFeeKobo();
  if (!configuredFeeKobo) throw new Error("The application fee is not configured. Please contact the school office.");

  const reservation = await db.transaction(async (tx) => {
    const [application] = await tx.select({
      id: applications.id,
      referenceNumber: applications.referenceNumber,
      feeStatus: applications.feeStatus,
      feeAmount: applications.feeAmount,
    }).from(applications).where(and(
      eq(applications.referenceNumber, input.referenceNumber),
      eq(applications.parentEmail, input.parentEmail.trim().toLowerCase()),
    )).limit(1).for("update");
    if (!application) throw new Error("Application reference and parent email did not match.");
    if (application.feeStatus === "paid") {
      const [paid] = await tx.select({ reference: applicationPayments.reference }).from(applicationPayments)
        .where(and(eq(applicationPayments.applicationId, application.id), eq(applicationPayments.status, "success")))
        .orderBy(desc(applicationPayments.paidAt)).limit(1);
      return { paid: true as const, reference: paid?.reference ?? "" };
    }

    const amount = application.feeAmount ? parseNairaToKobo(application.feeAmount) : configuredFeeKobo;
    if (!amount) throw new Error("The application fee amount is invalid. Please contact the school office.");
    if (!application.feeAmount) await tx.update(applications).set({ feeAmount: koboToDecimal(amount) }).where(eq(applications.id, application.id));

    const [pending] = await tx.select({
      id: applicationPayments.id,
      reference: applicationPayments.reference,
      authorizationUrl: applicationPayments.authorizationUrl,
      createdAt: applicationPayments.createdAt,
    }).from(applicationPayments).where(and(
      eq(applicationPayments.applicationId, application.id),
      eq(applicationPayments.status, "pending"),
    )).orderBy(desc(applicationPayments.createdAt)).limit(1).for("update");
    if (pending?.authorizationUrl) return { paid: false as const, reused: true as const, reference: pending.reference, authorizationUrl: pending.authorizationUrl };
    if (pending && Date.now() - pending.createdAt.getTime() < 3 * 60 * 1000) {
      throw new Error("Your checkout is being prepared. Please wait a moment and retry.");
    }
    if (pending) await tx.update(applicationPayments).set({ status: "failed" }).where(eq(applicationPayments.id, pending.id));

    const reference = `CHA-APP-PAY-${crypto.randomUUID()}`;
    await tx.insert(applicationPayments).values({
      applicationId: application.id,
      reference,
      amount: koboToDecimal(amount),
      status: "pending",
    });
    await tx.update(applications).set({ feeStatus: "pending" }).where(eq(applications.id, application.id));
    return { paid: false as const, reused: false as const, applicationId: application.id, reference, amountKobo: amount };
  });

  if (reservation.paid) return { paid: true as const, reference: reservation.reference };
  if (reservation.reused) return { paid: false as const, reference: reservation.reference, authorizationUrl: reservation.authorizationUrl };

  try {
    const origin = getPublicAppUrl();
    const callbackUrl = new URL("/admissions/payment/callback", origin).toString();
    const authorizationUrl = await initializePaystackTransaction({
      email: input.parentEmail.trim().toLowerCase(),
      amountKobo: reservation.amountKobo,
      reference: reservation.reference,
      callbackUrl,
    });
    const parsedAuthorizationUrl = new URL(authorizationUrl);
    if (parsedAuthorizationUrl.protocol !== "https:" || !parsedAuthorizationUrl.hostname.endsWith(".paystack.com")) {
      throw new Error("Paystack returned an invalid checkout URL.");
    }
    await db.update(applicationPayments).set({ authorizationUrl }).where(and(
      eq(applicationPayments.reference, reservation.reference),
      eq(applicationPayments.status, "pending"),
    ));
    return { paid: false as const, reference: reservation.reference, authorizationUrl };
  } catch (error) {
    await failApplicationPayment(reservation.reference);
    throw error;
  }
}

export async function findApplicationPayment(reference: string) {
  const [payment] = await db.select({
    id: applicationPayments.id,
    applicationId: applicationPayments.applicationId,
    amount: applicationPayments.amount,
    paymentStatus: applicationPayments.status,
    applicationReference: applications.referenceNumber,
    applicationFeeStatus: applications.feeStatus,
    childFullName: applications.childFullName,
    classApplyingFor: applications.classApplyingFor,
    parentFullName: applications.parentFullName,
    parentEmail: applications.parentEmail,
  }).from(applicationPayments).innerJoin(applications, eq(applications.id, applicationPayments.applicationId))
    .where(eq(applicationPayments.reference, reference)).limit(1);
  return payment ?? null;
}

export async function failApplicationPayment(reference: string, rawEvent: unknown = null) {
  await db.transaction(async (tx) => {
    const [payment] = await tx.select({ id: applicationPayments.id, applicationId: applicationPayments.applicationId, status: applicationPayments.status })
      .from(applicationPayments).where(eq(applicationPayments.reference, reference)).limit(1).for("update");
    if (!payment || payment.status !== "pending") return;
    await tx.update(applicationPayments).set({ status: "failed", rawEvent }).where(eq(applicationPayments.id, payment.id));
    const [pending] = await tx.select({ id: applicationPayments.id }).from(applicationPayments)
      .where(and(eq(applicationPayments.applicationId, payment.applicationId), eq(applicationPayments.status, "pending"))).limit(1);
    if (!pending) {
      await tx.update(applications).set({ feeStatus: "unpaid" }).where(and(
        eq(applications.id, payment.applicationId),
        inArray(applications.feeStatus, ["pending", "unpaid"]),
      ));
    }
  });
}

export async function completeApplicationPayment(input: { reference: string; amountKobo: number; rawEvent: unknown }) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select({
      id: applicationPayments.id,
      applicationId: applicationPayments.applicationId,
      amount: applicationPayments.amount,
      status: applicationPayments.status,
    }).from(applicationPayments).where(eq(applicationPayments.reference, input.reference)).limit(1).for("update");
    if (!payment) return null;
    const [application] = await tx.select({
      id: applications.id,
      referenceNumber: applications.referenceNumber,
      feeStatus: applications.feeStatus,
      childFullName: applications.childFullName,
      classApplyingFor: applications.classApplyingFor,
      parentFullName: applications.parentFullName,
      parentEmail: applications.parentEmail,
    }).from(applications).where(eq(applications.id, payment.applicationId)).limit(1).for("update");
    if (!application) return null;
    if (payment.status === "success") return { application, created: false };
    if (payment.status !== "pending" || parseNairaToKobo(payment.amount) !== input.amountKobo) return null;

    const now = new Date();
    await tx.update(applicationPayments).set({ status: "success", paidAt: now, rawEvent: input.rawEvent }).where(eq(applicationPayments.id, payment.id));
    if (application.feeStatus !== "paid") {
      await tx.update(applications).set({ feeStatus: "paid", feePaidAt: now, updatedAt: now }).where(eq(applications.id, application.id));
    }
    return { application, created: application.feeStatus !== "paid" };
  });
}
