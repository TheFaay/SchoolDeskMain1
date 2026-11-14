import type { Metadata } from "next";
import Link from "next/link";

import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password · Crown Heights Academy" };
export const instant = false;

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <section className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#12264F]">Choose a new password</h1>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {token ? <ResetPasswordForm token={token} /> : <p role="alert" className="text-sm text-red-700">This reset link is invalid or expired. Request a new one from the <Link className="underline" href="/forgot-password">password reset page</Link>.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">This reset link is invalid or expired.</p>}
      </section>
    </main>
  );
}
