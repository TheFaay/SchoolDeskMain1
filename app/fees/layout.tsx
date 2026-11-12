import type { Metadata } from "next";
import Link from "next/link";
import { FeesNav } from "./_components/fees-nav";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

export default function FeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 bg-slate-50 text-slate-900">
      <header className="border-b-4 border-[#c9a227] bg-[#0b1f3a] text-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/fees" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-bold text-[#f0c94a]">
              CH
            </span>
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c94a]">
                Crown Heights Academy
              </span>
              <span className="block text-lg font-semibold">
                Fees and payments
              </span>
            </span>
          </Link>
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            Sample data · Test payments only
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10 print:max-w-none print:p-0">
        <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
          <FeesNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
