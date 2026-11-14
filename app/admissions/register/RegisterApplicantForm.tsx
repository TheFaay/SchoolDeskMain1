"use client";

import { createAuthClient } from "better-auth/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const authClient = createAuthClient();

export default function RegisterApplicantForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        callbackURL: "/dashboard/applicant",
      });
      if (result.error) throw new Error(result.error.message || "Could not create your applicant account.");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create your applicant account.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return <section aria-live="polite" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <h2 className="font-semibold">Check your email to verify your account</h2>
      <p>We sent a verification link to <strong>{email}</strong>. Verify it before signing in. The link expires in one hour.</p>
      <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2" href="/login">Go to sign in</Link>
    </section>;
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium text-slate-700">Parent / guardian full name
      <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
    </label>
    <label className="block text-sm font-medium text-slate-700">Parent / guardian email
      <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
    </label>
    <label className="block text-sm font-medium text-slate-700">Password
      <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
      <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span>
    </label>
    <label className="block text-sm font-medium text-slate-700">Confirm password
      <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
    </label>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <button disabled={pending} className="min-h-11 w-full rounded-lg bg-[#12264F] px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Creating account…" : "Create applicant account"}</button>
  </form>;
}
