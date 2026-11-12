import type { Metadata } from "next";

import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Crown Heights Academy",
};

// The portal's single entry point: school name, email, password, Sign in.
// After sign-in each role is sent to its own dashboard (server-checked).

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <section className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A227]">
          School portal
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F] sm:text-3xl">
          Crown Heights Academy
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to view results, fees and notices.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </section>
    </main>
  );
}
