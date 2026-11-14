import { and, asc, desc, eq, inArray, like, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  classes,
  invoiceItems,
  invoices,
  parentStudents,
  payments,
  receiptCounters,
  schoolSettings,
  students,
  user,
} from "@/lib/db/schema";
import { getLagosDate, isValidCalendarDate } from "./date";
import { formatNaira } from "./format";
import {
  decimalToKobo,
  deriveInvoiceStatus,
  koboToDecimal,
  koboToNaira,
} from "./invoice";

import type {
  Invoice,
  InvoiceLineItem,
  Parent,
  Payment,
  Student,
} from "./types";

type InvoiceRow = {
  id: string;
  studentId: string;
  invoiceNumber: string;
  title: string | null;
  session: string | null;
  term: string | null;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  status: Invoice["status"];
};

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  parentId: string;
};

type PaymentRow = {
  id: string;
  invoiceId: string;
  amount: string;
  reference: string | null;
  receiptNumber: string | null;
  balanceAfter: string | null;
  paidAt: Date;
  method: Payment["method"];
  status: Payment["status"];
  recordedBy: string | null;
};

const invoiceColumns = {
  id: invoices.id,
  studentId: invoices.studentId,
  invoiceNumber: invoices.invoiceNumber,
  title: invoices.title,
  session: invoices.session,
  term: invoices.term,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  totalAmount: invoices.totalAmount,
  status: invoices.status,
};

const paymentColumns = {
  id: payments.id,
  invoiceId: payments.invoiceId,
  amount: payments.amount,
  reference: payments.reference,
  receiptNumber: payments.receiptNumber,
  balanceAfter: payments.balanceAfter,
  paidAt: payments.paidAt,
  method: payments.method,
  status: payments.status,
  recordedBy: payments.recordedBy,
};

function toNaira(value: string): number {
  return Number(value);
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    parentId: row.parentId,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    className: row.className,
    admissionNumber: row.admissionNumber,
  };
}

async function loadLineItems(
  invoiceIds: string[],
): Promise<Map<string, InvoiceLineItem[]>> {
  const grouped = new Map<string, InvoiceLineItem[]>();

  if (invoiceIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      description: invoiceItems.description,
      category: invoiceItems.category,
      amount: invoiceItems.amount,
    })
    .from(invoiceItems)
    .where(inArray(invoiceItems.invoiceId, invoiceIds))
    .orderBy(asc(invoiceItems.createdAt), asc(invoiceItems.id));

  for (const row of rows) {
    const items = grouped.get(row.invoiceId) ?? [];

    items.push({
      id: row.id,
      item: row.description,
      category: row.category ?? "Fees",
      amount: toNaira(row.amount),
      status: "not_paid",
    });

    grouped.set(row.invoiceId, items);
  }

  return grouped;
}

async function loadInvoices(rows: InvoiceRow[]): Promise<Invoice[]> {
  const lineItems = await loadLineItems(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    studentId: row.studentId,
    title: row.title ?? row.invoiceNumber,
    session: row.session ?? "",
    term: row.term ?? "",
    amountDue: toNaira(row.totalAmount),
    dueDate: row.dueDate,
    issuedAt: row.issueDate,
    status: row.status,
    lineItems: lineItems.get(row.id) ?? [],
  }));
}

function mapPayments(rows: PaymentRow[]): Payment[] {
  return rows.map((row) => ({
    id: row.id,
    invoiceId: row.invoiceId,
    amount: toNaira(row.amount),
    balanceAfter: row.balanceAfter ? toNaira(row.balanceAfter) : 0,
    paidAt: row.paidAt.toISOString(),
    method: row.method,
    reference: row.reference ?? "",
    receiptNumber: row.receiptNumber ?? "",
    status: row.status,
    recordedBy: row.recordedBy,
  }));
}

async function getStudentIdsForParent(parentId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(eq(parentStudents.parentUserId, parentId));

  return rows.map((row) => row.studentId);
}

async function getInvoiceIdsForParent(parentId: string): Promise<string[]> {
  const studentIds = await getStudentIdsForParent(parentId);

  if (studentIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(inArray(invoices.studentId, studentIds), ne(invoices.status, "cancelled")));

  return rows.map((row) => row.id);
}

async function parentHasStudent(
  parentId: string,
  studentId: string,
): Promise<boolean> {
  const [link] = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(
      and(
        eq(parentStudents.parentUserId, parentId),
        eq(parentStudents.studentId, studentId),
      ),
    )
    .limit(1);

  return Boolean(link);
}

export async function getCurrentParent(): Promise<Parent> {
  const current = await getCurrentUser();
  if (!current || (current.role !== "parent" && current.role !== "admin")) {
    throw new Error("A parent session is required.");
  }
  return { id: current.id, name: current.name, email: current.email, phone: "" };
}

export async function getParentById(
  parentId: string,
): Promise<Parent | undefined> {
  const current = await getCurrentUser();
  return current?.id === parentId
    ? { id: current.id, name: current.name, email: current.email, phone: "" }
    : undefined;
}

export async function getStudentById(
  studentId: string,
): Promise<Student | undefined> {
  const [row] = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      parentId: parentStudents.parentUserId,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(parentStudents, eq(parentStudents.studentId, students.id))
    .where(eq(students.id, studentId))
    .orderBy(asc(parentStudents.createdAt))
    .limit(1);

  return row ? mapStudent(row) : undefined;
}

export async function getStudentsForParent(
  parentId: string,
): Promise<Student[]> {
  const rows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      parentId: parentStudents.parentUserId,
    })
    .from(parentStudents)
    .innerJoin(students, eq(parentStudents.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(parentStudents.parentUserId, parentId))
    .orderBy(asc(students.firstName), asc(students.lastName));

  return rows.map(mapStudent);
}

export async function listInvoicesForStudent(
  studentId: string,
): Promise<Invoice[]> {
  const rows = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(invoices.studentId, studentId))
    .orderBy(asc(invoices.dueDate));

  return loadInvoices(rows);
}

export async function listInvoicesForParent(
  parentId: string,
): Promise<Invoice[]> {
  const studentIds = await getStudentIdsForParent(parentId);

  if (studentIds.length === 0) {
    return [];
  }

  const rows = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(inArray(invoices.studentId, studentIds))
    .orderBy(asc(invoices.dueDate));

  return loadInvoices(rows);
}

export async function getInvoiceById(
  invoiceId: string,
): Promise<Invoice | undefined> {
  const [row] = await db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  const [invoice] = await loadInvoices([row]);

  return invoice;
}

export async function getInvoiceForParent(
  parentId: string,
  invoiceId: string,
): Promise<Invoice | undefined> {
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    return undefined;
  }

  return (await parentHasStudent(parentId, invoice.studentId))
    ? invoice
    : undefined;
}

export async function listPaymentsForInvoice(
  invoiceId: string,
): Promise<Payment[]> {
  const rows = await db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(
      asc(payments.paidAt),
      asc(payments.createdAt),
      asc(payments.id),
    );

  return mapPayments(rows).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function listPaymentsForParent(
  parentId: string,
): Promise<Payment[]> {
  const invoiceIds = await getInvoiceIdsForParent(parentId);

  if (invoiceIds.length === 0) {
    return [];
  }

  const rows = await db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(inArray(payments.invoiceId, invoiceIds))
    .orderBy(
      asc(payments.paidAt),
      asc(payments.createdAt),
      asc(payments.id),
    );

  return mapPayments(rows).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function getPaymentById(
  paymentId: string,
): Promise<Payment | undefined> {
  const [target] = await db
    .select({ invoiceId: payments.invoiceId })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!target) {
    return undefined;
  }

  const invoicePayments = await listPaymentsForInvoice(target.invoiceId);

  return invoicePayments.find((payment) => payment.id === paymentId);
}

export async function getPaymentForParent(
  parentId: string,
  paymentId: string,
): Promise<Payment | undefined> {
  const payment = await getPaymentById(paymentId);

  if (!payment || payment.status !== "success") {
    return undefined;
  }

  const invoice = await getInvoiceById(payment.invoiceId);

  if (!invoice) {
    return undefined;
  }

  return (await parentHasStudent(parentId, invoice.studentId))
    ? payment
    : undefined;
}

type FeeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function allocateReceiptNumber(tx: FeeTransaction, year: number) {
  const prefix = `CHA-${year}-`;
  const [latest] = await tx
    .select({ lastNumber: sql<number>`coalesce(max(substring(${payments.receiptNumber} from ${`^CHA-${year}-([0-9]+)$`})::integer), 0)` })
    .from(payments)
    .where(like(payments.receiptNumber, `${prefix}%`));
  const firstNumber = Number(latest.lastNumber) + 1;
  const [counter] = await tx
    .insert(receiptCounters)
    .values({ year, lastNumber: firstNumber })
    .onConflictDoUpdate({
      target: receiptCounters.year,
      set: { lastNumber: sql`greatest(${receiptCounters.lastNumber}, ${latest.lastNumber}) + 1` },
    })
    .returning({ lastNumber: receiptCounters.lastNumber });

  return `CHA-${year}-${String(counter.lastNumber).padStart(4, "0")}`;
}

async function recordSuccessfulPayment(input: {
  invoiceId: string;
  amountKobo: number;
  method: Payment["method"];
  reference: string;
  recordedBy: string;
}): Promise<Payment> {
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 1) {
    throw new Error("Enter an amount of at least ₦0.01.");
  }

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select({ id: invoices.id, totalAmount: invoices.totalAmount, dueDate: invoices.dueDate, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, input.invoiceId))
      .for("update");

    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "cancelled") throw new Error("Cancelled invoices cannot be paid.");

    const [onlinePending] = await tx.select({ id: payments.id }).from(payments)
      .where(and(eq(payments.invoiceId, invoice.id), eq(payments.method, "paystack"), eq(payments.status, "pending"))).limit(1);
    if (onlinePending) throw new Error("An online payment is still pending for this invoice. Complete it or wait for its status to update before recording another payment.");

    const [paid] = await tx
      .select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
      .from(payments)
      .where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "success")));

    const amountDueKobo = decimalToKobo(invoice.totalAmount);
    const amountPaidKobo = decimalToKobo(paid.amount);
    const balanceKobo = Math.max(0, amountDueKobo - amountPaidKobo);
    if (balanceKobo === 0) throw new Error("This invoice is already fully paid.");
    if (input.amountKobo > balanceKobo) {
      throw new Error(`The outstanding balance is ${formatNaira(koboToNaira(balanceKobo))}. You cannot pay more than that.`);
    }

    const paidAt = new Date();
    const year = Number(getLagosDate(paidAt).slice(0, 4));
    const receiptNumber = await allocateReceiptNumber(tx, year);
    const paymentValues = {
      id: crypto.randomUUID(),
      invoiceId: invoice.id,
      amount: koboToDecimal(input.amountKobo),
      method: input.method,
      reference: input.reference,
      receiptNumber,
      balanceAfter: koboToDecimal(balanceKobo - input.amountKobo),
      status: "success" as const,
      recordedBy: input.recordedBy,
      paidAt,
    };

    await tx.insert(payments).values(paymentValues);
    const newStatus = deriveInvoiceStatus({
      amountDueKobo,
      amountPaidKobo: amountPaidKobo + input.amountKobo,
      dueDate: invoice.dueDate,
    });
    await tx.update(invoices).set({ status: newStatus }).where(eq(invoices.id, invoice.id));

    return {
      id: paymentValues.id,
      invoiceId: paymentValues.invoiceId,
      amount: koboToNaira(input.amountKobo),
      balanceAfter: koboToNaira(balanceKobo - input.amountKobo),
      paidAt: paidAt.toISOString(),
      method: input.method,
      reference: input.reference,
      receiptNumber,
      status: "success",
      recordedBy: input.recordedBy,
    };
  });
}

export function recordTestPayment(input: {
  invoiceId: string;
  amountKobo: number;
  recordedBy: string;
}): Promise<Payment> {
  return recordSuccessfulPayment({
    ...input,
    method: "test",
    reference: `TEST-${crypto.randomUUID()}`,
  });
}

export function recordManualPayment(input: {
  invoiceId: string;
  amountKobo: number;
  method: "cash" | "bank_transfer";
  reference: string;
  recordedBy: string;
}): Promise<Payment> {
  return recordSuccessfulPayment(input);
}

export async function reservePaystackPayment(input: { invoiceId: string; parentUserId: string; email: string }) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select({ id: invoices.id, totalAmount: invoices.totalAmount, status: invoices.status, dueDate: invoices.dueDate })
      .from(invoices).innerJoin(parentStudents, eq(parentStudents.studentId, invoices.studentId))
      .where(and(eq(invoices.id, input.invoiceId), eq(parentStudents.parentUserId, input.parentUserId))).for("update");
    if (!invoice || invoice.status === "cancelled") throw new Error("Invoice not found or unavailable.");
    const [pending] = await tx.select({ id: payments.id, reference: payments.paystackReference, authorizationUrl: payments.authorizationUrl, createdAt: payments.createdAt, recordedBy: payments.recordedBy })
      .from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.method, "paystack"), eq(payments.status, "pending"))).limit(1).for("update");
    if (pending) {
      if (pending.authorizationUrl && pending.reference) {
        if (pending.recordedBy !== input.parentUserId) throw new Error("Another linked parent has an open checkout for this invoice. Ask them to complete it or wait for the pending status to update.");
        return { reference: pending.reference, authorizationUrl: pending.authorizationUrl, reused: true as const };
      }
      if (Date.now() - pending.createdAt.getTime() < 3 * 60 * 1000) throw new Error("A payment session is being prepared. Please wait a moment and retry.");
      await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, pending.id));
    }
    const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text` })
      .from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "success")));
    const amountKobo = decimalToKobo(invoice.totalAmount) - decimalToKobo(paid.amount);
    if (amountKobo <= 0) throw new Error("This invoice is already fully paid.");
    const reference = `CHA-PAY-${crypto.randomUUID()}`;
    await tx.insert(payments).values({ invoiceId: invoice.id, amount: koboToDecimal(amountKobo), method: "paystack", paystackReference: reference, reference, status: "pending", recordedBy: input.parentUserId });
    return { reference, amountKobo, email: input.email, reused: false as const };
  });
}

export async function setPaystackAuthorizationUrl(reference: string, authorizationUrl: string) {
  await db.update(payments).set({ authorizationUrl }).where(and(eq(payments.paystackReference, reference), eq(payments.status, "pending")));
}

export async function failPaystackPayment(reference: string) {
  await db.update(payments).set({ status: "failed" }).where(and(eq(payments.paystackReference, reference), eq(payments.status, "pending")));
}

export async function completePaystackPayment(input: { reference: string; amountKobo: number }) {
  return db.transaction(async (tx) => {
    const [referenceRow] = await tx.select({ invoiceId: payments.invoiceId }).from(payments).where(eq(payments.paystackReference, input.reference)).limit(1);
    if (!referenceRow) return null;
    const [invoice] = await tx.select({ id: invoices.id, totalAmount: invoices.totalAmount, status: invoices.status, dueDate: invoices.dueDate })
      .from(invoices).where(eq(invoices.id, referenceRow.invoiceId)).for("update");
    const [payment] = await tx.select({ id: payments.id, amount: payments.amount, status: payments.status, recordedBy: payments.recordedBy })
      .from(payments).where(eq(payments.paystackReference, input.reference)).limit(1).for("update");
    if (!invoice || !payment) return null;
    if (payment.status === "success") return { id: payment.id, created: false };
    if (payment.status !== "pending" || invoice.status === "cancelled") return null;
    const amountKobo = decimalToKobo(payment.amount);
    if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo !== amountKobo) return null;
    const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)::text` }).from(payments)
      .where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "success")));
    const amountDueKobo = decimalToKobo(invoice.totalAmount);
    const amountPaidKobo = decimalToKobo(paid.amount);
    const balanceKobo = Math.max(0, amountDueKobo - amountPaidKobo);
    if (amountKobo > balanceKobo) return null;
    const paidAt = new Date();
    const year = Number(getLagosDate(paidAt).slice(0, 4));
    const receiptNumber = await allocateReceiptNumber(tx, year);
    await tx.update(payments).set({ status: "success", method: "paystack", receiptNumber, balanceAfter: koboToDecimal(balanceKobo - amountKobo), paidAt, recordedBy: payment.recordedBy }).where(eq(payments.id, payment.id));
    await tx.update(invoices).set({ status: deriveInvoiceStatus({ amountDueKobo, amountPaidKobo: amountPaidKobo + amountKobo, dueDate: invoice.dueDate }) }).where(eq(invoices.id, invoice.id));
    return { id: payment.id, created: true };
  });
}

export async function createFeeInvoice(input: {
  studentId: string;
  title: string;
  dueDate: string;
  items: { description: string; amountKobo: number }[];
}) {
  if (!isValidCalendarDate(input.dueDate)) throw new Error("Choose a valid due date.");
  if (!input.items.length || input.items.some((item) => !Number.isSafeInteger(item.amountKobo) || item.amountKobo < 1 || !item.description.trim())) {
    throw new Error("Each invoice line needs a description and an amount of at least ₦0.01.");
  }
  const totalKobo = input.items.reduce((total, item) => total + item.amountKobo, 0);
  if (totalKobo > 999_999_999_999) throw new Error("The invoice total exceeds the supported limit.");
  const issueDate = getLagosDate();
  if (input.dueDate < issueDate) throw new Error("The due date cannot be before the issue date.");

  return db.transaction(async (tx) => {
    const [settings] = await tx
      .select({ session: schoolSettings.currentSession, term: schoolSettings.currentTerm })
      .from(schoolSettings)
      .where(eq(schoolSettings.id, 1))
      .limit(1);
    if (!settings) throw new Error("Set the current school session and term before creating invoices.");

    const [student] = await tx.select({ id: students.id }).from(students).where(eq(students.id, input.studentId)).limit(1);
    if (!student) throw new Error("Choose a valid student.");

    const invoiceNumber = `INV-${issueDate.slice(0, 4)}-${crypto.randomUUID().toUpperCase()}`;
    const [created] = await tx.insert(invoices).values({
      studentId: student.id,
      invoiceNumber,
      status: deriveInvoiceStatus({ amountDueKobo: totalKobo, amountPaidKobo: 0, dueDate: input.dueDate }),
      issueDate,
      dueDate: input.dueDate,
      totalAmount: koboToDecimal(totalKobo),
      title: input.title.trim(),
      session: settings.session,
      term: settings.term,
    }).returning({ id: invoices.id });

    await tx.insert(invoiceItems).values(input.items.map((item) => ({
      invoiceId: created.id,
      description: item.description.trim(),
      quantity: 1,
      unitAmount: koboToDecimal(item.amountKobo),
      amount: koboToDecimal(item.amountKobo),
      category: "Fees",
    })));
    return { id: created.id, invoiceNumber };
  });
}

export async function cancelFeeInvoice(invoiceId: string) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select({ id: invoices.id, status: invoices.status }).from(invoices).where(eq(invoices.id, invoiceId)).for("update");
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "cancelled") throw new Error("This invoice is already cancelled.");

    const [paymentsFound] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(and(eq(payments.invoiceId, invoiceId), ne(payments.status, "failed")));
    if (paymentsFound.count > 0) throw new Error("An invoice with a successful or pending payment cannot be cancelled.");

    await tx.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, invoiceId));
  });
}

export async function getFeeManagementSnapshot() {
  const [studentRows, invoiceRows, paymentRows, familyLinks] = await Promise.all([
    db.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, className: classes.name, admissionNumber: students.admissionNumber })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .orderBy(asc(classes.name), asc(students.lastName), asc(students.firstName)),
    db.select({ ...invoiceColumns, firstName: students.firstName, lastName: students.lastName, className: classes.name })
      .from(invoices)
      .innerJoin(students, eq(invoices.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .orderBy(desc(invoices.createdAt)),
    db.select(paymentColumns).from(payments).orderBy(desc(payments.paidAt)),
    db.select({ parentId: parentStudents.parentUserId, parentName: user.name, parentEmail: user.email, studentId: students.id, studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`, className: classes.name })
      .from(parentStudents)
      .innerJoin(user, eq(parentStudents.parentUserId, user.id))
      .innerJoin(students, eq(parentStudents.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .orderBy(asc(user.name), asc(students.lastName), asc(students.firstName)),
  ]);

  const invoicesWithItems = await loadInvoices(invoiceRows);
  const studentById = new Map(studentRows.map((student) => [student.id, student]));
  const invoiceById = new Map(invoiceRows.map((invoice) => [invoice.id, invoice]));

  return {
    students: studentRows.map((student) => ({
      id: student.id,
      label: `${student.firstName} ${student.lastName} · ${student.className} · ${student.admissionNumber}`,
    })),
    invoices: invoicesWithItems.map((invoice) => ({
      ...invoice,
      student: studentById.get(invoice.studentId),
    })),
    payments: mapPayments(paymentRows).map((payment) => ({
      ...payment,
      invoice: invoiceById.get(payment.invoiceId),
      student: studentById.get(invoiceById.get(payment.invoiceId)?.studentId ?? ""),
    })),
    familyLinks,
  };
}
