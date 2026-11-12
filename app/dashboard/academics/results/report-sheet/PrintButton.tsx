"use client";

// Runs the browser's print dialog. Used by the report sheet's Print button.
// Buttons are hidden in print (see the @media print rules on the sheet page).
export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ||
        "rounded-xl border-2 border-[#12264F] bg-white px-5 py-3 text-base font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#C9A227]"
      }
    >
      Print
    </button>
  );
}
