"use client";

import { createAuthClient } from "better-auth/react";
import Link from "next/link";
import { useState } from "react";

const authClient = createAuthClient();

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (result.error) {
      setMessage("We could not reset the password. The link may have expired; request a new one.");
      return;
    }
    setComplete(true);
  }

  if (complete) return <div className="space-y-3"><p role="status" className="text-sm text-slate-700">Password updated. Sign in with your new password.</p><Link href="/login" className="inline-block font-medium text-[#12264F] underline">Go to sign in</Link></div>;

  return (
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">New password</label>
      <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
      <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">Confirm new password</label>
      <input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#12264F] px-6 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </form>
  );
}
