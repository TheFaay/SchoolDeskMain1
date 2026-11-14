import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { applicationPayments, applications } from "@/lib/db/schema";
import { formatNaira } from "@/lib/fees/format";
import ApplicationPaymentForm from "@/app/admissions/payment/ApplicationPaymentForm";
import PermissionDenied from "@/app/dashboard/PermissionDenied";

export const metadata: Metadata = { title: "Applicant account · Crown Heights Academy" };

export default async function ApplicantAccountPage() {
  const gate = await requireRole("applicant");
  if (gate.status === "forbidden") return <main className="mx-auto px-4 py-8"><PermissionDenied /></main>;

  const rows = await db.select({
    id: applications.id,
    referenceNumber: applications.referenceNumber,
    childFullName: applications.childFullName,
    classApplyingFor: applications.classApplyingFor,
    status: applications.status,
    feeStatus: applications.feeStatus,
    feeAmount: applications.feeAmount,
    createdAt: applications.createdAt,
  }).from(applications).where(eq(applications.parentEmail, gate.user.email.toLowerCase())).orderBy(desc(applications.createdAt));

  const payments = rows.length ? await db.select({
    applicationId: applicationPayments.applicationId,
    reference: applicationPayments.reference,
    status: applicationPayments.status,
  }).from(applicationPayments).where(inArray(applicationPayments.applicationId, rows.map((row) => row.id))).orderBy(desc(applicationPayments.createdAt)) : [];
  const paidReferences = new Map<string, string>();
  for (const payment of payments) if (payment.status === "success" && !paidReferences.has(payment.applicationId)) paidReferences.set(payment.applicationId, payment.reference);

  return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#806200]">Admissions portal</p><h1 className="mt-1 text-2xl font-bold text-[#12264F]">Welcome, {gate.user.name}</h1><p className="mt-1 text-sm text-slate-600">Applications linked to {gate.user.email}</p></div>
      <Link href="/admissions" className="inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-4 text-sm font-semibold text-white">Start an application</Link>
    </header>
    {rows.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">No applications yet</h2><p className="mt-2 text-sm text-slate-600">Start an application using this verified parent or guardian email. You can return here later to check its status or resume payment.</p></section> : <section className="space-y-4" aria-label="Your applications">
      {rows.map((application) => {
        const paidReference = paidReferences.get(application.id);
        return <article key={application.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{application.referenceNumber}</p><h2 className="mt-1 text-lg font-semibold text-[#12264F]">{application.childFullName}</h2><p className="mt-1 text-sm text-slate-600">Applying for {application.classApplyingFor} · Submitted {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(application.createdAt)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{application.status.replaceAll("_", " ")}</span></div>
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><p className="text-sm text-slate-700">Application fee: <strong>{application.feeAmount ? formatNaira(Number(application.feeAmount)) : "Not set"}</strong></p><p className="text-sm text-slate-700">Payment: <strong className="capitalize">{application.feeStatus}</strong></p></div>
          {paidReference ? <Link href={`/admissions/payment/callback?reference=${encodeURIComponent(paidReference)}`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#12264F]">View entrance exam pass slip</Link> : <ApplicationPaymentForm initialReference={application.referenceNumber} initialEmail={gate.user.email} />}
        </article>;
      })}
    </section>}
  </main>;
}
