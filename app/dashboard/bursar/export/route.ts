import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { academicSessions, schoolSettings } from "@/lib/db/schema";
import { getInvoiceSummary } from "@/lib/fees/invoice";
import { getFeeManagementSnapshot } from "@/lib/fees/repository";
import { getLagosDate, isValidCalendarDate } from "@/lib/fees/date";
import { formatDateTime, formatNaira } from "@/lib/fees/format";

type Term = "first" | "second" | "third";
const TERMS: Term[] = ["first", "second", "third"];

export async function GET(request: Request) {
  const gate = await requireRole("bursar", "admin");
  if (gate.status === "forbidden") return new NextResponse("Forbidden", { status: 403 });
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const term = params.get("term") as Term;
  if (type !== "debtors" && type !== "payments") return new NextResponse("Invalid export type", { status: 400 });
  if (!TERMS.includes(term)) return new NextResponse("Invalid term", { status: 400 });
  const [sessions, settings] = await Promise.all([
    db.select({ name: academicSessions.name }).from(academicSessions),
    db.select({ session: schoolSettings.currentSession }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1),
  ]);
  const requestedSession = params.get("session") ?? "";
  const session = sessions.some((row) => row.name === requestedSession) ? requestedSession : settings[0]?.session;
  if (!session) return new NextResponse("No school session is configured", { status: 400 });
  const search = (params.get("search") ?? "").trim().slice(0, 100).toLowerCase();
  const classFilter = params.get("class") ?? "";
  const sort = params.get("sort") ?? "balance";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const dateFrom = isValidCalendarDate(from) ? from : "";
  const dateTo = isValidCalendarDate(to) ? to : "";
  if (dateFrom && dateTo && dateFrom > dateTo) return new NextResponse("Invalid date range", { status: 400 });

  const snapshot = await getFeeManagementSnapshot();
  const invoicesForPeriod = snapshot.invoices.filter((invoice) => invoice.session === session && invoice.term.toLowerCase() === term && invoice.status !== "cancelled");
  const invoiceIds = new Set(invoicesForPeriod.map((invoice) => invoice.id));
  const today = getLagosDate();
  const rows: string[][] = [];

  if (type === "debtors") {
    const parents = new Map<string, typeof snapshot.familyLinks>();
    for (const link of snapshot.familyLinks) parents.set(link.studentId, [...(parents.get(link.studentId) ?? []), link]);
    const debtors = new Map<string, { name: string; className: string; parents: string; emails: string; count: number; balance: number; oldestDue: string | null }>();
    for (const invoice of invoicesForPeriod) {
      const summary = getInvoiceSummary(invoice, snapshot.payments);
      if (summary.balance <= 0 || !invoice.student) continue;
      const linked = parents.get(invoice.studentId) ?? [];
      const found = debtors.get(invoice.studentId);
      if (found) {
        found.count += 1;
        found.balance += summary.balance;
        if (summary.status === "overdue" && (!found.oldestDue || invoice.dueDate < found.oldestDue)) found.oldestDue = invoice.dueDate;
      } else debtors.set(invoice.studentId, { name: `${invoice.student.firstName} ${invoice.student.lastName}`, className: invoice.student.className, parents: [...new Set(linked.map((row) => row.parentName))].join(", "), emails: [...new Set(linked.map((row) => row.parentEmail))].join(", "), count: 1, balance: summary.balance, oldestDue: summary.status === "overdue" ? invoice.dueDate : null });
    }
    const sorted = [...debtors.values()].filter((row) => (!classFilter || row.className === classFilter) && (!search || `${row.name} ${row.className} ${row.parents} ${row.emails}`.toLowerCase().includes(search)));
    sorted.sort(sort === "student" ? (a, b) => a.name.localeCompare(b.name) : sort === "overdue" ? (a, b) => (a.oldestDue ?? "9999-12-31").localeCompare(b.oldestDue ?? "9999-12-31") : (a, b) => b.balance - a.balance);
    rows.push(["Student", "Class", "Parent contact", "Parent email", "Outstanding invoices", "Balance", "Days overdue"]);
    for (const row of sorted) rows.push([row.name, row.className, row.parents || "No linked parent", row.emails, String(row.count), formatNaira(row.balance), row.oldestDue ? String(daysBetween(row.oldestDue, today)) : "0"]);
  } else {
    const paymentsForPeriod = snapshot.payments.filter((payment) => {
      if (!invoiceIds.has(payment.invoiceId)) return false;
      const day = getLagosDate(new Date(payment.paidAt));
      if (dateFrom && day < dateFrom || dateTo && day > dateTo) return false;
      const student = payment.student;
      const fullName = student ? `${student.firstName} ${student.lastName}` : "";
      return (!classFilter || student?.className === classFilter) && (!search || `${fullName} ${student?.className ?? ""} ${payment.invoice?.invoiceNumber ?? ""}`.toLowerCase().includes(search));
    }).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    rows.push(["Date", "Receipt", "Student", "Class", "Invoice", "Method", "Status", "Amount"]);
    for (const payment of paymentsForPeriod) rows.push([formatDateTime(payment.paidAt), payment.receiptNumber, payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "Student", payment.student?.className ?? "", payment.invoice?.invoiceNumber ?? "", payment.method.replaceAll("_", " "), payment.status, formatNaira(payment.amount)]);
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `schooldesk-${type}-${session.replace("/", "-")}-${term}.csv`;
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}

function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function daysBetween(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000));
}
