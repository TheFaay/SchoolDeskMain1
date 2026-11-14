"use client";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-lg bg-[#12264F] px-4 py-2.5 text-sm font-semibold text-white">Print pass slip</button>;
}
