"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { emailTemplates } from "@/lib/email/templates";
import { db } from "@/lib/db";
import { feeReminderLogs, invoices, parentStudents, payments, students, user, type ScoreTerm } from "@/lib/db/schema";
import { formatNaira } from "@/lib/fees/format";
import { decimalToKobo, koboToNaira } from "@/lib/fees/invoice";
import { getLagosDate } from "@/lib/fees/date";

export type ReminderState = { error?: string; message?: string } | null;
const TERMS: ScoreTerm[] = ["first", "second", "third"];

type ReminderRecipient = { id: string; parentUserId: string; studentId: string; email: string; parentName: string; childName: string; balance: number };

export async function sendReminderAction(_previous: ReminderState, formData: FormData): Promise<ReminderState> {
  void _previous;
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "bursar" && actor.role !== "admin")) return { error: "You do not have permission to send reminders." };

  const session = String(formData.get("session") ?? "");
  const term = String(formData.get("term") ?? "") as ScoreTerm;
  const studentIds = [...new Set(formData.getAll("studentId").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (!/^\d{4}\/\d{4}$/.test(session) || !TERMS.includes(term)) return { error: "Choose a valid session and term." };
  if (studentIds.length === 0 || studentIds.length > 50) return { error: "Select between one and fifty debtors." };

  const recipients = await db.transaction(async (tx) => {
    const invoiceRows = await tx.select({ id: invoices.id, studentId: invoices.studentId, totalAmount: invoices.totalAmount })
      .from(invoices).where(and(inArray(invoices.studentId, studentIds), eq(invoices.session, session), eq(invoices.term, term), ne(invoices.status, "cancelled")));
    if (!invoiceRows.length) return [];
    const paidRows = await tx.select({ invoiceId: payments.invoiceId, amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
      .from(payments).where(and(inArray(payments.invoiceId, invoiceRows.map((row) => row.id)), eq(payments.status, "success"))).groupBy(payments.invoiceId);
    const paidByInvoice = new Map(paidRows.map((row) => [row.invoiceId, decimalToKobo(row.amount)]));
    const balances = new Map<string, number>();
    for (const invoice of invoiceRows) {
      balances.set(invoice.studentId, (balances.get(invoice.studentId) ?? 0) + Math.max(0, decimalToKobo(invoice.totalAmount) - (paidByInvoice.get(invoice.id) ?? 0)));
    }
    const eligibleStudentIds = [...balances].filter(([, balance]) => balance > 0).map(([studentId]) => studentId);
    if (!eligibleStudentIds.length) return [];

    const links = await tx.select({ parentUserId: user.id, studentId: students.id, email: user.email, parentName: user.name, childName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})` })
      .from(parentStudents).innerJoin(user, eq(parentStudents.parentUserId, user.id)).innerJoin(students, eq(parentStudents.studentId, students.id))
      .where(and(inArray(parentStudents.studentId, eligibleStudentIds), eq(user.role, "parent")));
    if (!links.length) return [];

    const today = getLagosDate();
    const claimed = await tx.insert(feeReminderLogs).values(links.map((link) => ({ parentUserId: link.parentUserId, studentId: link.studentId, reminderDate: today, status: "pending" as const, sentBy: actor.id })))
      .onConflictDoUpdate({ target: [feeReminderLogs.parentUserId, feeReminderLogs.studentId, feeReminderLogs.reminderDate], set: { status: "pending", sentBy: actor.id, sentAt: null }, where: eq(feeReminderLogs.status, "failed") })
      .returning({ id: feeReminderLogs.id, parentUserId: feeReminderLogs.parentUserId, studentId: feeReminderLogs.studentId });
    const claimKeys = new Set(claimed.map((row) => `${row.parentUserId}:${row.studentId}`));
    return links.filter((link) => claimKeys.has(`${link.parentUserId}:${link.studentId}`)).map((link) => {
      const claim = claimed.find((row) => row.parentUserId === link.parentUserId && row.studentId === link.studentId)!;
      return { ...link, id: claim.id, balance: balances.get(link.studentId) ?? 0 };
    });
  });

  if (!recipients.length) return { message: "No new reminders were sent. There may be no outstanding balances or reminders were already sent to these parents today." };

  const byParent = new Map<string, ReminderRecipient[]>();
  for (const recipient of recipients) byParent.set(recipient.parentUserId, [...(byParent.get(recipient.parentUserId) ?? []), recipient]);
  let sent = 0;
  let failed = 0;
  for (const group of byParent.values()) {
    const first = group[0]!;
    const termLabel = `${term.charAt(0).toUpperCase()}${term.slice(1)} Term`;
    try {
      const lines = group.map((item) => `• ${item.childName}: ${formatNaira(koboToNaira(item.balance))} outstanding`).join("\n");
      await sendEmail({ to: first.email, ...emailTemplates.feeReminder(first.parentName, `${termLabel} ${session}`, lines) });
      await db.update(feeReminderLogs).set({ status: "sent", sentAt: new Date() }).where(inArray(feeReminderLogs.id, group.map((item) => item.id)));
      sent += 1;
    } catch {
      await db.update(feeReminderLogs).set({ status: "failed" }).where(inArray(feeReminderLogs.id, group.map((item) => item.id)));
      failed += 1;
    }
  }

  revalidatePath("/dashboard/bursar");
  return failed ? { error: `Sent ${sent} reminder email${sent === 1 ? "" : "s"}; ${failed} failed. Failed reminders can be retried.` } : { message: `Sent ${sent} reminder email${sent === 1 ? "" : "s"}.` };
}
