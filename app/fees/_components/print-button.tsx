"use client";

export function PrintButton({
  label = "Print receipt",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 print:hidden"
    >
      {label}
    </button>
  );
}
