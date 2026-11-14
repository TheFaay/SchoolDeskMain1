import type { Metadata } from "next";
import Link from "next/link";
import { applicationPaymentReferencePattern, findApplicationPayment } from "@/lib/admissions/payments";
import { formatNaira } from "@/lib/fees/format";
import ApplicationPaymentForm from "../ApplicationPaymentForm";
import PrintButton from "../PrintButton";

export const metadata: Metadata = { title: "Application payment status · Crown Heights Academy" };
export const instant = false;

export default async function ApplicationPaymentCallbackPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference = "" } = await searchParams;
  if (!applicationPaymentReferencePattern.test(reference)) return <Status title="Payment reference not found" message="We could not match this checkout to an application." />;
  const payment = await findApplicationPayment(reference);
  if (!payment) return <Status title="Payment reference not found" message="We could not match this checkout to an application." />;

  if (payment.applicationFeeStatus === "paid") {
    return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Fee payment confirmed</p>
        <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Entrance exam pass slip</h1>
        <p className="mt-2 text-sm text-slate-600">Payment status is confirmed by the school payment service.</p>
        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <Detail label="Child's name" value={payment.childFullName} />
          <Detail label="Class" value={payment.classApplyingFor} />
          <Detail label="Application number" value={payment.applicationReference} />
          <Detail label="Application fee" value={formatNaira(Number(payment.amount))} />
          <Detail label="Entrance exam date" value="Saturday, 16 Jan 2027" />
        </dl>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden"><PrintButton /><Link href="/" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#12264F]">School home</Link></div>
      </section>
    </main>;
  }

  if (payment.paymentStatus === "failed" || payment.applicationFeeStatus === "unpaid") {
    return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Payment not completed</p>
        <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Your application is saved</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">We have not confirmed the application fee yet. You can retry securely below. Application reference: <strong>{payment.applicationReference}</strong>.</p>
        <ApplicationPaymentForm initialReference={payment.applicationReference} initialEmail={payment.parentEmail} />
      </section>
    </main>;
  }

  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">Awaiting confirmation</p>
      <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Your payment is being verified</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Your application fee is still pending confirmation. This page only shows payment status after the verified payment notification reaches the school. Please wait before trying again.</p>
      <p className="mt-4 text-sm text-slate-600">Application reference: <strong>{payment.applicationReference}</strong></p>
      <Link href={`/admissions/payment/callback?reference=${encodeURIComponent(reference)}`} className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-[#12264F]">Refresh payment status</Link>
    </section>
  </main>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-[#12264F]">{value}</dd></div>;
}

function Status({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p><Link href="/admissions/payment" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-4 text-sm font-semibold text-white">Resume payment</Link></section></main>;
}
