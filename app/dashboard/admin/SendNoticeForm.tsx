"use client";

// Send notice form for the admin. Calls the sendNotice server action
// (Resend via plain fetch; keys stay in .env) and shows exactly one clear
// result message.

import { useActionState } from "react";

import { sendNotice, type NoticeResult } from "./sendNotice";

export default function SendNoticeForm() {
  const [state, action, pending] = useActionState<NoticeResult | null, FormData>(
    sendNotice,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="notice-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title
        </label>
        <input
          id="notice-title"
          type="text"
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Open Day holds next Saturday"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        />
      </div>

      <div>
        <label
          htmlFor="notice-message"
          className="block text-sm font-medium text-slate-700"
        >
          Message
        </label>
        <textarea
          id="notice-message"
          name="message"
          required
          rows={4}
          maxLength={2000}
          placeholder="Write the notice the school office wants to send."
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#12264F] px-5 py-3 text-base font-semibold text-white shadow-sm active:bg-[#0d1b3a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
      >
        {pending ? "Sending…" : "Send notice"}
      </button>

      {state && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
