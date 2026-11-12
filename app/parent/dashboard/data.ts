import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  classes,
  invoices,
  parentStudents,
  payments,
  students,
} from "@/lib/db/schema";

import {
  children as sampleChildren,
  notices,
  parent as sampleParent,
  school,
} from "./sample-data";
import type { Child, Fees, ParentDashboardData } from "./types";

// Login is not wired up yet, so the seeded parent is the signed-in parent.
const SAMPLE_PARENT_USER_ID = "sample-parent-user-001";

function toAmount(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getEarliestDate(dates: string[]): string {
  return dates.reduce((earliest, date) =>
    date < earliest ? date : earliest,
  );
}

function getLatestDate(dates: string[]): string {
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function formatRelationship(relationship: string): string {
  if (!relationship) {
    return sampleParent.relationship;
  }

  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

export async function getParentDashboardData(): Promise<ParentDashboardData> {
  const childRows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      academicYear: classes.academicYear,
      relationship: parentStudents.relationship,
    })
    .from(parentStudents)
    .innerJoin(students, eq(parentStudents.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(parentStudents.parentUserId, SAMPLE_PARENT_USER_ID))
    .orderBy(students.createdAt, students.firstName);

  const childIds = childRows.map((child) => child.id);

  const invoiceRows =
    childIds.length > 0
      ? await db
          .select({
            id: invoices.id,
            studentId: invoices.studentId,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
          })
          .from(invoices)
          .where(inArray(invoices.studentId, childIds))
      : [];

  const invoiceIds = invoiceRows.map((invoice) => invoice.id);

  const paymentRows =
    invoiceIds.length > 0
      ? await db
          .select({
            invoiceId: payments.invoiceId,
            amount: payments.amount,
            paidAt: payments.paidAt,
          })
          .from(payments)
          .where(inArray(payments.invoiceId, invoiceIds))
      : [];

  const invoiceById = new Map(
    invoiceRows.map((invoice) => [invoice.id, invoice]),
  );
  const paidByInvoice = new Map<string, number>();
  const paidByStudent = new Map<string, number>();
  const lastPaymentByStudent = new Map<string, Date>();

  for (const payment of paymentRows) {
    const invoice = invoiceById.get(payment.invoiceId);
    if (!invoice) {
      continue;
    }

    const amount = toAmount(payment.amount);
    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) ?? 0) + amount,
    );
    paidByStudent.set(
      invoice.studentId,
      (paidByStudent.get(invoice.studentId) ?? 0) + amount,
    );

    const previousPayment = lastPaymentByStudent.get(invoice.studentId);
    if (!previousPayment || payment.paidAt > previousPayment) {
      lastPaymentByStudent.set(invoice.studentId, payment.paidAt);
    }
  }

  const invoicesByStudent = new Map<string, typeof invoiceRows>();
  for (const invoice of invoiceRows) {
    const studentInvoices = invoicesByStudent.get(invoice.studentId) ?? [];
    studentInvoices.push(invoice);
    invoicesByStudent.set(invoice.studentId, studentInvoices);
  }

  const children: Child[] = childRows.map((child, index) => {
    const studentInvoices = invoicesByStudent.get(child.id) ?? [];
    const totalBilled = studentInvoices.reduce(
      (total, invoice) => total + toAmount(invoice.totalAmount),
      0,
    );
    const amountPaid = paidByStudent.get(child.id) ?? 0;

    const outstandingDueDates = studentInvoices
      .filter(
        (invoice) =>
          toAmount(invoice.totalAmount) -
            (paidByInvoice.get(invoice.id) ?? 0) >
          0,
      )
      .map((invoice) => invoice.dueDate);

    const allDueDates = studentInvoices.map((invoice) => invoice.dueDate);
    const dueDate =
      outstandingDueDates.length > 0
        ? getEarliestDate(outstandingDueDates)
        : allDueDates.length > 0
          ? getLatestDate(allDueDates)
          : null;

    const lastPayment = lastPaymentByStudent.get(child.id);
    const fees: Fees | null =
      studentInvoices.length > 0 && dueDate
        ? {
            totalBilled,
            amountPaid,
            dueDate,
            lastPaymentDate: lastPayment
              ? lastPayment.toISOString().slice(0, 10)
              : null,
          }
        : null;

    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      className: child.className,
      admissionNumber: child.admissionNumber,
      currentTerm: child.academicYear,
      // Results have no shared table yet, so the existing sample sets stay in
      // the same order as the children returned from the database.
      results: sampleChildren[index]?.results ?? [],
      fees,
    };
  });

  return {
    parent: {
      firstName: sampleParent.firstName,
      lastName: sampleParent.lastName,
      relationship: formatRelationship(childRows[0]?.relationship ?? ""),
    },
    school: {
      ...school,
      currentTerm: childRows[0]?.academicYear ?? school.currentTerm,
    },
    children,
    notices,
  };
}
