"use client";

// The list of class + term pairs currently visible to parents, each with an
// unpublish button. The unpublish action re-checks the admin role on the
// server and refreshes this list on success.

import { useActionState } from "react";

import { unpublishResult, type PublishActionState } from "./publish";

export type PublishedItem = {
  id: string;
  className: string;
  academicYear: string;
  term: string;
};

const TERM_LABEL: Record<string, string> = {
  first: "First term",
  second: "Second term",
  third: "Third term",
};

export default function PublishedResults({
  items,
}: {
  items: PublishedItem[];
}) {
  const [state, action, pending] = useActionState<PublishActionState | null, FormData>(
    unpublishResult,
    null,
  );

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        Nothing is published yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-3"
          >
            <span className="text-sm font-medium text-slate-800">
              {item.className} ({item.academicYear}) ·{" "}
              {TERM_LABEL[item.term] ?? item.term}
            </span>
            <form action={action}>
              <input type="hidden" name="id" value={item.id} />
              <button
                type="submit"
                disabled={pending}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#12264F] active:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
              >
                {pending ? "Unpublishing…" : "Unpublish"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      {state && !state.ok && (
        <p
          role="status"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
