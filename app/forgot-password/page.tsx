import type { Metadata } from "next";
import Link from "next/link";

import PasswordResetRequestForm from "./PasswordResetRequestForm";

export const metadata: Metadata = { title: "Reset password · Crown Heights Academy" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <section className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#12264F]">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-600">We’ll send a secure reset link to your school account email.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PasswordResetRequestForm available={Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM)} />
        <p className="mt-4 text-center text-sm"><Link className="underline" href="/login">Back to sign in</Link></p>
      </section>
    </main>
  );
}
