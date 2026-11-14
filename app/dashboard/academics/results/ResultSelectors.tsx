"use client";

import { useRouter } from "next/navigation";

export interface ChildOption {
  id: string;
  name: string;
}

export interface TermOption {
  value: string;
  label: string;
}

/**
 * Child + published-term pickers. Changing either one updates the URL
 * (?child=...&term=...) so the results page remains server-rendered.
 *
 * Tap targets are kept large (h-12) for cheap phones, per the style guide.
 */
export default function ResultSelectors({
  childOptions,
  terms,
  selectedChildId,
  selectedTerm,
}: {
  /** Pickers for which child's results to show. */
  childOptions: ChildOption[];
  terms: TermOption[];
  selectedChildId: string;
  selectedTerm: string;
}) {
  const router = useRouter();

  function update(nextChild: string, nextTerm: string) {
    const params = new URLSearchParams({ child: nextChild, term: nextTerm });
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const labelClass =
    "block text-sm font-medium text-slate-700 mb-1 font-[family-name:var(--font-poppins)]";
  const selectClass =
    "mt-1 h-12 w-full rounded-lg border-2 border-[#12264F] bg-white px-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C9A227]";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Child
        <select
          className={selectClass}
          value={selectedChildId}
          onChange={(e) => update(e.target.value, selectedTerm)}
        >
          {childOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Term
        <select
          className={selectClass}
          value={selectedTerm}
          disabled={terms.length === 0}
          onChange={(e) => update(selectedChildId, e.target.value)}
        >
          {terms.length === 0 ? <option value="">No published results yet</option> : null}
          {terms.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
