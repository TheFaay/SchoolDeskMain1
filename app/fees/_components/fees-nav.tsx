"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/fees", label: "Overview" },
  { href: "/fees/invoices", label: "Invoices" },
  { href: "/fees/receipts", label: "Receipts" },
];

export function FeesNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Fees and payments" className="print:hidden">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Fees and payments
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {links.map((link) => {
          const active =
            link.href === "/fees"
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#0b1f3a] text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-4 hidden rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 lg:block">
        <p className="font-semibold">Sample parent account</p>
        <p>All payments here are test payments.</p>
      </div>
    </nav>
  );
}
