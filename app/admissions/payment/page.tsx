import type { Metadata } from "next";
import ApplicationPaymentForm from "./ApplicationPaymentForm";

export const metadata: Metadata = { title: "Resume application payment · Crown Heights Academy" };

export default function ResumeApplicationPaymentPage() {
  return <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-12 sm:px-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">Admissions</p>
      <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Resume application payment</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Enter the application reference and parent email used on the application. Your fee amount is retrieved from the saved application.</p>
      <ApplicationPaymentForm />
    </section>
  </main>;
}
