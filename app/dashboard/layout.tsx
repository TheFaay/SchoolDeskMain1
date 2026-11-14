// Feature 10 layout — scoped to the dashboard pages.
// Shared navy header and sign-out button for authenticated dashboard pages.
import SignOutButton from "./SignOutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import RoleNavigation from "./RoleNavigation";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Client components are not an access-control boundary; require a real
  // Better Auth session for every nested dashboard route.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div
      className="min-h-dvh bg-white font-[family-name:var(--font-inter)] text-slate-900"
    >
      <header className="bg-[#12264F]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#C9A227]">
              School portal
            </p>
            <p className="font-[family-name:var(--font-poppins)] text-sm font-semibold text-white sm:text-base">
              Crown Heights Academy
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="border-b border-slate-200 bg-slate-50">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pb-3 pt-2 sm:px-6 lg:px-8"><div aria-hidden="true" className="h-11 rounded-lg bg-slate-100" /></div>}>
          <RoleNavigation role={user.role} />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
