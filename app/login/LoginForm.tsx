"use client";

// Feature 10: sign-in form. Talks to Better Auth's /api/auth routes via
// the official React client, then sends each role to its own page
// (parent → /dashboard, teacher → /dashboard/teacher, etc.).

import { createAuthClient } from "better-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { roleHomePath } from "@/lib/auth/roleHome";

const authClient = createAuthClient();

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(
        result.error.message ??
          "Could not sign you in. Check the email and password.",
      );
      setSubmitting(false);
      return;
    }

    // The freshly created session already carries the user's role.
    const { data: fresh } = await authClient.getSession();
    const role =
      fresh?.user && "role" in fresh.user
        ? String((fresh.user as { role: string }).role)
        : null;
    router.push(roleHomePath(role));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#12264F] px-6 py-4 text-base font-semibold text-white shadow-sm active:bg-[#0d1b3a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-[#12264F] underline underline-offset-2">
          Forgot your password?
        </Link>
      </p>
      <p className="text-center text-sm text-slate-600">
        New applicant?{" "}
        <Link href="/admissions/register" className="font-medium text-[#12264F] underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
