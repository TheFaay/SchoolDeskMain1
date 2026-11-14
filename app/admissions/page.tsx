import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAdmissionsFeeKobo } from "@/lib/admissions/payments";
import { formatNaira } from "@/lib/fees/format";
import AdmissionsForm from "./admissions-form";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Apply to Crown Heights Academy",
};

async function AdmissionsFormWithFee() {
  await connection();
  const feeKobo = getAdmissionsFeeKobo();
  const applicant = await getCurrentUser();
  if (applicant?.role !== "applicant") {
    return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <p className="text-sm leading-6 text-slate-700">Create an applicant account with the parent or guardian email. After verifying that email, sign in to complete the form, Pay securely with Paystack, and track the application.</p>
      <p className="font-semibold text-[#12264F]">Application fee: {feeKobo ? formatNaira(feeKobo / 100) : "temporarily unavailable"}</p>
      <div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-lg bg-[#12264F] px-5 text-sm font-semibold text-white" href="/admissions/register">Create applicant account</Link><Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-[#12264F]" href="/login">Sign in</Link></div>
    </section>;
  }
  return <AdmissionsForm feeAmountLabel={feeKobo ? formatNaira(feeKobo / 100) : null} applicantName={applicant.name} applicantEmail={applicant.email} />;
}

export default function AdmissionsPage() {
  return (
    <div
      className="flex min-h-screen flex-1 flex-col bg-white text-[#0B1F3A] [color-scheme:light] [font-family:var(--font-inter)]"
    >
      <header className="relative bg-[#0B1F3A] print:hidden">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-[#C9A227]"
        />
        <div className="mx-auto w-full max-w-3xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <span
            aria-hidden="true"
            className="mb-4 block h-1 w-12 rounded-full bg-[#C9A227]"
          />
          <h1
            id="admissions-title"
            className="font-[family-name:var(--font-poppins)] text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Apply to Crown Heights Academy
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6 print:mx-0 print:max-w-none print:px-0 print:pb-0">
        <div className="relative z-10 -mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(11,31,58,0.35)] sm:-mt-10 sm:p-8 print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <Suspense fallback={<p className="text-sm text-slate-600">Loading application fee…</p>}>
            <AdmissionsFormWithFee />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
