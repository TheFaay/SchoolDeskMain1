import type { Metadata } from "next";
import Link from "next/link";
import RegisterApplicantForm from "./RegisterApplicantForm";

export const metadata: Metadata = { title: "Create an applicant account · Crown Heights Academy" };

export default function RegisterApplicantPage() {
  return <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
    <section className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#806200]">Admissions portal</p>
      <h1 className="mt-2 text-2xl font-bold text-[#12264F]">Create an applicant account</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Use the parent or guardian email for this application. Verify it to sign in, complete the application, pay the fee securely with Paystack, and track its status.</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><RegisterApplicantForm /></section>
    <p className="mt-5 text-center text-sm text-slate-600">Already registered? <Link href="/login" className="font-semibold text-[#12264F] underline underline-offset-2">Sign in</Link></p>
  </main>;
}
