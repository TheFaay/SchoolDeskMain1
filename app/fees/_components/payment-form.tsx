"use client";

import { useActionState, useState } from "react";
import { formatNaira } from "@/lib/fees/format";
import {
  getMinimumPartPayment,
  MIN_PART_PAYMENT_NAIRA,
} from "@/lib/fees/invoice";
import { payInvoiceAction, type PayInvoiceState } from "../actions";

const initialState: PayInvoiceState = null;

export function PaymentForm({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: number;
}) {
  const [state, formAction, pending] = useActionState(
    payInvoiceAction,
    initialState,
  );
  const [amount, setAmount] = useState(String(balance));
  const parsedAmount = Number(amount);
  const amountLabel =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? formatNaira(parsedAmount)
      : "amount";

  const minimumPartPayment = getMinimumPartPayment(balance);
  const quickAmounts = Array.from(
    new Set([minimumPartPayment, Math.ceil(balance / 2), balance]),
  )
    .filter(
      (value) =>
        value > 0 &&
        value <= balance &&
        (value === balance || value >= minimumPartPayment),
    )
    .sort((a, b) => a - b);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="invoiceId" value={invoiceId} />

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-semibold text-slate-800"
        >
          Amount to pay
        </label>
        <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#0b1f3a] focus-within:ring-2 focus-within:ring-[#0b1f3a]/20">
          <span className="pl-4 text-base font-semibold text-slate-500">₦</span>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl bg-transparent px-2 py-3 text-base font-semibold text-slate-900 outline-none"
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Part payments must be at least {formatNaira(minimumPartPayment)}.
          Balance to pay: {formatNaira(balance)}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickAmounts.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAmount(String(value))}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            {value === balance
              ? `Full balance · ${formatNaira(value)}`
              : value === MIN_PART_PAYMENT_NAIRA
                ? `Minimum · ${formatNaira(value)}`
                : formatNaira(value)}
          </button>
        ))}
      </div>

      {state?.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <p className="font-semibold">
            Payment did not go through. You were not charged. Try again.
          </p>
          <p className="mt-1">{state.error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#0b1f3a] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#132f55] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Processing test payment…" : `Pay ${amountLabel} (test)`}
      </button>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <span className="font-semibold">Test payment only.</span> This simulates
        a successful payment. No real money is collected.
      </p>
    </form>
  );
}
