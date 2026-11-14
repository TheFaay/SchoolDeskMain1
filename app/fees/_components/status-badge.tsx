import type { InvoiceStatus } from "@/lib/fees/types";

const styles: Record<InvoiceStatus, string> = {
  unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
  partial: "bg-amber-50 text-amber-800 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  overdue: "bg-orange-50 text-orange-800 ring-orange-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-300",
};

const labels: Record<InvoiceStatus, string> = {
  unpaid: "Unpaid",
  partial: "Part-paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
