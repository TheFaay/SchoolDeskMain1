"use client";

// Publishing is confirmed; parent notification is an explicit separate action.

import { useActionState, useState } from "react";

import { approveResult, type PublishActionState } from "./publish";

const TERM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "first", label: "First term" },
  { value: "second", label: "Second term" },
  { value: "third", label: "Third term" },
];

export default function PublishResultForm({
  classes,
}: {
  classes: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState<PublishActionState | null, FormData>(
    approveResult,
    null,
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="publish-class"
          className="block text-sm font-medium text-slate-700"
        >
          Class
        </label>
        <select
          id="publish-class"
          name="classId"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        >
          <option value="" disabled>
            Choose a class
          </option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="publish-term"
          className="block text-sm font-medium text-slate-700"
        >
          Term
        </label>
        <select
          id="publish-term"
          name="term"
          required
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#12264F] focus:ring-2 focus:ring-[#C9A227]/40"
        >
          <option value="" disabled>
            Choose a term
          </option>
          {TERM_OPTIONS.map((term) => (
            <option key={term.value} value={term.value}>
              {term.label}
            </option>
          ))}
        </select>
      </div>

      {confirming ? (
        <div className="rounded-xl border border-[#12264F]/30 bg-[#12264F]/5 px-4 py-3">
          <p className="text-sm font-medium text-[#12264F]">
            Publish these results now? You can send or retry parent email from
            the published results list afterward.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {/* No onClick here: removing the submit button mid-click would
                cancel the form submission, so the panel stays until the
                action answers. */}
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#12264F] px-5 py-3 text-base font-semibold text-white shadow-sm active:bg-[#0d1b3a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
            >
              {pending ? "Publishing…" : "Yes, publish"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-[#12264F] active:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending || classes.length === 0}
          className="rounded-xl bg-[#12264F] px-5 py-3 text-base font-semibold text-white shadow-sm active:bg-[#0d1b3a] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
        >
          {pending ? "Publishing…" : "Approve Result"}
        </button>
      )}

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
