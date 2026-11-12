import type { Metadata } from "next";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";

import PermissionDenied from "../PermissionDenied";

export const metadata: Metadata = {
  title: "Bursar dashboard · Crown Heights Academy",
};

// Bursar's own page: an overview of fees and payments. Other roles (and
// signed-out visitors) cannot see this content.

export default function BursarPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <BursarPanel />
      </Suspense>
    </main>
  );
}

async function BursarPanel() {
  const gate = await requireRole("bursar", "admin");

  if (gate.status === "forbidden") {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">
          Bursar dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {gate.user.name} ({gate.user.email}).
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
            Outstanding fees
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Invoices and balances will appear here.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-[family-name:var(--font-poppins)] font-semibold text-[#12264F]">
            Recent payments
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Today&apos;s receipts will appear here.
          </p>
        </article>
      </section>

      <p className="text-xs text-slate-500">
        You can only open the pages assigned to your role.
      </p>
    </div>
  );
}
