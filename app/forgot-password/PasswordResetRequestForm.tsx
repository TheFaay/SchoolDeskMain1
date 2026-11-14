"use client";

import { createAuthClient } from "better-auth/react";
import { useState } from "react";

const authClient = createAuthClient();

export default function PasswordResetRequestForm({ available }: { available: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setMessage(
      result.error
        ? "We could not process that request. Check the email service configuration and try again."
        : "If that address belongs to an account, a password reset link will be sent.",
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700" htmlFor="reset-email">School account email</label>
      <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
      <button type="submit" disabled={busy || !available} className="w-full rounded-xl bg-[#12264F] px-6 py-3 font-semibold text-white disabled:opacity-60">
        {!available ? "Password reset unavailable" : busy ? "Sending…" : "Send reset link"}
      </button>
      {!available && <p className="text-sm text-slate-600">Contact the school administrator until password reset email is configured.</p>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
