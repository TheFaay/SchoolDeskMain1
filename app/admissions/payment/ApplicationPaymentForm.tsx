"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ApplicationPaymentForm({
  initialReference = "",
  initialEmail = "",
}: {
  initialReference?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [referenceNumber, setReferenceNumber] = useState(initialReference);
  const [parentEmail, setParentEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/admissions/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNumber, parentEmail }),
      });
      const result = await response.json() as { authorizationUrl?: string; reference?: string; paid?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not start the application fee checkout.");
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }
      if (result.paid && result.reference) {
        router.push(`/admissions/payment/callback?reference=${encodeURIComponent(result.reference)}`);
        return;
      }
      throw new Error("No checkout was returned. Please try again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the application fee checkout.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="grid gap-1 text-sm font-medium text-slate-700">Application reference
      <input required value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} pattern="CHA-\d{4}-[A-Fa-f0-9]{8}" className="min-h-11 rounded-lg border border-slate-300 px-3" autoComplete="off" />
    </label>
    <label className="grid gap-1 text-sm font-medium text-slate-700">Parent email
      <input required type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3" autoComplete="email" />
    </label>
    <div className="sm:col-span-2">
      {error ? <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p> : null}
      <button disabled={pending} className="min-h-11 rounded-lg bg-[#0B1F3A] px-5 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Starting secure checkout…" : "Continue to payment"}</button>
    </div>
  </form>;
}
