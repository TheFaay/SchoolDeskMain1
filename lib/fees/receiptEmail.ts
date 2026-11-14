import "server-only";

import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, parentStudents, payments, students, user } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { emailTemplates } from "@/lib/email/templates";
import { formatNaira } from "@/lib/fees/format";

export async function sendPaymentReceiptEmail(paymentId: string) {
  const [row] = await db.select({ email: user.email, name: user.name, receipt: payments.receiptNumber, amount: payments.amount })
    .from(payments).innerJoin(invoices, eq(payments.invoiceId, invoices.id)).innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id)).innerJoin(user, eq(user.id, parentStudents.parentUserId))
    .where(and(eq(payments.id, paymentId), eq(user.role, "parent"), or(and(eq(payments.method, "paystack"), eq(payments.recordedBy, user.id)), ne(payments.method, "paystack")))).limit(1);
  if (!row?.receipt) return;
  try { await sendEmail({ to: row.email, ...emailTemplates.feeReceipt(row.name, row.receipt, formatNaira(Number(row.amount))) }); }
  catch { /* Payment and receipt remain available in the portal; delivery failure is logged. */ }
}
