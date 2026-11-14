"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/fees/format";

export function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function startPayment() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Could not start payment.");
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start payment. Please try again.");
      setPending(false);
    }
  }

  return <div className="space-y-4">
    <p className="text-sm text-slate-600">Pay the outstanding invoice balance: <strong className="text-slate-900">{formatNaira(balance)}</strong>. The server recalculates this amount before starting checkout.</p>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
    <button type="button" onClick={startPayment} disabled={pending} className="w-full rounded-xl bg-[#0b1f3a] px-5 py-3.5 text-base font-semibold text-white hover:bg-[#132f55] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
      {pending ? "Connecting to Paystack…" : "Pay invoice balance (test)"}
    </button>
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>Paystack test mode only.</strong> Use Paystack test credentials and test cards. No live payment key is accepted by this integration.</p>
  </div>;
}
